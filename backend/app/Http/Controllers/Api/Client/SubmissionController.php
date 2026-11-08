<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Services\SubmissionPdfService;
use App\Traits\ValidatesSubmissionDates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Throwable;

class SubmissionController extends Controller
{
    use ValidatesSubmissionDates;
    // Les devis et sinistres du client connecté (jamais ceux des autres)
    public function index(Request $request): JsonResponse
    {
        $request->validate(['type' => ['nullable', 'in:claim,quote']]);

        // Rattache automatiquement les soumissions envoyées avec cette adresse email
        Submission::where(function ($q) {
            $q->whereNull('user_id')->orWhere('user_id', 0);
        })
        ->whereRaw('LOWER(TRIM(email)) = ?', [Str::lower(trim($request->user()->email))])
        ->update(['user_id' => $request->user()->id]);

        $query = Submission::with('category:id,name,name_en')
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
            'category_en'      => $submission->category?->name_en,
            'rejection_reason' => $submission->rejection_reason,
            'created_at'       => $submission->created_at?->toIso8601String(),
            'updated_at'       => $submission->updated_at?->toIso8601String(),
            'processed_at'     => $submission->processed_at?->toIso8601String(),
            'taken_at'         => $submission->taken_at?->toIso8601String(),
            'closed_at'        => $submission->closed_at?->toIso8601String(),
        ]);

        return response()->json($page);
    }

    // Modification d'une soumission (uniquement si status === 'received')
    public function update(Request $request, string $reference): JsonResponse
    {
        $submission = Submission::where('reference', strtoupper(trim($reference)))->first();

        if (! $submission) {
            return response()->json(['message' => 'Dossier introuvable.'], 404);
        }

        $user = $request->user();
        $userEmail = Str::lower(trim($user->email));
        $subEmail  = Str::lower(trim($submission->email));

        // Contrôle d'accès
        if ((int) $submission->user_id !== (int) $user->id) {
            if (empty($submission->user_id) && $subEmail === $userEmail) {
                $submission->update(['user_id' => $user->id]);
            } else {
                return response()->json(['message' => 'Accès refusé.'], 403);
            }
        }

        // Modification impossible si la demande a déjà été prise en charge
        if ($submission->status !== 'received') {
            return response()->json([
                'message' => 'Cette demande ne peut plus être modifiée car elle a déjà été prise en charge.',
            ], 403);
        }

        $data = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $this->validateDateAnswers($data['answers'], $submission->category?->slug);

        $submission->update([
            'answers' => array_merge($submission->answers ?? [], $data['answers']),
        ]);

        return response()->json([
            'reference'    => $submission->reference,
            'status'       => $submission->status,
            'answers'      => $submission->answers,
            'updated_at'   => $submission->updated_at?->toIso8601String(),
            'processed_at' => $submission->processed_at?->toIso8601String(),
        ]);
    }

    // Téléchargement du PDF d'une soumission appartenant au client connecté (contrôle d'accès strict)
    public function downloadPdf(Request $request, string $reference): Response
    {
        $submission = Submission::with(['category', 'attachments'])
            ->where('reference', strtoupper(trim($reference)))
            ->first();

        if (! $submission) {
            abort(404, 'Dossier introuvable.');
        }

        $user = $request->user();
        $userEmail = Str::lower(trim($user->email));
        $subEmail  = Str::lower(trim($submission->email));

        // Contrôle d'accès : le dossier doit appartenir au compte connecté
        if ((int) $submission->user_id === (int) $user->id) {
            // Accès autorisé : propriétaire direct
        } elseif (empty($submission->user_id) && $subEmail === $userEmail) {
            // Soumission initiale non rattachée : attribution automatique au compte vérifié
            $submission->update(['user_id' => $user->id]);
        } else {
            // Tentative d'accès au document d'un autre client
            abort(403, 'Accès refusé. Vous n\'êtes pas autorisé à consulter ce document.');
        }

        try {
            $pdfContent = app(SubmissionPdfService::class)->generate($submission);
        } catch (Throwable $e) {
            abort(500, 'La génération du PDF a échoué.');
        }

        $filename = $submission->reference . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'           => 'application/pdf',
            'Content-Disposition'    => 'attachment; filename="' . $filename . '"',
            'Content-Length'         => strlen($pdfContent),
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control'          => 'private, no-cache, no-store, must-revalidate',
        ]);
    }
}
