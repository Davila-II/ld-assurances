<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Str;

class ClaimCompensationService
{
    /**
     * Calcule l'estimation de l'indemnisation pour un sinistre selon les règles CIMA / Marché Camerounais.
     */
    public function calculate(Category|string|null $target, array $answers): ?array
    {
        $slug = '';
        if ($target instanceof Category) {
            $slug = $target->slug;
        } elseif (is_string($target)) {
            $slug = $target;
        }

        // Harmonisation du slug ou type
        $slug = strtolower($slug);
        if ($slug === '' && !empty($answers['sinistre_type'])) {
            $slug = Str::slug((string) $answers['sinistre_type']);
        }

        $result = null;

        if (str_contains($slug, 'auto')) {
            $result = $this->calculateAuto($answers);
        } elseif (str_contains($slug, 'habitation')) {
            $result = $this->calculateHabitation($answers);
        } elseif (str_contains($slug, 'sante')) {
            $result = $this->calculateSante($answers);
        } elseif (str_contains($slug, 'rc') || str_contains($slug, 'responsabilite')) {
            $result = $this->calculateRc($answers);
        } elseif (str_contains($slug, 'professionnelle') || str_contains($slug, 'entreprise')) {
            $result = $this->calculateProfessionnelle($answers);
        } elseif (str_contains($slug, 'voyage') || str_contains($slug, 'transport')) {
            $result = $this->calculateTransportVoyage($answers);
        } elseif (str_contains($slug, 'agricole')) {
            $result = $this->calculateAgricole($answers);
        } else {
            $result = $this->calculateAutres($answers);
        }

        if (!$result) {
            return null;
        }

        $indemnisation = max(0, (float) ($result['indemnisation_estimee'] ?? 0));
        $franchise = max(0, (float) ($result['franchise'] ?? 0));
        $montantBrut = max(0, (float) ($result['montant_brut'] ?? $indemnisation + $franchise));

        $formattedBreakdown = array_map(function ($item) {
            $amt = (float) ($item['amount'] ?? 0);
            return array_merge($item, [
                'formatted' => number_format($amt, 0, ',', ' ') . ' FCFA',
            ]);
        }, $result['breakdown'] ?? []);

        return array_merge([
            'has_calculation'                  => true,
            'type'                             => 'claim',
            'currency'                         => 'FCFA',
            'regle_appliquee'                  => $result['regle_appliquee'] ?? 'Barème CIMA / Convention Cameroun',
            'regle_appliquee_en'               => $result['regle_appliquee_en'] ?? 'CIMA Code / Cameroon Convention',
            'montant_brut'                     => $montantBrut,
            'montant_brut_formatted'           => number_format($montantBrut, 0, ',', ' ') . ' FCFA',
            'franchise'                        => $franchise,
            'franchise_formatted'              => number_format($franchise, 0, ',', ' ') . ' FCFA',
            'indemnisation_estimee'            => $indemnisation,
            'indemnisation_estimee_formatted'  => number_format($indemnisation, 0, ',', ' ') . ' FCFA',
            'prime_ttc'                        => $indemnisation,
            'prime_ttc_formatted'              => number_format($indemnisation, 0, ',', ' ') . ' FCFA',
            'notes_explicatives'               => $result['notes_explicatives'] ?? null,
            'notes_explicatives_en'            => $result['notes_explicatives_en'] ?? null,
            'breakdown'                        => $formattedBreakdown,
        ], $result);
    }

