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

    /**
     * Pièces jointes : le PDF de confirmation de la soumission.
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
            // Si la génération du PDF échoue, l'email part quand même sans pièce jointe
            return [];
        }
    }
}
