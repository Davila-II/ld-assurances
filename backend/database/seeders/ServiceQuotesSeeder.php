<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class ServiceQuotesSeeder extends Seeder
{
    public function run(): void
    {
        $this->ensureCategories();

        foreach ($this->definitions() as $slug => $sections) {
            $category = Category::where('slug', $slug)->firstOrFail();

            // On repart d'une base propre pour les devis de cette catégorie
            FormField::where('category_id', $category->id)
                ->where('form_type', 'quote')
                ->update(['is_active' => false]);

            $order = 0;

            foreach ($sections as $section => $fields) {
                foreach ($fields as $field) {
                    $order++;

                    FormField::updateOrCreate(
                        [
                            'category_id' => $category->id,
                            'form_type'   => 'quote',
                            'name'        => $field['name'],
                        ],
                        [
                            'label'       => $field['label'],
                            'placeholder' => $field['placeholder'] ?? null,
                            'section'     => $section,
                            'field_type'  => $field['field_type'],
                            'is_required' => $field['is_required'],
                            'options'     => $field['options'],
                            'condition'   => $field['condition'],
                            'sort_order'  => $order,
                            'is_active'   => true,
                        ]
                    );
                }
            }
        }
    }

    // L'identifiant "personne" est conservé : seul le nom affiché devient "Santé"
    private function ensureCategories(): void
    {
        $categories = [
            ['slug' => 'auto', 'name' => 'Automobile', 'sort_order' => 1],
            ['slug' => 'voyage', 'name' => 'Voyage', 'sort_order' => 2],
            ['slug' => 'habitation', 'name' => 'Habitation', 'sort_order' => 3],
            ['slug' => 'personne', 'name' => 'Santé', 'sort_order' => 4],
            ['slug' => 'professionnelle', 'name' => 'Professionnelle', 'sort_order' => 5],
            ['slug' => 'responsabilite-civile', 'name' => 'Responsabilité Civile', 'sort_order' => 6],
            ['slug' => 'autres', 'name' => 'Autres assurances', 'sort_order' => 7],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                ['name' => $category['name'], 'sort_order' => $category['sort_order'], 'is_active' => true]
            );
        }
    }

    // Catégorie => [ titre de l'étape => [ questions ] ]
    private function definitions(): array
    {
        $yesNo = ['Oui', 'Non'];

        return [
            'auto' => [
                'Véhicule' => [
                    $this->f('vehicle_usage', 'Usage du véhicule', 'select', true, ['Personnel / Trajets privés et domicile-travail', 'Professionnel / Déplacements commerciaux', 'Transport public de voyageurs (Taxi / Car)', 'Transport de marchandises']),
                    $this->f('vehicle_brand', 'Marque et modèle', 'text', true, null, null, 'Ex : Toyota Corolla, Renault Duster…'),
                    $this->f('vehicle_plate', 'Immatriculation', 'text', true, null, null, 'Ex : LT 123 AB'),
                    $this->f('first_reg_year', 'Année de première mise en circulation', 'number', true, null, null, 'Ex : 2021'),
                    $this->f('fiscal_power', 'Puissance fiscale (CV)', 'number', true, null, null, 'Ex : 7'),
                    $this->f('fuel_type', 'Carburant / Énergie', 'select', true, ['Essence', 'Diesel', 'Hybride / Électrique']),
                    $this->f('estimated_value', 'Valeur estimée du véhicule (FCFA)', 'number', false, null, null, 'Ex : 10 000 000'),
                    $this->f('parking_type', 'Stationnement habituel de nuit', 'select', false, ['Garage fermé', 'Cour clôturée surveillée', 'Voie publique', 'Parking gardé']),
                ],
                'Conducteur' => [
                    $this->f('driver_birthdate', 'Date de naissance du conducteur principal', 'date', true),
                    $this->f('license_date', 'Date d’obtention du permis de conduire', 'date', true),
                    $this->f('claims_3y', 'Avez-vous eu des sinistres au cours des 3 dernières années ?', 'select', false, $yesNo),
                    $this->f('claims_count', 'Si oui, nombre de sinistres', 'number', false, null, $this->when('claims_3y', 'Oui'), 'Ex : 1'),
                ],
                'Garanties' => [
                    $this->f('formula', 'Formule d’assurance souhaitée', 'select', true, ['Responsabilité Civile (Tiers Simple)', 'Tiers Complet (Vol, Incendie, Bris de glace)', 'Tous Risques']),
                    $this->f('defense_recourse', 'Option Défense et Recours', 'select', false, $yesNo),
                    $this->f('passenger_cover', 'Sécurité du conducteur et des passagers', 'select', false, $yesNo),
                    $this->f('start_date', 'Date d’effet souhaitée', 'date', true),
                    $this->f('duration', 'Durée du contrat', 'select', true, ['1 an (12 mois)', '6 mois', '3 mois']),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'voyage' => [
                'Séjour' => [
                    $this->f('destination_country', 'Pays de destination', 'text', true, null, null, 'Ex : France, Canada, Émirats Arabes Unis…'),
                    $this->f('travel_purpose', 'Motif principal du voyage', 'select', true, ['Tourisme / Vacances', 'Affaires / Mission professionnelle', 'Études / Stage académique', 'Visite familiale', 'Autre']),
                    $this->f('departure_date', 'Date de départ', 'date', true),
                    $this->f('return_date', 'Date de retour', 'date', true),
                    $this->f('schengen_visa', 'Attestation demandée pour visa Schengen ou équivalent ?', 'select', true, $yesNo),
                ],
                'Voyageurs' => [
                    $this->f('travelers_count', 'Nombre de voyageurs à assurer', 'number', true, null, null, 'Ex : 2'),
                    $this->f('travelers_ages', 'Âge(s) du/des voyageur(s)', 'text', true, null, null, 'Ex : 35 ans, 30 ans, 4 ans'),
                    $this->f('preexisting', 'Un voyageur a-t-il une pathologie médicale connue ?', 'select', false, $yesNo),
                ],
                'Garanties' => [
                    $this->f('guarantees', 'Garanties souhaitées', 'multiselect', true, ['Frais médicaux et hospitalisation d’urgence', 'Rapatriement sanitaire 24h/24', 'Bagages (vol, retard, perte)', 'Responsabilité civile à l’étranger', 'Annulation ou interruption de voyage']),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'professionnelle' => [
                'Entreprise' => [
                    $this->f('company_name', 'Raison sociale ou nom de l’entreprise', 'text', true, null, null, 'Ex : ETS Cameroun Services'),
                    $this->f('legal_form', 'Forme juridique', 'select', true, ['SARL', 'SAS / SA', 'Entreprise individuelle / ETS', 'Profession libérale', 'GIC / Association', 'Autre']),
                    $this->f('activity_sector', 'Secteur d’activité précis', 'text', true, null, null, 'Ex : Commerce général, BTP, Informatique, Restauration…'),
                    $this->f('turnover', 'Chiffre d’affaires annuel estimé (FCFA)', 'number', false, null, null, 'Ex : 45 000 000'),
                    $this->f('employees_count', 'Nombre de collaborateurs', 'number', false, null, null, 'Ex : 6'),
                    $this->f('company_city', 'Ville et quartier des locaux', 'text', true, null, null, 'Ex : Akwa, Douala'),
                ],
                'Locaux et biens' => [
                    $this->f('premise_type', 'Type de locaux', 'select', true, ['Bureaux administratifs', 'Boutique / Point de vente commercial', 'Entrepôt / Dépôt de stockage', 'Atelier / Usine de production', 'Travail à domicile']),
                    $this->f('occupant_status', 'Vous êtes', 'select', true, ['Propriétaire des murs', 'Locataire']),
                    $this->f('content_value', 'Valeur estimée du matériel, machines et marchandises (FCFA)', 'number', false, null, null, 'Ex : 20 000 000'),
                    $this->f('security_measures', 'Moyens de protection en place', 'multiselect', false, ['Gardiennage jour et nuit', 'Alarme anti-intrusion', 'Caméras de surveillance', 'Extincteurs vérifiés', 'Grilles et portes blindées']),
                ],
                'Garanties' => [
                    $this->f('guarantees', 'Garanties souhaitées', 'multiselect', true, ['Incendie, explosion et foudre', 'Dégâts des eaux', 'Vol et vandalisme', 'Bris de machines et matériel informatique', 'Perte d’exploitation après sinistre', 'Responsabilité civile professionnelle']),
                    $this->f('start_date', 'Date d’effet souhaitée', 'date', true),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'habitation' => [
                'Logement' => [
                    $this->f('property_type', 'Type de bien', 'select', true, ['Appartement', 'Maison', 'Villa', 'Studio ou chambre', 'Autre']),
                    $this->f('property_address', 'Adresse du bien (quartier, ville)', 'text', true, null, null, 'Ex : Akwa, Douala'),
                    $this->f('surface', 'Superficie approximative (m²)', 'number', false, null, null, 'Ex : 80'),
                    $this->f('rooms', 'Nombre de pièces', 'number', false, null, null, 'Ex : 3'),
                ],
                'Occupation' => [
                    $this->f('occupant_status', 'Vous êtes', 'select', true, ['Propriétaire', 'Locataire']),
                    $this->f('residence_usage', 'Usage du logement', 'select', true, ['Résidence principale', 'Résidence secondaire', 'Mise en location']),
                    $this->f('building_value', 'Valeur estimée du bâtiment (FCFA)', 'number', false, null, $this->when('occupant_status', 'Propriétaire'), 'Ex : 25 000 000'),
                    $this->f('contents_value', 'Valeur estimée des biens à assurer : meubles, appareils (FCFA)', 'number', false, null, null, 'Ex : 5 000 000'),
                ],
                'Garanties' => [
                    $this->f('guarantees', 'Garanties souhaitées', 'multiselect', true, ['Incendie', 'Dégât des eaux', 'Vol et cambriolage', 'Responsabilité civile']),
                    $this->f('previous_insurance', 'Le bien est-il déjà assuré ?', 'select', false, $yesNo),
                    $this->f('previous_insurer', 'Assureur actuel', 'text', false, null, $this->when('previous_insurance', 'Oui'), 'Ex : Nom de votre assureur actuel'),
                    $this->f('claims_3y', 'Avez-vous eu des sinistres au cours des 3 dernières années ?', 'select', false, $yesNo),
                    $this->f('start_date', 'Date de début souhaitée', 'date', true),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'personne' => [
                'Personnes à assurer' => [
                    $this->f('insured_for', 'Qui souhaitez-vous assurer ?', 'select', true, ['Moi-même', 'Ma famille', 'Mes employés']),
                    $this->f('people_count', 'Nombre de personnes à assurer', 'number', true, null, null, 'Ex : 4'),
                    $this->f('birth_date', "Date de naissance de l'assuré principal", 'date', true),
                ],
                'Situation' => [
                    $this->f('occupation_status', 'Situation professionnelle', 'select', true, ['Salarié', 'Indépendant ou commerçant', 'Étudiant', 'Retraité', 'Autre']),
                    $this->f('current_cover', 'Avez-vous déjà une couverture santé ?', 'select', false, $yesNo),
                    $this->f('current_insurer', 'Assureur actuel', 'text', false, null, $this->when('current_cover', 'Oui'), 'Ex : Nom de votre assureur actuel'),
                ],
                'Garanties' => [
                    $this->f('cover_types', 'Couvertures souhaitées', 'multiselect', true, ['Hospitalisation et soins', 'Consultations et pharmacie', 'Optique et dentaire', 'Maternité', 'Accident corporel', 'Décès et invalidité']),
                    $this->f('cover_zone', 'Zone de couverture souhaitée', 'select', false, ['Cameroun', 'Cameroun et Afrique centrale', 'International']),
                    $this->f('budget', 'Budget mensuel envisagé (FCFA)', 'number', false, null, null, 'Ex : 20 000'),
                    $this->f('start_date', 'Date de début souhaitée', 'date', true),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'responsabilite-civile' => [
                'Type de risque' => [
                    $this->f('rc_type', 'Type de responsabilité civile', 'select', true, ['Chef de famille (particulier)', 'Professionnelle', 'Exploitation (entreprise)', "Organisation d'un événement", 'Autre']),
                    $this->f('rc_description', "Décrivez la situation ou l'activité à couvrir", 'textarea', true, null, null, 'Ex : Décrivez votre activité ou la situation à couvrir'),
                ],
                'Assuré' => [
                    $this->f('assured_type', 'Vous êtes', 'select', true, ['Particulier', 'Entreprise ou association']),
                    $this->f('company_name', "Nom de l'entreprise ou de l'association", 'text', true, null, $this->when('assured_type', 'Entreprise ou association'), 'Ex : SARL Exemple'),
                    $this->f('activity', "Secteur d'activité", 'text', true, null, $this->when('assured_type', 'Entreprise ou association'), 'Ex : Commerce général'),
                    $this->f('employees', "Nombre d'employés", 'number', false, null, $this->when('assured_type', 'Entreprise ou association'), 'Ex : 10'),
                ],
                'Garanties' => [
                    $this->f('coverage_limit', 'Plafond de garantie souhaité (FCFA)', 'number', false, null, null, 'Ex : 50 000 000'),
                    $this->f('claims_3y', 'Avez-vous eu des sinistres au cours des 3 dernières années ?', 'select', false, $yesNo),
                    $this->f('claims_details', 'Précisez ces sinistres', 'textarea', false, null, $this->when('claims_3y', 'Oui'), 'Ex : Nature et date des sinistres'),
                    $this->f('start_date', 'Date de début souhaitée', 'date', true),
                ],
                'Coordonnées' => $this->contactFields(),
            ],

            'autres' => [
                'Votre besoin' => [
                    $this->f('product_type', "Type d'assurance recherché", 'select', true, ['Entreprise (multirisque professionnelle)', 'Transport de marchandises', 'Agricole', 'Autre']),
                    $this->f('need_description', 'Décrivez votre besoin', 'textarea', true, null, null, 'Ex : Transport de marchandises, matériel agricole…'),
                ],
                'Détails' => [
                    $this->f('insured_object', 'Que souhaitez-vous assurer ?', 'text', true, null, null, 'Ex : Marchandises, matériel, véhicules…'),
                    $this->f('estimated_value', 'Valeur estimée (FCFA)', 'number', false, null, null, 'Ex : 10 000 000'),
                    $this->f('assured_type', 'Vous êtes', 'select', true, ['Particulier', 'Entreprise']),
                    $this->f('company_name', "Nom de l'entreprise", 'text', true, null, $this->when('assured_type', 'Entreprise'), 'Ex : Nom de votre entreprise'),
                ],
                'Préférences' => [
                    $this->f('start_date', 'Date de début souhaitée', 'date'),
                    $this->f('already_insured', 'Êtes-vous déjà assuré pour ce risque ?', 'select', false, $yesNo),
                    $this->f('current_insurer', 'Assureur actuel', 'text', false, null, $this->when('already_insured', 'Oui'), 'Ex : Nom de votre assureur actuel'),
                    $this->f('contact_pref', 'Comment souhaitez-vous être contacté ?', 'select', true, ['Téléphone', 'Email', 'WhatsApp']),
                    $this->f('best_time', 'Moment préféré pour être contacté', 'select', false, ['Matin', 'Après-midi', 'Peu importe']),
                ],
                'Coordonnées' => $this->contactFields(),
            ],
        ];
    }

    // Dernière étape, commune à tous les devis (l'email est demandé par le formulaire lui-même)
    private function contactFields(): array
    {
        return [
            $this->f('full_name', 'Nom et prénom', 'text', true, null, null, 'Ex : Jean Dupont'),
            $this->f('phone', 'Téléphone', 'text', true, null, null, 'Ex : 6 90 12 34 56'),
            $this->f('city', 'Ville', 'text', true, null, null, 'Ex : Douala'),
            $this->f('comments', 'Informations complémentaires', 'textarea', false, null, null, 'Ex : Précisions utiles pour votre devis…'),
        ];
    }

    // Décrit une question
    private function f(
        string $name,
        string $label,
        string $type = 'text',
        bool $required = false,
        ?array $options = null,
        ?array $condition = null,
        ?string $placeholder = null
    ): array {
        return [
            'name'        => $name,
            'label'       => $label,
            'field_type'  => $type,
            'is_required' => $required,
            'options'     => $options,
            'condition'   => $condition,
            'placeholder' => $placeholder,
        ];
    }

    // Condition d'affichage : la question n'apparaît que si la réponse à $field vaut $equals
    private function when(string $field, string $equals): array
    {
        return ['field' => $field, 'equals' => $equals];
    }
}