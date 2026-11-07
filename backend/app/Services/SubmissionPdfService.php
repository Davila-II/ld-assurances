<?php

namespace App\Services;

use App\Models\Submission;
use Barryvdh\DomPDF\Facade\Pdf;

class SubmissionPdfService
{
    /**
     * Génère le PDF de confirmation d'une soumission et retourne son contenu binaire.
     */
    public function generate(Submission $submission): string
    {
        $submission->loadMissing('category');

        $logoPath   = public_path('logo-icon.png');
        $logoBase64 = file_exists($logoPath)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : '';

        $typeLabel = $submission->form_type === 'claim'
            ? 'Déclaration de sinistre'
            : 'Demande de devis';

        $pdf = Pdf::loadView('pdf.submission', compact(
            'submission',
            'typeLabel',
            'logoBase64',
        ))
        ->setPaper('a4', 'portrait')
        ->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
            'defaultFont'          => 'DejaVu Sans',
            'dpi'                  => 150,
        ]);

        return $pdf->output();
    }
}
