<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SubmissionReply;
use App\Mail\SubmissionStatusChanged;
use App\Models\Attachment;
use App\Models\PricingRule;
use App\Models\Submission;
use App\Services\ClaimCompensationService;
use App\Services\PricingService;
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
        $submission->load(['category:id,name,slug,pricing_rule_id', 'attachments']);

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
            'category_id' => $submission->category_id,
            'category_slug' => $submission->category?->slug,
            'pricing_rule_id' => $submission->category?->pricing_rule_id,
            'type'        => $submission->form_type === 'claim'
                ? ($submission->answers['sinistre_type'] ?? null)
                : $submission->category?->name,
            'notes'            => $submission->notes,
            'rejection_reason' => $submission->rejection_reason,
            'created_at'       => $submission->created_at?->toIso8601String(),
            'processed_at'     => $submission->processed_at?->toIso8601String(),
            'taken_at'         => $submission->taken_at?->toIso8601String(),
            'closed_at'        => $submission->closed_at?->toIso8601String(),
            'quote_calculation' => $submission->quote_calculation,
            'answers'     => $answers,
            'raw_answers' => $stored,
            'attachments' => $submission->attachments->map(fn (Attachment $a) => [
                'id'            => $a->id,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
                'source'        => $a->source,
                'reply_id'      => $a->reply_id,
            ]),
            'replies'     => $submission->replies()->with('attachments')->latest()->get()->map(fn ($r) => [
                'id'         => $r->id,
                'message'    => $r->message,
                'created_at' => $r->created_at?->toIso8601String(),
                'attachments' => $r->attachments->map(fn ($a) => [
                    'id'            => $a->id,
                    'original_name' => $a->original_name,
                    'mime_type'     => $a->mime_type,
                    'size'          => $a->size,
                ])->values(),
            ])->values(),
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

        // Enregistrer la réponse dans la table submission_replies
        $reply = $submission->replies()->create([
            'user_id' => $request->user()?->id,
            'message' => $data['message'],
        ]);

        // Stocker les pièces jointes associées à cette réponse
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("admin-replies/{$submission->id}", 'local');
                $submission->attachments()->create([
                    'original_name' => $file->getClientOriginalName(),
                    'path'          => $path,
                    'mime_type'     => $file->getMimeType(),
                    'size'          => $file->getSize(),
                    'source'        => 'admin',
                    'reply_id'      => $reply->id,
                ]);
            }
        }

        // Si le statut est encore reçu ou en cours, passer à "answered" (Répondu)
        if (in_array($submission->status, ['received', 'in_progress'])) {
            $submission->update(['status' => 'answered']);
        }

        try {
            Mail::to($submission->email)->send(new SubmissionReply($submission, $data['message']));
        } catch (Throwable $e) {
            Log::error('Échec envoi réponse client', ['message' => $e->getMessage()]);

            return response()->json(['message' => "L'envoi de l'email a échoué mais la réponse a été enregistrée."], 500);
        }

        return response()->json([
            'message' => 'Réponse envoyée au client et enregistrée sur le dossier.',
            'reply'   => [
                'id'         => $reply->id,
                'message'    => $reply->message,
                'created_at' => $reply->created_at?->toIso8601String(),
            ],
        ]);
    }

    // Calcul / Indemnisation manuel déclenché par l'administrateur
    // L'admin peut choisir un algorithme, ajuster les paramètres et appliquer une réduction.
    public function calculateForSubmission(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            // Algorithme à utiliser : null = algorithme par défaut de la catégorie
            'pricing_rule_id'     => ['nullable', 'integer', 'exists:pricing_rules,id'],
            // Paramètres supplémentaires à passer à l'algorithme (ex: valeur vénale, devis expert…)
            'extra_params'        => ['nullable', 'array'],
            // Résultat brut fourni manuellement par l'admin (contourne le calcul algorithmique)
            'manual_montant_brut' => ['nullable', 'numeric', 'min:0'],
            'manual_franchise'    => ['nullable', 'numeric', 'min:0'],
            // Réduction appliquée par l'admin sur le résultat calculé ou manuel
            'reduction_percent'   => ['nullable', 'numeric', 'min:0', 'max:100'],
            'reduction_fixed'     => ['nullable', 'numeric', 'min:0'],
            // Note justificative de l'admin (apparaît dans le PDF)
            'admin_note'          => ['nullable', 'string', 'max:2000'],
            // Si true : juste prévisualiser sans sauvegarder
            'preview_only'        => ['nullable', 'boolean'],
        ]);

        $submission->loadMissing('category');
        $answers  = $submission->answers ?? [];
        $category = $submission->category;

        // ── 1. Choisir la règle de tarification ou la catégorie ─────────────
        /** @var PricingRule|null $rule */
        $rule = isset($data['pricing_rule_id'])
            ? PricingRule::find($data['pricing_rule_id'])
            : ($category?->pricingRule ?? null);

        $target = $rule ?? $category;

        // ── 2. Calculer ou utiliser le montant manuel ──────────────────────────
        $calculation = null;
        $extraParams = $data['extra_params'] ?? [];

        if (isset($data['manual_montant_brut'])) {
            // Mode entièrement manuel : l'admin saisit directement les montants
            $montantBrut = (float) $data['manual_montant_brut'];
            $franchise   = (float) ($data['manual_franchise'] ?? 0);

            if ($submission->form_type === 'quote') {
                $calculation = [
                    'has_calculation'      => true,
                    'driver'               => 'manual',
                    'rule_name'            => 'Tarification manuelle admin',
                    'prime_ttc'            => max(0, $montantBrut - $franchise),
                    'prime_ttc_formatted'  => number_format(max(0, $montantBrut - $franchise), 0, ',', ' ') . ' FCFA',
                    'notes_explicatives'   => 'Montant de prime défini manuellement par l\'administrateur.',
                ];
            } else {
                $indemnite = max(0, $montantBrut - $franchise);
                $calculation = [
                    'has_calculation'                 => true,
                    'driver'                          => 'manual',
                    'rule_name'                       => 'Évaluation manuelle admin',
                    'montant_brut'                    => $montantBrut,
                    'montant_brut_formatted'          => number_format($montantBrut, 0, ',', ' ') . ' FCFA',
                    'franchise'                       => $franchise,
                    'franchise_formatted'             => number_format($franchise, 0, ',', ' ') . ' FCFA',
                    'indemnisation_estimee'           => $indemnite,
                    'indemnisation_estimee_formatted' => number_format($indemnite, 0, ',', ' ') . ' FCFA',
                    'notes_explicatives'              => 'Montant d\'indemnisation défini manuellement par l\'administrateur.',
                ];
            }
        } elseif ($target || $submission->form_type) {
            // Mode algorithmique : calcul via le service approprié
            try {
                if ($submission->form_type === 'claim' || ($rule && str_starts_with($rule->driver ?? '', 'sinistre_'))) {
                    $claimService = app(ClaimCompensationService::class);
                    $calculation  = $claimService->calculate($target, array_merge($answers, $extraParams));
                } else {
                    $pricingService = app(PricingService::class);
                    $calculation    = $pricingService->calculate($target, array_merge($answers, $extraParams));
                }
            } catch (Throwable $e) {
                Log::warning('Échec calcul admin pour soumission', [
                    'submission_id' => $submission->id,
                    'rule_id'       => $rule?->id,
                    'message'       => $e->getMessage(),
                ]);
                return response()->json([
                    'message' => 'Le calcul a échoué : ' . $e->getMessage(),
                ], 422);
            }
        } else {
            return response()->json([
                'message' => 'Aucun algorithme disponible pour cette catégorie. Veuillez choisir une règle ou saisir un montant manuel.',
            ], 422);
        }

        if (! $calculation) {
            return response()->json([
                'message' => 'Le calcul n\'a retourné aucun résultat.',
            ], 422);
        }

        // ── 3. Appliquer la réduction éventuelle ──────────────────────────────
        $reductionPercent = (float) ($data['reduction_percent'] ?? 0);
        $reductionFixed   = (float) ($data['reduction_fixed'] ?? 0);

        if ($reductionPercent > 0 || $reductionFixed > 0) {
            // Pour les devis : réduction sur prime_ttc
            // Pour les sinistres : réduction sur indemnisation_estimee
            if (isset($calculation['indemnisation_estimee'])) {
                $base    = (float) $calculation['indemnisation_estimee'];
                $reduced = $base * (1 - $reductionPercent / 100) - $reductionFixed;
                $reduced = max(0, $reduced);
                $calculation['indemnisation_estimee']           = $reduced;
                $calculation['indemnisation_estimee_formatted'] = number_format($reduced, 0, ',', ' ') . ' FCFA';
                $calculation['reduction_applied_percent']       = $reductionPercent;
                $calculation['reduction_applied_fixed']         = $reductionFixed;
            } elseif (isset($calculation['prime_ttc'])) {
                $base    = (float) $calculation['prime_ttc'];
                $reduced = $base * (1 - $reductionPercent / 100) - $reductionFixed;
                $reduced = max(0, $reduced);
                $calculation['prime_ttc']           = $reduced;
                $calculation['prime_ttc_formatted'] = number_format($reduced, 0, ',', ' ') . ' FCFA';
                $calculation['reduction_applied_percent'] = $reductionPercent;
                $calculation['reduction_applied_fixed']   = $reductionFixed;
            }
        }

        // ── 4. Ajouter la note admin au résultat ──────────────────────────────
        if (! empty($data['admin_note'])) {
            $calculation['admin_note']             = $data['admin_note'];
            $calculation['notes_explicatives']     = ($calculation['notes_explicatives'] ?? '') . ' — ' . $data['admin_note'];
        }

        // Marquer comme validé par l'administrateur
        $calculation['admin_validated'] = true;
        $calculation['admin_rule_id']   = $rule?->id;
        $calculation['admin_rule_name'] = $rule?->name ?? 'Évaluation manuelle';

        // ── 5. Sauvegarder ou juste prévisualiser ─────────────────────────────
        if (! ($data['preview_only'] ?? false)) {
            $submission->update(['quote_calculation' => $calculation]);
        }

        return response()->json([
            'message'           => ($data['preview_only'] ?? false)
                ? 'Prévisualisation du calcul (non sauvegardé).'
                : 'Calcul validé et sauvegardé sur le dossier.',
            'quote_calculation' => $calculation,
            'preview_only'      => (bool) ($data['preview_only'] ?? false),
        ]);
    }

    // Réinitialiser le calcul d'un dossier (remettre quote_calculation à null)
    public function resetCalculation(Submission $submission): JsonResponse
    {
        $submission->update(['quote_calculation' => null]);

        return response()->json([
            'message' => 'Calcul réinitialisé. Le dossier n\'a plus de tarification validée.',
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