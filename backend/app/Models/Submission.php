<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Submission extends Model
{
    protected $fillable = [
        'reference', 'category_id', 'user_id', 'form_type',
        'email', 'status', 'notes', 'rejection_reason', 'answers', 'form_snapshot', 'quote_calculation',
    ];

    protected $casts = [
        'answers'           => 'array',
        'form_snapshot'     => 'array',
        'quote_calculation' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Submission $submission) {
            if (! $submission->reference) {
                $submission->reference = static::generateReference($submission->form_type ?? 'claim');
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