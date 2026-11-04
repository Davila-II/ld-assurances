<?php

namespace App\Mail;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminNewSubmission extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Submission $submission)
    {
    }

    public function envelope(): Envelope
    {
        $type = $this->submission->form_type === 'claim' ? 'sinistre' : 'devis';

        return new Envelope(subject: "Nouvelle demande ({$type}) - {$this->submission->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-new-submission');
    }
}
