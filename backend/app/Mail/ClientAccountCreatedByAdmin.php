<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientAccountCreatedByAdmin extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $plainPassword,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos identifiants d’accès à votre espace client — LD Assurances'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.client-account-created-by-admin'
        );
    }
}
