<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SubmissionStatusChanged;
use App\Models\Attachment;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AdminSubmissionController extends Controller
{
    private const STATUSES = ['received', 'in_progress', 'answered', 'closed'];

    // Liste paginée, avec filtres : status, form_type, category, q (référence ou email)
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status'    => ['nullable', Rule::in(self::STATUSES)],
            'form_type' => ['nullable', 'in:claim,quote'],
            'category'  => ['nullable', 'string', 'exists:categories,slug'],
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

        $page = $query->paginate(15)->withQueryString()->through(fn (Submission $s) => [
            'id'                => $s->id,
            'reference'         => $s->reference,
            'form_type'         => $s->form_type,
            'status'            => $s->status,
            'email'             => $s->email,
            'category'          => $s->category?->name,
            'attachments_count' => $s->attachments_count,
            'created_at'        => $s->created_at?->toIso8601String(),
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
            'created_at'  => $submission->created_at?->toIso8601String(),
            'answers'     => $answers,
            'attachments' => $submission->attachments->map(fn (Attachment $a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
            ]),
        ]);
    }

    // Changement de statut : received, in_progress, answered, closed
    public function updateStatus(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $submission->update(['status' => $data['status']]);

        // Notification au client du changement de statut
        try {
            Mail::to($submission->email)->send(new SubmissionStatusChanged($submission));
        } catch (Throwable $e) {
            Log::error('Échec envoi email de changement de statut', ['message' => $e->getMessage()]);
        }

        return response()->json([
            'id'     => $submission->id,
            'status' => $submission->status,
        ]);
    }

    // Téléchargement d'une pièce jointe (jamais accessible sans jeton)
    public function download(Attachment $attachment): StreamedResponse
    {
        if (! Storage::exists($attachment->path)) {
            abort(404, 'Fichier introuvable.');
        }

        return Storage::download($attachment->path, $attachment->original_name);
    }
}