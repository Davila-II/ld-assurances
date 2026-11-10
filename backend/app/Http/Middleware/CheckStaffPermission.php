<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStaffPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Si l'utilisateur est admin principal, il a tous les droits
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Si l'utilisateur n'est pas admin, il doit avoir un rôle staff actif
        if (! $user->staffRole || ! $user->staffRole->is_active) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        // Vérifier si l'utilisateur possède au moins une des permissions requises
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Vous n\'avez pas la permission d\'effectuer cette action.'], 403);
    }
}
