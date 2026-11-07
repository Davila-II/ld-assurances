<?php

namespace App\Services;

use App\Models\Category;
use App\Models\PricingRule;
use Carbon\Carbon;
use Illuminate\Support\Str;

class PricingService
{
    /**
     * Calcule le montant d'un devis pour une catégorie et un ensemble de réponses.
     */
    public function calculate(Category|PricingRule|string|null $target, array $answers): ?array
    {
        $rule = $this->resolvePricingRule($target);

        if (! $rule || ! $rule->is_active) {
            return null;
        }

        $params = $rule->parameters ?? [];
        $driver = strtolower((string) ($rule->driver ?: $rule->code));

        $result = match ($driver) {
            'automobile'            => $this->calculateAutomobile($params, $answers),
            'voyage'                => $this->calculateVoyage($params, $answers),
            'habitation'            => $this->calculateHabitation($params, $answers),
            'sante'                 => $this->calculateSante($params, $answers),
            'professionnelle'       => $this->calculateProfessionnelle($params, $answers),
            'responsabilite_civile' => $this->calculateResponsabiliteCivile($params, $answers),
            'autres'                => $this->calculateAutres($params, $answers),
            default                 => $this->calculateCustom($rule, $answers),
        };

        if (! $result) {
            return null;
        }

        return array_merge([
            'has_calculation'     => true,
            'rule_id'             => $rule->id,
            'rule_name'           => $rule->name,
            'rule_code'           => $rule->code,
            'driver'              => $driver,
            'formatted_prime_ttc' => number_format($result['prime_ttc'], 0, ',', ' ') . ' FCFA',
        ], $result);
    }

