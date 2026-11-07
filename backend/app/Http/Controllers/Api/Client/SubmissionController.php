<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    // Les devis et sinistres du client connecté (jamais ceux des autres)
    public function index(Request $request): JsonResponse
    {
        $request->validate(['type' => ['nullable', 'in:claim,quote']]);

        // Rattache automatiquement les soumissions envoyées avec cette adresse email
        Submission::whereNull('user_id')
            ->whereRaw('LOWER(email) = ?', [\Illuminate\Support\Str::lower($request->user()->email)])
            ->update(['user_id' => $request->user()->id]);

        $query = Submission::with('category:id,name')
            ->where('user_id', $request->user()->id)
            ->latest();

        if ($request->filled('type')) {
            $query->where('form_type', $request->input('type'));
        }

        $page = $query->paginate(20)->through(fn (Submission $submission) => [
            'reference'        => $submission->reference,
            'form_type'        => $submission->form_type,
            'status'           => $submission->status,
            'status_label'     => $submission->statusLabel(),
            'category'         => $submission->category?->name,
            'rejection_reason' => $submission->rejection_reason,
            'created_at'       => $submission->created_at?->toIso8601String(),
            'updated_at'       => $submission->updated_at?->toIso8601String(),
        ]);

        return response()->json($page);
    }
}