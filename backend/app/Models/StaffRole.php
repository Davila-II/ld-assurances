<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class StaffRole extends Model
{
    protected $fillable = ['name', 'name_en', 'slug', 'description', 'is_system', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(StaffPermission::class, 'staff_role_permissions', 'role_id', 'permission_id');
    }

    public function users(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(User::class, 'staff_role_id');
    }

    public function hasPermission(string $key): bool
    {
        return $this->permissions->contains('key', $key);
    }
}
