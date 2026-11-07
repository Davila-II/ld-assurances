<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormField extends Model
{
    protected $fillable = [
        'category_id',
        'form_type',
        'label',
        'label_en',
        'placeholder',
        'placeholder_en',
        'section',
        'section_en',
        'name',
        'field_type',
        'is_required',
        'options',
        'options_en',
        'condition',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'options'     => 'array',
        'options_en'  => 'array',
        'condition'   => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
