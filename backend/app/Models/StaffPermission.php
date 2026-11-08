<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class StaffPermission extends Model
{
    protected $fillable = ['key', 'name', 'name_en', 'group', 'description'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(StaffRole::class, 'staff_role_permissions', 'permission_id', 'role_id');
    }
}
