<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Submission extends Model
{
    // Ordre hiérarchique des statuts (du plus bas au plus haut)
    public const STATUS_RANK = [
        'received'    => 1,
        'in_progress' => 2,
        'answered'    => 3,
        'closed'      => 4,
        'rejected'    => 4, // même niveau que closed (terminal)
    ];

    protected $fillable = [
        'reference', 'category_id', 'user_id', 'form_type',
        'email', 'status', 'answers', 'form_snapshot', 'quote_calculation',
        'notes', 'rejection_reason', 'processed_at', 'taken_at', 'closed_at',
    ];

    protected $casts = [
        'answers'           => 'array',
        'form_snapshot'     => 'array',
        'quote_calculation' => 'array',
        'processed_at'      => 'datetime',
        'taken_at'          => 'datetime',
        'closed_at'         => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Submission $submission) {
            if (! $submission->reference) {
                $submission->reference = static::generateReference($submission->form_type ?? 'claim');
            }
        });

        // Enregistrement automatique des dates de changement de statut :
        // 1. Date reçue : created_at (automatique par Laravel)
        // 2. Date de prise en charge : taken_at (dès passage à "in_progress")
        // 3. Date de traitement : processed_at (dès passage à "closed" ou "rejected")
        static::updating(function (Submission $submission) {
            if (! $submission->isDirty('status')) {
                return;
            }

            $new = $submission->status;

            // taken_at : passage à "in_progress" (date de prise en charge)
            if ($new === 'in_progress' && $submission->taken_at === null) {
                $submission->taken_at = now();
            }

            // processed_at : passage à "closed" ou "rejected" (date de traitement final)
            if (in_array($new, ['closed', 'rejected']) && $submission->processed_at === null) {
                $submission->processed_at = now();
            }

            // closed_at reste synchronisé si nécessaire
            if (in_array($new, ['closed', 'rejected']) && $submission->closed_at === null) {
                $submission->closed_at = now();
            }
        });
    }

    // Génère une référence uniforme et séquentielle : LD-DS-0001-DDMMYYYY ou LD-DV-0001-DDMMYYYY
    public static function generateReference(string $formType): string
    {
        $prefix = $formType === 'claim' ? 'LD-DS' : 'LD-DV';
        $date = now()->format('dmY');

        $pattern = "{$prefix}-%-{$date}";

        $latestRef = static::where('reference', 'LIKE', $pattern)
            ->orderBy('id', 'desc')
            ->value('reference');

        $nextSeq = 1;
        if ($latestRef && preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)-' . $date . '$/', $latestRef, $matches)) {
            $nextSeq = (int) $matches[1] + 1;
        }

        do {
            $candidate = sprintf('%s-%04d-%s', $prefix, $nextSeq, $date);
            $exists = static::where('reference', $candidate)->exists();
            if ($exists) {
                $nextSeq++;
            }
        } while ($exists);

        return $candidate;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // Libellé français du statut
    public function statusLabel(): string
    {
        return match ($this->status) {
            'received'    => 'Reçu',
            'in_progress' => 'En cours',
            'answered'    => 'Répondu',
            'closed'      => 'Clôturé',
            'rejected'    => 'Rejeté',
            default       => $this->status,
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }
}