    /**
     * 1. Sinistre Automobile (Convention IDA Cameroun & Formules)
     */
    private function calculateAuto(array $answers): array
    {
        // Données d'entrée extraites du formulaire ou saisies
        $devisExpert = (float) ($answers['devis_expert'] ?? $answers['estimated_value'] ?? $answers['cout_devis_expert'] ?? 0);
        $valeurVenale = (float) ($answers['valeur_venale'] ?? $answers['vehicle_value'] ?? 3000000);
        $garantie = (string) ($answers['type_garantie'] ?? $answers['garantie'] ?? 'Tous_Risques');
        $responsabilite = (string) ($answers['choc_responsabilite'] ?? $answers['responsabilite'] ?? '0%_Responsable');

        // Cas par défaut si valeurs non renseignées : si un constat/IDA est coché
        $isIda = !empty($answers['ida_convention']);
        if ($devisExpert <= 0) {
            $devisExpert = 500000; // estimation plancher indicative
        }

        $franchise = 0;
        $indemnisation = 0;
        $motif = '';
        $motifEn = '';

        if (stripos($garantie, 'Vol') !== false) {
            // Vol de Véhicule : valeur vénale - franchise 10%
            $franchise = $valeurVenale * 0.10;
            $indemnisation = max(0, $valeurVenale - $franchise);
            $motif = "Vol de véhicule : Indemnisation sur la base de la valeur vénale au jour du sinistre avec franchise légale de 10%.";
            $motifEn = "Vehicle theft: Compensation based on market value on incident day with mandatory 10% deductible.";
        } elseif (stripos($garantie, 'Tiers') !== false && stripos($responsabilite, '100%') !== false) {
            // Tiers et 100% responsable : RC uniquement pour le tiers
            $indemnisation = 0;
            $franchise = 0;
            $motif = "Garantie Tiers avec responsabilité 100% : Les dommages matériels du véhicule assuré ne sont pas couverts.";
            $motifEn = "Third-Party warranty with 100% fault: Own vehicle property damage is not covered.";
        } elseif (stripos($responsabilite, '0%') !== false || $isIda) {
            // 0% Responsable (Convention IDA) : Remboursement intégral du devis
            $franchise = 0;
            $indemnisation = $devisExpert;
            $motif = "Convention IDA (0% Responsable) : Prise en charge intégrale des réparations validées.";
            $motifEn = "Direct Settlement (0% fault): Full coverage of certified repair estimate.";
        } elseif (stripos($responsabilite, '50%') !== false) {
            // 50% Responsable : partage 50% et franchise 10% de la valeur ou min 50 000
            $franchise = max(50000, $valeurVenale * 0.05);
            $indemnisation = max(0, ($devisExpert / 2) - $franchise);
            $motif = "Partage des responsabilités (50%) : Moitié du montant du devis déduction faite de la franchise.";
            $motifEn = "Shared fault (50%): Half of repair estimate minus deductible.";
        } else {
            // 100% Responsable Tous Risques : devis - franchise fixe
            $franchise = 75000;
            $indemnisation = max(0, $devisExpert - $franchise);
            $motif = "Formule Tous Risques : Prise en charge des réparations avec déduction de la franchise contractuelle (75 000 FCFA).";
            $motifEn = "Comprehensive coverage: Repairs covered minus contractual deductible (75,000 FCFA).";
        }

        return [
            'regle_appliquee'       => 'Convention IDA & Code CIMA (Automobile)',
            'regle_appliquee_en'    => 'IDA Convention & CIMA Code (Motor)',
            'montant_brut'          => $devisExpert,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $indemnisation,
            'notes_explicatives'    => $motif,
            'notes_explicatives_en' => $motifEn,
            'breakdown'             => [
                ['label' => 'Estimation des réparations / valeur', 'label_en' => 'Repair estimate / market value', 'amount' => $devisExpert],
                ['label' => 'Franchise contractuelle / légale', 'label_en' => 'Contractual / legal deductible', 'amount' => -$franchise],
                ['label' => 'Indemnité nette prévisionnelle', 'label_en' => 'Net estimated indemnity', 'amount' => $indemnisation],
            ],
        ];
    }

