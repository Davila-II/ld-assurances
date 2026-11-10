<?php

namespace App\Jobs;

use App\Mail\StaffRoleAssigned;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendStaffRoleEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre de tentatives max.
     */
    public int $tries = 2;

    /**
     * Timeout du job (en secondes).
     */
    public int $timeout = 20;

    public function __construct(
        public User $user,
        public StaffRole $role,
        public string $plainPassword,
        public bool $isNewAccount,
    ) {}

    public function handle(): void
    {
        try {
            Mail::to($this->user->email)
                ->send(new StaffRoleAssigned($this->user, $this->role, $this->plainPassword, $this->isNewAccount));
        } catch (\Throwable $e) {
            Log::warning('SendStaffRoleEmail: échec envoi email', [
                'user'  => $this->user->email,
                'error' => $e->getMessage(),
            ]);

            // On ne relance pas l'exception pour éviter les retries inutiles
            // si le SMTP est mal configuré.
        }
    }
}
