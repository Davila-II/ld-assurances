<?php

namespace App\Mail;

use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffRoleAssigned extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public StaffRole $role,
        public string $plainPassword,
        public bool $isNewAccount,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos accès collaborateur LD Assurances — Rôle ' . $this->role->name
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff-role-assigned'
        );
    }
}
