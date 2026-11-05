<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
        public int $minutes = 15,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre code de vérification - LD Assurances');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.verification-code');
    }
}