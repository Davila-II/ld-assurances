<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    // Suivi public par référence : n'expose que des informations non sensibles
    public function show(string $reference): JsonResponse
    {
        $submission = Submission::where('reference', $reference)->firstOrFail();

        return response()->json([
            'reference'    => $submission->reference,
            'form_type'    => $submission->form_type,
            'status'       => $submission->status,
            'status_label' => $submission->statusLabel(),
            'category'     => $submission->category?->name,
            'created_at'   => $submission->created_at?->toIso8601String(),
            'updated_at'   => $submission->updated_at?->toIso8601String(),
        ]);
    }
}
