<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetLink;
use App\Mail\VerificationCode;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

class AuthController extends Controller
{
    private const TOKEN_DAYS = 7;
    private const CODE_MINUTES = 15;
    private const MAX_CODE_ATTEMPTS = 5;

    // Création du compte : le rôle est fixé ici, jamais par le client
    public function register(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'password' => $this->passwordRules(),
        ], array_merge($this->passwordMessages(), [
            'name.required'  => 'Le nom est obligatoire.',
            'email.required' => "L'adresse email est obligatoire.",
            'email.email'    => "L'adresse email n'est pas valide.",
            'email.unique'   => 'Un compte existe déjà avec cette adresse email.',
        ]));

        $user = new User([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'] ?? null,
            'password' => $data['password'],
        ]);
        $user->role = 'client';
        $user->save();

        $this->sendCode($user);

        return response()->json([
            'token' => $this->newToken($user),
            'user'  => $this->userData($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        // Même réponse dans tous les cas d'échec (compte absent, administrateur, mauvais mot de passe)
        if (! $user) {
            Hash::make($credentials['password']); // temps de réponse comparable
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }

        if ($user->role !== 'client' || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }

        return response()->json([
            'token' => $this->newToken($user),
            'user'  => $this->userData($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userData($request->user()));
    }

    // Vérification de l'email par le code à 6 chiffres
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['code' => ['required', 'digits:6']],
            ['code.required' => 'Saisissez le code reçu par email.', 'code.digits' => 'Le code contient 6 chiffres.']
        );

        $user = $request->user();

        if ($user->email_verified_at !== null) {
            return response()->json(['message' => 'Adresse email déjà vérifiée.', 'user' => $this->userData($user), 'linked' => 0]);
        }

        if (
            ! $user->verification_code
            || ! $user->verification_code_expires_at
            || $user->verification_code_expires_at->isPast()
        ) {
            return response()->json(['message' => 'Ce code a expiré. Demandez-en un nouveau.'], 422);
        }

        if ($user->verification_attempts >= self::MAX_CODE_ATTEMPTS) {
            return response()->json(['message' => 'Trop de tentatives. Demandez un nouveau code.'], 422);
        }

        if (! Hash::check($data['code'], $user->verification_code)) {
            $user->increment('verification_attempts');
            return response()->json(['message' => 'Code incorrect.'], 422);
        }

        $user->forceFill([
            'email_verified_at'            => now(),
            'verification_code'            => null,
            'verification_code_expires_at' => null,
            'verification_attempts'        => 0,
        ])->save();

        // L'email est vérifié : on rattache les demandes faites sans compte avec cette adresse
        $linked = Submission::whereNull('user_id')
            ->whereRaw('LOWER(email) = ?', [Str::lower($user->email)])
            ->update(['user_id' => $user->id]);

        return response()->json([
            'message' => 'Adresse email vérifiée.',
            'user'    => $this->userData($user),
            'linked'  => $linked,
        ]);
    }

    public function resendCode(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->email_verified_at !== null) {
            return response()->json(['message' => 'Adresse email déjà vérifiée.']);
        }

        $this->sendCode($user);

        return response()->json(['message' => 'Un nouveau code vient de vous être envoyé.']);
    }

    // Demande de réinitialisation : la réponse est identique que le compte existe ou non
    public function forgotPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        $user = User::where('email', $data['email'])->where('role', 'client')->first();

        if ($user) {
            $token = Password::broker()->createToken($user);
            $url = rtrim((string) config('frontend.url'), '/')
                . '/espace-client/reinitialiser?token=' . $token
                . '&email=' . urlencode($user->email);

            try {
                Mail::to($user->email)->send(new PasswordResetLink($user, $url));
            } catch (Throwable $e) {
                Log::error("Échec de l'envoi du lien de réinitialisation", [
                    'user_id' => $user->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'message' => "Si un compte existe avec cette adresse, un email de réinitialisation vient d'être envoyé.",
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $data = $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => $this->passwordRules(),
        ], $this->passwordMessages());

        $status = Password::broker()->reset(
            [
                'email'                 => $data['email'],
                'password'              => $data['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token'                 => $data['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password'       => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete(); // toutes les sessions sont fermées
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Ce lien est invalide ou a expiré. Refaites une demande.'], 422);
        }

        return response()->json(['message' => 'Mot de passe modifié. Vous pouvez vous connecter.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
        ], ['name.required' => 'Le nom est obligatoire.']);

        $user = $request->user();
        $user->forceFill(['name' => $data['name'], 'phone' => $data['phone'] ?? null])->save();

        return response()->json($this->userData($user));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => $this->passwordRules(),
        ], array_merge($this->passwordMessages(), [
            'current_password.required' => 'Saisissez votre mot de passe actuel.',
        ]));

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
                'errors'  => ['current_password' => ['Le mot de passe actuel est incorrect.']],
            ], 422);
        }

        $user->forceFill(['password' => $data['password']])->save();

        // On déconnecte les autres appareils, pas celui-ci
        $current = $user->currentAccessToken();
        $query = $user->tokens();

        if ($current instanceof PersonalAccessToken) {
            $query->where('id', '!=', $current->id);
        }

        $query->delete();

        return response()->json(['message' => 'Mot de passe modifié.']);
    }

    // --- Outils internes ---

    private function normalizeEmail(Request $request): void
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);
    }

    private function passwordRules(): array
    {
        return ['required', 'string', 'min:8', 'max:100', 'confirmed', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'];
    }

    private function passwordMessages(): array
    {
        return [
            'password.required'  => 'Le mot de passe est obligatoire.',
            'password.min'       => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.regex'     => 'Le mot de passe doit contenir des lettres et des chiffres.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ];
    }

    private function newToken(User $user): string
    {
        return $user->createToken('client', ['client'], now()->addDays(self::TOKEN_DAYS))->plainTextToken;
    }

    // Génère un code à 6 chiffres, le stocke chiffré et l'envoie par email
    private function sendCode(User $user): void
    {
        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'verification_code'            => Hash::make($code),
            'verification_code_expires_at' => now()->addMinutes(self::CODE_MINUTES),
            'verification_attempts'        => 0,
        ])->save();

        try {
            Mail::to($user->email)->send(new VerificationCode($user, $code, self::CODE_MINUTES));
        } catch (Throwable $e) {
            Log::error("Échec de l'envoi du code de vérification", [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function userData(User $user): array
    {
        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'email_verified' => $user->email_verified_at !== null,
        ];
    }
}