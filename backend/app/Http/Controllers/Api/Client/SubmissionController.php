<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Models\SubmissionReply;
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

        $query = Submission::with(['category:id,name,name_en', 'attachments', 'replies.attachments'])
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
            'quote_calculation' => ($submission->quote_calculation && ($submission->quote_calculation['admin_validated'] ?? false)) ? $submission->quote_calculation : null,
            'admin_attachments' => $submission->attachments->where('source', 'admin')->map(fn ($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
            ])->values(),
            'replies_count'     => $submission->replies->count(),
            'unread_replies_count' => $submission->replies->whereNull('read_at')->count(),
            'replies'           => $submission->replies->map(fn ($r) => [
                'id'          => $r->id,
                'message'     => $r->message,
                'created_at'  => $r->created_at?->toIso8601String(),
                'is_read'     => $r->read_at !== null,
                'read_at'     => $r->read_at?->toIso8601String(),
                'attachments' => $r->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'original_name' => $a->original_name,
                    'mime_type'     => $a->mime_type,
                    'size'          => $a->size,
                ])->values(),
            ])->values(),
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

        $newAnswers = array_merge($submission->answers ?? [], $data['answers']);
        $updatePayload = ['answers' => $newAnswers];

        // Le calcul n'est pas automatique : il sera validé ou ajusté par l'administrateur.
        $submission->update($updatePayload);

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

    // Téléchargement sécurisé d'une pièce jointe appartenant au dossier du client
    public function downloadAttachment(Request $request, string $reference, int $attachmentId)
    {
        $submission = Submission::where('reference', strtoupper(trim($reference)))->firstOrFail();

        $user = $request->user();
        $userEmail = Str::lower(trim($user->email));
        $subEmail  = Str::lower(trim($submission->email));

        if ((int) $submission->user_id !== (int) $user->id && (empty($submission->user_id) && $subEmail !== $userEmail)) {
            abort(403, 'Accès refusé.');
        }

        $attachment = $submission->attachments()->findOrFail($attachmentId);

        if (! \Illuminate\Support\Facades\Storage::exists($attachment->path)) {
            abort(404, 'Fichier introuvable.');
        }

        return \Illuminate\Support\Facades\Storage::download($attachment->path, $attachment->original_name);
    }

    // Nombre de réponses non lues par le client connecté (pour le badge de la cloche)
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $subIds = Submission::where('user_id', $user->id)
            ->orWhereRaw('LOWER(TRIM(email)) = ?', [Str::lower(trim($user->email))])
            ->pluck('id');

        $unreadCount = SubmissionReply::whereIn('submission_id', $subIds)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $unreadCount]);
    }

    // Liste de toutes les notifications / réponses reçues pour l'ensemble des dossiers du client
    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();

        // Rattachement automatique si nécessaire
        Submission::where(function ($q) {
            $q->whereNull('user_id')->orWhere('user_id', 0);
        })
        ->whereRaw('LOWER(TRIM(email)) = ?', [Str::lower(trim($user->email))])
        ->update(['user_id' => $user->id]);

        $replies = SubmissionReply::with([
            'submission:id,reference,form_type,category_id',
            'submission.category:id,name,name_en',
            'attachments',
        ])
        ->whereHas('submission', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->latest()
        ->get()
        ->map(fn ($r) => [
            'id'                   => $r->id,
            'submission_reference' => $r->submission?->reference,
            'form_type'            => $r->submission?->form_type,
            'category'             => $r->submission?->category?->name,
            'category_en'          => $r->submission?->category?->name_en,
            'message'              => $r->message,
            'is_read'              => $r->read_at !== null,
            'read_at'              => $r->read_at?->toIso8601String(),
            'created_at'           => $r->created_at?->toIso8601String(),
            'attachments'          => $r->attachments->map(fn ($a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
            ])->values(),
        ]);

        return response()->json([
            'unread_count'  => $replies->where('is_read', false)->count(),
            'notifications' => $replies->values(),
        ]);
    }

    // Marquer une réponse individuelle comme lue
    public function markReplyRead(Request $request, int $replyId): JsonResponse
    {
        $user = $request->user();
        $reply = SubmissionReply::whereHas('submission', function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhereRaw('LOWER(TRIM(email)) = ?', [Str::lower(trim($user->email))]);
        })->findOrFail($replyId);

        $reply->markAsRead();

        return response()->json([
            'id'      => $reply->id,
            'is_read' => true,
            'read_at' => $reply->read_at?->toIso8601String(),
        ]);
    }

    // Marquer toutes les réponses d'un dossier comme lues
    public function markSubmissionRepliesRead(Request $request, string $reference): JsonResponse
    {
        $user = $request->user();
        $submission = Submission::where('reference', strtoupper(trim($reference)))
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereRaw('LOWER(TRIM(email)) = ?', [Str::lower(trim($user->email))]);
            })
            ->firstOrFail();

        $submission->replies()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'reference' => $submission->reference,
            'marked'    => true,
        ]);
    }
}
