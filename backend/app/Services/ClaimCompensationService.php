<?php

namespace App\Services;

use App\Models\Category;
use App\Models\PricingRule;
use Illuminate\Support\Str;

class ClaimCompensationService
{
    /**
     * Résout la règle d'indemnisation de sinistre à partir d'une catégorie, d'une règle ou d'un slug.
     */
    public function resolvePricingRule(Category|PricingRule|string|null $target): ?PricingRule
    {
        if ($target instanceof PricingRule) {
            return $target;
        }

        if ($target instanceof Category) {
            if ($target->pricing_rule_id) {
                return PricingRule::find($target->pricing_rule_id);
            }
            return PricingRule::where('code', $target->slug)
                ->orWhere('code', str_replace('-', '_', $target->slug))
                ->orWhere('driver', $target->slug)
                ->orWhere('driver', str_replace('-', '_', $target->slug))
                ->first();
        }

        if (is_string($target)) {
            $cat = Category::where('slug', $target)->first();
            if ($cat && $cat->pricing_rule_id) {
                return PricingRule::find($cat->pricing_rule_id);
            }
            return PricingRule::where('code', $target)
                ->orWhere('code', str_replace('-', '_', $target))
                ->orWhere('driver', $target)
                ->orWhere('driver', str_replace('-', '_', $target))
                ->first();
        }

        return null;
    }

