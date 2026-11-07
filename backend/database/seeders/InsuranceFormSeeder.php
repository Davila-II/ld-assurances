<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class InsuranceFormSeeder extends Seeder
{
    public function run(): void
    {
        // Supprime l'ancienne catégorie monolithique 'sinistre' si elle n'a plus de soumissions
        $legacy = Category::where('slug', 'sinistre')->first();
        if ($legacy && ! $legacy->submissions()->exists()) {
            $legacy->fields()->delete();
            $legacy->delete();
        }

        $yesNo = ['Oui', 'Non'];

        $commonIncident = [
            $this->f('incident_date', 'Date du sinistre', 'date', true),
            $this->f('incident_time', 'Heure approximative', 'text', false, null, null, 'Ex : 14h30'),
            $this->f('incident_place', 'Lieu exact', 'text', true, null, null, 'Ex : Carrefour Poste, Yaoundé'),
            $this->f('description', 'Description des circonstances', 'textarea', true, null, null, 'Décrivez en détail ce qui s\'est passé, les dommages constatés…'),
            $this->f('known_date', 'Date à laquelle vous avez eu connaissance du sinistre', 'date', false),
            $this->f('police_notified', 'Les forces de l\'ordre ont-elles été prévenues ?', 'select', false, $yesNo),
        ];

        $commonCorporealAndWitness = [
            $this->f('injured', 'Y a-t-il des blessés ?', 'select', false, $yesNo),
            $this->f('injured_details', 'Nom, âge et état de chaque blessé', 'textarea', false, null, $this->when('injured', 'Oui'), 'Ex : Paul Mbarga, 34 ans, blessure légère'),
            $this->f('witnesses', 'Témoins et tiers (nom, téléphone, qualité)', 'textarea', false, null, null, 'Ex : Marie Kamga, 6 90 00 00 00, témoin'),
        ];

        $commonDocumentsAndDeclaration = [
            $this->f('id_document', 'Copie de la pièce d\'identité (CNI ou passeport)', 'file'),
            $this->f('policy_document', 'Copie de l\'attestation ou de la police d\'assurance', 'file'),
            $this->f('photos', 'Photos des dégâts ou justificatifs', 'file'),
            $this->f('documents', 'Autres justificatifs (constat, PV, carte grise, permis, certificat médical, factures…)', 'file'),
            $this->f('honor_declaration', 'Je certifie sur l\'honneur que les informations fournies sont exactes et complètes. Je reconnais que toute fausse déclaration peut entraîner la déchéance de ma garantie.', 'checkbox', true),
            $this->f('signature_name', 'Nom et prénom (signature)', 'text', true, null, null, 'Ex : Jean Dupont'),
        ];

        $commonIdentification = [
            $this->f('full_name', 'Nom et prénom', 'text', true, null, null, 'Ex : Jean Dupont'),
            $this->f('profession', 'Profession', 'text', false, null, null, 'Ex : Commerçant'),
            $this->f('policy_number', 'Numéro de police', 'text', true, null, null, 'Ex : POL-2024-00123'),
            $this->f('agency', 'Agence ou courtier émetteur', 'text', false, null, null, 'Ex : Agence Akwa'),
            $this->f('id_number', 'N° de la pièce d\'identité (CNI ou passeport)', 'text', false, null, null, 'Ex : 1087654321'),
            $this->f('phone', 'Téléphone', 'text', true, null, null, 'Ex : 6 90 12 34 56'),
            $this->f('address', 'Adresse (quartier, ville)', 'text', true, null, null, 'Ex : Akwa, Douala'),
        ];

        $categoryForms = [
            'auto' => [
                'Votre sinistre' => $commonIncident,
                'Détails du véhicule' => array_merge($this->autoSpecificFields($yesNo), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'habitation' => [
                'Votre sinistre' => $commonIncident,
                'Détails du bien' => array_merge($this->habitationSpecificFields($yesNo), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'personne' => [
                'Votre sinistre' => $commonIncident,
                'Détails médicaux' => array_merge($this->santeSpecificFields($yesNo), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'responsabilite-civile' => [
                'Votre sinistre' => $commonIncident,
                'Détails du dommage' => array_merge($this->rcSpecificFields(), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'professionnelle' => [
                'Votre sinistre' => $commonIncident,
                'Détails de l\'exploitation' => array_merge($this->entrepriseSpecificFields(), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'voyage' => [
                'Votre sinistre' => $commonIncident,
                'Détails du transport / voyage' => array_merge($this->transportSpecificFields(), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
            'autres' => [
                'Votre sinistre' => $commonIncident,
                'Détails du sinistre' => array_merge($this->autreSpecificFields(), $commonCorporealAndWitness),
                'Pièces et déclaration' => $commonDocumentsAndDeclaration,
                'Identification' => $commonIdentification,
            ],
        ];

        foreach ($categoryForms as $slug => $sections) {
            $cat = Category::where('slug', $slug)->first();
            if (! $cat) {
                continue;
            }

            // Supprime les anciens champs de sinistre pour cette catégorie afin d'avoir un état propre
            FormField::where('category_id', $cat->id)->where('form_type', 'claim')->delete();

            $order = 0;
            foreach ($sections as $sectionName => $fields) {
                foreach ($fields as $field) {
                    $order++;
                    FormField::create([
                        'category_id' => $cat->id,
                        'form_type'   => 'claim',
                        'name'        => $field['name'],
                        'label'       => $field['label'],
                        'placeholder' => $field['placeholder'] ?? null,
                        'section'     => $sectionName,
                        'field_type'  => $field['field_type'],
                        'is_required' => $field['is_required'],
                        'options'     => $field['options'],
                        'condition'   => $field['condition'],
                        'sort_order'  => $order,
                        'is_active'   => true,
                    ]);
                }
            }
        }
    }

    private function autoSpecificFields(array $yesNo): array
    {
        return [
            $this->f('vehicle_plate', 'Immatriculation du véhicule', 'text', true, null, null, 'Ex : LT 123 AB'),
            $this->f('chassis_number', 'Numéro de châssis', 'text', false, null, null, 'Ex : VF1…'),
            $this->f('vehicle_model', 'Marque et modèle', 'text', false, null, null, 'Ex : Toyota Corolla'),
            $this->f('driver_name', 'Nom du conducteur', 'text', false, null, null, 'Ex : Jean Dupont'),
            $this->f('driver_phone', 'Téléphone du conducteur', 'text', false, null, null, 'Ex : 6 90 12 34 56'),
            $this->f('license_number', 'N° de permis et catégorie', 'text', false, null, null, 'Ex : B - 123456'),
            $this->f('tech_inspection_valid', 'La visite technique est-elle valide ?', 'select', false, $yesNo),
            $this->f('third_party_involved', 'Un tiers est-il impliqué ?', 'select', false, $yesNo),
            $this->f('third_party_plate', 'Immatriculation du véhicule du tiers', 'text', false, null, $this->when('third_party_involved', 'Oui'), 'Ex : LT 456 CD'),
            $this->f('third_party_insurer', 'Assureur du tiers et n° de police', 'text', false, null, $this->when('third_party_involved', 'Oui'), 'Ex : Nom de l\'assureur - POL-…'),
            $this->f('damages_visible', 'Dommages apparents', 'textarea', false, null, null, 'Ex : Aile avant gauche enfoncée…'),
            $this->f('amicable_report', 'Un constat amiable a-t-il été établi ?', 'select', false, $yesNo),
            $this->f('ida_convention', 'J\'accepte l\'application de la Convention IDA (indemnisation directe de l\'assuré)', 'checkbox', false),
            $this->f('drivable', 'Votre véhicule est-il en état de rouler ?', 'select', false, $yesNo),
            $this->f('vehicle_location', 'Lieu actuel du véhicule', 'text', false, null, null, 'Ex : Garage, domicile, fourrière…'),
            $this->f('police_report_ref', 'Référence du procès-verbal (si établi)', 'text', false, null, null, 'Ex : PV n°123/2024'),
        ];
    }

    private function habitationSpecificFields(array $yesNo): array
    {
        return [
            $this->f('property_address', 'Adresse du bien sinistré', 'text', true, null, null, 'Ex : Akwa, Douala'),
            $this->f('damaged_items', 'Biens endommagés ou volés (description, date d\'achat, valeur estimée)', 'textarea', true, null, null, 'Ex : Téléviseur 55" (250 000 FCFA)…'),
            $this->f('estimated_value', 'Valeur estimée des dommages (FCFA)', 'number', false, null, null, 'Ex : 1 500 000'),
            $this->f('inhabited', 'Le bien est-il habité ou exploité en ce moment ?', 'select', false, $yesNo),
        ];
    }

    private function santeSpecificFields(array $yesNo): array
    {
        return [
            $this->f('injury_description', 'État de la personne concernée', 'textarea', true, null, null, 'Ex : Fracture du bras droit…'),
            $this->f('health_facility', 'Structure de santé où la personne a été prise en charge', 'text', false, null, null, 'Ex : Hôpital Général de Douala'),
            $this->f('doctor_signature', 'Nom et visa du médecin traitant', 'text', false, null, null, 'Ex : Dr Kamga'),
            $this->f('deceased', 'Y a-t-il eu un décès ?', 'select', false, $yesNo),
        ];
    }

    private function rcSpecificFields(): array
    {
        return [
            $this->f('rc_description', 'Décrivez le dommage causé à autrui', 'textarea', true, null, null, 'Ex : Chute d\'un arbre chez le voisin…'),
            $this->f('third_party_name', 'Nom de la victime (tiers lésé)', 'text', false, null, null, 'Ex : Paul Mbarga'),
            $this->f('third_party_phone', 'Téléphone du tiers', 'text', false, null, null, 'Ex : 6 90 00 00 00'),
        ];
    }

    private function entrepriseSpecificFields(): array
    {
        return [
            $this->f('business_description', 'Description du sinistre d\'exploitation', 'textarea', true, null, null, 'Ex : Incendie dans l\'entrepôt…'),
            $this->f('business_value', 'Valeur estimée des pertes (FCFA)', 'number', false, null, null, 'Ex : 5 000 000'),
        ];
    }

    private function transportSpecificFields(): array
    {
        return [
            $this->f('transport_description', 'Description du sinistre transport / voyage', 'textarea', true, null, null, 'Ex : Marchandise endommagée…'),
            $this->f('cargo_value', 'Valeur estimée de la marchandise ou du bagage (FCFA)', 'number', false, null, null, 'Ex : 2 000 000'),
            $this->f('transport_route', 'Itinéraire ou destination', 'text', false, null, null, 'Ex : Douala → Bafoussam'),
        ];
    }

    private function autreSpecificFields(): array
    {
        return [
            $this->f('other_description', 'Décrivez en détail la nature exacte de votre sinistre', 'textarea', true, null, null, 'Ex : Précisez ici…'),
        ];
    }

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

    private function when(string $field, string $equals): array
    {
        return ['field' => $field, 'equals' => $equals];
    }
}
