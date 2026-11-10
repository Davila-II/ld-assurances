<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        // Même message dans tous les cas d'échec, pour ne rien révéler
        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $user->isStaff()) {
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }

        $token = $user->createToken('admin', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->userData($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userData($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'new_password.min'       => 'Le nouveau mot de passe doit comporter au moins 8 caractères.',
            'new_password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return response()->json([
            'message' => 'Votre mot de passe a été modifié avec succès.',
        ]);
    }

    private function userData(User $user): array
    {
        $permissions = [];
        $permissionsDetails = [];
        $roleName = $user->isAdmin() ? 'Administrateur' : ($user->staffRole?->name ?? 'Collaborateur');
        $roleDesc = $user->isAdmin() ? 'Accès complet à toutes les fonctionnalités et paramètres de la plateforme.' : ($user->staffRole?->description ?? null);

        if ($user->isAdmin()) {
            $permissions = ['*'];
        } elseif ($user->staffRole) {
            $permissions = $user->staffRole->permissions->pluck('key')->values()->all();
            $permissionsDetails = $user->staffRole->permissions->map(fn ($p) => [
                'key'     => $p->key,
                'name'    => $p->name,
                'name_en' => $p->name_en,
                'group'   => $p->group,
            ])->values()->all();
        }

        return [
            'id'                  => $user->id,
            'name'                => $user->name,
            'email'               => $user->email,
            'role'                => $user->role,
            'role_name'           => $roleName,
            'role_description'    => $roleDesc,
            'is_admin'            => $user->isAdmin(),
            'permissions'         => $permissions,
            'permissions_details' => $permissionsDetails,
        ];
    }
}