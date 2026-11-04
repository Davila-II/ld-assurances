<?php

namespace App\Mail;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Submission $submission)
    {
    }

    public function envelope(): Envelope
    {
        $subject = $this->submission->form_type === 'claim'
            ? 'Votre déclaration de sinistre a bien été reçue'
            : 'Votre demande de devis a bien été reçue';

        return new Envelope(subject: $subject . ' - ' . $this->submission->reference);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.submission-received');
    }
}