    /**
     * 2. Sinistre Habitation (Règle proportionnelle - Article 32 Code CIMA)
     */
    private function calculateHabitation(array $answers): array
    {
        $degats = (float) ($answers['estimated_value'] ?? $answers['montant_degats_expert'] ?? 1000000);
        $valeurDeclaree = (float) ($answers['valeur_declaree_contrat'] ?? 15000000);
        $valeurReelle = (float) ($answers['valeur_reelle_biens'] ?? 15000000);
        $franchise = (float) ($answers['franchise_contractuelle'] ?? 50000);

        if ($valeurReelle > 0 && $valeurDeclaree < $valeurReelle) {
            // Sous-assurance : application de l'article 32 CIMA
            $taux = $valeurDeclaree / $valeurReelle;
            $dommageRetenu = $degats * $taux;
            $note = sprintf("Application de l'Art. 32 Code CIMA (Règle proportionnelle de capitaux) : Taux d'indemnisation de %.1f%%.", $taux * 100);
            $noteEn = sprintf("Application of Art. 32 CIMA Code (Proportional rule): Compensation rate of %.1f%%.", $taux * 100);
        } else {
            $dommageRetenu = $degats;
            $note = "Bien couvert à 100% de sa valeur réelle : Pas de réduction proportionnelle.";
            $noteEn = "Property insured at full value: No proportional reduction applied.";
        }

        $indemnisation = max(0, $dommageRetenu - $franchise);

        return [
            'regle_appliquee'       => 'Article 32 du Code CIMA (Règle Proportionnelle)',
            'regle_appliquee_en'    => 'Article 32 CIMA Code (Average / Proportional Rule)',
            'montant_brut'          => $dommageRetenu,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $indemnisation,
            'notes_explicatives'    => $note,
            'notes_explicatives_en' => $noteEn,
            'breakdown'             => [
                ['label' => 'Montant des dommages constatés', 'label_en' => 'Assessed damage amount', 'amount' => $degats],
                ['label' => 'Dommage retenu (après règle proportionnelle)', 'label_en' => 'Retained damage (after average rule)', 'amount' => $dommageRetenu],
                ['label' => 'Franchise contractuelle', 'label_en' => 'Contractual deductible', 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 3. Santé & Corporel (Tiers-Payant et Barème CIMA Incapacité)
     */
    private function calculateSante(array $answers): array
    {
        $facture = (float) ($answers['facture_clinique_agreee'] ?? $answers['medical_expenses'] ?? 250000);
        $tauxCouverture = (float) ($answers['taux_couverture'] ?? 80);
        $plafondRestant = (float) ($answers['plafond_annuel_restant'] ?? 2000000);
        $isAccidentCorporel = !empty($answers['injured']) && $answers['injured'] === 'Oui';
        $tauxIpp = (float) ($answers['taux_ipp'] ?? 0);

        $partAssurance = $facture * ($tauxCouverture / 100);
        if ($partAssurance > $plafondRestant) {
            $partAssurance = $plafondRestant;
        }

        $indemniteCorporelle = 0;
        if ($isAccidentCorporel && $tauxIpp > 0) {
            $capitalBaseCima = 2000000;
            $indemniteCorporelle = $capitalBaseCima * ($tauxIpp / 100);
        }

        $total = $partAssurance + $indemniteCorporelle;
        $ticketModerateur = max(0, $facture - $partAssurance);

        return [
            'regle_appliquee'       => 'Barème Frais Médicaux & Incapacité CIMA (Santé)',
            'regle_appliquee_en'    => 'Medical Expenses & CIMA Disability Schedule (Health)',
            'montant_brut'          => $facture + $indemniteCorporelle,
            'franchise'             => $ticketModerateur,
            'indemnisation_estimee' => $total,
            'notes_explicatives'    => "Prise en charge à {$tauxCouverture}% dans le réseau de soins agréé + barème invalidité CIMA si applicable.",
            'notes_explicatives_en' => "{$tauxCouverture}% network medical coverage + CIMA disability table if applicable.",
            'breakdown'             => [
                ['label' => 'Frais médicaux / hospitalisation', 'label_en' => 'Medical / hospitalization fees', 'amount' => $facture],
                ['label' => 'Part prise en charge par l\'assurance', 'label_en' => 'Insurance covered portion', 'amount' => $partAssurance],
                ['label' => 'Ticket modérateur (reste à charge)', 'label_en' => 'Co-payment (out-of-pocket)', 'amount' => -$ticketModerateur],
                ['label' => 'Indemnité d\'incapacité corporelle CIMA', 'label_en' => 'CIMA bodily injury compensation', 'amount' => $indemniteCorporelle],
            ],
        ];
    }

    /**
     * 4. Sinistre Professionnel (Perte d'exploitation selon états financiers OHADA)
     */
    private function calculateProfessionnelle(array $answers): array
    {
        $caN1 = (float) ($answers['chiffre_affaires_n_moins_1'] ?? 50000000);
        $caSinistre = (float) ($answers['chiffre_affaires_sinistre'] ?? 30000000);
        $tauxMarge = (float) ($answers['taux_marge_brute'] ?? 0.30);
        $chargesFixes = (float) ($answers['charges_fixes_permanentes'] ?? $answers['business_value'] ?? 2000000);

        $perteCa = max(0, $caN1 - $caSinistre);
        $perteMarge = $perteCa * $tauxMarge;
        $indemnisationBrute = $perteMarge + $chargesFixes;

        // Franchise 3 jours sur 30 jours (10%)
        $franchise = $indemnisationBrute * (3 / 30);
        $net = max(0, $indemnisationBrute - $franchise);

        return [
            'regle_appliquee'       => 'Pertes d\'Exploitation & Charges Permanentes (Normes OHADA)',
            'regle_appliquee_en'    => 'Business Interruption & Standing Charges (OHADA Standards)',
            'montant_brut'          => $indemnisationBrute,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $net,
            'notes_explicatives'    => "Calcul basé sur la baisse de marge brute certifiée et le maintien des charges fixes, déduction faite de la franchise de 3 jours.",
            'notes_explicatives_en' => "Calculated based on gross margin loss and continuing fixed expenses, minus 3 days franchise.",
            'breakdown'             => [
                ['label' => 'Baisse de marge brute d\'exploitation', 'label_en' => 'Operating gross margin drop', 'amount' => $perteMarge],
                ['label' => 'Prise en charge des charges fixes (salaires, loyers)', 'label_en' => 'Standing charges coverage (wages, rent)', 'amount' => $chargesFixes],
                ['label' => 'Franchise contractuelle (3 jours d\'activité)', 'label_en' => 'Contractual waiting period (3 days)', 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 5. Responsabilité Civile (Indemnisation intégrale du tiers lésé)
     */
    private function calculateRc(array $answers): array
    {
        $devisTiers = (float) ($answers['devis_reparation_tiers'] ?? $answers['estimated_value'] ?? 800000);
        $franchiseAssure = (float) ($answers['franchise_assure'] ?? 50000);

        return [
            'regle_appliquee'       => 'Code CIMA - Responsabilité Civile (Réparation Intégrale)',
            'regle_appliquee_en'    => 'CIMA Code - Third Party Liability (Full Restitution)',
            'montant_brut'          => $devisTiers,
            'franchise'             => $franchiseAssure,
            'indemnisation_estimee' => $devisTiers, // le tiers reçoit 100%
            'notes_explicatives'    => "Indemnisation versée à 100% au tiers victime. La franchise contractuelle est régularisée auprès de l'assuré.",
            'notes_explicatives_en' => "100% paid directly to third-party victim. Contractual deductible collected from policyholder.",
            'breakdown'             => [
                ['label' => 'Montant certifié du préjudice tiers', 'label_en' => 'Certified third party claim amount', 'amount' => $devisTiers],
                ['label' => 'Indemnité intégrale versée au tiers', 'label_en' => 'Full indemnity paid to victim', 'amount' => $devisTiers],
                ['label' => 'Franchise à la charge de l\'assuré', 'label_en' => 'Deductible payable by insured', 'amount' => -$franchiseAssure],
            ],
        ];
    }

    /**
     * 6. Transport & Voyage (Maritime, Terrestre et Aérien)
     */
    private function calculateTransportVoyage(array $answers): array
    {
        $valeurFacture = (float) ($answers['cargo_value'] ?? $answers['valeur_facture_marchandise'] ?? 1500000);
        $fret = (float) ($answers['cout_fret'] ?? 150000);
        $typeTransport = (string) ($answers['type_transport'] ?? 'Terrestre_National');
        $poidsPerdu = (float) ($answers['poids_perdu_kg'] ?? 0);

        if (stripos($typeTransport, 'Aerien') !== false && $poidsPerdu > 0) {
            $plafondParKg = 13500; // équivalent DTS en FCFA
            $indemnisation = $poidsPerdu * $plafondParKg;
            $montantBrut = $indemnisation;
            $franchise = 0;
            $note = "Convention internationale transport aérien : Plafond légal de 13 500 FCFA par kilogramme de bagage perdu.";
            $noteEn = "International air convention: Legal cap of 13,500 FCFA per kg of lost luggage.";
        } else {
            $montantBrut = $valeurFacture + $fret;
            $franchise = $montantBrut * 0.05; // 5% franchise avarie transport
            $indemnisation = max(0, $montantBrut - $franchise);
            $note = "Transport Terrestre / Maritime : Valeur marchande déclarée majorée des frais de fret proratisés.";
            $noteEn = "Inland / Sea Transit: Declared invoice value plus prorated freight costs.";
        }

        return [
            'regle_appliquee'       => 'Conventions de Transport & Code CIMA (Transit Marchandises)',
            'regle_appliquee_en'    => 'Transport Conventions & CIMA Code (Cargo & Transit)',
            'montant_brut'          => $montantBrut,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $indemnisation,
            'notes_explicatives'    => $note,
            'notes_explicatives_en' => $noteEn,
            'breakdown'             => [
                ['label' => 'Valeur déclarée des marchandises / bagages', 'label_en' => 'Declared cargo / luggage value', 'amount' => $valeurFacture],
                ['label' => 'Frais de transport & fret admissibles', 'label_en' => 'Eligible transport & freight costs', 'amount' => $fret],
                ['label' => 'Franchise contractuelle transport', 'label_en' => 'Contractual transport deductible', 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 7. Sinistre Agricole (Pertes de récoltes & aléas climatiques)
     */
    private function calculateAgricole(array $answers): array
    {
        $superficie = (float) ($answers['superficie_hectares'] ?? 5);
        $rendementMoyen = (float) ($answers['rendement_moyen_historique'] ?? 2.5); // tonnes/ha
        $prixMarche = (float) ($answers['prix_marquet_cameroun'] ?? 250000); // FCFA/tonne
        $tauxPerte = (float) ($answers['taux_perte_expert'] ?? 70); // % de perte

        $productionAttendue = $superficie * $rendementMoyen;
        $valeurRecolte = $productionAttendue * $prixMarche;
        $indemnisationBrute = $valeurRecolte * ($tauxPerte / 100);
        $franchise = $indemnisationBrute * 0.15; // 15% franchise indicielle agricole
        $net = max(0, $indemnisationBrute - $franchise);

        return [
            'regle_appliquee'       => 'Assurance Agricole Indicielle & Pertes de Récolte',
            'regle_appliquee_en'    => 'Agricultural Index Insurance & Harvest Loss',
            'montant_brut'          => $indemnisationBrute,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $net,
            'notes_explicatives'    => "Calcul du déficit de rendement par rapport à l'historique de production avec franchise indicielle de 15%.",
            'notes_explicatives_en' => "Calculated on yield loss vs historical benchmark with 15% index deductible.",
            'breakdown'             => [
                ['label' => 'Valeur financière de la récolte attendue', 'label_en' => 'Expected crop market value', 'amount' => $valeurRecolte],
                ['label' => 'Perte brute évaluée (' . $tauxPerte . '%)', 'label_en' => 'Assessed gross loss (' . $tauxPerte . '%)', 'amount' => $indemnisationBrute],
                ['label' => 'Franchise agricole (15%)', 'label_en' => 'Agricultural deductible (15%)', 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 8. Autres Sinistres (ex : Assurance Scolaire / Plafonds)
     */
    private function calculateAutres(array $answers): array
    {
        $frais = (float) ($answers['frais_medicaux_eleve'] ?? $answers['estimated_value'] ?? 150000);
        $plafond = (float) ($answers['plafond_garantie_scolaire'] ?? 500000);

        $indemnisation = min($frais, $plafond);
        $excedent = max(0, $frais - $plafond);

        return [
            'regle_appliquee'       => 'Garantie Individuelle Accidents & Prévoyance Scolaire',
            'regle_appliquee_en'    => 'Personal Accident & School Insurance Policy',
            'montant_brut'          => $frais,
            'franchise'             => $excedent,
            'indemnisation_estimee' => $indemnisation,
            'notes_explicatives'    => "Prise en charge intégrale des frais médicaux dans la limite du plafond garanti contractuel (500 000 FCFA).",
            'notes_explicatives_en' => "Full coverage of medical expenses up to the contractual policy limit (500,000 FCFA).",
            'breakdown'             => [
                ['label' => 'Total des frais réels engagés', 'label_en' => 'Total actual expenses incurred', 'amount' => $frais],
                ['label' => 'Montant indemnisé (dans la limite du plafond)', 'label_en' => 'Indemnified amount (within limit)', 'amount' => $indemnisation],
                ['label' => 'Dépassement de plafond éventuel', 'label_en' => 'Limit excess (if any)', 'amount' => -$excedent],
            ],
        ];
    }
}
