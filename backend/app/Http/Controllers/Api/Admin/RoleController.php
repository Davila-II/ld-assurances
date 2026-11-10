<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\StaffRoleAssigned;
use App\Models\StaffPermission;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    // ── Liste tous les rôles avec leurs permissions et le nombre d'utilisateurs ──
    public function index(): JsonResponse
    {
        $roles = StaffRole::with('permissions')
            ->withCount('users')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(fn ($role) => $this->formatRole($role));

        $permissions = StaffPermission::orderBy('group')->orderBy('name')->get()
            ->groupBy('group')
            ->map(fn ($perms, $group) => [
                'group'       => $group,
                'permissions' => $perms->map(fn ($p) => [
                    'id'      => $p->id,
                    'key'     => $p->key,
                    'name'    => $p->name,
                    'name_en' => $p->name_en,
                ])->values(),
            ])->values();

        return response()->json([
            'roles'       => $roles,
            'permissions' => $permissions,
        ]);
    }

    // ── Créer un nouveau rôle ──────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'name_en'     => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:staff_permissions,key'],
        ]);

        $slug = Str::slug($validated['name'], '_');
        // Garantir l'unicité du slug
        $baseSlug = $slug;
        $counter  = 1;
        while (StaffRole::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '_' . $counter++;
        }

        $role = StaffRole::create([
            'name'        => $validated['name'],
            'name_en'     => $validated['name_en'] ?? null,
            'slug'        => $slug,
            'description' => $validated['description'] ?? null,
            'is_system'   => false,
            'is_active'   => true,
        ]);

        $permIds = StaffPermission::whereIn('key', $validated['permissions'])->pluck('id');
        $role->permissions()->sync($permIds);

        return response()->json($this->formatRole($role->load('permissions')->loadCount('users')), 201);
    }

    // ── Mettre à jour un rôle ─────────────────────────────────────────────────
    public function update(Request $request, StaffRole $role): JsonResponse
    {
        if ($role->is_system) {
            // Les rôles système ne peuvent pas changer leur nom/slug,
            // mais leurs permissions restent modifiables
            $validated = $request->validate([
                'description' => ['nullable', 'string', 'max:500'],
                'permissions' => ['required', 'array'],
                'permissions.*' => ['string', 'exists:staff_permissions,key'],
                'is_active'   => ['sometimes', 'boolean'],
            ]);
            $role->update([
                'description' => $validated['description'] ?? $role->description,
                'is_active'   => $validated['is_active'] ?? $role->is_active,
            ]);
        } else {
            $validated = $request->validate([
                'name'        => ['required', 'string', 'max:100'],
                'name_en'     => ['nullable', 'string', 'max:100'],
                'description' => ['nullable', 'string', 'max:500'],
                'permissions' => ['required', 'array'],
                'permissions.*' => ['string', 'exists:staff_permissions,key'],
                'is_active'   => ['sometimes', 'boolean'],
            ]);
            $role->update([
                'name'        => $validated['name'],
                'name_en'     => $validated['name_en'] ?? $role->name_en,
                'description' => $validated['description'] ?? null,
                'is_active'   => $validated['is_active'] ?? $role->is_active,
            ]);
        }

        $permIds = StaffPermission::whereIn('key', $validated['permissions'])->pluck('id');
        $role->permissions()->sync($permIds);

        return response()->json($this->formatRole($role->fresh()->load('permissions')->loadCount('users')));
    }

    // ── Supprimer un rôle ─────────────────────────────────────────────────────
    public function destroy(StaffRole $role): JsonResponse
    {
        if ($role->is_system) {
            return response()->json(['message' => 'Ce rôle système ne peut pas être supprimé.'], 403);
        }

        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Ce rôle est encore attribué à des utilisateurs. Réattribuez-les avant de supprimer ce rôle.',
            ], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Rôle supprimé.']);
    }

    // ── Assigner un rôle à un utilisateur par email ───────────────────────────
    public function assignUser(Request $request, StaffRole $role): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'name'  => ['nullable', 'string', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();
        $isNewAccount = false;
        $plainPassword = '••••••••';

        if (! $user) {
            // Création automatique de l'utilisateur avec le mot de passe par défaut 12345678
            $name = $validated['name'] ?? explode('@', $email)[0];
            $user = User::create([
                'name'          => ucfirst($name),
                'email'         => $email,
                'password'      => Hash::make('12345678'),
                'role'          => 'admin', // membre du staff
                'staff_role_id' => $role->id,
            ]);
            $isNewAccount = true;
            $plainPassword = '12345678';
        } else {
            // L'utilisateur existe déjà
            if ($user->role === 'client') {
                return response()->json([
                    'message' => 'Cet utilisateur possède déjà un compte client. Veuillez utiliser une autre adresse e-mail professionnelle.',
                ], 422);
            }

            $user->update([
                'staff_role_id' => $role->id,
            ]);
        }

        // Envoi d'un e-mail d'information avec identifiants
        try {
            Mail::to($user->email)->send(new StaffRoleAssigned($user, $role, $plainPassword, $isNewAccount));
        } catch (\Throwable $e) {
            // Envoi non bloquant en cas d'indisponibilité SMTP
        }

        return response()->json([
            'message' => "Rôle \"{$role->name}\" attribué à {$user->name}.",
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'is_new_account' => $isNewAccount,
        ]);
    }

    // ── Retirer le rôle d'un utilisateur ─────────────────────────────────────
    public function removeUser(Request $request, StaffRole $role): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::find($validated['user_id']);

        if ((int) $user->staff_role_id !== (int) $role->id) {
            return response()->json(['message' => 'Cet utilisateur n\'a pas ce rôle.'], 422);
        }

        $user->update(['staff_role_id' => null]);

        return response()->json(['message' => 'Rôle retiré.']);
    }

    // ── Lister les utilisateurs d'un rôle ────────────────────────────────────
    public function users(StaffRole $role): JsonResponse
    {
        $users = $role->users()->select('id', 'name', 'email', 'created_at')->get();

        return response()->json(['users' => $users]);
    }

    // ── Format de sortie ──────────────────────────────────────────────────────
    private function formatRole(StaffRole $role): array
    {
        return [
            'id'          => $role->id,
            'name'        => $role->name,
            'name_en'     => $role->name_en,
            'slug'        => $role->slug,
            'description' => $role->description,
            'is_system'   => $role->is_system,
            'is_active'   => $role->is_active,
            'users_count' => $role->users_count ?? 0,
            'permissions' => $role->permissions->pluck('key')->values()->all(),
        ];
    }
}
