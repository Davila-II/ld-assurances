<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsClient
{
    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'client') {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if ($mode === 'verified' && $user->email_verified_at === null) {
            return response()->json([
                'message' => "Veuillez d'abord vérifier votre adresse email.",
                'code'    => 'email_unverified',
            ], 403);
        }

        return $next($request);
    }
}