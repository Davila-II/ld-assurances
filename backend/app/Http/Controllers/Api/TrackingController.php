<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    // Suivi public : il faut la référence ET l'email utilisé lors de la demande.
    // Les informations renvoyées restent non sensibles (statut, dates, catégorie).
    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:40'],
            'email'     => ['required', 'email', 'max:255'],
        ]);

        $submission = Submission::with('category')
            ->where('reference', strtoupper(trim($data['reference'])))
            ->first();

        // Même réponse si la référence n'existe pas ou si l'email ne correspond pas :
        // on ne révèle pas quels dossiers existent.
        if (
            ! $submission
            || ! hash_equals(strtolower($submission->email), strtolower(trim($data['email'])))
        ) {
            return response()->json(['message' => 'Aucun dossier ne correspond à ces informations.'], 404);
        }

        return response()->json([
            'reference'    => $submission->reference,
            'form_type'    => $submission->form_type,
            'status'       => $submission->status,
            'status_label' => $submission->statusLabel(),
            'category'     => $submission->category?->name,
            'created_at'   => $submission->created_at?->toIso8601String(),
            'updated_at'   => $submission->updated_at?->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }
}
