<?php

namespace App\Mail;

use App\Models\Submission;
use App\Services\SubmissionPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
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

    /**
     * Pièces jointes : le PDF de la soumission (même PDF que celui envoyé au client).
     */
    public function attachments(): array
    {
        try {
            $pdfContent = app(SubmissionPdfService::class)->generate($this->submission);
            $filename   = $this->submission->reference . '.pdf';

            return [
                Attachment::fromData(fn () => $pdfContent, $filename)
                    ->withMime('application/pdf'),
            ];
        } catch (\Throwable) {
            return [];
        }
    }
}
