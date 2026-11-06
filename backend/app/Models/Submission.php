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
        'email', 'status', 'notes', 'rejection_reason', 'answers', 'form_snapshot',
    ];

    protected $casts = [
        'answers'       => 'array',
        'form_snapshot' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Submission $submission) {
            if (! $submission->reference) {
                $prefix = $submission->form_type === 'claim' ? 'SIN' : 'DEV';
                $submission->reference = $prefix . '-' . now()->format('Y') . '-' . strtoupper(Str::random(6));
            }
        });
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