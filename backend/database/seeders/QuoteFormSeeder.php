<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class QuoteFormSeeder extends Seeder
{
    public function run(): void
    {
        $definitions = [
            'auto' => array_merge(
                $this->commonFields(),
                [
                    [
                        'name' => 'vehicle_type', 'label' => 'Type de véhicule', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => ['Voiture particulière', 'Moto', 'Camion ou utilitaire', 'Transport de personnes', 'Autre'],
                    ],
                    ['name' => 'vehicle_brand', 'label' => 'Marque et modèle', 'field_type' => 'text', 'is_required' => true],
                    ['name' => 'vehicle_year', 'label' => 'Année de première mise en circulation', 'field_type' => 'number', 'is_required' => true],
                    [
                        'name' => 'vehicle_usage', 'label' => 'Usage du véhicule', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => ['Personnel', 'Professionnel', 'Transport de marchandises', 'Taxi ou transport de personnes'],
                    ],
                    ['name' => 'vehicle_value', 'label' => 'Valeur estimée du véhicule (FCFA)', 'field_type' => 'number'],
                    [
                        'name' => 'coverage', 'label' => 'Formule souhaitée', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => [
                            'Responsabilité civile (garantie obligatoire)',
                            'Responsabilité civile + vol et incendie',
                            'Tous risques',
                        ],
                    ],
                    ['name' => 'start_date', 'label' => 'Date de début souhaitée', 'field_type' => 'date', 'is_required' => true],
                    ['name' => 'previous_insurance', 'label' => 'Le véhicule est-il déjà assuré ?', 'field_type' => 'select', 'options' => ['Oui', 'Non']],
                    [
                        'name' => 'previous_insurer', 'label' => 'Assureur actuel',
                        'field_type' => 'text',
                        'condition' => ['field' => 'previous_insurance', 'equals' => 'Oui'],
                    ],
                    [
                        'name' => 'claims_3y', 'label' => 'Avez-vous eu des sinistres au cours des 3 dernières années ?',
                        'field_type' => 'select', 'options' => ['Oui', 'Non'],
                    ],
                    ['name' => 'registration_doc', 'label' => 'Carte grise (photo ou PDF)', 'field_type' => 'file'],
                ],
                $this->closingFields()
            ),

            'habitation' => array_merge(
                $this->commonFields(),
                [
                    [
                        'name' => 'property_type', 'label' => 'Type de bien', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => ['Appartement', 'Maison', 'Autre'],
                    ],
                    [
                        'name' => 'occupant_status', 'label' => 'Vous êtes', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => ['Propriétaire', 'Locataire'],
                    ],
                    ['name' => 'property_address', 'label' => 'Adresse du bien (quartier, ville)', 'field_type' => 'text', 'is_required' => true],
                    ['name' => 'surface', 'label' => 'Superficie approximative (m²)', 'field_type' => 'number'],
                    [
                        'name' => 'building_value', 'label' => 'Valeur estimée du bâtiment (FCFA)',
                        'field_type' => 'number',
                        'condition' => ['field' => 'occupant_status', 'equals' => 'Propriétaire'],
                    ],
                    ['name' => 'contents_value', 'label' => 'Valeur estimée des biens à assurer : meubles, appareils (FCFA)', 'field_type' => 'number'],
                    [
                        'name' => 'guarantees', 'label' => 'Garanties souhaitées', 'field_type' => 'multiselect',
                        'is_required' => true,
                        'options' => ['Incendie', 'Dégât des eaux', 'Vol et cambriolage', 'Responsabilité civile'],
                    ],
                    ['name' => 'start_date', 'label' => 'Date de début souhaitée', 'field_type' => 'date', 'is_required' => true],
                ],
                $this->closingFields()
            ),

            'personne' => array_merge(
                $this->commonFields(),
                [
                    [
                        'name' => 'insured_for', 'label' => 'Qui souhaitez-vous assurer ?', 'field_type' => 'select',
                        'is_required' => true,
                        'options' => ['Moi-même', 'Ma famille', 'Mes employés'],
                    ],
                    ['name' => 'birth_date', 'label' => "Date de naissance de l'assuré principal", 'field_type' => 'date', 'is_required' => true],
                    ['name' => 'people_count', 'label' => 'Nombre de personnes à assurer', 'field_type' => 'number', 'is_required' => true],
                    [
                        'name' => 'cover_types', 'label' => 'Couvertures souhaitées', 'field_type' => 'multiselect',
                        'is_required' => true,
                        'options' => ['Hospitalisation et soins', 'Accident corporel', 'Décès et invalidité', 'Épargne et retraite'],
                    ],
                    ['name' => 'start_date', 'label' => 'Date de début souhaitée', 'field_type' => 'date', 'is_required' => true],
                ],
                $this->closingFields()
            ),
        ];

        foreach ($definitions as $slug => $fields) {
            $category = Category::where('slug', $slug)->first();

            if (! $category) {
                $this->command->warn("Catégorie introuvable : {$slug}. Lance d'abord InsuranceFormSeeder.");
                continue;
            }

            foreach ($fields as $index => $field) {
                FormField::updateOrCreate(
                    [
                        'category_id' => $category->id,
                        'form_type'   => 'quote',
                        'name'        => $field['name'],
                    ],
                    [
                        'label'       => $field['label'],
                        'field_type'  => $field['field_type'],
                        'is_required' => $field['is_required'] ?? false,
                        'options'     => $field['options'] ?? null,
                        'condition'   => $field['condition'] ?? null,
                        'sort_order'  => $index + 1,
                        'is_active'   => true,
                    ]
                );
            }
        }
    }

    // Questions communes au début de tous les devis (l'email est demandé à part)
    private function commonFields(): array
    {
        return [
            ['name' => 'full_name', 'label' => 'Nom et prénom', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'phone', 'label' => 'Téléphone', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'city', 'label' => 'Ville', 'field_type' => 'text', 'is_required' => true],
        ];
    }

    // Question commune à la fin de tous les devis
    private function closingFields(): array
    {
        return [
            ['name' => 'comments', 'label' => 'Informations complémentaires', 'field_type' => 'textarea'],
        ];
    }
}