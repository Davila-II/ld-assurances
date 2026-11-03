<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attachment extends Model
{
    protected $fillable = ['submission_id', 'original_name', 'path', 'mime_type', 'size'];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }
}