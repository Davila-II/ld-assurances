<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use App\Models\Submission;
use Illuminate\Database\Seeder;

class InsuranceFormSeeder extends Seeder
{
    public function run(): void
    {
        // Supprime l'ancienne catégorie monolithique 'sinistre' si présente
        $legacy = Category::where('slug', 'sinistre')->first();
        if ($legacy) {
            $legacy->fields()->delete();
            if (! $legacy->submissions()->exists()) {
                $legacy->delete();
            }
        }

        $yesNo = ['Oui', 'Non'];
        $yesNoEn = ['Yes', 'No'];

        $claimCategories = [
            'sinistre-auto' => [
                'name'       => 'Sinistre Automobile',
                'name_en'    => 'Motor Claim',
                'sort_order' => 1,
            ],
            'sinistre-habitation' => [
                'name'       => 'Sinistre Habitation',
                'name_en'    => 'Home Claim',
                'sort_order' => 2,
            ],
            'sinistre-sante' => [
                'name'       => 'Sinistre Santé',
                'name_en'    => 'Health Claim',
                'sort_order' => 3,
            ],
            'sinistre-rc' => [
                'name'       => 'Sinistre Responsabilité Civile',
                'name_en'    => 'Liability Claim',
                'sort_order' => 4,
            ],
            'sinistre-professionnelle' => [
                'name'       => 'Sinistre Entreprise',
                'name_en'    => 'Business Claim',
                'sort_order' => 5,
            ],
            'sinistre-voyage' => [
                'name'       => 'Sinistre Transport / Voyage',
                'name_en'    => 'Travel / Transport Claim',
                'sort_order' => 6,
            ],
            'sinistre-autres' => [
                'name'       => 'Autre sinistre',
                'name_en'    => 'Other Claim',
                'sort_order' => 7,
            ],
        ];

        // Création ou mise à jour des catégories dédiées aux déclarations de sinistres
        $catModels = [];
        foreach ($claimCategories as $slug => $data) {
            $catModels[$slug] = Category::updateOrCreate(
                ['slug' => $slug],
                [
                    'name'       => $data['name'],
                    'name_en'    => $data['name_en'],
                    'form_type'  => 'claim',
                    'sort_order' => $data['sort_order'],
                    'is_active'  => true,
                ]
            );
        }

        // Rattachement des soumissions de sinistre historiques aux nouvelles catégories
        if (isset($catModels['sinistre-sante'])) {
            Submission::where('form_type', 'claim')->where('id', 2)->update(['category_id' => $catModels['sinistre-sante']->id]);
        }
        if (isset($catModels['sinistre-voyage'])) {
            Submission::where('form_type', 'claim')->where('id', 3)->update(['category_id' => $catModels['sinistre-voyage']->id]);
        }

        $commonIncident = [
            $this->f('incident_date', 'Date du sinistre', 'Date of incident', 'date', true),
            $this->f('incident_time', 'Heure approximative', 'Approximate time', 'text', false, null, null, null, 'Ex : 14h30', 'E.g., 2:30 PM'),
            $this->f('incident_place', 'Lieu exact', 'Exact location', 'text', true, null, null, null, 'Ex : Carrefour Poste, Yaoundé', 'E.g., Post Office junction, Yaounde'),
            $this->f('description', 'Description des circonstances', 'Description of circumstances', 'textarea', true, null, null, null, 'Décrivez en détail ce qui s\'est passé, les dommages constatés…', 'Describe in detail what happened and visible damage...'),
            $this->f('known_date', 'Date à laquelle vous avez eu connaissance du sinistre', 'Date you became aware of the incident', 'date', false),
            $this->f('police_notified', 'Les forces de l\'ordre ont-elles été prévenues ?', 'Were authorities notified?', 'select', false, $yesNo, $yesNoEn),
        ];

        $commonCorporealAndWitness = [
            $this->f('injured', 'Y a-t-il des blessés ?', 'Are there any injured persons?', 'select', false, $yesNo, $yesNoEn),
            $this->f('injured_details', 'Nom, âge et état de chaque blessé', 'Name, age and condition of each injured person', 'textarea', false, null, null, $this->when('injured', 'Oui'), 'Ex : Paul Mbarga, 34 ans, blessure légère', 'E.g., John Doe, 34 yrs, minor injury'),
            $this->f('witnesses', 'Témoins et tiers (nom, téléphone, qualité)', 'Witnesses and third parties (name, phone, role)', 'textarea', false, null, null, null, 'Ex : Marie Kamga, 6 90 00 00 00, témoin', 'E.g., Mary Doe, 6 90 00 00 00, witness'),
        ];

        $commonDocumentsAndDeclaration = [
            $this->f('id_document', 'Copie de la pièce d\'identité (CNI ou passeport)', 'Copy of National ID or Passport', 'file'),
            $this->f('policy_document', 'Copie de l\'attestation ou de la police d\'assurance', 'Copy of insurance certificate or policy', 'file'),
            $this->f('photos', 'Photos des dégâts ou justificatifs', 'Photos of damage or proof', 'file'),
            $this->f('documents', 'Autres justificatifs (constat, PV, carte grise, permis, certificat médical, factures…)', 'Other supporting documents (joint report, police report, medical certificate...)', 'file'),
            $this->f('honor_declaration', 'Je certifie sur l\'honneur que les informations fournies sont exactes et complètes.', 'I solemnly declare that the information provided is accurate and complete.', 'checkbox', true),
            $this->f('signature_name', 'Nom et prénom (signature)', 'Full name (signature)', 'text', true, null, null, null, 'Ex : Jean Dupont', 'E.g., John Doe'),
        ];

        $commonIdentification = [
            $this->f('full_name', 'Nom et prénom', 'Full name', 'text', true, null, null, null, 'Ex : Jean Dupont', 'E.g., John Doe'),
            $this->f('profession', 'Profession', 'Profession / Occupation', 'text', false, null, null, null, 'Ex : Commerçant', 'E.g., Trader'),
            $this->f('policy_number', 'Numéro de police', 'Policy number', 'text', true, null, null, null, 'Ex : POL-2024-00123', 'E.g., POL-2024-00123'),
            $this->f('agency', 'Agence ou courtier émetteur', 'Issuing branch or broker', 'text', false, null, null, null, 'Ex : Agence Akwa', 'E.g., Akwa Branch'),
            $this->f('id_number', 'N° de la pièce d\'identité (CNI ou passeport)', 'National ID or Passport number', 'text', false, null, null, null, 'Ex : 1087654321', 'E.g., 1087654321'),
            $this->f('phone', 'Téléphone', 'Phone number', 'text', true, null, null, null, 'Ex : 6 90 12 34 56', 'E.g., 6 90 12 34 56'),
            $this->f('address', 'Adresse (quartier, ville)', 'Address (neighbourhood, city)', 'text', true, null, null, null, 'Ex : Akwa, Douala', 'E.g., Akwa, Douala'),
        ];

        $categoryForms = [
            'sinistre-auto' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails du véhicule', 'Vehicle details', array_merge($this->autoSpecificFields($yesNo, $yesNoEn), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-habitation' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails du bien', 'Property details', array_merge($this->habitationSpecificFields($yesNo, $yesNoEn), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-sante' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails médicaux', 'Medical details', array_merge($this->santeSpecificFields($yesNo, $yesNoEn), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-rc' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails du dommage', 'Damage details', array_merge($this->rcSpecificFields(), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-professionnelle' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails de l\'exploitation', 'Business details', array_merge($this->entrepriseSpecificFields(), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-voyage' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails du transport / voyage', 'Transport & travel details', array_merge($this->transportSpecificFields(), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
            'sinistre-autres' => [
                ['Votre sinistre', 'Your incident', $commonIncident],
                ['Détails du sinistre', 'Claim details', array_merge($this->autreSpecificFields(), $commonCorporealAndWitness)],
                ['Pièces et déclaration', 'Documents & declaration', $commonDocumentsAndDeclaration],
                ['Identification', 'Identification', $commonIdentification],
            ],
        ];

        foreach ($categoryForms as $slug => $sections) {
            $cat = $catModels[$slug] ?? null;
            if (! $cat) {
                continue;
            }

            FormField::where('category_id', $cat->id)->where('form_type', 'claim')->delete();

            $order = 0;
            foreach ($sections as [$sectionNameFr, $sectionNameEn, $fields]) {
                foreach ($fields as $field) {
                    $order++;
                    FormField::create([
                        'category_id'    => $cat->id,
                        'form_type'      => 'claim',
                        'name'           => $field['name'],
                        'label'          => $field['label'],
                        'label_en'       => $field['label_en'] ?? null,
                        'placeholder'    => $field['placeholder'] ?? null,
                        'placeholder_en' => $field['placeholder_en'] ?? null,
                        'section'        => $sectionNameFr,
                        'section_en'     => $sectionNameEn,
                        'field_type'     => $field['field_type'],
                        'is_required'    => $field['is_required'],
                        'options'        => $field['options'],
                        'options_en'     => $field['options_en'] ?? null,
                        'condition'      => $field['condition'],
                        'sort_order'     => $order,
                        'is_active'      => true,
                    ]);
                }
            }
        }
    }

    private function autoSpecificFields(array $yesNo, array $yesNoEn): array
    {
        return [
            $this->f('vehicle_plate', 'Immatriculation du véhicule', 'Vehicle registration plate', 'text', true, null, null, null, 'Ex : LT 123 AB', 'E.g., LT 123 AB'),
            $this->f('chassis_number', 'Numéro de châssis', 'Chassis number (VIN)', 'text', false, null, null, null, 'Ex : VF1…', 'E.g., VF1...'),
            $this->f('vehicle_model', 'Marque et modèle', 'Vehicle make and model', 'text', false, null, null, null, 'Ex : Toyota Corolla', 'E.g., Toyota Corolla'),
            $this->f('driver_name', 'Nom du conducteur', 'Driver name', 'text', false, null, null, null, 'Ex : Jean Dupont', 'E.g., John Doe'),
            $this->f('driver_phone', 'Téléphone du conducteur', 'Driver phone number', 'text', false, null, null, null, 'Ex : 6 90 12 34 56', 'E.g., 6 90 12 34 56'),
            $this->f('license_number', 'N° de permis et catégorie', 'Driver licence number & category', 'text', false, null, null, null, 'Ex : B - 123456', 'E.g., B - 123456'),
            $this->f('tech_inspection_valid', 'La visite technique est-elle valide ?', 'Is roadworthiness inspection valid?', 'select', false, $yesNo, $yesNoEn),
            $this->f('third_party_involved', 'Un tiers est-il impliqué ?', 'Is a third party involved?', 'select', false, $yesNo, $yesNoEn),
            $this->f('third_party_plate', 'Immatriculation du véhicule du tiers', 'Third party vehicle registration', 'text', false, null, null, $this->when('third_party_involved', 'Oui'), 'Ex : LT 456 CD', 'E.g., LT 456 CD'),
            $this->f('third_party_insurer', 'Assureur du tiers et n° de police', 'Third party insurer & policy number', 'text', false, null, null, $this->when('third_party_involved', 'Oui'), 'Ex : Nom de l\'assureur - POL-…', 'E.g., Insurer name - POL-...'),
            $this->f('damages_visible', 'Dommages apparents', 'Visible damage', 'textarea', false, null, null, null, 'Ex : Aile avant gauche enfoncée…', 'E.g., Front left bumper damaged...'),
            $this->f('amicable_report', 'Un constat amiable a-t-il été établi ?', 'Was a joint report signed?', 'select', false, $yesNo, $yesNoEn),
            $this->f('ida_convention', 'J\'accepte l\'application de la Convention IDA', 'I accept IDA direct settlement convention', 'checkbox', false),
            $this->f('drivable', 'Votre véhicule est-il en état de rouler ?', 'Is your vehicle driveable?', 'select', false, $yesNo, $yesNoEn),
            $this->f('vehicle_location', 'Lieu actuel du véhicule', 'Current location of vehicle', 'text', false, null, null, null, 'Ex : Garage, domicile, fourrière…', 'E.g., Garage, home, impound...'),
            $this->f('police_report_ref', 'Référence du procès-verbal (si établi)', 'Police report reference number', 'text', false, null, null, null, 'Ex : PV n°123/2024', 'E.g., Report #123/2024'),
        ];
    }

    private function habitationSpecificFields(array $yesNo, array $yesNoEn): array
    {
        return [
            $this->f('property_address', 'Adresse du bien sinistré', 'Address of damaged property', 'text', true, null, null, null, 'Ex : Akwa, Douala', 'E.g., Akwa, Douala'),
            $this->f('damaged_items', 'Biens endommagés ou volés (description, date d\'achat, valeur estimée)', 'Damaged or stolen items (description, purchase date, estimated value)', 'textarea', true, null, null, null, 'Ex : Téléviseur 55" (250 000 FCFA)…', 'E.g., 55" TV (250,000 FCFA)...'),
            $this->f('estimated_value', 'Valeur estimée des dommages (FCFA)', 'Estimated damage value (FCFA)', 'number', false, null, null, null, 'Ex : 1 500 000', 'E.g., 1,500,000'),
            $this->f('inhabited', 'Le bien est-il habité ou exploité en ce moment ?', 'Is the property currently inhabited or operated?', 'select', false, $yesNo, $yesNoEn),
        ];
    }

    private function santeSpecificFields(array $yesNo, array $yesNoEn): array
    {
        return [
            $this->f('injury_description', 'État de la personne concernée', 'Condition of the person concerned', 'textarea', true, null, null, null, 'Ex : Fracture du bras droit…', 'E.g., Right arm fracture...'),
            $this->f('health_facility', 'Structure de santé où la personne a été prise en charge', 'Healthcare facility / Hospital', 'text', false, null, null, null, 'Ex : Hôpital Général de Douala', 'E.g., Douala General Hospital'),
            $this->f('doctor_signature', 'Nom et visa du médecin traitant', 'Attending physician name', 'text', false, null, null, null, 'Ex : Dr Kamga', 'E.g., Dr Kamga'),
            $this->f('deceased', 'Y a-t-il eu un décès ?', 'Has a death occurred?', 'select', false, $yesNo, $yesNoEn),
        ];
    }

    private function rcSpecificFields(): array
    {
        return [
            $this->f('rc_description', 'Décrivez le dommage causé à autrui', 'Describe damage caused to third party', 'textarea', true, null, null, null, 'Ex : Chute d\'un arbre chez le voisin…', 'E.g., Tree fell on neighbor\'s roof...'),
            $this->f('third_party_name', 'Nom de la victime (tiers lésé)', 'Third party / victim name', 'text', false, null, null, null, 'Ex : Paul Mbarga', 'E.g., Paul Mbarga'),
            $this->f('third_party_phone', 'Téléphone du tiers', 'Third party phone number', 'text', false, null, null, null, 'Ex : 6 90 00 00 00', 'E.g., 6 90 00 00 00'),
        ];
    }

    private function entrepriseSpecificFields(): array
    {
        return [
            $this->f('business_description', 'Description du sinistre d\'exploitation', 'Description of business claim', 'textarea', true, null, null, null, 'Ex : Incendie dans l\'entrepôt…', 'E.g., Warehouse fire...'),
            $this->f('business_value', 'Valeur estimée des pertes (FCFA)', 'Estimated business losses (FCFA)', 'number', false, null, null, null, 'Ex : 5 000 000', 'E.g., 5,000,000'),
        ];
    }

    private function transportSpecificFields(): array
    {
        return [
            $this->f('transport_description', 'Description du sinistre transport / voyage', 'Description of transport/travel claim', 'textarea', true, null, null, null, 'Ex : Marchandise endommagée…', 'E.g., Cargo damaged during transit...'),
            $this->f('cargo_value', 'Valeur estimée de la marchandise ou du bagage (FCFA)', 'Estimated value of cargo or luggage (FCFA)', 'number', false, null, null, null, 'Ex : 2 000 000', 'E.g., 2,000,000'),
            $this->f('transport_route', 'Itinéraire ou destination', 'Route or destination', 'text', false, null, null, null, 'Ex : Douala → Bafoussam', 'E.g., Douala → Bafoussam'),
        ];
    }

    private function autreSpecificFields(): array
    {
        return [
            $this->f('other_description', 'Décrivez en détail la nature exacte de votre sinistre', 'Describe in detail the exact nature of your claim', 'textarea', true, null, null, null, 'Ex : Précisez ici…', 'E.g., Please specify here...'),
        ];
    }

    private function f(
        string $name,
        string $label,
        ?string $labelEn = null,
        string $type = 'text',
        bool $required = false,
        ?array $options = null,
        ?array $optionsEn = null,
        ?array $condition = null,
        ?string $placeholder = null,
        ?string $placeholderEn = null
    ): array {
        return [
            'name'           => $name,
            'label'          => $label,
            'label_en'       => $labelEn,
            'field_type'     => $type,
            'is_required'    => $required,
            'options'        => $options,
            'options_en'     => $optionsEn,
            'condition'      => $condition,
            'placeholder'    => $placeholder,
            'placeholder_en' => $placeholderEn,
        ];
    }

    private function when(string $field, string $equals): array
    {
        return ['field' => $field, 'equals' => $equals];
    }
}
