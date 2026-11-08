<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PricingRule extends Model
{
    protected $fillable = [
        'name',
        'name_en',
        'code',
        'description',
        'driver',
        'parameters',
        'formula_code',
        'is_active',
    ];

    protected $casts = [
        'parameters' => 'array',
        'is_active'  => 'boolean',
    ];

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /**
     * Retourne les définitions complètes et paramètres par défaut des 7 algorithmes CIMA & LD Assurances.
     */
    public static function defaultTemplates(): array
    {
        return [
            'automobile' => [
                'name'         => 'Assurance Automobile (Grille CIMA)',
                'name_en'      => 'Motor Insurance (CIMA Tariff)',
                'code'         => 'automobile',
                'driver'       => 'automobile',
                'description'  => 'Tarification Responsabilité Civile CIMA selon puissance fiscale et usage, majorations jeune conducteur & bonus/malus, et garanties dommages/vol/incendie/tous risques.',
                'parameters'   => [
                    'rc_brackets' => [
                        ['max_cv' => 3, 'base' => 35000],
                        ['max_cv' => 7, 'base' => 45000],
                        ['max_cv' => 10, 'base' => 60000],
                        ['max_cv' => null, 'base' => 85000],
                    ],
                    'commercial_base'         => 45000,
                    'commercial_multiplier'   => 2.5,
                    'young_driver_years'      => 2,
                    'young_driver_surcharge'  => 0.20,
                    'bonus_no_claims'         => 0.10,
                    'malus_claims_threshold'  => 2,
                    'malus_claims_surcharge'  => 0.40,
                    'rate_incendie'           => 0.005,
                    'rate_vol'                => 0.01,
                    'flat_bris_glace'         => 15000,
                    'rate_tous_risques'       => 0.035,
                    'accessoires'             => 5000,
                    'taxe_unique'             => 0.15,
                ],
            ],
            'voyage' => [
                'name'         => 'Assurance Voyage (Zones Médicales CIMA)',
                'name_en'      => 'Travel Insurance (CIMA Medical Zones)',
                'code'         => 'voyage',
                'driver'       => 'voyage',
                'description'  => 'Taux journalier selon la zone de destination (Afrique/CIMA, Europe Schengen, Monde/USA), surprime selon l’âge et couverture par voyageur.',
                'parameters'   => [
                    'rates_by_zone' => [
                        'Zone_Afrique'         => 1000,
                        'Zone_CIMA'            => 1000,
                        'Zone_Europe_Schengen' => 1500,
                        'Zone_Monde'           => 3000,
                        'USA_Canada'           => 3000,
                    ],
                    'age_brackets' => [
                        ['min_age' => 66, 'max_age' => 75, 'multiplier' => 1.5],
                        ['min_age' => 76, 'max_age' => null, 'multiplier' => 2.0],
                    ],
                    'accessoires' => 3000,
                    'taxe_unique' => 0.15,
                ],
            ],
            'habitation' => [
                'name'         => 'Assurance Habitation (Incendie & Vol CIMA)',
                'name_en'      => 'Home Insurance (Fire & Theft CIMA)',
                'code'         => 'habitation',
                'driver'       => 'habitation',
                'description'  => 'Taux incendie selon matériaux de construction (Béton dur, Semi-dur tôle, Bois/paille), taux vol avec bonus/malus sécurité, et garanties annexes dégât des eaux.',
                'parameters'   => [
                    'rates_construction' => [
                        'Beton_Dur'     => 0.0010,
                        'Semi_Dur_Tole' => 0.0025,
                        'Bois_Paille'   => 0.0060,
                    ],
                    'rate_vol_base' => 0.0030,
                    'security_modifiers' => [
                        'Aucune'                 => 1.5,
                        'Non_Securise'           => 1.5,
                        'Standard'               => 1.0,
                        'Gardiennage_Et_Grilles' => 0.8,
                    ],
                    'annexe_appartement' => 10000,
                    'annexe_autre'       => 7000,
                    'accessoires'        => 4000,
                    'taxe_unique'        => 0.15,
                ],
            ],
            'sante' => [
                'name'         => 'Assurance Santé (Barème d’âge & Formules)',
                'name_en'      => 'Health Insurance (Age-based Scale & Plans)',
                'code'         => 'sante',
                'driver'       => 'sante',
                'description'  => 'Grille tarifaire par tranches d’âge, coefficient selon la formule de remboursement (70%, 80%, 100%), surprime antécédents médicaux et forfait enfants.',
                'parameters'   => [
                    'age_brackets' => [
                        ['max_age' => 18, 'base' => 60000],
                        ['max_age' => 35, 'base' => 90000],
                        ['max_age' => 50, 'base' => 130000],
                        ['max_age' => 65, 'base' => 210000],
                        ['max_age' => null, 'base' => 350000],
                    ],
                    'formula_multipliers' => [
                        'Formule_70%'  => 0.85,
                        'Formule_80%'  => 1.00,
                        'Formule_100%' => 1.40,
                    ],
                    'medical_surcharge_conditions' => ['Hypertension', 'Diabete'],
                    'medical_surcharge'            => 0.35,
                    'child_flat_rate'              => 40000,
                    'accessoires'                  => 5000,
                    'taxe_unique'                  => 0.15,
                ],
            ],
            'professionnelle' => [
                'name'         => 'Assurance Professionnelle (Patrimoine & Pertes)',
                'name_en'      => 'Business Insurance (Assets & Interruption)',
                'code'         => 'professionnelle',
                'driver'       => 'professionnelle',
                'description'  => 'Facteur de risque selon secteur d’activité (Bureau, Commerce, BTP/Usine), couverture stock/machines et fraction du chiffre d’affaires en perte d’exploitation.',
                'parameters'   => [
                    'sector_risk_factors' => [
                        'Bureau_Informatique' => 0.0010,
                        'Consulting'          => 0.0010,
                        'Commerce_Magasin'    => 0.0025,
                        'Entrepot'            => 0.0025,
                        'Menuiserie'          => 0.0050,
                        'BTP'                 => 0.0050,
                        'Usine'               => 0.0050,
                    ],
                    'default_sector_risk'  => 0.0025,
                    'turnover_loss_rate'   => 0.0008,
                    'accessoires'          => 10000,
                    'taxe_unique'          => 0.15,
                ],
            ],
            'responsabilite_civile' => [
                'name'         => 'Responsabilité Civile (Chef de Famille / Pro)',
                'name_en'      => 'Public Liability (Family Head / Professional)',
                'code'         => 'responsabilite_civile',
                'driver'       => 'responsabilite_civile',
                'description'  => 'Tarif forfaitaire selon type de RC (Chef de famille selon taille du foyer, chiens dangereux, ou exploitation professionnelle).',
                'parameters'   => [
                    'chef_de_famille_small' => 12000,
                    'chef_de_famille_large' => 18000,
                    'family_size_threshold' => 4,
                    'dangerous_dog_fee'     => 5000,
                    'pro_exploitation_flat' => 45000,
                    'accessoires'           => 2500,
                    'taxe_unique'           => 0.15,
                ],
            ],
            'autres' => [
                'name'         => 'Autres Assurances (Scolaire, Équipement, Obsèques)',
                'name_en'      => 'Other Insurances (School, Equipment, Funeral)',
                'code'         => 'autres',
                'driver'       => 'autres',
                'description'  => 'Branchement dynamique selon le sous-produit choisi : scolaire par élève, équipement électronique au taux de 4%, obsèques par bénéficiaire.',
                'parameters'   => [
                    'scolaire_per_student'         => 2500,
                    'scolaire_accessoires'         => 1500,
                    'electronic_equipment_rate'    => 0.04,
                    'electronic_accessoires'       => 5000,
                    'obseques_flat_per_beneficiary'=> 15000,
                    'obseques_accessoires'         => 1500,
                    'default_accessoires'          => 1500,
                    'taxe_unique'                  => 0.15,
                ],
            ],

            // --- Règles d'indemnisation de sinistres (Code CIMA & Marché Camerounais) ---
            'sinistre_auto' => [
                'name'         => 'Sinistre Auto (Convention IDA & CIMA)',
                'name_en'      => 'Motor Claim (IDA Convention & CIMA)',
                'code'         => 'sinistre_auto',
                'driver'       => 'sinistre_auto',
                'description'  => 'Convention IDA (remboursement 100% à 0% responsable), partage 50% avec franchise légale (10%), Tous Risques (franchise fixe 75 000 FCFA) et Vol de véhicule (franchise 10%).',
                'parameters'   => [
                    'franchise_vol_rate'          => 0.10,
                    'franchise_fixe_tous_risques' => 75000,
                    'franchise_partage_rate'      => 0.10,
                    'franchise_partage_min'       => 50000,
                    'default_devis_expert'        => 500000,
                    'default_valeur_venale'       => 3000000,
                ],
            ],
            'sinistre_habitation' => [
                'name'         => 'Sinistre Habitation (Règle Proportionnelle Art. 32 CIMA)',
                'name_en'      => 'Home Claim (Art. 32 CIMA Proportional Rule)',
                'code'         => 'sinistre_habitation',
                'driver'       => 'sinistre_habitation',
                'description'  => 'Application stricte de la règle proportionnelle de capitaux du Code CIMA en cas de sous-assurance et déduction de la franchise contractuelle.',
                'parameters'   => [
                    'default_franchise_contractuelle' => 50000,
                    'seuil_sous_assurance'            => 1.0,
                    'default_degats'                  => 1000000,
                    'default_valeur_reelle'           => 15000000,
                ],
            ],
            'sinistre_sante' => [
                'name'         => 'Sinistre Santé & Corporel (Barème CIMA & Tiers-Payant)',
                'name_en'      => 'Health & Injury Claim (CIMA Scale & Direct Billing)',
                'code'         => 'sinistre_sante',
                'driver'       => 'sinistre_sante',
                'description'  => 'Prise en charge réseau tiers-payant selon taux conventionné et indemnisation de l’incapacité permanente partielle (IPP) basée sur le capital CIMA.',
                'parameters'   => [
                    'taux_couverture_default' => 80,
                    'plafond_annuel_default'  => 1500000,
                    'capital_base_cima_ipp'   => 2000000,
                ],
            ],
            'sinistre_rc' => [
                'name'         => 'Sinistre Responsabilité Civile (Indemnisation Tiers)',
                'name_en'      => 'Third-Party Liability Claim (CIMA Compensation)',
                'code'         => 'sinistre_rc',
                'driver'       => 'sinistre_rc',
                'description'  => 'Indemnisation intégrale du tiers victime sans enrichissement et refacturation de la franchise contractuelle à l’assuré.',
                'parameters'   => [
                    'franchise_rc_assure' => 50000,
                ],
            ],
            'sinistre_professionnelle' => [
                'name'         => 'Sinistre Entreprise (OHADA & Perte d\'exploitation)',
                'name_en'      => 'Business Claim (OHADA & Business Interruption)',
                'code'         => 'sinistre_professionnelle',
                'driver'       => 'sinistre_professionnelle',
                'description'  => 'Évaluation de la perte de marge brute certifiée OHADA et prise en charge des charges fixes avec franchise en jours d’inactivité.',
                'parameters'   => [
                    'taux_marge_brute_default' => 0.30,
                    'franchise_jours'          => 3,
                    'jours_par_mois'           => 30,
                ],
            ],
            'sinistre_voyage' => [
                'name'         => 'Sinistre Transport & Voyage (DTS & Conventions)',
                'name_en'      => 'Transport & Travel Claim (SDR & Conventions)',
                'code'         => 'sinistre_voyage',
                'driver'       => 'sinistre_voyage',
                'description'  => 'Indemnisation fret terrestre/maritime (valeur marchandise + fret) et bagages aériens selon plafond international DTS.',
                'parameters'   => [
                    'dts_par_kg_fcfa'            => 13500,
                    'franchise_marchandises_rate'=> 0.05,
                ],
            ],
            'sinistre_agricole' => [
                'name'         => 'Sinistre Agricole (Assurance Indicielle & Récoltes)',
                'name_en'      => 'Agricultural Claim (Index & Crops)',
                'code'         => 'sinistre_agricole',
                'driver'       => 'sinistre_agricole',
                'description'  => 'Indemnisation des pertes de récoltes ou bétail selon barème mercuriale Cameroun et franchise indicielle.',
                'parameters'   => [
                    'franchise_indicielle_rate' => 0.15,
                    'prix_marche_defaut'        => 250000,
                    'rendement_moyen_defaut'    => 3.5,
                ],
            ],
            'sinistre_autres' => [
                'name'         => 'Sinistre Autres Risques (Frais réels CIMA)',
                'name_en'      => 'Other Risks Claim (Actual Costs CIMA)',
                'code'         => 'sinistre_autres',
                'driver'       => 'sinistre_autres',
                'description'  => 'Prise en charge des frais réels justificatifs sous plafond contractuel avec franchise forfaitaire.',
                'parameters'   => [
                    'plafond_indemnisation_defaut' => 500000,
                    'franchise_defaut'             => 25000,
                ],
            ],
        ];
    }
}
