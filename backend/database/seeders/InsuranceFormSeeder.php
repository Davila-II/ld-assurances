<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FormField;
use Illuminate\Database\Seeder;

class InsuranceFormSeeder extends Seeder
{
    public function run(): void
    {
        // Un seul formulaire de déclaration de sinistre, qui s'adapte au type choisi.
        Category::updateOrCreate(
            ['slug' => 'sinistre'],
            ['name' => 'Déclaration de sinistre', 'sort_order' => 1, 'is_active' => true]
        );

        // Les anciens formulaires de sinistre par catégorie sont remplacés par ce formulaire général
        FormField::where('form_type', 'claim')->update(['is_active' => false]);

        $category = Category::where('slug', 'sinistre')->firstOrFail();
        $yesNo = ['Oui', 'Non'];
        $types = [
            'Automobile', 'Habitation', 'Santé', 'Responsabilité civile',
            'Transport', 'Agricole', 'Entreprise', 'Autre',
        ];

        $order = 0;

        foreach ($this->definitions($yesNo, $types) as $section => $fields) {
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

    // Déclaration de sinistre en 4 étapes, avec des champs conditionnels selon le type
    private function definitions(array $yesNo, array $types): array
    {
        return [
            'Identification' => [
                $this->f('full_name', 'Nom et prénom', 'text', true, null, null, 'Ex : Jean Dupont'),
                $this->f('profession', 'Profession', 'text', false, null, null, 'Ex : Commerçant'),
                $this->f('policy_number', 'Numéro de police', 'text', true, null, null, 'Ex : POL-2024-00123'),
                $this->f('agency', 'Agence ou courtier émetteur', 'text', false, null, null, 'Ex : Agence Akwa'),
                $this->f('id_number', 'N° de la pièce d\'identité (CNI ou passeport)', 'text', false, null, null, 'Ex : 1087654321'),
                $this->f('phone', 'Téléphone', 'text', true, null, null, 'Ex : 6 90 12 34 56'),
                $this->f('address', 'Adresse (quartier, ville)', 'text', true, null, null, 'Ex : Akwa, Douala'),
            ],

            'Votre sinistre' => [
                $this->f('sinistre_type', 'Type de sinistre', 'select', true, $types),
                $this->f('incident_date', 'Date du sinistre', 'date', true),
                $this->f('incident_time', 'Heure approximative', 'text', false, null, null, 'Ex : 14h30'),
                $this->f('incident_place', 'Lieu exact', 'text', true, null, null, 'Ex : Carrefour Poste, Yaoundé'),
                $this->f('description', 'Description des circonstances', 'textarea', true, null, null, 'Décrivez en détail ce qui s\'est passé, les dommages constatés…'),
                $this->f('known_date', 'Date à laquelle vous avez eu connaissance du sinistre', 'date', false),
                $this->f('police_notified', 'Les forces de l\'ordre ont-elles été prévenues ?', 'select', false, $yesNo),
            ],

            'Détails' => array_merge(
                $this->autoFields($yesNo),
                $this->habitationFields($yesNo),
                $this->santeFields($yesNo),
                $this->rcFields(),
                $this->transportFields(),
                $this->agricoleFields(),
                $this->entrepriseFields(),
                $this->autreFields(),
                $this->corporealFields(),
                $this->witnessFields()
            ),

            'Pièces et déclaration' => array_merge(
                $this->documentFields(),
                $this->declarationFields()
            ),
        ];
    }

    // --- Détails conditionnels par type de sinistre ---

    private function autoFields(array $yesNo): array
    {
        $c = $this->when('sinistre_type', 'Automobile');

        return [
            $this->f('vehicle_plate', 'Immatriculation du véhicule', 'text', true, null, $c, 'Ex : LT 123 AB'),
            $this->f('chassis_number', 'Numéro de châssis', 'text', false, null, $c, 'Ex : VF1…'),
            $this->f('vehicle_model', 'Marque et modèle', 'text', false, null, $c, 'Ex : Toyota Corolla'),
            $this->f('driver_name', 'Nom du conducteur', 'text', false, null, $c, 'Ex : Jean Dupont'),
            $this->f('driver_phone', 'Téléphone du conducteur', 'text', false, null, $c, 'Ex : 6 90 12 34 56'),
            $this->f('license_number', 'N° de permis et catégorie', 'text', false, null, $c, 'Ex : B - 123456'),
            $this->f('tech_inspection_valid', 'La visite technique est-elle valide ?', 'select', false, $yesNo, $c),
            $this->f('third_party_involved', 'Un tiers est-il impliqué ?', 'select', false, $yesNo, $c),
            $this->f('third_party_plate', 'Immatriculation du véhicule du tiers', 'text', false, null, $c, 'Ex : LT 456 CD'),
            $this->f('third_party_insurer', 'Assureur du tiers et n° de police', 'text', false, null, $c, 'Ex : Nom de l\'assureur - POL-…'),
            $this->f('damages_visible', 'Dommages apparents', 'textarea', false, null, $c, 'Ex : Aile avant gauche enfoncée…'),
            $this->f('amicable_report', 'Un constat amiable a-t-il été établi ?', 'select', false, $yesNo, $c),
            $this->f('ida_convention', 'J\'accepte l\'application de la Convention IDA (indemnisation directe de l\'assuré)', 'checkbox', false, null, $c),
            $this->f('drivable', 'Votre véhicule est-il en état de rouler ?', 'select', false, $yesNo, $c),
            $this->f('vehicle_location', 'Lieu actuel du véhicule', 'text', false, null, $c, 'Ex : Garage, domicile, fourrière…'),
            $this->f('police_report_ref', 'Référence du procès-verbal (si établi)', 'text', false, null, $c, 'Ex : PV n°123/2024'),
        ];
    }

    private function habitationFields(array $yesNo): array
    {
        $c = $this->when('sinistre_type', 'Habitation');

        return [
            $this->f('property_address', 'Adresse du bien sinistré', 'text', true, null, $c, 'Ex : Akwa, Douala'),
            $this->f('damaged_items', 'Biens endommagés ou volés (description, date d\'achat, valeur estimée)', 'textarea', true, null, $c, 'Ex : Téléviseur 55" (250 000 FCFA)…'),
            $this->f('estimated_value', 'Valeur estimée des dommages (FCFA)', 'number', false, null, $c, 'Ex : 1 500 000'),
            $this->f('inhabited', 'Le bien est-il habité ou exploité en ce moment ?', 'select', false, $yesNo, $c),
        ];
    }

    private function santeFields(array $yesNo): array
    {
        $c = $this->when('sinistre_type', 'Santé');

        return [
            $this->f('injury_description', 'État de la personne concernée', 'textarea', true, null, $c, 'Ex : Fracture du bras droit…'),
            $this->f('health_facility', 'Structure de santé où la personne a été prise en charge', 'text', false, null, $c, 'Ex : Hôpital Général de Douala'),
            $this->f('doctor_signature', 'Nom et visa du médecin traitant', 'text', false, null, $c, 'Ex : Dr Kamga'),
            $this->f('deceased', 'Y a-t-il eu un décès ?', 'select', false, $yesNo, $c),
        ];
    }

    private function rcFields(): array
    {
        $c = $this->when('sinistre_type', 'Responsabilité civile');

        return [
            $this->f('rc_description', 'Décrivez le dommage causé à autrui', 'textarea', true, null, $c, 'Ex : Chute d\'un arbre chez le voisin…'),
            $this->f('third_party_name', 'Nom de la victime (tiers lésé)', 'text', false, null, $c, 'Ex : Paul Mbarga'),
            $this->f('third_party_phone', 'Téléphone du tiers', 'text', false, null, $c, 'Ex : 6 90 00 00 00'),
        ];
    }

    private function transportFields(): array
    {
        $c = $this->when('sinistre_type', 'Transport');

        return [
            $this->f('transport_description', 'Description de la marchandise sinistrée', 'textarea', true, null, $c, 'Ex : Cartons endommagés lors du transport…'),
            $this->f('cargo_value', 'Valeur de la marchandise (FCFA)', 'number', false, null, $c, 'Ex : 2 000 000'),
            $this->f('transport_route', 'Itinéraire ou destination', 'text', false, null, $c, 'Ex : Douala → Bafoussam'),
        ];
    }

    private function agricoleFields(): array
    {
        $c = $this->when('sinistre_type', 'Agricole');

        return [
            $this->f('farm_description', 'Description du sinistre agricole', 'textarea', true, null, $c, 'Ex : Inondation des cultures de maïs…'),
            $this->f('farm_location', 'Localisation de l\'exploitation', 'text', false, null, $c, 'Ex : Bafoussam'),
            $this->f('crop_value', 'Valeur estimée des pertes (FCFA)', 'number', false, null, $c, 'Ex : 800 000'),
        ];
    }

    private function entrepriseFields(): array
    {
        $c = $this->when('sinistre_type', 'Entreprise');

        return [
            $this->f('business_description', 'Description du sinistre', 'textarea', true, null, $c, 'Ex : Incendie dans l\'entrepôt…'),
            $this->f('business_value', 'Valeur estimée (FCFA)', 'number', false, null, $c, 'Ex : 5 000 000'),
        ];
    }

    private function autreFields(): array
    {
        $c = $this->when('sinistre_type', 'Autre');

        return [
            $this->f('other_description', 'Décrivez votre sinistre', 'textarea', true, null, $c, 'Ex : Précisez la nature du sinistre…'),
        ];
    }

    // Dommages corporels (toutes catégories)
    private function corporealFields(): array
    {
        return [
            $this->f('injured', 'Y a-t-il des blessés ?', 'select', false, ['Oui', 'Non']),
            $this->f('injured_details', 'Nom, âge et état de chaque blessé', 'textarea', false, null, $this->when('injured', 'Oui'), 'Ex : Paul Mbarga, 34 ans, blessure légère'),
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
    private function documentFields(): array
    {
        return [
            $this->f('id_document', 'Copie de la pièce d\'identité (CNI ou passeport)', 'file'),
            $this->f('policy_document', 'Copie de l\'attestation ou de la police d\'assurance', 'file'),
            $this->f('photos', 'Photos des dégâts ou justificatifs', 'file'),
            $this->f('documents', 'Autres justificatifs (constat, PV, carte grise, permis, certificat médical, factures…)', 'file'),
        ];
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
