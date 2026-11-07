<?php

namespace Tests\Feature;

use App\Mail\AdminNewSubmission;
use App\Mail\SubmissionReceived;
use App\Models\Category;
use App\Models\Submission;
use App\Models\User;
use App\Services\SubmissionPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubmissionPdfTest extends TestCase
{
    use RefreshDatabase;

    private function createDummySubmission(string $formType = 'claim', ?int $userId = null, string $status = 'received'): Submission
    {
        $category = Category::create([
            'name'       => 'Automobile',
            'name_en'    => 'Motor Insurance',
            'slug'       => 'sinistre-auto-' . uniqid(),
            'form_type'  => $formType,
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        return Submission::create([
            'category_id'   => $category->id,
            'user_id'       => $userId,
            'form_type'     => $formType,
            'email'         => 'client@example.com',
            'status'        => $status,
            'answers'       => [
                'full_name'     => 'Paul Biya',
                'phone'         => '699112233',
                'city'          => 'Yaoundé',
                'sinistre_type' => 'Accident de la route',
                'description'   => 'Choc frontal au carrefour',
            ],
            'form_snapshot' => [
                [
                    'name'        => 'full_name',
                    'label'       => 'Nom complet',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'phone',
                    'label'       => 'Téléphone',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'city',
                    'label'       => 'Ville',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'sinistre_type',
                    'label'       => 'Type de sinistre',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Détails du sinistre',
                ],
                [
                    'name'        => 'description',
                    'label'       => 'Description',
                    'field_type'  => 'textarea',
                    'is_required' => false,
                    'section'     => 'Détails du sinistre',
                ],
            ],
        ]);
    }

    public function test_pdf_service_generates_valid_pdf(): void
    {
        $submission = $this->createDummySubmission();
        $service = app(SubmissionPdfService::class);
        $binary = $service->generate($submission);

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
    }

    public function test_client_can_download_their_own_pdf(): void
    {
        $client = User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);
        $submission = $this->createDummySubmission('claim', $client->id);

        Sanctum::actingAs($client, ['client']);

        $res = $this->get("/api/client/submissions/{$submission->reference}/pdf");

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_admin_can_download_submission_pdf(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com', 'role' => 'admin']);
        $submission = $this->createDummySubmission('quote');

        Sanctum::actingAs($admin, ['admin']);

        $res = $this->get("/api/admin/submissions/{$submission->id}/pdf");

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_public_track_pdf_endpoint(): void
    {
        $submission = $this->createDummySubmission('claim');

        $res = $this->postJson('/api/track/pdf', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
        ]);

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_emails_have_pdf_attachment(): void
    {
        $submission = $this->createDummySubmission('claim');

        $clientMail = new SubmissionReceived($submission);
        $clientAttachments = $clientMail->attachments();
        $this->assertCount(1, $clientAttachments);

        $adminMail = new AdminNewSubmission($submission);
        $adminAttachments = $adminMail->attachments();
        $this->assertCount(1, $adminAttachments);
    }

    /**
     * Test 1 : Devis Santé avec plusieurs personnes à assurer, budget élevé et champs facultatifs vides.
     * Vérifie que le nombre de personnes affiche "4" (et JAMAIS "OUI" / "NON"), et que le budget est formaté en FCFA.
     */
    public function test_health_quote_pdf_with_multiple_people_and_high_budget_and_empty_fields(): void
    {
        $cat = Category::create([
            'name'       => 'Santé',
            'name_en'    => 'Health Insurance',
            'slug'       => 'sante-' . uniqid(),
            'form_type'  => 'quote',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        $submission = Submission::create([
            'category_id'   => $cat->id,
            'form_type'     => 'quote',
            'email'         => 'famille.kamga@example.com',
            'status'        => 'received',
            'answers'       => [
                'full_name'         => 'Dr Emmanuel Kamga',
                'phone'             => '+237 699 44 55 66',
                'city'              => 'Douala (Bonapriso)',
                'insured_for'       => 'Ma famille',
                'people_count'      => 4, // 4 personnes ! Doit s'afficher "4" et non "OUI"
                'birth_date'        => '1985-04-12',
                'occupation_status' => 'Profession libérale',
                'current_cover'     => 'Non',
                'current_insurer'   => '', // Champ conditionnel facultatif vide
                'cover_types'       => ['Hospitalisation et soins', 'Consultations et pharmacie', 'Optique et dentaire'],
                'cover_zone'        => 'Cameroun et International',
                'budget'            => 450000, // Budget élevé : 450 000 FCFA
                'start_date'        => '2026-12-01',
            ],
            'form_snapshot' => [
                ['name' => 'insured_for', 'label' => 'Qui souhaitez-vous assurer ?', 'field_type' => 'select', 'section' => 'Bénéficiaires'],
                ['name' => 'people_count', 'label' => 'Nombre de personnes à assurer', 'field_type' => 'number', 'section' => 'Bénéficiaires'],
                ['name' => 'birth_date', 'label' => 'Date de naissance de l’assuré principal', 'field_type' => 'date', 'section' => 'Bénéficiaires'],
                ['name' => 'occupation_status', 'label' => 'Situation professionnelle', 'field_type' => 'select', 'section' => 'Situation'],
                ['name' => 'current_cover', 'label' => 'Avez-vous déjà une couverture santé ?', 'field_type' => 'select', 'section' => 'Situation'],
                ['name' => 'current_insurer', 'label' => 'Assureur actuel', 'field_type' => 'text', 'section' => 'Situation', 'condition' => ['field' => 'current_cover', 'equals' => 'Oui']],
                ['name' => 'cover_types', 'label' => 'Couvertures souhaitées', 'field_type' => 'multiselect', 'section' => 'Garanties'],
                ['name' => 'budget', 'label' => 'Budget mensuel envisagé (FCFA)', 'field_type' => 'number', 'section' => 'Garanties'],
                ['name' => 'start_date', 'label' => 'Date d’effet souhaitée', 'field_type' => 'date', 'section' => 'Garanties'],
            ],
        ]);

        $service = app(SubmissionPdfService::class);
        $data = $service->prepareViewData($submission);

        // 1. Vérification des données structurées
        $benefSection = collect($data['sections'])->firstWhere('name', 'Bénéficiaires');
        $this->assertNotNull($benefSection);

        $peopleCountField = collect($benefSection['fields'])->firstWhere('name', 'people_count');
        $this->assertNotNull($peopleCountField);
        $this->assertSame('4', $peopleCountField['formatted']);
        $this->assertNotSame('Oui', $peopleCountField['formatted']);
        $this->assertNotSame('Non', $peopleCountField['formatted']);

        $garantiesSection = collect($data['sections'])->firstWhere('name', 'Garanties');
        $this->assertNotNull($garantiesSection);

        $budgetField = collect($garantiesSection['fields'])->firstWhere('name', 'budget');
        $this->assertNotNull($budgetField);
        $this->assertSame('450 000 FCFA', $budgetField['formatted']);

        // Le champ conditionnel non rempli (current_insurer) ne doit pas figurer
        $situationSection = collect($data['sections'])->firstWhere('name', 'Situation');
        $this->assertNull(collect($situationSection['fields'])->firstWhere('name', 'current_insurer'));

        // 2. Génération binaire du PDF
        $binary = $service->generate($submission);
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
    }

    /**
     * Test 2 : Devis Habitation avec grande surface, valeur bâtiment élevée (budget important)
     * et plusieurs garanties multiselect.
     */
    public function test_home_quote_pdf_with_surface_and_high_property_value(): void
    {
        $cat = Category::create([
            'name'       => 'Habitation',
            'name_en'    => 'Home Insurance',
            'slug'       => 'habitation-' . uniqid(),
            'form_type'  => 'quote',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        $submission = Submission::create([
            'category_id'   => $cat->id,
            'form_type'     => 'quote',
            'email'         => 'proprietaire@example.com',
            'status'        => 'received',
            'answers'       => [
                'full_name'        => 'Mme Chantal Nguemo',
                'phone'            => '+237 677 88 99 00',
                'city'             => 'Yaoundé (Bastos)',
                'property_type'    => 'Villa duplex',
                'property_address' => 'Rue 1.450, Bastos, Yaoundé',
                'surface'          => 320,
                'rooms'            => 7,
                'occupant_status'  => 'Propriétaire',
                'building_value'   => 150000000, // 150 millions FCFA
                'contents_value'   => 45000000,  // 45 millions FCFA
                'guarantees'       => ['Incendie', 'Dégât des eaux', 'Vol et cambriolage', 'Responsabilité civile chef de famille'],
                'start_date'       => '2026-12-15',
            ],
            'form_snapshot' => [
                ['name' => 'property_type', 'label' => 'Type de bien', 'field_type' => 'select', 'section' => 'Logement'],
                ['name' => 'property_address', 'label' => 'Adresse du bien', 'field_type' => 'text', 'section' => 'Logement'],
                ['name' => 'surface', 'label' => 'Superficie approximative (m²)', 'field_type' => 'number', 'section' => 'Logement'],
                ['name' => 'rooms', 'label' => 'Nombre de pièces principales', 'field_type' => 'number', 'section' => 'Logement'],
                ['name' => 'occupant_status', 'label' => 'Qualité de l’occupant', 'field_type' => 'select', 'section' => 'Occupation'],
                ['name' => 'building_value', 'label' => 'Valeur estimée du bâtiment (FCFA)', 'field_type' => 'number', 'section' => 'Occupation'],
                ['name' => 'contents_value', 'label' => 'Valeur estimée du mobilier (FCFA)', 'field_type' => 'number', 'section' => 'Occupation'],
                ['name' => 'guarantees', 'label' => 'Garanties souscrites', 'field_type' => 'multiselect', 'section' => 'Garanties'],
                ['name' => 'start_date', 'label' => 'Date d’effet souhaitée', 'field_type' => 'date', 'section' => 'Garanties'],
            ],
        ]);

        $service = app(SubmissionPdfService::class);
        $data = $service->prepareViewData($submission);

        $logementSection = collect($data['sections'])->firstWhere('name', 'Logement');
        $surfaceField = collect($logementSection['fields'])->firstWhere('name', 'surface');
        $this->assertSame('320 m²', $surfaceField['formatted']);

        $roomsField = collect($logementSection['fields'])->firstWhere('name', 'rooms');
        $this->assertSame('7', $roomsField['formatted']);

        $occSection = collect($data['sections'])->firstWhere('name', 'Occupation');
        $bldField = collect($occSection['fields'])->firstWhere('name', 'building_value');
        $this->assertSame('150 000 000 FCFA', $bldField['formatted']);

        $binary = $service->generate($submission);
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
    }

    /**
     * Test 3 : Réponses longues et narratives (descriptions détaillées d'accident ou de locaux).
     */
    public function test_long_responses_are_rendered_properly(): void
    {
        $longNarrative = "Le véhicule circulait normalement sur la voie droite en direction du carrefour Agip. "
            . "À la hauteur du carrefour, un camion venant de la gauche a subitement coupé la priorité en tentant un dépassement dangereux. "
            . "Le freinage d'urgence n'a pas permis d'éviter l'impact latéral. "
            . "Le constat amiable a été rédigé sur place avec les agents du commissariat du 3ème arrondissement. "
            . "Des témoins oculaires ont confirmé les faits et remis leurs déclarations écrites.";

        $cat = Category::create([
            'name'       => 'Automobile',
            'slug'       => 'auto-' . uniqid(),
            'form_type'  => 'claim',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        $submission = Submission::create([
            'category_id'   => $cat->id,
            'form_type'     => 'claim',
            'email'         => 'temoin@example.com',
            'status'        => 'in_progress',
            'answers'       => [
                'full_name'     => 'Alain Tchuente',
                'sinistre_type' => 'Accident de la circulation',
                'description'   => $longNarrative,
            ],
            'form_snapshot' => [
                ['name' => 'sinistre_type', 'label' => 'Nature du sinistre', 'field_type' => 'text', 'section' => 'Circonstances'],
                ['name' => 'description', 'label' => 'Circonstances détaillées de l’événement', 'field_type' => 'textarea', 'section' => 'Circonstances'],
            ],
        ]);

        $service = app(SubmissionPdfService::class);
        $data = $service->prepareViewData($submission);

        $circSection = collect($data['sections'])->firstWhere('name', 'Circonstances');
        $descField = collect($circSection['fields'])->firstWhere('name', 'description');
        $this->assertTrue($descField['is_multiline']);
        $this->assertSame($longNarrative, $descField['formatted']);

        $binary = $service->generate($submission);
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
    }

    /**
     * Test 4 : Vérification des statuts d'une demande de devis :
     * - « Demande reçue » (received)
     * - « En cours de traitement » (in_progress)
     * - « Devis disponible » (answered)
     */
    public function test_quote_status_representation(): void
    {
        $cat = Category::create([
            'name'       => 'Santé',
            'slug'       => 'sante-' . uniqid(),
            'form_type'  => 'quote',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        $service = app(SubmissionPdfService::class);

        // 1. Statut "received"
        $sub1 = Submission::create([
            'category_id' => $cat->id,
            'form_type'   => 'quote',
            'email'       => 's1@example.com',
            'status'      => 'received',
            'answers'     => ['full_name' => 'Client Un'],
        ]);
        $data1 = $service->prepareViewData($sub1);
        $this->assertSame('Demande reçue', $data1['statusInfo']['label']);

        // 2. Statut "in_progress"
        $sub2 = Submission::create([
            'category_id' => $cat->id,
            'form_type'   => 'quote',
            'email'       => 's2@example.com',
            'status'      => 'in_progress',
            'answers'     => ['full_name' => 'Client Deux'],
        ]);
        $data2 = $service->prepareViewData($sub2);
        $this->assertSame('En cours de traitement', $data2['statusInfo']['label']);

        // 3. Statut "answered"
        $sub3 = Submission::create([
            'category_id' => $cat->id,
            'form_type'   => 'quote',
            'email'       => 's3@example.com',
            'status'      => 'answered',
            'answers'     => ['full_name' => 'Client Trois'],
        ]);
        $data3 = $service->prepareViewData($sub3);
        $this->assertSame('Devis disponible', $data3['statusInfo']['label']);
    }
}
