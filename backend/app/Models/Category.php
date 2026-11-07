<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['name', 'name_en', 'slug', 'form_type', 'pricing_rule_id', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function pricingRule(): BelongsTo
    {
        return $this->belongsTo(PricingRule::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(FormField::class)->orderBy('sort_order');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }
}