    /**
     * Calcule l'estimation de l'indemnisation pour un sinistre selon les règles CIMA / Marché Camerounais
     * configurées en base de données dans PricingRule.
     */
    public function calculate(Category|PricingRule|string|null $target, array $answers): ?array
    {
        $rule = $this->resolvePricingRule($target);
        $params = $rule?->parameters ?? [];

        $slug = '';
        if ($target instanceof Category) {
            $slug = $target->slug;
        } elseif ($target instanceof PricingRule) {
            $slug = $target->driver ?: $target->code;
        } elseif (is_string($target)) {
            $slug = $target;
        }

        if ($rule && $rule->driver) {
            $slug = $rule->driver;
        }

        // Harmonisation du slug ou type
        $slug = strtolower($slug);
        if ($slug === '' && !empty($answers['sinistre_type'])) {
            $slug = Str::slug((string) $answers['sinistre_type']);
        }

        $result = null;

        if (str_contains($slug, 'auto')) {
            $result = $this->calculateAuto($answers, $params);
        } elseif (str_contains($slug, 'habitation')) {
            $result = $this->calculateHabitation($answers, $params);
        } elseif (str_contains($slug, 'sante')) {
            $result = $this->calculateSante($answers, $params);
        } elseif (str_contains($slug, 'rc') || str_contains($slug, 'responsabilite')) {
            $result = $this->calculateRc($answers, $params);
        } elseif (str_contains($slug, 'professionnelle') || str_contains($slug, 'entreprise')) {
            $result = $this->calculateProfessionnelle($answers, $params);
        } elseif (str_contains($slug, 'voyage') || str_contains($slug, 'transport')) {
            $result = $this->calculateTransportVoyage($answers, $params);
        } elseif (str_contains($slug, 'agricole')) {
            $result = $this->calculateAgricole($answers, $params);
        } else {
            $result = $this->calculateAutres($answers, $params);
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
            'driver'                           => $rule?->driver ?: $slug,
            'rule_id'                          => $rule?->id,
            'rule_name'                        => $rule?->name,
            'currency'                         => 'FCFA',
            'regle_appliquee'                  => $result['regle_appliquee'] ?? ($rule?->name ?: 'Barème CIMA / Convention Cameroun'),
            'regle_appliquee_en'               => $result['regle_appliquee_en'] ?? ($rule?->name_en ?: 'CIMA Code / Cameroon Convention'),
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
    private function calculateAuto(array $answers, array $params = []): array
    {
        $defaultDevis = (float) ($params['default_devis_expert'] ?? 500000);
        $defaultValeur = (float) ($params['default_valeur_venale'] ?? 3000000);
        $franchiseVolRate = (float) ($params['franchise_vol_rate'] ?? 0.10);
        $franchiseTousRisques = (float) ($params['franchise_fixe_tous_risques'] ?? 75000);
        $franchisePartageRate = (float) ($params['franchise_partage_rate'] ?? 0.10);
        $franchisePartageMin = (float) ($params['franchise_partage_min'] ?? 50000);

        // Données d'entrée extraites du formulaire ou saisies
        $devisExpert = (float) ($answers['devis_expert'] ?? $answers['estimated_value'] ?? $answers['cout_devis_expert'] ?? 0);
        $valeurVenale = (float) ($answers['valeur_venale'] ?? $answers['vehicle_value'] ?? $defaultValeur);
        $garantie = (string) ($answers['type_garantie'] ?? $answers['garantie'] ?? 'Tous_Risques');
        $responsabilite = (string) ($answers['choc_responsabilite'] ?? $answers['responsabilite'] ?? '0%_Responsable');

        // Cas par défaut si valeurs non renseignées : si un constat/IDA est coché
        $isIda = !empty($answers['ida_convention']);
        if ($devisExpert <= 0) {
            $devisExpert = $defaultDevis;
        }

        $franchise = 0;
        $indemnisation = 0;
        $motif = '';
        $motifEn = '';

        $respUpper = strtoupper($responsabilite);
        $isFifty = str_contains($respUpper, '50%');
        $isHundred = str_contains($respUpper, '100%');
        $isZero = str_contains($respUpper, '0%') && ! $isFifty && ! $isHundred;

        if (stripos($garantie, 'Vol') !== false) {
            // Vol de Véhicule : valeur vénale - franchise %
            $franchise = $valeurVenale * $franchiseVolRate;
            $indemnisation = max(0, $valeurVenale - $franchise);
            $pct = round($franchiseVolRate * 100);
            $motif = "Vol de véhicule : Indemnisation sur la base de la valeur vénale au jour du sinistre avec franchise légale de {$pct}%.";
            $motifEn = "Vehicle theft: Compensation based on market value on incident day with mandatory {$pct}% deductible.";
        } elseif (stripos($garantie, 'Tiers') !== false && $isHundred) {
            // Tiers et 100% responsable : RC uniquement pour le tiers
            $indemnisation = 0;
            $franchise = 0;
            $motif = "Garantie Tiers avec responsabilité 100% : Les dommages matériels du véhicule assuré ne sont pas couverts.";
            $motifEn = "Third-Party warranty with 100% fault: Own vehicle property damage is not covered.";
        } elseif ($isFifty) {
            // 50% Responsable : partage 50% et franchise % de la valeur ou min FCFA
            $franchise = max($franchisePartageMin, $valeurVenale * $franchisePartageRate);
            $indemnisation = max(0, ($devisExpert / 2) - $franchise);
            $motif = "Partage des responsabilités (50%) : Moitié du montant du devis déduction faite de la franchise.";
            $motifEn = "Shared fault (50%): Half of repair estimate minus deductible.";
        } elseif ($isHundred) {
            // 100% Responsable Tous Risques : devis - franchise fixe
            $franchise = $franchiseTousRisques;
            $indemnisation = max(0, $devisExpert - $franchise);
            $fmtFranchise = number_format($franchiseTousRisques, 0, ',', ' ');
            $motif = "Formule Tous Risques : Prise en charge des réparations avec déduction de la franchise contractuelle ({$fmtFranchise} FCFA).";
            $motifEn = "Comprehensive coverage: Repairs covered minus contractual deductible ({$fmtFranchise} FCFA).";
        } else {
            // 0% Responsable (Convention IDA) : Remboursement intégral du devis
            $franchise = 0;
            $indemnisation = $devisExpert;
            $motif = "Convention IDA (0% Responsable) : Prise en charge intégrale des réparations validées.";
            $motifEn = "Direct Settlement (0% fault): Full coverage of certified repair estimate.";
        }

        $montantBrut = $isFifty ? ($devisExpert / 2) : (stripos($garantie, 'Vol') !== false ? $valeurVenale : $devisExpert);

        return [
            'regle_appliquee'       => 'Convention IDA & Code CIMA (Automobile)',
            'regle_appliquee_en'    => 'IDA Convention & CIMA Code (Motor)',
            'montant_brut'          => $montantBrut,
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
    private function calculateHabitation(array $answers, array $params = []): array
    {
        $defaultFranchise = (float) ($params['default_franchise_contractuelle'] ?? 50000);
        $defaultDegats = (float) ($params['default_degats'] ?? 1000000);
        $defaultValeurReelle = (float) ($params['default_valeur_reelle'] ?? 15000000);

        $degats = (float) ($answers['estimated_value'] ?? $answers['montant_degats_expert'] ?? $defaultDegats);
        $valeurDeclaree = (float) ($answers['valeur_declaree_contrat'] ?? $defaultValeurReelle);
        $valeurReelle = (float) ($answers['valeur_reelle_biens'] ?? $defaultValeurReelle);
        $franchise = (float) ($answers['franchise_contractuelle'] ?? $defaultFranchise);

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
    private function calculateSante(array $answers, array $params = []): array
    {
        $defaultTaux = (float) ($params['taux_couverture_default'] ?? 80);
        $defaultPlafond = (float) ($params['plafond_annuel_default'] ?? 2000000);
        $capitalBaseCima = (float) ($params['capital_base_cima_ipp'] ?? 2000000);

        $facture = (float) ($answers['facture_clinique_agreee'] ?? $answers['medical_expenses'] ?? 250000);
        $tauxCouverture = (float) ($answers['taux_couverture'] ?? $defaultTaux);
        $plafondRestant = (float) ($answers['plafond_annuel_restant'] ?? $defaultPlafond);
        $isAccidentCorporel = !empty($answers['injured']) && $answers['injured'] === 'Oui';
        $tauxIpp = (float) ($answers['taux_ipp'] ?? 0);

        $partAssurance = $facture * ($tauxCouverture / 100);
        if ($partAssurance > $plafondRestant) {
            $partAssurance = $plafondRestant;
        }

        $indemniteCorporelle = 0;
        if ($isAccidentCorporel && $tauxIpp > 0) {
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
    private function calculateProfessionnelle(array $answers, array $params = []): array
    {
        $tauxMargeDefault = (float) ($params['taux_marge_brute_default'] ?? 0.30);
        $franchiseJours = (int) ($params['franchise_jours'] ?? 3);
        $joursParMois = (int) ($params['jours_par_mois'] ?? 30);

        $caN1 = (float) ($answers['chiffre_affaires_n_moins_1'] ?? 50000000);
        $caSinistre = (float) ($answers['chiffre_affaires_sinistre'] ?? 30000000);
        $tauxMarge = (float) ($answers['taux_marge_brute'] ?? $tauxMargeDefault);
        $chargesFixes = (float) ($answers['charges_fixes_permanentes'] ?? $answers['business_value'] ?? 2000000);

        $perteCa = max(0, $caN1 - $caSinistre);
        $perteMarge = $perteCa * $tauxMarge;
        $indemnisationBrute = $perteMarge + $chargesFixes;

        // Franchise jours
        $franchiseRatio = $joursParMois > 0 ? ($franchiseJours / $joursParMois) : 0.10;
        $franchise = $indemnisationBrute * $franchiseRatio;
        $net = max(0, $indemnisationBrute - $franchise);

        return [
            'regle_appliquee'       => 'Pertes d\'Exploitation & Charges Permanentes (Normes OHADA)',
            'regle_appliquee_en'    => 'Business Interruption & Standing Charges (OHADA Standards)',
            'montant_brut'          => $indemnisationBrute,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $net,
            'notes_explicatives'    => "Calcul basé sur la baisse de marge brute certifiée et le maintien des charges fixes, déduction faite de la franchise de {$franchiseJours} jours.",
            'notes_explicatives_en' => "Calculated based on gross margin loss and continuing fixed expenses, minus {$franchiseJours} days franchise.",
            'breakdown'             => [
                ['label' => 'Baisse de marge brute d\'exploitation', 'label_en' => 'Operating gross margin drop', 'amount' => $perteMarge],
                ['label' => 'Prise en charge des charges fixes (salaires, loyers)', 'label_en' => 'Standing charges coverage (wages, rent)', 'amount' => $chargesFixes],
                ['label' => "Franchise contractuelle ({$franchiseJours} jours d'activité)", 'label_en' => "Contractual waiting period ({$franchiseJours} days)", 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 5. Responsabilité Civile (Indemnisation intégrale du tiers lésé)
     */
    private function calculateRc(array $answers, array $params = []): array
    {
        $franchiseAssure = (float) ($params['franchise_rc_assure'] ?? ($answers['franchise_assure'] ?? 50000));
        $devisTiers = (float) ($answers['devis_reparation_tiers'] ?? $answers['estimated_value'] ?? 800000);

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
    private function calculateTransportVoyage(array $answers, array $params = []): array
    {
        $dtsKg = (float) ($params['dts_par_kg_fcfa'] ?? 13500);
        $franchiseRate = (float) ($params['franchise_marchandises_rate'] ?? 0.05);

        $valeurFacture = (float) ($answers['cargo_value'] ?? $answers['valeur_facture_marchandise'] ?? 1500000);
        $fret = (float) ($answers['cout_fret'] ?? 150000);
        $typeTransport = (string) ($answers['type_transport'] ?? 'Terrestre_National');
        $poidsPerdu = (float) ($answers['poids_perdu_kg'] ?? 0);

        if (stripos($typeTransport, 'Aerien') !== false && $poidsPerdu > 0) {
            $indemnisation = $poidsPerdu * $dtsKg;
            $montantBrut = $indemnisation;
            $franchise = 0;
            $fmtDts = number_format($dtsKg, 0, ',', ' ');
            $note = "Convention internationale transport aérien : Plafond légal de {$fmtDts} FCFA par kilogramme de bagage perdu.";
            $noteEn = "International air convention: Legal cap of {$fmtDts} FCFA per kg of lost luggage.";
        } else {
            $montantBrut = $valeurFacture + $fret;
            $franchise = $montantBrut * $franchiseRate;
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
    private function calculateAgricole(array $answers, array $params = []): array
    {
        $franchiseRate = (float) ($params['franchise_indicielle_rate'] ?? 0.15);
        $prixDefaut = (float) ($params['prix_marche_defaut'] ?? 250000);
        $rendementDefaut = (float) ($params['rendement_moyen_defaut'] ?? 2.5);

        $superficie = (float) ($answers['superficie_hectares'] ?? 5);
        $rendementMoyen = (float) ($answers['rendement_moyen_historique'] ?? $rendementDefaut);
        $prixMarche = (float) ($answers['prix_marquet_cameroun'] ?? $prixDefaut);
        $tauxPerte = (float) ($answers['taux_perte_expert'] ?? 70);

        $productionAttendue = $superficie * $rendementMoyen;
        $valeurRecolte = $productionAttendue * $prixMarche;
        $indemnisationBrute = $valeurRecolte * ($tauxPerte / 100);
        $franchise = $indemnisationBrute * $franchiseRate;
        $net = max(0, $indemnisationBrute - $franchise);

        $pctFranchise = round($franchiseRate * 100);

        return [
            'regle_appliquee'       => 'Assurance Agricole Indicielle & Pertes de Récolte',
            'regle_appliquee_en'    => 'Agricultural Index Insurance & Harvest Loss',
            'montant_brut'          => $indemnisationBrute,
            'franchise'             => $franchise,
            'indemnisation_estimee' => $net,
            'notes_explicatives'    => "Calcul du déficit de rendement par rapport à l'historique de production avec franchise indicielle de {$pctFranchise}%.",
            'notes_explicatives_en' => "Calculated on yield loss vs historical benchmark with {$pctFranchise}% index deductible.",
            'breakdown'             => [
                ['label' => 'Valeur financière de la récolte attendue', 'label_en' => 'Expected crop market value', 'amount' => $valeurRecolte],
                ['label' => 'Perte brute évaluée (' . $tauxPerte . '%)', 'label_en' => 'Assessed gross loss (' . $tauxPerte . '%)', 'amount' => $indemnisationBrute],
                ['label' => "Franchise agricole ({$pctFranchise}%)", 'label_en' => "Agricultural deductible ({$pctFranchise}%)", 'amount' => -$franchise],
            ],
        ];
    }

    /**
     * 8. Autres Sinistres (ex : Assurance Scolaire / Plafonds)
     */
    private function calculateAutres(array $answers, array $params = []): array
    {
        $plafond = (float) ($params['plafond_indemnisation_defaut'] ?? 500000);
        $franchiseBase = (float) ($params['franchise_defaut'] ?? 0);

        $frais = (float) ($answers['frais_medicaux_eleve'] ?? $answers['estimated_value'] ?? 150000);
        $plafondSaisi = (float) ($answers['plafond_garantie_scolaire'] ?? $plafond);

        $indemnisation = min($frais, $plafondSaisi);
        $excedent = max(0, $frais - $plafondSaisi) + $franchiseBase;

        $fmtPlafond = number_format($plafondSaisi, 0, ',', ' ');

        return [
            'regle_appliquee'       => 'Garantie Individuelle Accidents & Prévoyance Scolaire',
            'regle_appliquee_en'    => 'Personal Accident & School Insurance Policy',
            'montant_brut'          => $frais,
            'franchise'             => $excedent,
            'indemnisation_estimee' => max(0, $indemnisation - $franchiseBase),
            'notes_explicatives'    => "Prise en charge intégrale des frais médicaux dans la limite du plafond garanti contractuel ({$fmtPlafond} FCFA).",
            'notes_explicatives_en' => "Full coverage of medical expenses up to the contractual policy limit ({$fmtPlafond} FCFA).",
            'breakdown'             => [
                ['label' => 'Total des frais réels engagés', 'label_en' => 'Total actual expenses incurred', 'amount' => $frais],
                ['label' => 'Montant indemnisé (dans la limite du plafond)', 'label_en' => 'Indemnified amount (within limit)', 'amount' => $indemnisation],
                ['label' => 'Dépassement de plafond éventuel', 'label_en' => 'Limit excess (if any)', 'amount' => -$excedent],
            ],
        ];
    }
}
