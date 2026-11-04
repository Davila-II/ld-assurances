<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormField extends Model
{
    protected $fillable = [
        'category_id', 'form_type', 'label', 'placeholder', 'section', 'name', 'field_type',
        'is_required', 'options', 'condition', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'options'     => 'array',
        'condition'   => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}