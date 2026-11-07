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

        $logoPath        = public_path('logo-icon.jpg');
        $watermarkPath   = public_path('logo-watermark.jpg');

        $logoBase64      = file_exists($logoPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($logoPath))
            : '';

        $watermarkBase64 = file_exists($watermarkPath)
            ? 'data:image/jpeg;base64,' . base64_encode(file_get_contents($watermarkPath))
            : $logoBase64;

        $typeLabel = $submission->form_type === 'claim'
            ? 'Déclaration de sinistre'
            : 'Demande de devis';

        $pdf = Pdf::loadView('pdf.submission', compact(
            'submission',
            'typeLabel',
            'logoBase64',
            'watermarkBase64',
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