    /**
     * Résout la règle de calcul correspondante à partir d'une catégorie, d'un ID ou d'un slug.
     */
    public function resolvePricingRule(Category|PricingRule|string|null $target): ?PricingRule
    {
        if ($target instanceof PricingRule) {
            return $target;
        }

        if ($target instanceof Category) {
            if ($target->pricingRule) {
                return $target->pricingRule;
            }
            if ($target->pricing_rule_id) {
                return PricingRule::find($target->pricing_rule_id);
            }
            // Recherche par correspondance de slug ou code si pas de FK explicite
            return PricingRule::where('code', $target->slug)
                ->orWhere('driver', $target->slug)
                ->first();
        }

        if (is_string($target)) {
            // Slug de catégorie ou code de règle
            $category = Category::where('slug', $target)->first();
            if ($category && $category->pricing_rule_id) {
                return PricingRule::find($category->pricing_rule_id);
            }

            return PricingRule::where('code', $target)
                ->orWhere('driver', $target)
                ->first();
        }

        return null;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ASSURANCE AUTOMOBILE (CIMA)
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateAutomobile(array $params, array $answers): array
    {
        $puissance = (int) $this->extractNumber($answers, ['fiscal_power', 'puissance_fiscale', 'puissance'], 7);
        $usageRaw  = (string) $this->extractValue($answers, ['vehicle_usage', 'usage'], 'Personnel');
        $isCommercial = (bool) preg_match('/commercial|taxi|transport|marchandise/i', $usageRaw);

        // 1. Responsabilité Civile (RC) de base selon la grille CIMA
        $rcBrackets = $params['rc_brackets'] ?? [
            ['max_cv' => 3, 'base' => 35000],
            ['max_cv' => 7, 'base' => 45000],
            ['max_cv' => 10, 'base' => 60000],
            ['max_cv' => null, 'base' => 85000],
        ];

        if ($isCommercial) {
            $commBase  = (float) ($params['commercial_base'] ?? 45000);
            $commMult  = (float) ($params['commercial_multiplier'] ?? 2.5);
            $primeRcBase = $commBase * $commMult;
        } else {
            $primeRcBase = 85000;
            foreach ($rcBrackets as $bracket) {
                if ($bracket['max_cv'] !== null && $puissance <= (int) $bracket['max_cv']) {
                    $primeRcBase = (float) $bracket['base'];
                    break;
                }
            }
        }

        // 2. Coefficients de pénétration du risque (Humain)
        $coeffConducteur = 1.0;
        $licenseDate = $this->extractValue($answers, ['license_date', 'permis_date']);
        $agePermis = $licenseDate ? Carbon::parse($licenseDate)->diffInYears(now()) : (int) $this->extractNumber($answers, ['age_permis', 'experience_permis'], 5);

        $youngLimit = (int) ($params['young_driver_years'] ?? 2);
        $youngSurcharge = (float) ($params['young_driver_surcharge'] ?? 0.20);
        if ($agePermis < $youngLimit) {
            $coeffConducteur += $youngSurcharge;
        }

        $claims3y = $this->extractValue($answers, ['claims_3y', 'sinistres_3ans']);
        $claimsCount = (int) $this->extractNumber($answers, ['claims_count', 'nombre_sinistres'], ($claims3y === 'Non' ? 0 : 0));

        $bonusNoClaims = (float) ($params['bonus_no_claims'] ?? 0.10);
        $malusThreshold = (int) ($params['malus_claims_threshold'] ?? 2);
        $malusSurcharge = (float) ($params['malus_claims_surcharge'] ?? 0.40);

        if ($claimsCount === 0) {
            $coeffConducteur -= $bonusNoClaims;
        } elseif ($claimsCount > $malusThreshold) {
            $coeffConducteur += $malusSurcharge;
        }

        $primeRcAjustee = round($primeRcBase * $coeffConducteur);

        // 3. Garanties optionnelles basées sur la valeur du véhicule
        $valeurVehicule = (float) $this->extractNumber($answers, ['estimated_value', 'valeur_vehicule', 'valeur_neuf'], 0);
        $formula = (string) $this->extractValue($answers, ['formula', 'formule'], '');
        $optionsRaw = $this->extractArray($answers, ['options_garanties', 'guarantees']);

        $primeOptions = 0.0;
        $breakdownOptions = [];

        $rateIncendie   = (float) ($params['rate_incendie'] ?? 0.005);
        $rateVol        = (float) ($params['rate_vol'] ?? 0.01);
        $flatBrisGlace  = (float) ($params['flat_bris_glace'] ?? 15000);
        $rateTousRisques= (float) ($params['rate_tous_risques'] ?? 0.035);

        $isTousRisques = str_contains(strtolower($formula), 'tous risques') || in_array('Tous_Risques', $optionsRaw, true);
        $isTiersComplet = str_contains(strtolower($formula), 'tiers complet') || str_contains(strtolower($formula), 'intermédiaire');

        if ($isTousRisques) {
            $optCost = round($valeurVehicule * $rateTousRisques);
            $primeOptions += $optCost;
            $breakdownOptions[] = ['label' => 'Garantie Tous Risques (3.5%)', 'amount' => $optCost];
        } else {
            if ($isTiersComplet || in_array('Incendie', $optionsRaw, true) || $this->hasOption($optionsRaw, 'incendie')) {
                $cost = round($valeurVehicule * $rateIncendie);
                $primeOptions += $cost;
                $breakdownOptions[] = ['label' => 'Garantie Incendie (0.5%)', 'amount' => $cost];
            }
            if ($isTiersComplet || in_array('Vol', $optionsRaw, true) || $this->hasOption($optionsRaw, 'vol')) {
                $cost = round($valeurVehicule * $rateVol);
                $primeOptions += $cost;
                $breakdownOptions[] = ['label' => 'Garantie Vol (1%)', 'amount' => $cost];
            }
            if ($isTiersComplet || in_array('Bris_de_Glace', $optionsRaw, true) || $this->hasOption($optionsRaw, 'bris')) {
                $primeOptions += $flatBrisGlace;
                $breakdownOptions[] = ['label' => 'Garantie Bris de Glace (Forfait)', 'amount' => $flatBrisGlace];
            }
        }

        // 4. Consolidation et fiscalité Cameroun
        $primeNette  = $primeRcAjustee + $primeOptions;
        $accessoires = (float) ($params['accessoires'] ?? 5000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        $breakdown = array_merge([
            ['label' => 'Prime Responsabilité Civile CIMA de base (' . $puissance . ' CV)', 'amount' => $primeRcBase],
            ['label' => 'Ajustement conducteur (Coefficient ' . number_format($coeffConducteur, 2, ',', ' ') . ')', 'amount' => $primeRcAjustee - $primeRcBase],
        ], $breakdownOptions, [
            ['label' => 'Prime Nette HT', 'amount' => $primeNette],
            ['label' => 'Accessoires & Frais de gestion', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Automobile TTC', 'amount' => $primeTtc],
        ]);

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ASSURANCE VOYAGE
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateVoyage(array $params, array $answers): array
    {
        $country = (string) $this->extractValue($answers, ['destination_country', 'pays_destination', 'destination'], 'France');
        $schengen = (string) $this->extractValue($answers, ['schengen_visa', 'visa_schengen'], '');

        $ratesByZone = $params['rates_by_zone'] ?? [
            'Zone_Afrique'         => 1000,
            'Zone_CIMA'            => 1000,
            'Zone_Europe_Schengen' => 1500,
            'Zone_Monde'           => 3000,
            'USA_Canada'           => 3000,
        ];

        // 1. Détermination du taux journalier selon la zone
        $cLower = strtolower($country);
        if (preg_match('/usa|états-unis|etats-unis|canada|amérique/i', $cLower)) {
            $zone = 'USA_Canada';
            $tauxJournalier = (float) ($ratesByZone['USA_Canada'] ?? 3000);
        } elseif ($schengen === 'Oui' || preg_match('/france|allemagne|italie|espagne|belgique|schengen|europe/i', $cLower)) {
            $zone = 'Zone_Europe_Schengen';
            $tauxJournalier = (float) ($ratesByZone['Zone_Europe_Schengen'] ?? 1500);
        } elseif (preg_match('/cameroun|gabon|congo|tchad|rca|afrique|senegal|côte d|benin|togo/i', $cLower)) {
            $zone = 'Zone_Afrique';
            $tauxJournalier = (float) ($ratesByZone['Zone_Afrique'] ?? 1000);
        } else {
            $zone = 'Zone_Monde';
            $tauxJournalier = (float) ($ratesByZone['Zone_Monde'] ?? 3000);
        }

        // 2. Durée du séjour
        $depDate = $this->extractValue($answers, ['departure_date', 'date_depart']);
        $retDate = $this->extractValue($answers, ['return_date', 'date_retour']);
        $duree = 7;
        if ($depDate && $retDate) {
            $duree = max(1, (int) Carbon::parse($depDate)->diffInDays(Carbon::parse($retDate)));
        } else {
            $duree = (int) $this->extractNumber($answers, ['duree_sejour', 'duration_days'], 7);
        }

        $primeBaseIndiv = $tauxJournalier * $duree;

        // 3. Majoration liée à l'âge du voyageur
        $ageRaw = (int) $this->extractNumber($answers, ['travelers_ages', 'age_voyageur'], 35);
        $coeffAge = 1.0;
        if ($ageRaw > 65 && $ageRaw <= 75) {
            $coeffAge = 1.5;
        } elseif ($ageRaw > 75) {
            $coeffAge = 2.0;
        }

        $primeAjusteeIndiv = round($primeBaseIndiv * $coeffAge);
        $nbrePersonnes = max(1, (int) $this->extractNumber($answers, ['travelers_count', 'nbre_personnes', 'nombre_voyageurs'], 1));

        // 4. Calcul global et taxes
        $primeNetteTotale = $primeAjusteeIndiv * $nbrePersonnes;
        $accessoires = (float) ($params['accessoires'] ?? 3000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNetteTotale * $taxeRate);
        $primeTtc    = $primeNetteTotale + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => "Taux journalier ({$zone} : " . number_format($tauxJournalier, 0, ',', ' ') . " FCFA/j × {$duree} j)", 'amount' => $primeBaseIndiv],
            ['label' => 'Majoration tranche d’âge (Coeff ' . $coeffAge . ')', 'amount' => ($primeAjusteeIndiv - $primeBaseIndiv) * $nbrePersonnes],
            ['label' => "Prime Nette ({$nbrePersonnes} voyageur(s))", 'amount' => $primeNetteTotale],
            ['label' => 'Accessoires & Attestation d’assistance', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Voyage TTC', 'amount' => $primeTtc],
        ];

        return [
            'prime_nette' => $primeNetteTotale,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ASSURANCE HABITATION
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateHabitation(array $params, array $answers): array
    {
        $materiaux = (string) $this->extractValue($answers, ['construction_material', 'materiaux_construction'], 'Beton_Dur');
        $capMobilier   = (float) $this->extractNumber($answers, ['contents_value', 'capital_mobilier', 'valeur_mobilier'], 5000000);
        $capImmobilier = (float) $this->extractNumber($answers, ['building_value', 'capital_immobilier', 'valeur_batiment'], 20000000);

        // 1. Détermination du taux incendie
        $ratesConst = $params['rates_construction'] ?? [
            'Beton_Dur'     => 0.0010,
            'Semi_Dur_Tole' => 0.0025,
            'Bois_Paille'   => 0.0060,
        ];
        $tauxIncendie = $ratesConst['Beton_Dur'] ?? 0.0010;
        if (preg_match('/semi|tole|tôle/i', $materiaux)) {
            $tauxIncendie = $ratesConst['Semi_Dur_Tole'] ?? 0.0025;
        } elseif (preg_match('/bois|paille|planche/i', $materiaux)) {
            $tauxIncendie = $ratesConst['Bois_Paille'] ?? 0.0060;
        }

        $primeIncendie = round(($capImmobilier + $capMobilier) * $tauxIncendie);

        // 2. Calcul garantie Vol
        $securityRaw = (string) $this->extractValue($answers, ['security_presence', 'security_measures', 'securite'], '');
        $tauxVolBase = (float) ($params['rate_vol_base'] ?? 0.0030);
        $secModifier = 1.0;
        if (preg_match('/gardien|grille|blindé|surveillance/i', $securityRaw)) {
            $secModifier = 0.8; // Bonus sécurité 20%
        } elseif (preg_match('/aucun|non/i', $securityRaw) || empty($securityRaw)) {
            $secModifier = 1.5; // Malus sécurité 50%
        }
        $primeVol = round($capMobilier * ($tauxVolBase * $secModifier));

        // 3. Garanties annexes forfaitaires
        $typeLogement = (string) $this->extractValue($answers, ['property_type', 'type_logement', 'type_bien'], 'Appartement');
        $primeAnnexe  = preg_match('/appartement|studio/i', $typeLogement)
            ? (float) ($params['annexe_appartement'] ?? 10000)
            : (float) ($params['annexe_autre'] ?? 7000);

        // 4. Taxes et frais locaux
        $primeNette  = $primeIncendie + $primeVol + $primeAnnexe;
        $accessoires = (float) ($params['accessoires'] ?? 4000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => 'Garantie Incendie & Événements naturels', 'amount' => $primeIncendie],
            ['label' => 'Garantie Vol & Vandalisme', 'amount' => $primeVol],
            ['label' => 'Garanties annexes (Dégâts des eaux, RC Habitation)', 'amount' => $primeAnnexe],
            ['label' => 'Prime Nette Habitation', 'amount' => $primeNette],
            ['label' => 'Accessoires de police', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Habitation TTC', 'amount' => $primeTtc],
        ];

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ASSURANCE SANTÉ
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateSante(array $params, array $answers): array
    {
        $birthDate = $this->extractValue($answers, ['birth_date', 'date_naissance']);
        $ageProposant = $birthDate ? Carbon::parse($birthDate)->diffInYears(now()) : (int) $this->extractNumber($answers, ['age_proposant', 'age'], 32);

        // 1. Grille tarifaire de base par tranche d'âge
        $ageBrackets = $params['age_brackets'] ?? [
            ['max_age' => 18, 'base' => 60000],
            ['max_age' => 35, 'base' => 90000],
            ['max_age' => 50, 'base' => 130000],
            ['max_age' => 65, 'base' => 210000],
            ['max_age' => null, 'base' => 350000],
        ];
        $primeBase = 350000;
        foreach ($ageBrackets as $b) {
            if ($b['max_age'] !== null && $ageProposant <= (int) $b['max_age']) {
                $primeBase = (float) $b['base'];
                break;
            }
        }

        // 2. Ajustement formule
        $formule = (string) $this->extractValue($answers, ['formula', 'formule_couverture', 'formule'], 'Formule_80%');
        $multipliers = $params['formula_multipliers'] ?? [
            'Formule_70%'  => 0.85,
            'Formule_80%'  => 1.00,
            'Formule_100%' => 1.40,
        ];
        $fMult = 1.0;
        if (preg_match('/70/i', $formule)) {
            $fMult = (float) ($multipliers['Formule_70%'] ?? 0.85);
        } elseif (preg_match('/100/i', $formule)) {
            $fMult = (float) ($multipliers['Formule_100%'] ?? 1.40);
        }
        $primeBaseAjustee = round($primeBase * $fMult);

        // 3. Antécédents médicaux
        $antecedents = (string) $this->extractValue($answers, ['antecedents_medicaux', 'medical_history', 'preexisting'], '');
        $coeffMedical = 1.0;
        if (preg_match('/hypertension|diabete|diabète|cardiaque/i', $antecedents)) {
            $coeffMedical = 1.0 + (float) ($params['medical_surcharge'] ?? 0.35);
        }
        $primeAdulteCharge = round($primeBaseAjustee * $coeffMedical);

        // 4. Enfants à charge
        $insuredFor = (string) $this->extractValue($answers, ['insured_for'], '');
        $peopleCount = (int) $this->extractNumber($answers, ['people_count', 'nbre_enfants_charge'], 1);
        $nbreEnfants = (preg_match('/famille/i', $insuredFor) && $peopleCount > 1) ? ($peopleCount - 1) : 0;
        if ($nbreEnfants === 0 && isset($answers['nbre_enfants_charge'])) {
            $nbreEnfants = (int) $answers['nbre_enfants_charge'];
        }

        $childRate = (float) ($params['child_flat_rate'] ?? 40000);
        $primeEnfantsTotale = $nbreEnfants * $childRate;

        // 5. Totalisation
        $primeNette  = $primeAdulteCharge + $primeEnfantsTotale;
        $accessoires = (float) ($params['accessoires'] ?? 5000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => "Cotisation Assuré Principal ({$ageProposant} ans)", 'amount' => $primeAdulteCharge],
        ];
        if ($nbreEnfants > 0) {
            $breakdown[] = ['label' => "Couverture des ayants droit ({$nbreEnfants} enfant(s))", 'amount' => $primeEnfantsTotale];
        }
        $breakdown = array_merge($breakdown, [
            ['label' => 'Prime Nette Santé', 'amount' => $primeNette],
            ['label' => 'Frais d’ouverture de dossier médical', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Santé Annuelle TTC', 'amount' => $primeTtc],
        ]);

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ASSURANCE PROFESSIONNELLE
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateProfessionnelle(array $params, array $answers): array
    {
        $secteur = (string) $this->extractValue($answers, ['activity_sector', 'secteur_activite', 'activity'], 'Commerce_Magasin');
        $ca = (float) $this->extractNumber($answers, ['turnover', 'chiffre_affaires'], 30000000);
        $valeurBiens = (float) $this->extractNumber($answers, ['content_value', 'valeur_stock', 'valeur_parc_machines'], 15000000);

        // 1. Facteur de risque selon le secteur
        $riskFactors = $params['sector_risk_factors'] ?? [
            'Bureau_Informatique' => 0.0010,
            'Consulting'          => 0.0010,
            'Commerce_Magasin'    => 0.0025,
            'Entrepot'            => 0.0025,
            'Menuiserie'          => 0.0050,
            'BTP'                 => 0.0050,
            'Usine'               => 0.0050,
        ];

        $facteur = (float) ($params['default_sector_risk'] ?? 0.0025);
        if (preg_match('/bureau|informatique|consulting|service|agence/i', $secteur)) {
            $facteur = $riskFactors['Bureau_Informatique'] ?? 0.0010;
        } elseif (preg_match('/menuiserie|btp|usine|industrie|fabrication/i', $secteur)) {
            $facteur = $riskFactors['BTP'] ?? 0.0050;
        }

        // 2. Calcul risque sur le patrimoine
        $primePatrimoine = round($valeurBiens * $facteur);

        // 3. Pertes d'exploitation
        $lossRate = (float) ($params['turnover_loss_rate'] ?? 0.0008);
        $primePerteExploitation = round($ca * $lossRate);

        // 4. Sortie et fiscalité Cameroun
        $primeNette  = $primePatrimoine + $primePerteExploitation;
        $accessoires = (float) ($params['accessoires'] ?? 10000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => 'Couverture des actifs professionnels (Stock & Matériel)', 'amount' => $primePatrimoine],
            ['label' => 'Garantie Pertes d’Exploitation (Continuité d’activité)', 'amount' => $primePerteExploitation],
            ['label' => 'Prime Nette Professionnelle', 'amount' => $primeNette],
            ['label' => 'Frais d’ouverture de dossier Entreprise', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Professionnelle TTC', 'amount' => $primeTtc],
        ];

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. RESPONSABILITÉ CIVILE
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateResponsabiliteCivile(array $params, array $answers): array
    {
        $rcType = (string) $this->extractValue($answers, ['rc_type', 'type_rc'], 'Chef_de_Famille');
        $tailleFamille = (int) $this->extractNumber($answers, ['family_size', 'taille_famille', 'employees'], 3);
        $chiens = (int) $this->extractNumber($answers, ['dangerous_dogs', 'chiens_categorie_dangereuse'], 0);

        if (preg_match('/pro|exploitation|entreprise/i', $rcType)) {
            $primeForfaitaire = (float) ($params['pro_exploitation_flat'] ?? 45000);
            $typeDesc = 'Responsabilité Civile Professionnelle & Exploitation';
        } else {
            $seuil = (int) ($params['family_size_threshold'] ?? 4);
            $small = (float) ($params['chef_de_famille_small'] ?? 12000);
            $large = (float) ($params['chef_de_famille_large'] ?? 18000);
            $primeForfaitaire = ($tailleFamille <= $seuil) ? $small : $large;

            $dogFee = (float) ($params['dangerous_dog_fee'] ?? 5000);
            if ($chiens > 0) {
                $primeForfaitaire += ($chiens * $dogFee);
            }
            $typeDesc = "RC Chef de Famille ({$tailleFamille} pers" . ($chiens > 0 ? " + {$chiens} chien(s)" : "") . ")";
        }

        $primeNette  = $primeForfaitaire;
        $accessoires = (float) ($params['accessoires'] ?? 2500);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => "Forfait de base : {$typeDesc}", 'amount' => $primeForfaitaire],
            ['label' => 'Prime Nette Responsabilité Civile', 'amount' => $primeNette],
            ['label' => 'Frais d’accessoires & timbre de police', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime Responsabilité Civile TTC', 'amount' => $primeTtc],
        ];

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. AUTRES ASSURANCES (Scolaire, Équipement électronique, Obsèques)
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateAutres(array $params, array $answers): array
    {
        $produitNiche = (string) $this->extractValue($answers, ['product_type', 'type_produit_niche'], 'Assurance_Scolaire');
        $valeur = (float) $this->extractNumber($answers, ['estimated_value', 'valeur_objet_specifique'], 1000000);
        $beneficiaires = max(1, (int) $this->extractNumber($answers, ['beneficiaries_count', 'nbre_beneficiaires', 'students_count'], 1));

        $primeNette = 0.0;
        $accessoires = (float) ($params['default_accessoires'] ?? 1500);
        $labelProduit = 'Assurance';

        if (preg_match('/scolaire|eleve|école/i', $produitNiche)) {
            $primeParEleve = (float) ($params['scolaire_per_student'] ?? 2500);
            $primeNette = $primeParEleve * $beneficiaires;
            $accessoires = (float) ($params['scolaire_accessoires'] ?? 1500);
            $labelProduit = "Assurance Scolaire ({$beneficiaires} élève(s))";
        } elseif (preg_match('/equipement|électronique|serveur|groupe/i', $produitNiche)) {
            $taux = (float) ($params['electronic_equipment_rate'] ?? 0.04);
            $primeNette = round($valeur * $taux);
            $accessoires = (float) ($params['electronic_accessoires'] ?? 5000);
            $labelProduit = 'Multirisque Équipement Électronique (4%)';
        } elseif (preg_match('/obseques|obsèques|deces|décès/i', $produitNiche)) {
            $forfait = (float) ($params['obseques_flat_per_beneficiary'] ?? 15000);
            $primeNette = $forfait * $beneficiaires;
            $accessoires = (float) ($params['obseques_accessoires'] ?? 1500);
            $labelProduit = "Assurance Assistance Obsèques ({$beneficiaires} bénéficiaire(s))";
        } else {
            // Risque divers général : 2% de la valeur déclarée
            $primeNette = max(25000, round($valeur * 0.02));
            $accessoires = 3000;
            $labelProduit = 'Couverture spécifique sur-mesure';
        }

        $taxeRate   = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique = round($primeNette * $taxeRate);
        $primeTtc   = $primeNette + $accessoires + $taxeUnique;

        $breakdown = [
            ['label' => $labelProduit, 'amount' => $primeNette],
            ['label' => 'Frais d’accessoires & gestion', 'amount' => $accessoires],
            ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
            ['label' => 'Total Prime TTC', 'amount' => $primeTtc],
        ];

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => $breakdown,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. CALCUL PERSONNALISÉ (Formule personnalisée)
    // ──────────────────────────────────────────────────────────────────────────
    public function calculateCustom(PricingRule $rule, array $answers): array
    {
        $params = $rule->parameters ?? [];
        $base = (float) ($params['base_amount'] ?? 25000);
        $rate = (float) ($params['rate'] ?? 0.01);
        $valeur = (float) $this->extractNumber($answers, ['estimated_value', 'valeur', 'budget', 'capital'], 1000000);

        $primeNette  = $base + round($valeur * $rate);
        $accessoires = (float) ($params['accessoires'] ?? 5000);
        $taxeRate    = (float) ($params['taxe_unique'] ?? 0.15);
        $taxeUnique  = round($primeNette * $taxeRate);
        $primeTtc    = $primeNette + $accessoires + $taxeUnique;

        return [
            'prime_nette' => $primeNette,
            'accessoires' => $accessoires,
            'taxe_unique' => $taxeUnique,
            'prime_ttc'   => $primeTtc,
            'breakdown'   => [
                ['label' => 'Base forfaitaire', 'amount' => $base],
                ['label' => 'Part proportionnelle', 'amount' => round($valeur * $rate)],
                ['label' => 'Prime Nette', 'amount' => $primeNette],
                ['label' => 'Frais d’accessoires', 'amount' => $accessoires],
                ['label' => 'Taxe unique sur les assurances (15%)', 'amount' => $taxeUnique],
                ['label' => 'Total Prime TTC', 'amount' => $primeTtc],
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UTILITAIRES D'EXTRACTION DE DONNÉES
    // ──────────────────────────────────────────────────────────────────────────
    private function extractValue(array $answers, array $possibleKeys, mixed $default = null): mixed
    {
        foreach ($possibleKeys as $key) {
            if (isset($answers[$key]) && $answers[$key] !== '') {
                return $answers[$key];
            }
        }
        return $default;
    }

    private function extractNumber(array $answers, array $possibleKeys, float|int $default = 0): float|int
    {
        $val = $this->extractValue($answers, $possibleKeys, null);
        if ($val === null || $val === '') {
            return $default;
        }
        $cleaned = preg_replace('/[^\d.]/', '', (string) $val);
        return is_numeric($cleaned) ? (float) $cleaned : $default;
    }

    private function extractArray(array $answers, array $possibleKeys): array
    {
        $val = $this->extractValue($answers, $possibleKeys, []);
        if (is_array($val)) {
            return $val;
        }
        if (is_string($val)) {
            return array_map('trim', explode(',', $val));
        }
        return [];
    }

    private function hasOption(array $options, string $keyword): bool
    {
        foreach ($options as $opt) {
            if (str_contains(strtolower((string) $opt), strtolower($keyword))) {
                return true;
            }
        }
        return false;
    }
}
