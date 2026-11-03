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
        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $user->isAdmin()) {
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

    private function userData(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ];
    }
}