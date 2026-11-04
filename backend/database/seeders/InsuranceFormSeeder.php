<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class InsuranceFormSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Les catégories d'assurance (déclaration de sinistre)
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

        $yesNo = ['Oui', 'Non'];

        foreach ($this->definitions($yesNo) as $slug => $sections) {
            $category = Category::where('slug', $slug)->firstOrFail();

            // On repart d'une base propre pour cette catégorie
            FormField::where('category_id', $category->id)
                ->where('form_type', 'claim')
                ->update(['is_active' => false]);

            $order = 0;

            foreach ($sections as $section => $fields) {
                foreach ($fields as $field) {
                    $order++;

                    FormField::updateOrCreate(
                        [
                            'category_id' => $category->id,
                            'form_type'   => 'claim',
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

    // Déclaration de sinistre en 4 étapes, adaptée par catégorie
    private function definitions(array $yesNo): array
    {
        return [
            'auto' => [
                'Identification' => $this->identityFields(),
                'Le sinistre' => $this->incidentFields(
                    ['Accident de la circulation', 'Vol', 'Incendie', 'Bris de glace', 'Vandalisme', 'Tempête ou grêle', 'Autre'],
                    $yesNo
                ),
                'Détails' => array_merge(
                    [
                        $this->f('vehicle_plate', 'Immatriculation de votre véhicule', 'text', true, null, null, 'Ex : LT 123 AB'),
                        $this->f('vehicle_model', 'Marque et modèle', 'text', false, null, null, 'Ex : Toyota Corolla'),
                        $this->f('driver_name', 'Nom du conducteur', 'text', false, null, null, 'Ex : Jean Dupont'),
                        $this->f('driver_phone', 'Téléphone du conducteur', 'text', false, null, null, 'Ex : 6 90 12 34 56'),
                        $this->f('license_number', 'N° de permis et catégorie', 'text', false, null, null, 'Ex : B - 123456'),
                        $this->f('third_party_involved', 'Un tiers est-il impliqué ?', 'select', false, $yesNo),
                        $this->f('third_party_plate', 'Immatriculation du véhicule du tiers', 'text', false, null, $this->when('third_party_involved', 'Oui'), 'Ex : LT 456 CD'),
                        $this->f('third_party_model', 'Marque et modèle du tiers', 'text', false, null, $this->when('third_party_involved', 'Oui'), 'Ex : Hyundai Tucson'),
                        $this->f('third_party_insurer', 'Assureur du tiers et n° de police', 'text', false, null, $this->when('third_party_involved', 'Oui'), 'Ex : Nom de l\'assureur - POL-2024-00456'),
                        $this->f('damages_visible', 'Dommages apparents', 'textarea', false, null, null, 'Ex : Aile avant gauche enfoncée, pare-chocs rayé…'),
                        $this->f('amicable_report', 'Un constat amiable a-t-il été établi ?', 'select', false, $yesNo),
                        $this->f('drivable', 'Votre véhicule est-il en état de rouler ?', 'select', false, $yesNo),
                        $this->f('vehicle_location', 'Lieu actuel du véhicule', 'text', false, null, null, 'Ex : Garage, domicile, fourrière…'),
                    ],
                    $this->corporealFields(),
                    $this->witnessFields()
                ),
                'Pièces et déclaration' => array_merge(
                    $this->documentFields(true, false),
                    $this->declarationFields()
                ),
            ],

            'habitation' => [
                'Identification' => $this->identityFields(),
                'Le sinistre' => $this->incidentFields(
                    ['Incendie', 'Dégât des eaux', 'Vol avec effraction', 'Vandalisme', 'Tempête ou grêle', 'Autre'],
                    $yesNo
                ),
                'Détails' => array_merge(
                    [
                        $this->f('property_address', 'Adresse du bien sinistré', 'text', true, null, null, 'Ex : Akwa, Douala'),
                        $this->f('damaged_items', 'Biens endommagés ou volés (description, date d\'achat, valeur estimée)', 'textarea', true, null, null, 'Ex : Téléviseur 55" (250 000 FCFA), ordinateur portable…'),
                        $this->f('estimated_value', 'Valeur estimée des dommages (FCFA)', 'number', false, null, null, 'Ex : 1 500 000'),
                        $this->f('inhabited', 'Le bien est-il habité ou exploité en ce moment ?', 'select', false, $yesNo),
                    ],
                    $this->corporealFields(),
                    $this->witnessFields()
                ),
                'Pièces et déclaration' => array_merge(
                    $this->documentFields(false, false),
                    $this->declarationFields()
                ),
            ],

            'personne' => [
                'Identification' => $this->identityFields(),
                'Le sinistre' => $this->incidentFields(
                    ['Accident corporel', 'Maladie', 'Hospitalisation', 'Autre'],
                    $yesNo
                ),
                'Détails' => array_merge(
                    [
                        $this->f('injury_description', 'État de la personne concernée', 'textarea', true, null, null, 'Ex : Fracture du bras droit, hospitalisation…'),
                        $this->f('health_facility', 'Structure de santé où la personne a été prise en charge', 'text', false, null, null, 'Ex : Hôpital Général de Douala'),
                        $this->f('deceased', 'Y a-t-il eu un décès ?', 'select', false, $yesNo),
                    ],
                    $this->witnessFields()
                ),
                'Pièces et déclaration' => array_merge(
                    $this->documentFields(false, true),
                    $this->declarationFields()
                ),
            ],
        ];
    }

    // Étape 1 : identification de l'assuré
    private function identityFields(): array
    {
        return [
            $this->f('full_name', 'Nom et prénom', 'text', true, null, null, 'Ex : Jean Dupont'),
            $this->f('policy_number', 'Numéro de police', 'text', true, null, null, 'Ex : POL-2024-00123'),
            $this->f('id_number', 'N° de la pièce d\'identité (CNI ou passeport)', 'text', false, null, null, 'Ex : 1087654321'),
            $this->f('phone', 'Téléphone', 'text', true, null, null, 'Ex : 6 90 12 34 56'),
            $this->f('address', 'Adresse (quartier, ville)', 'text', true, null, null, 'Ex : Akwa, Douala'),
        ];
    }

    // Étape 2 : le sinistre
    private function incidentFields(array $natureOptions, array $yesNo): array
    {
        return [
            $this->f('nature', 'Nature du sinistre', 'select', true, $natureOptions),
            $this->f('incident_date', 'Date du sinistre', 'date', true),
            $this->f('incident_time', 'Heure approximative', 'text', false, null, null, 'Ex : 14h30'),
            $this->f('incident_place', 'Lieu exact', 'text', true, null, null, 'Ex : Carrefour Arno, Douala'),
            $this->f('description', 'Description des circonstances', 'textarea', true, null, null, 'Décrivez en détail ce qui s\'est passé, les dommages constatés…'),
            $this->f('known_date', 'Date à laquelle vous avez eu connaissance du sinistre', 'date', false),
            $this->f('police_notified', 'Les forces de l\'ordre ont-elles été prévenues ?', 'select', false, $yesNo),
        ];
    }

    // Dommages corporels (toutes catégories sauf Personne, qui a ses champs dédiés)
    private function corporealFields(): array
    {
        return [
            $this->f('injured', 'Y a-t-il des blessés ?', 'select', false, ['Oui', 'Non']),
            $this->f('injured_details', 'Nom, âge et état de chaque blessé', 'textarea', false, null, $this->when('injured', 'Oui'), 'Ex : Paul Mbarga, 34 ans, blessure légère à la jambe'),
        ];
    }

    // Témoins et tiers
    private function witnessFields(): array
    {
        return [
            $this->f('witnesses', 'Témoins et tiers (nom, téléphone, qualité)', 'textarea', false, null, null, 'Ex : Marie Kamga, 6 90 00 00 00, témoin'),
        ];
    }

    // Étape 4 : pièces justificatives
    private function documentFields(bool $auto, bool $personne): array
    {
        $fields = [
            $this->f('id_document', 'Copie de la pièce d\'identité (CNI ou passeport)', 'file'),
            $this->f('policy_document', 'Copie de l\'attestation ou de la police d\'assurance', 'file'),
            $this->f('photos', 'Photos des dégâts ou justificatifs', 'file'),
        ];

        if ($auto) {
            $fields[] = $this->f('report_document', 'Constat amiable ou procès-verbal de police', 'file');
            $fields[] = $this->f('vehicle_documents', 'Carte grise et permis de conduire', 'file');
        } elseif ($personne) {
            $fields[] = $this->f('medical_certificate', 'Certificat médical ou rapport de la structure de santé', 'file');
        } else {
            $fields[] = $this->f('report_document', 'Constat, procès-verbal ou devis de réparation', 'file');
        }

        $fields[] = $this->f('documents', 'Autres justificatifs (factures, devis…)', 'file');

        return $fields;
    }

    // Déclaration sur l'honneur + signature
    private function declarationFields(): array
    {
        return [
            $this->f('honor_declaration', 'Je certifie sur l\'honneur que les informations fournies sont exactes et complètes. Je reconnais que toute fausse déclaration peut entraîner la déchéance de ma garantie.', 'checkbox', true),
            $this->f('signature_name', 'Nom et prénom (signature)', 'text', true, null, null, 'Ex : Jean Dupont'),
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
