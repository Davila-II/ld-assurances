<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ClientAccountCreatedByAdmin;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AdminClientController extends Controller
{
    // Liste paginée des clients avec recherche par nom, email ou téléphone
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $query = User::where('role', 'client')
            ->withCount('submissions')
            ->latest();

        if ($request->filled('q')) {
            $term = $request->input('q');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('email', 'like', "%{$term}%")
                  ->orWhere('phone', 'like', "%{$term}%");
            });
        }

        $page = $query->paginate(15)->withQueryString()->through(fn (User $user) => [
            'id'                => $user->id,
            'name'              => $user->name,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'submissions_count' => $user->submissions_count,
            'created_at'        => $user->created_at?->toIso8601String(),
        ]);

        return response()->json($page);
    }

    // Création d'un client par l'administrateur et envoi automatique de ses coordonnées par email
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ], [
            'name.required'  => 'Le nom du client est obligatoire.',
            'email.required' => "L'adresse email est obligatoire.",
            'email.email'    => "L'adresse email n'est pas valide.",
            'email.unique'   => 'Un compte existe déjà avec cette adresse email.',
            'password.min'   => 'Le mot de passe doit comporter au moins 8 caractères.',
        ]);

        // Si aucun mot de passe n'est fourni, on génère un mot de passe aléatoire de 10 caractères
        $plainPassword = ! empty($data['password'])
            ? $data['password']
            : Str::random(10);

        $user = new User([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'] ?? null,
            'password' => $plainPassword,
        ]);
        $user->role = 'client';
        $user->email_verified_at = now();
        $user->save();

        // Rattachement immédiat des dossiers (devis/sinistres) créés précédemment avec cette adresse
        Submission::whereNull('user_id')
            ->whereRaw('LOWER(email) = ?', [Str::lower($user->email)])
            ->update(['user_id' => $user->id]);

        // Envoi direct des identifiants au client par email
        try {
            Mail::to($user->email)->send(new ClientAccountCreatedByAdmin($user, $plainPassword));
        } catch (Throwable $e) {
            Log::error("Échec de l'envoi de l'email des identifiants client par l'admin", [
                'user_id' => $user->id,
                'email'   => $user->email,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message'            => 'Le client a été créé avec succès et ses coordonnées lui ont été envoyées par email.',
            'user'               => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'phone'      => $user->phone,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'temporary_password' => $plainPassword,
        ], 201);
    }
}
