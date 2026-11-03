<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class InsuranceFormSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Les catégories d'assurance
        $categories = [
            ['name' => 'Automobile', 'slug' => 'auto', 'sort_order' => 1],
            ['name' => 'Habitation', 'slug' => 'habitation', 'sort_order' => 2],
            ['name' => 'Personne', 'slug' => 'personne', 'sort_order' => 3],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category + ['is_active' => true]
            );
        }

        // 2. Les questions de la déclaration de sinistre, par catégorie
        $definitions = [
            'auto' => array_merge(
                $this->identityFields(),
                [[
                    'name' => 'nature', 'label' => 'Nature du sinistre', 'field_type' => 'select',
                    'is_required' => true,
                    'options' => ['Accident', 'Vol', 'Incendie', 'Bris de glace', 'Autre'],
                ]],
                $this->incidentFields(),
                [
                    ['name' => 'vehicle_plate', 'label' => 'Immatriculation de votre véhicule', 'field_type' => 'text', 'is_required' => true],
                    ['name' => 'vehicle_model', 'label' => 'Marque et modèle', 'field_type' => 'text'],
                    ['name' => 'driver_name', 'label' => 'Nom du conducteur', 'field_type' => 'text'],
                    ['name' => 'license_number', 'label' => 'Numéro de permis et catégorie', 'field_type' => 'text'],
                    [
                        'name' => 'third_party_involved', 'label' => 'Un tiers est-il impliqué ?',
                        'field_type' => 'select', 'options' => ['Oui', 'Non'],
                    ],
                    [
                        'name' => 'third_party_plate', 'label' => 'Immatriculation du véhicule du tiers',
                        'field_type' => 'text',
                        'condition' => ['field' => 'third_party_involved', 'equals' => 'Oui'],
                    ],
                    [
                        'name' => 'third_party_insurer', 'label' => 'Assureur du tiers',
                        'field_type' => 'text',
                        'condition' => ['field' => 'third_party_involved', 'equals' => 'Oui'],
                    ],
                    ['name' => 'amicable_report', 'label' => 'Un constat amiable a-t-il été établi ?', 'field_type' => 'select', 'options' => ['Oui', 'Non']],
                    ['name' => 'drivable', 'label' => 'Votre véhicule est-il en état de rouler ?', 'field_type' => 'select', 'options' => ['Oui', 'Non']],
                    ['name' => 'injured', 'label' => 'Y a-t-il des blessés ?', 'field_type' => 'select', 'options' => ['Oui', 'Non']],
                    [
                        'name' => 'injured_details', 'label' => 'Nom, âge et état de chaque blessé',
                        'field_type' => 'textarea',
                        'condition' => ['field' => 'injured', 'equals' => 'Oui'],
                    ],
                    ['name' => 'photos', 'label' => 'Photos des dégâts', 'field_type' => 'file'],
                    ['name' => 'documents', 'label' => 'Constat, procès-verbal, carte grise, permis', 'field_type' => 'file'],
                ]
            ),

            'habitation' => array_merge(
                $this->identityFields(),
                [[
                    'name' => 'nature', 'label' => 'Nature du sinistre', 'field_type' => 'select',
                    'is_required' => true,
                    'options' => ['Incendie', 'Dégât des eaux', 'Vol', 'Autre'],
                ]],
                $this->incidentFields(),
                [
                    ['name' => 'property_address', 'label' => 'Adresse du bien sinistré', 'field_type' => 'text', 'is_required' => true],
                    ['name' => 'damaged_items', 'label' => 'Biens endommagés ou volés (description)', 'field_type' => 'textarea', 'is_required' => true],
                    ['name' => 'estimated_value', 'label' => 'Valeur estimée (FCFA)', 'field_type' => 'number'],
                    ['name' => 'photos', 'label' => 'Photos des dégâts', 'field_type' => 'file'],
                    ['name' => 'documents', 'label' => 'Factures ou justificatifs de valeur', 'field_type' => 'file'],
                ]
            ),

            'personne' => array_merge(
                $this->identityFields(),
                [[
                    'name' => 'nature', 'label' => 'Nature du sinistre', 'field_type' => 'select',
                    'is_required' => true,
                    'options' => ['Accident corporel', 'Maladie', 'Hospitalisation', 'Autre'],
                ]],
                $this->incidentFields(),
                [
                    ['name' => 'health_facility', 'label' => 'Structure de santé où la personne a été prise en charge', 'field_type' => 'text'],
                    ['name' => 'injury_description', 'label' => 'État de la personne concernée', 'field_type' => 'textarea'],
                    ['name' => 'medical_certificate', 'label' => 'Certificat médical ou rapport de la structure de santé', 'field_type' => 'file'],
                ]
            ),
        ];

        foreach ($definitions as $slug => $fields) {
            $category = Category::where('slug', $slug)->first();

            foreach ($fields as $index => $field) {
                FormField::updateOrCreate(
                    [
                        'category_id' => $category->id,
                        'form_type'   => 'claim',
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

    // Questions communes au début de tous les formulaires
    private function identityFields(): array
    {
        return [
            ['name' => 'full_name', 'label' => 'Nom et prénom', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'policy_number', 'label' => 'Numéro de police', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'phone', 'label' => 'Téléphone', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'address', 'label' => 'Adresse (quartier, ville)', 'field_type' => 'text', 'is_required' => true],
        ];
    }

    // Questions communes sur le déroulement du sinistre
    private function incidentFields(): array
    {
        return [
            ['name' => 'incident_date', 'label' => 'Date du sinistre', 'field_type' => 'date', 'is_required' => true],
            ['name' => 'incident_place', 'label' => 'Lieu exact', 'field_type' => 'text', 'is_required' => true],
            ['name' => 'description', 'label' => 'Description des circonstances', 'field_type' => 'textarea', 'is_required' => true],
            ['name' => 'police_notified', 'label' => "Les forces de l'ordre ont-elles été prévenues ?", 'field_type' => 'select', 'options' => ['Oui', 'Non']],
        ];
    }
}