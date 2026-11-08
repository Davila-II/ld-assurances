<?php

namespace App\Services;

use App\Models\Submission;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class SubmissionPdfService
{
    /**
     * Génère le récépissé officiel PDF d'une soumission et retourne son contenu binaire.
     */
    public function generate(Submission $submission): string
    {
        $submission->loadMissing(['category', 'attachments']);

        $data = $this->prepareViewData($submission);

        $pdf = Pdf::loadView('pdf.submission', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled'      => false,
                'defaultFont'          => 'DejaVu Sans',
                'dpi'                  => 150,
            ]);

        $pdf->render();

        // Ajout du pied de page officiel sur chaque page (LD ASSURANCES SA + pagination)
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font = $fontMetrics->getFont('DejaVu Sans', 'normal');
        $canvas->page_text(42.5, 812, 'LD ASSURANCES SA — Document généré électroniquement', $font, 7, [0.4, 0.47, 0.54]);
        $canvas->page_text(525, 812, 'Page {PAGE_NUM}', $font, 7, [0.4, 0.47, 0.54]);
        $canvas->line(42.5, 804, 552.5, 804, [0.84, 0.88, 0.91], 0.5);

        return $pdf->output();
    }

    /**
     * Prépare et structure l'ensemble des données pour un rendu irréprochable.
     */
    public function prepareViewData(Submission $submission): array
    {
        $submission->loadMissing(['category', 'attachments']);

        $company = config('company', [
            'name'            => 'LD ASSURANCES SA',
            'tagline'         => 'Assurément Proche de Vous',
            'legal'           => 'Société Anonyme au capital de 5 000 000 000 FCFA entièrement libéré | Agréée par arrêté N°0000815/MINFI du 15 NOV 2024',
            'address'         => 'Carrefour Arno, Akwa-Douala',
            'postal_box'      => 'B.P. 2854 – Douala – Cameroun',
            'phones'          => ['(+237) 640 65 67 93', '(+237) 233 43 99 24', '(+237) 233 42 51 82'],
            'emergency_phone' => '(+237) 640 65 67 93',
            'email'           => 'contact@ldassurances.cm',
            'website'         => 'www.ldassurances.cm',
            'agencies'        => 'Douala · Yaoundé · Bafoussam',
        ]);

        // Logos & Filigrane avec cascade de fallbacks garantissant la disponibilité des assets (JPEG prioritaire car nativement supporté par DomPDF sans extension GD)
        $logoBase64 = $this->resolveImageBase64([
            public_path('logo1.jpg'),
            resource_path('images/logo1.jpg'),
            base_path('../frontend/src/images/logo1.jpg'),
            config('company.logo_path'),
            public_path('logo-icon.jpg'),
            resource_path('images/logo-icon.jpg'),
            base_path('../frontend/dist/logo-icon.jpg'),
            public_path('logo1-tight.png'),
            public_path('logo1.png'),
            base_path('../frontend/src/images/logo1.png'),
        ]);

        $watermarkBase64 = $this->resolveImageBase64([
            config('company.watermark_path'),
            public_path('logo-watermark.jpg'),
            resource_path('images/logo-watermark.jpg'),
            public_path('logo1.jpg'),
            public_path('logo-icon.jpg'),
            resource_path('images/logo-icon.jpg'),
        ]) ?: $logoBase64;

        // Informations client
        $answers = $submission->answers ?? [];
        $clientName  = $answers['full_name']
            ?? $answers['nom_complet']
            ?? $answers['name']
            ?? $answers['nom']
            ?? 'Client';
        $clientEmail = $submission->email
            ?? $answers['email']
            ?? $answers['courriel']
            ?? 'Non renseigné';
        $clientPhone = $answers['phone']
            ?? $answers['telephone']
            ?? 'Non renseigné';
        $clientCity  = $answers['city']
            ?? $answers['ville']
            ?? 'Douala';

        $submittedAt = $submission->created_at ?? now();
        $dateFormatted  = Carbon::parse($submittedAt)->locale('fr')->translatedFormat('d F Y à H:i');
        $dateOnly       = Carbon::parse($submittedAt)->locale('fr')->translatedFormat('d/m/Y');
        $registeredDate = Carbon::parse($submittedAt)->locale('fr')->translatedFormat('d F Y');

        // Titre du document selon la nature
        $isQuote = ($submission->form_type === 'quote');
        $typeLabel = $isQuote
            ? 'Récépissé de Demande de Devis'
            : 'Récépissé de Déclaration de Sinistre';

        $docTitle = $isQuote
            ? 'RÉCÉPISSÉ DE DEMANDE DE DEVIS'
            : 'RÉCÉPISSÉ DE DÉCLARATION DE SINISTRE';

        $docSubTitle = $isQuote
            ? 'DEMANDE DE DEVIS D’ASSURANCE'
            : 'DÉCLARATION DE SINISTRE';

        $categoryName = $submission->category?->name ?? ($isQuote ? 'Santé' : 'Automobile');

        // Statut réel & mise en forme
        $statusInfo = $this->resolveStatusInfo($submission->status ?? 'received', $submission->form_type ?? 'quote');

        // Organisation & formatage fiable des données du formulaire
        $sections = $this->buildSections($submission);

        // Liste des pièces jointes transmises
        $attachments = $this->buildAttachmentsList($submission);

        // Tarification calculée du devis — uniquement si validée par l'administrateur
        // (quote_calculation doit exister ET contenir admin_validated = true)
        $quoteCalculation = null;
        $rawCalc = $submission->quote_calculation;
        if ($rawCalc && isset($rawCalc['admin_validated']) && $rawCalc['admin_validated'] === true) {
            $quoteCalculation = $rawCalc;
        }
        // Note : on ne recalcule plus automatiquement ici.

        // Textes d'accompagnement conformes aux maquettes officielles de LD ASSURANCES SA
        $greetingText = $isQuote
            ? "Bonjour {$clientName}, votre demande de devis a bien été transmise à LD ASSURANCES SA. Voici le récapitulatif des informations communiquées."
            : "Bonjour {$clientName}, votre déclaration de sinistre a été enregistrée sur la plateforme de LD ASSURANCES SA. Ce document récapitule les informations transmises.";

        $nextStepsText = $isQuote
            ? "Un conseiller pourra examiner votre demande et vous contacter pour la suite du traitement. Des informations ou pièces complémentaires pourront être demandées."
            : "Votre déclaration sera examinée par les services compétents. Un gestionnaire pourra vous contacter si des informations ou justificatifs supplémentaires sont nécessaires. Conservez cette référence pour vos échanges.";

        $legalNoticeText = $isQuote
            ? "Ce récépissé confirme uniquement la réception et l'enregistrement de votre demande de devis. Il ne constitue ni un devis tarifaire, ni une acceptation du risque, ni un contrat d'assurance, ni une attestation de garantie."
            : "Ce récépissé confirme la réception technique de votre déclaration et des pièces transmises. Il ne constitue ni une reconnaissance de responsabilité, ni une acceptation de garantie, ni une décision d'indemnisation. La suite du dossier dépend de son examen et des dispositions applicables à votre contrat.";

        $contactLabel = $isQuote ? "Besoin d'aide ?" : "Contact :";
        $policyNumber = $answers['policy_number'] ?? $answers['numero_police'] ?? $answers['police'] ?? null;

        return [
            'submission'       => $submission,
            'company'          => $company,
            'isQuote'          => $isQuote,
            'typeLabel'        => $typeLabel,
            'docTitle'         => $docTitle,
            'docSubTitle'      => $docSubTitle,
            'categoryName'     => $categoryName,
            'clientName'       => $clientName,
            'clientEmail'      => $clientEmail,
            'clientPhone'      => $clientPhone,
            'clientCity'       => $clientCity,
            'dateFormatted'    => $dateFormatted,
            'dateOnly'         => $dateOnly,
            'registeredDate'   => $registeredDate,
            'statusInfo'       => $statusInfo,
            'greetingText'     => $greetingText,
            'nextStepsText'    => $nextStepsText,
            'legalNoticeText'  => $legalNoticeText,
            'contactLabel'     => $contactLabel,
            'policyNumber'     => $policyNumber,
            'sections'         => $sections,
            'attachments'      => $attachments,
            'quoteCalculation' => $quoteCalculation,
            'logoBase64'       => $logoBase64,
            'watermarkBase64'  => $watermarkBase64,
        ];
    }

    /**
     * Résout l'image en base64 à partir d'une liste ordonnée de chemins candidats.
     */
    private function resolveImageBase64(array $candidatePaths): string
    {
        foreach ($candidatePaths as $path) {
            if ($path && is_string($path) && file_exists($path) && is_readable($path)) {
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                $mime = in_array($ext, ['png']) ? 'image/png' : 'image/jpeg';
                $content = file_get_contents($path);
                if ($content !== false && strlen($content) > 0) {
                    return 'data:' . $mime . ';base64,' . base64_encode($content);
                }
            }
        }

        return '';
    }

    /**
     * Structure la liste des pièces jointes avec métadonnées professionnelles.
     */
    private function buildAttachmentsList(Submission $submission): array
    {
        $rawAttachments = $submission->relationLoaded('attachments')
            ? $submission->attachments
            : $submission->attachments()->get();

        if ($rawAttachments->isEmpty()) {
            return [];
        }

        return $rawAttachments->map(function ($att) {
            $bytes = (int) ($att->size ?? 0);
            $sizeFormatted = $bytes >= 1048576
                ? number_format($bytes / 1048576, 2, ',', ' ') . ' Mo'
                : number_format(max(1, round($bytes / 1024, 1)), 1, ',', ' ') . ' Ko';

            $mime = strtolower((string) ($att->mime_type ?? ''));
            $name = $att->original_name ?? 'Pièce justificative';
            $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

            $badge = 'DOC';
            $badgeColor = '#334155';
            $badgeBg = '#f1f5f9';
            $badgeBorder = '#cbd5e1';
            $typeLabel = 'Document joint';

            if (str_contains($mime, 'pdf') || $ext === 'pdf') {
                $badge = 'PDF';
                $badgeColor = '#b91c1c';
                $badgeBg = '#fee2e2';
                $badgeBorder = '#fca5a5';
                $typeLabel = 'Document PDF';
            } elseif (str_contains($mime, 'image') || in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $badge = 'IMAGE';
                $badgeColor = '#0369a1';
                $badgeBg = '#e0f2fe';
                $badgeBorder = '#bae6fd';
                $typeLabel = 'Fichier image (' . strtoupper($ext ?: 'JPG') . ')';
            }

            return [
                'id'             => $att->id,
                'name'           => $name,
                'size'           => $bytes,
                'size_formatted' => $sizeFormatted,
                'badge'          => $badge,
                'badge_color'    => $badgeColor,
                'badge_bg'       => $badgeBg,
                'badge_border'   => $badgeBorder,
                'type_label'     => $typeLabel,
            ];
        })->values()->all();
    }

    /**
     * Résout l'état métier exact de la demande sans inventer de transition automatique.
     */
    private function resolveStatusInfo(string $status, string $formType): array
    {
        $isQuote = ($formType === 'quote');

        return match ($status) {
            'received' => [
                'code'        => 'received',
                'label'       => $isQuote ? 'Demande reçue' : 'Déclaration reçue',
                'badge'       => $isQuote ? 'DEMANDE REÇUE' : 'DÉCLARATION REÇUE',
                'status_line' => $isQuote ? 'Demande reçue — en attente de traitement' : "Déclaration reçue — en attente d'examen",
                'description' => $isQuote
                    ? 'Votre demande de devis a été enregistrée avec succès. Elle est en attente d’attribution à un conseiller commercial.'
                    : 'Votre déclaration de sinistre a été enregistrée avec succès. Elle est transmise au service d’indemnisation.',
                'color'       => '#1e40af',
                'bg'          => '#dbeafe',
                'border'      => '#93c5fd',
                'manager'     => 'En attente de prise en charge par le service gestionnaire',
            ],
            'in_progress' => [
                'code'        => 'in_progress',
                'label'       => $isQuote ? 'En cours de traitement' : 'En cours d’instruction',
                'badge'       => $isQuote ? 'EN COURS DE TRAITEMENT' : 'EN COURS D\'INSTRUCTION',
                'status_line' => $isQuote ? 'En cours de traitement — analyse technique' : "En cours d'instruction technique",
                'description' => $isQuote
                    ? 'Votre dossier est actuellement en cours d’analyse technique et d’évaluation par notre service souscription.'
                    : 'Votre dossier de sinistre est en cours d’instruction technique par nos gestionnaires.',
                'color'       => '#b45309',
                'bg'          => '#fef3c7',
                'border'      => '#fcd34d',
                'manager'     => 'Dossier assigné et en cours d’analyse par notre équipe',
            ],
            'answered' => [
                'code'        => 'answered',
                'label'       => $isQuote ? 'Devis disponible' : 'Réponse transmise',
                'badge'       => $isQuote ? 'DEVIS DISPONIBLE' : 'RÉPONSE TRANSMISE',
                'status_line' => $isQuote ? 'Devis disponible — proposition commerciale prête' : "Réponse officielle transmise au souscripteur",
                'description' => $isQuote
                    ? 'L’étude de votre dossier est finalisée. Votre proposition commerciale et tarifaire personnalisée est prête.'
                    : 'Une réponse officielle ou une proposition de prise en charge vous a été communiquée par nos services.',
                'color'       => '#15803d',
                'bg'          => '#dcfce7',
                'border'      => '#86efac',
                'manager'     => $isQuote ? 'Proposition de devis finalisée et transmise' : 'Réponse officielle transmise au souscripteur',
            ],
            'closed' => [
                'code'        => 'closed',
                'label'       => 'Dossier clôturé',
                'badge'       => 'DOSSIER CLÔTURÉ',
                'status_line' => 'Dossier clôturé et archivé',
                'description' => 'Le traitement de ce dossier est achevé et archivé dans notre système.',
                'color'       => '#475569',
                'bg'          => '#f1f5f9',
                'border'      => '#cbd5e1',
                'manager'     => 'Dossier clôturé dans le système de gestion',
            ],
            'rejected' => [
                'code'        => 'rejected',
                'label'       => $isQuote ? 'Non retenu' : 'Rejeté / Non garanti',
                'badge'       => $isQuote ? 'NON RETENU' : 'REJETÉ / NON GARANTI',
                'status_line' => $isQuote ? 'Demande non retenue' : 'Dossier rejeté / non garanti',
                'description' => $isQuote
                    ? 'Cette demande n’a pas pu recevoir de suite favorable au vu des critères de souscription.'
                    : 'Les dommages ou circonstances déclarés ne sont pas couverts au titre des garanties souscrites.',
                'color'       => '#b91c1c',
                'bg'          => '#fee2e2',
                'border'      => '#fca5a5',
                'manager'     => 'Dossier non retenu par le service de souscription',
            ],
            default => [
                'code'        => $status,
                'label'       => ucfirst($status),
                'badge'       => strtoupper($status),
                'status_line' => ucfirst($status),
                'description' => 'État de traitement enregistré : ' . $status,
                'color'       => '#0c2340',
                'bg'          => '#f1f5f9',
                'border'      => '#cbd5e1',
                'manager'     => 'En cours de suivi',
            ],
        };
    }

    /**
     * Construit les sections du formulaire en évitant les champs non applicables
     * et en formatant avec précision les types de données (monnaies, dates, nombres, etc.).
     */
    private function buildSections(Submission $submission): array
    {
        $snapshot = $submission->form_snapshot ?? [];
        $answers  = $submission->answers ?? [];

        // Si aucun snapshot n'est enregistré (données directes), on génère une section unique
        if (empty($snapshot)) {
            $fields = [];
            foreach ($answers as $key => $val) {
                // Ignore les champs réservés redondants avec l'en-tête client
                if (in_array($key, ['full_name', 'phone', 'city', 'email', 'website'])) {
                    continue;
                }
                $fieldMeta = [
                    'name'       => $key,
                    'label'      => ucfirst(str_replace('_', ' ', $key)),
                    'field_type' => is_numeric($val) ? 'number' : (is_array($val) ? 'multiselect' : 'text'),
                ];
                $formatted = $this->formatFieldValue($fieldMeta, $val, $answers);
                if ($formatted !== null) {
                    $fields[] = $formatted;
                }
            }

            return !empty($fields) ? [['name' => 'Informations Déclarées', 'fields' => $fields]] : [];
        }

        // Regroupement par section en respectant les conditions d'affichage
        $sections = [];

        foreach ($snapshot as $field) {
            $name = $field['name'] ?? '';

            // Écarte les questions conditionnelles dont la condition parent n'est pas remplie
            if (!empty($field['condition'])) {
                $condField  = $field['condition']['field'] ?? null;
                $condEquals = $field['condition']['equals'] ?? null;
                if ($condField && (!isset($answers[$condField]) || (string) $answers[$condField] !== (string) $condEquals)) {
                    continue; // Cette question n'était pas applicable au client
                }
            }

            $rawVal = $answers[$name] ?? null;
            $formatted = $this->formatFieldValue($field, $rawVal, $answers);

            // Si le champ est facultatif et complètement vide, on l'omet s'il n'apporte rien
            if ($formatted === null) {
                continue;
            }

            $secName = trim($field['section'] ?? '') ?: 'Informations Générales';
            if (!isset($sections[$secName])) {
                $sections[$secName] = [
                    'name'   => $secName,
                    'fields' => [],
                ];
            }

            $sections[$secName]['fields'][] = $formatted;
        }

        // Filtrer les sections qui n'ont aucun champ affiché
        return array_values(array_filter($sections, fn ($s) => !empty($s['fields'])));
    }

    /**
     * Formate avec précision une valeur selon son type métier réel.
     */
    private function formatFieldValue(array $field, mixed $value, array $allAnswers): ?array
    {
        $name      = strtolower($field['name'] ?? '');
        $label     = $field['label'] ?? ucfirst(str_replace('_', ' ', $name));
        $fieldType = $field['field_type'] ?? 'text';

        // Champ non renseigné
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            // Si le champ est obligatoire ou important, on affiche "Non renseigné"
            if (!empty($field['is_required'])) {
                return [
                    'name'         => $name,
                    'label'        => $label,
                    'type'         => 'empty',
                    'formatted'    => 'Non renseigné',
                    'is_multiline' => false,
                ];
            }
            // Sinon champ facultatif vide : omis pour ne pas surcharger inutilement
            return null;
        }

        // 1. Fichiers : traités à part via la relation attachments
        if ($fieldType === 'file') {
            return null;
        }

        // 2. Budget / Montant monétaire en FCFA
        if ($this->isCurrencyField($name, $label, $fieldType)) {
            $numeric = (float) preg_replace('/[^\d.]/', '', (string) $value);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'currency',
                'formatted'    => number_format($numeric, 0, ',', ' ') . ' FCFA',
                'is_multiline' => false,
            ];
        }

        // 3. Superficie (m²)
        if ($name === 'surface' || str_contains(strtolower($label), 'm²') || str_contains(strtolower($label), 'superficie')) {
            $numeric = (float) preg_replace('/[^\d.]/', '', (string) $value);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'unit',
                'formatted'    => number_format($numeric, 0, ',', ' ') . ' m²',
                'is_multiline' => false,
            ];
        }

        // 4. Puissance fiscale (CV)
        if ($name === 'fiscal_power' || str_contains(strtolower($label), '(cv)')) {
            $numeric = (int) preg_replace('/[^\d]/', '', (string) $value);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'unit',
                'formatted'    => $numeric . ' CV',
                'is_multiline' => false,
            ];
        }

        // 5. Nombres entiers stricts (Personnes, pièces, collaborateurs, années...)
        // GARANTIE : Ne jamais transformer 1 ou 0 en "OUI" ou "NON" !
        if ($fieldType === 'number' || $this->isCountField($name, $label)) {
            $numeric = (int) preg_replace('/[^\d-]/', '', (string) $value);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'number',
                'formatted'    => number_format($numeric, 0, ',', ' '),
                'is_multiline' => false,
            ];
        }

        // 6. Case à cocher booléenne stricte (field_type = checkbox)
        if ($fieldType === 'checkbox') {
            $isTrue = in_array($value, [true, 1, '1', 'true', 'on', 'Oui'], true);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'boolean',
                'formatted'    => $isTrue ? 'Oui' : 'Non',
                'is_yes'       => $isTrue,
                'is_multiline' => false,
            ];
        }

        // 7. Choix Oui / Non (Select)
        if (is_string($value) && in_array(strtolower(trim($value)), ['oui', 'non', 'yes', 'no'])) {
            $isYes = in_array(strtolower(trim($value)), ['oui', 'yes']);
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'boolean',
                'formatted'    => $isYes ? 'Oui' : 'Non',
                'is_yes'       => $isYes,
                'is_multiline' => false,
            ];
        }

        // 8. Dates (formatées en français)
        if ($fieldType === 'date' || (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($value)))) {
            try {
                $formattedDate = Carbon::parse($value)->locale('fr')->translatedFormat('d F Y');
            } catch (\Throwable) {
                $formattedDate = (string) $value;
            }
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'date',
                'formatted'    => $formattedDate,
                'is_multiline' => false,
            ];
        }

        // 9. Choix multiples (Tableaux)
        if (is_array($value)) {
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'list',
                'formatted'    => $value,
                'is_multiline' => false,
            ];
        }

        // 10. Textes longs (Textarea / descriptions)
        if ($fieldType === 'textarea' || strlen((string) $value) > 70 || str_contains((string) $value, "\n")) {
            return [
                'name'         => $name,
                'label'        => $label,
                'type'         => 'text',
                'formatted'    => (string) $value,
                'is_multiline' => true,
            ];
        }

        // 11. Texte standard
        return [
            'name'         => $name,
            'label'        => $label,
            'type'         => 'text',
            'formatted'    => (string) $value,
            'is_multiline' => false,
        ];
    }

    /**
     * Détecte si le champ représente un montant monétaire.
     */
    private function isCurrencyField(string $name, string $label, string $type): bool
    {
        $currencyKeys = [
            'budget', 'building_value', 'contents_value', 'content_value',
            'estimated_value', 'turnover', 'annual_income', 'capital', 'salary',
        ];

        if (in_array($name, $currencyKeys)) {
            return true;
        }

        $lowerLabel = strtolower($label);

        return str_contains($lowerLabel, 'fcfa')
            || str_contains($lowerLabel, 'budget')
            || str_contains($lowerLabel, 'chiffre d’affaires')
            || str_contains($lowerLabel, 'chiffre d\'affaires')
            || str_contains($lowerLabel, 'valeur estimée');
    }

    /**
     * Détecte si le champ représente un décompte/nombre de personnes ou d'éléments.
     */
    private function isCountField(string $name, string $label): bool
    {
        $countKeys = [
            'people_count', 'travelers_count', 'employees_count',
            'rooms', 'claims_count', 'first_reg_year',
        ];

        if (in_array($name, $countKeys)) {
            return true;
        }

        $lower = strtolower($label);

        return str_contains($lower, 'nombre de')
            || str_contains($lower, 'pièces')
            || str_contains($lower, 'collaborateurs')
            || str_contains($lower, 'voyageurs');
    }
}
