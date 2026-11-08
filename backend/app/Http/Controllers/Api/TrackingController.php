<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Services\SubmissionPdfService;
use App\Traits\ValidatesSubmissionDates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class TrackingController extends Controller
{
    use ValidatesSubmissionDates;
    // Suivi public : il faut la référence ET l'email utilisé lors de la demande.
    // Les informations renvoyées restent non sensibles (statut, dates, catégorie).
    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:40'],
            'email'     => ['required', 'email', 'max:255'],
        ]);

        $submission = Submission::with(['category', 'attachments'])
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
            'reference'        => $submission->reference,
            'form_type'        => $submission->form_type,
            'status'           => $submission->status,
            'status_label'     => $submission->statusLabel(),
            'category'         => $submission->category?->name,
            'rejection_reason' => $submission->rejection_reason,
            'created_at'       => $submission->created_at?->toIso8601String(),
            'updated_at'       => $submission->updated_at?->toIso8601String(),
            'taken_at'         => $submission->taken_at?->toIso8601String(),
            'processed_at'     => $submission->processed_at?->toIso8601String(),
            'answers'          => $submission->answers,
            'form_snapshot'    => $submission->form_snapshot,
            'admin_attachments' => $submission->attachments->where('source', 'admin')->map(fn ($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
            ])->values(),
        ])->header('Cache-Control', 'no-store');
    }

    // Modification publique d'une soumission (uniquement si status === 'received')
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:40'],
            'email'     => ['required', 'email', 'max:255'],
            'answers'   => ['required', 'array'],
        ]);

        $submission = Submission::where('reference', strtoupper(trim($data['reference'])))->first();

        if (
            ! $submission
            || ! hash_equals(strtolower($submission->email), strtolower(trim($data['email'])))
        ) {
            return response()->json(['message' => 'Aucun dossier ne correspond à ces informations.'], 404);
        }

        if ($submission->status !== 'received') {
            return response()->json([
                'message' => 'Cette demande ne peut plus être modifiée car elle a déjà été prise en charge.',
            ], 403);
        }

        $this->validateDateAnswers($data['answers'], $submission->category?->slug);

        $submission->update([
            'answers' => array_merge($submission->answers ?? [], $data['answers']),
        ]);

        return response()->json([
            'reference'    => $submission->reference,
            'status'       => $submission->status,
            'updated_at'   => $submission->updated_at?->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }

    // Téléchargement public du PDF avec le couple (référence + email)
    public function downloadPdf(Request $request): Response|JsonResponse
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:40'],
            'email'     => ['required', 'email', 'max:255'],
        ]);

        $submission = Submission::with(['category', 'attachments'])
            ->where('reference', strtoupper(trim($data['reference'])))
            ->first();

        if (
            ! $submission
            || ! hash_equals(strtolower($submission->email), strtolower(trim($data['email'])))
        ) {
            return response()->json(['message' => 'Aucun dossier ne correspond à ces informations.'], 404);
        }

        try {
            $pdfContent = app(SubmissionPdfService::class)->generate($submission);
        } catch (Throwable $e) {
            return response()->json(['message' => 'La génération du PDF a échoué.'], 500);
        }

        $filename = $submission->reference . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'           => 'application/pdf',
            'Content-Disposition'    => 'attachment; filename="' . $filename . '"',
            'Content-Length'         => strlen($pdfContent),
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control'          => 'no-store, private',
        ]);
    }

    // Téléchargement public sécurisé d'une pièce jointe avec le couple (référence + email)
    public function downloadAttachment(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse|JsonResponse
    {
        $data = $request->validate([
            'reference'     => ['required', 'string', 'max:40'],
            'email'         => ['required', 'email', 'max:255'],
            'attachment_id' => ['required', 'integer'],
        ]);

        $submission = Submission::where('reference', strtoupper(trim($data['reference'])))->first();

        if (
            ! $submission
            || ! hash_equals(strtolower($submission->email), strtolower(trim($data['email'])))
        ) {
            return response()->json(['message' => 'Aucun dossier ne correspond à ces informations.'], 404);
        }

        $attachment = $submission->attachments()->find($data['attachment_id']);

        if (! $attachment || ! \Illuminate\Support\Facades\Storage::exists($attachment->path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return \Illuminate\Support\Facades\Storage::download($attachment->path, $attachment->original_name);
    }
}
