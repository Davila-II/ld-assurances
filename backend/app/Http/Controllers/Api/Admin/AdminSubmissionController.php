<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SubmissionReply;
use App\Mail\SubmissionStatusChanged;
use App\Models\Attachment;
use App\Models\Submission;
use App\Services\SubmissionPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AdminSubmissionController extends Controller
{
    private const STATUSES = ['received', 'in_progress', 'answered', 'closed', 'rejected'];

    // Liste paginée, avec filtres : status, form_type, category, q (référence ou email)
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status'    => ['nullable', Rule::in(self::STATUSES)],
            'form_type' => ['nullable', 'in:claim,quote'],
            'category'  => ['nullable', 'string', 'exists:categories,slug'],
            'type'      => ['nullable', 'string', 'max:100'],
            'q'         => ['nullable', 'string', 'max:100'],
        ]);

        $query = Submission::with('category:id,name,slug')
            ->withCount('attachments')
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('form_type')) {
            $query->where('form_type', $request->input('form_type'));
        }

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->input('category')));
        }

        if ($request->filled('q')) {
            $term = $request->input('q');
            $query->where(function ($q) use ($term) {
                $q->where('reference', 'like', "%{$term}%")
                  ->orWhere('email', 'like', "%{$term}%");
            });
        }

        // Filtre par type de sinistre (champ stocké dans les réponses)
        if ($request->filled('type')) {
            $query->where('form_type', 'claim')
                ->where('answers->sinistre_type', $request->input('type'));
        }

        $page = $query->paginate(15)->withQueryString()->through(fn (Submission $s) => [
            'id'                => $s->id,
            'reference'         => $s->reference,
            'form_type'         => $s->form_type,
            'status'            => $s->status,
            'email'             => $s->email,
            'category'          => $s->category?->name,
            'type'              => $s->form_type === 'claim'
                ? ($s->answers['sinistre_type'] ?? null)
                : $s->category?->name,
            'attachments_count' => $s->attachments_count,
            'created_at'        => $s->created_at?->toIso8601String(),
            'processed_at'      => $s->processed_at?->toIso8601String(),
            'taken_at'          => $s->taken_at?->toIso8601String(),
            'closed_at'         => $s->closed_at?->toIso8601String(),
        ]);

        return response()->json($page);
    }

    // Détail d'une déclaration : réponses lisibles (avec les questions d'origine) et pièces jointes
    public function show(Submission $submission): JsonResponse
    {
        $submission->load(['category:id,name,slug', 'attachments']);

        $stored = $submission->answers ?? [];

        $answers = collect($submission->form_snapshot ?? [])
            ->reject(fn (array $field) => $field['field_type'] === 'file')
            ->map(fn (array $field) => [
                'label' => $field['label'],
                'type'  => $field['field_type'],
                'value' => $stored[$field['name']] ?? null,
            ])
            ->values();

        return response()->json([
            'id'          => $submission->id,
            'reference'   => $submission->reference,
            'form_type'   => $submission->form_type,
            'status'      => $submission->status,
            'email'       => $submission->email,
            'category'    => $submission->category?->name,
            'type'        => $submission->form_type === 'claim'
                ? ($submission->answers['sinistre_type'] ?? null)
                : $submission->category?->name,
            'notes'            => $submission->notes,
            'rejection_reason' => $submission->rejection_reason,
            'created_at'       => $submission->created_at?->toIso8601String(),
            'processed_at'     => $submission->processed_at?->toIso8601String(),
            'taken_at'         => $submission->taken_at?->toIso8601String(),
            'closed_at'        => $submission->closed_at?->toIso8601String(),
            'answers'     => $answers,
            'attachments' => $submission->attachments->map(fn (Attachment $a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
            ]),
        ]);
    }

    // Changement de statut : received, in_progress, answered, closed, rejected
    // Règle : on ne peut pas revenir à un statut de rang inférieur
    public function updateStatus(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'status'           => ['required', Rule::in(self::STATUSES)],
            'rejection_reason' => [
                Rule::requiredIf($request->input('status') === 'rejected'),
                'nullable',
                'string',
                'max:2000',
            ],
        ], [
            'rejection_reason.required' => 'Le motif du rejet est obligatoire pour rejeter un dossier.',
        ]);

        $newStatus  = $data['status'];
        $oldStatus  = $submission->status;
        $rankMap    = Submission::STATUS_RANK;
        $currentRank = $rankMap[$oldStatus] ?? 0;
        $newRank     = $rankMap[$newStatus] ?? 0;

        // Bloquer tout retour en arrière dans la hiérarchie
        if ($newRank < $currentRank) {
            return response()->json([
                'message' => "Impossible de repasser le statut de « {$submission->statusLabel()} » à un statut antérieur.",
            ], 422);
        }

        $submission->update([
            'status'           => $newStatus,
            'rejection_reason' => $newStatus === 'rejected'
                ? ($data['rejection_reason'] ?? null)
                : null,
        ]);

        // Notification au client du changement de statut
        try {
            Mail::to($submission->email)->send(new SubmissionStatusChanged($submission));
        } catch (Throwable $e) {
            Log::error('Échec envoi email de changement de statut', ['message' => $e->getMessage()]);
        }

        return response()->json([
            'id'               => $submission->id,
            'status'           => $submission->status,
            'rejection_reason' => $submission->rejection_reason,
            'taken_at'         => $submission->taken_at?->toIso8601String(),
            'closed_at'        => $submission->closed_at?->toIso8601String(),
        ]);
    }

    // Statistiques du tableau de bord
    public function stats(): JsonResponse
    {
        return response()->json([
            'total'        => Submission::count(),
            'by_status'    => Submission::selectRaw('status, count(*) as total')
                ->groupBy('status')->pluck('total', 'status'),
            'by_form_type' => Submission::selectRaw('form_type, count(*) as total')
                ->groupBy('form_type')->pluck('total', 'form_type'),
            'recent'       => Submission::with('category:id,name')
                ->latest()->take(5)->get()->map(fn (Submission $s) => [
                    'id'         => $s->id,
                    'reference'  => $s->reference,
                    'form_type'  => $s->form_type,
                    'status'     => $s->status,
                    'category'   => $s->category?->name,
                    'created_at' => $s->created_at?->toIso8601String(),
                ])->values(),
        ]);
    }

    // Observations internes (non visibles par le client)
    public function updateNotes(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $submission->update(['notes' => $data['notes']]);

        return response()->json([
            'id'    => $submission->id,
            'notes' => $submission->notes,
        ]);
    }

    // Réponse envoyée par email au client (avec pièces jointes optionnelles)
    public function reply(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'message'      => ['required', 'string', 'max:5000'],
            'attachments'  => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:20480'], // 20 Mo max par fichier
        ]);

        // Stocker les pièces jointes de la réponse admin dans storage/app/admin-replies/
        $replyFiles = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("admin-replies/{$submission->id}", 'local');
                $replyFiles[] = [
                    'path'          => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type'     => $file->getMimeType(),
                    'size'          => $file->getSize(),
                ];
            }
        }

        try {
            Mail::to($submission->email)->send(new SubmissionReply($submission, $data['message']));
        } catch (Throwable $e) {
            Log::error('Échec envoi réponse client', ['message' => $e->getMessage()]);

            return response()->json(['message' => "L'envoi de l'email a échoué."], 500);
        }

        return response()->json(['message' => 'Réponse envoyée au client.']);
    }

    // Téléchargement d'une pièce jointe (jamais accessible sans jeton)
    public function download(Attachment $attachment): StreamedResponse
    {
        if (! Storage::exists($attachment->path)) {
            abort(404, 'Fichier introuvable.');
        }

        return Storage::download($attachment->path, $attachment->original_name);
    }

    // Téléchargement du PDF de confirmation de la soumission (admin)
    public function downloadPdf(Submission $submission): Response
    {
        $submission->loadMissing(['category', 'attachments']);

        try {
            $pdfContent = app(SubmissionPdfService::class)->generate($submission);
        } catch (Throwable $e) {
            Log::error('Échec génération PDF', ['message' => $e->getMessage()]);
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