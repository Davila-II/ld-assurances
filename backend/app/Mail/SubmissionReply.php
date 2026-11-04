<?php

namespace App\Mail;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Submission $submission, public string $body)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Réponse de LD Assurances - {$this->submission->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.submission-reply');
    }
}
