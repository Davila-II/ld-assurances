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
        'email', 'status', 'answers', 'form_snapshot',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }
}