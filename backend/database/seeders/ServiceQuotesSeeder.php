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
            ['slug' => 'habitation', 'name' => 'Habitation', 'sort_order' => 2],
            ['slug' => 'personne', 'name' => 'Santé', 'sort_order' => 3],
            ['slug' => 'responsabilite-civile', 'name' => 'Responsabilité Civile', 'sort_order' => 4],
            ['slug' => 'autres', 'name' => 'Autres assurances', 'sort_order' => 5],
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