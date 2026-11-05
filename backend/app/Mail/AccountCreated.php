<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public ?string $loginUrl = null,
    ) {
        $this->loginUrl = $loginUrl ?? rtrim((string) config('frontend.url', 'http://localhost:5173'), '/') . '/espace-client';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address', 'no-reply@ldassurances.cm'), 'LD Assurance'),
            subject: 'Confirmation de la création de votre compte - LD Assurances',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.account-created');
    }
}
