<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use App\Services\ClaimCompensationService;
use Database\Seeders\InsuranceFormSeeder;
use Database\Seeders\PricingRuleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClaimCompensationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PricingRuleSeeder::class);
        $this->seed(InsuranceFormSeeder::class);
    }

    /**
     * Test Auto 1 : Convention IDA 0% Responsable (Remboursement intégral du devis d'expert)
     */
    public function test_claim_auto_zero_percent_responsible(): void
    {
        $service = app(ClaimCompensationService::class);
        $result = $service->calculate('automobile', [
            'choc_responsabilite' => '0%_Responsable',
            'devis_expert'        => 650000,
            'valeur_venale'       => 5000000,
            'type_garantie'       => 'Tous_Risques',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(650000, $result['indemnisation_estimee']);
        $this->assertEquals(0, $result['franchise']);
        $this->assertEquals(650000, $result['montant_brut']);
        $this->assertStringContainsString('Convention IDA', $result['regle_appliquee']);
    }

    /**
     * Test Auto 2 : Partage de responsabilité 50% avec franchise 10% valeur vénale
     */
    public function test_claim_auto_fifty_percent_responsible(): void
    {
        $service = app(ClaimCompensationService::class);
        // Devis 800 000, 50% = 400 000. Franchise = 10% de 3 000 000 = 300 000. Indemnité = 400 000 - 300 000 = 100 000.
        $result = $service->calculate('automobile', [
            'choc_responsabilite' => '50%_Responsable',
            'devis_expert'        => 800000,
            'valeur_venale'       => 3000000,
            'type_garantie'       => 'Tous_Risques',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(100000, $result['indemnisation_estimee']);
        $this->assertEquals(300000, $result['franchise']);
        $this->assertEquals(400000, $result['montant_brut']);
    }

    /**
     * Test Auto 3 : 100% Responsable avec Tous Risques (franchise fixe 75 000 FCFA)
     */
    public function test_claim_auto_hundred_percent_responsible_all_risks(): void
    {
        $service = app(ClaimCompensationService::class);
        $result = $service->calculate('automobile', [
            'choc_responsabilite' => '100%_Responsable',
            'devis_expert'        => 500000,
            'valeur_venale'       => 4000000,
            'type_garantie'       => 'Tous_Risques',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(425000, $result['indemnisation_estimee']);
        $this->assertEquals(75000, $result['franchise']);
    }

    /**
     * Test Auto 4 : 100% Responsable au Tiers (pas de prise en charge matérielle propre)
     */
    public function test_claim_auto_hundred_percent_responsible_tiers(): void
    {
        $service = app(ClaimCompensationService::class);
        $result = $service->calculate('automobile', [
            'choc_responsabilite' => '100%_Responsable',
            'devis_expert'        => 500000,
            'valeur_venale'       => 4000000,
            'type_garantie'       => 'Tiers',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(0, $result['indemnisation_estimee']);
    }

    /**
     * Test Auto 5 : Vol de Véhicule (franchise obligatoire 10% sur la valeur vénale)
     */
    public function test_claim_auto_theft(): void
    {
        $service = app(ClaimCompensationService::class);
        $result = $service->calculate('automobile', [
            'type_garantie' => 'Vol',
            'valeur_venale' => 6000000,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(5400000, $result['indemnisation_estimee']);
        $this->assertEquals(600000, $result['franchise']);
    }

    /**
     * Test Habitation : Application de la règle proportionnelle de capitaux (Article 32 Code CIMA)
     */
    public function test_claim_habitation_cima_article_32(): void
    {
        $service = app(ClaimCompensationService::class);
        // Valeur réelle = 20 000 000, Déclarée = 10 000 000 (sous-assurance à 50%)
        // Dégâts = 4 000 000 => Dommage retenu = 2 000 000, franchise contractuelle = 50 000
        // Indemnisation = 1 950 000 FCFA
        $result = $service->calculate('habitation', [
            'valeur_reelle_biens'      => 20000000,
            'valeur_declaree_contrat'  => 10000000,
            'montant_degats_expert'    => 4000000,
            'franchise_contractuelle'  => 50000,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(1950000, $result['indemnisation_estimee']);
        $this->assertEquals(50000, $result['franchise']);
        $this->assertEquals(2000000, $result['montant_brut']);
        $this->assertStringContainsString('Article 32', $result['regle_appliquee']);
    }

    /**
     * Test API endpoint POST /api/claims/calculate
     */
    public function test_api_calculate_claim_endpoint(): void
    {
        $response = $this->postJson('/api/claims/calculate', [
            'category' => 'sinistre-auto',
            'answers'  => [
                'choc_responsabilite' => '0%_Responsable',
                'devis_expert'        => 300000,
                'valeur_venale'       => 2000000,
                'type_garantie'       => 'Tous_Risques',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'has_calculation'       => true,
                'type'                  => 'claim',
                'indemnisation_estimee' => 300000,
                'franchise'             => 0,
            ]);
    }

    /**
     * Test soumission d'une déclaration de sinistre avec persistance du calcul CIMA
     */
    public function test_submission_claim_persists_compensation_calculation(): void
    {
        $category = Category::where('slug', 'sinistre-auto')->firstOrFail();

        $response = $this->postJson('/api/submissions', [
            'category'  => 'sinistre-auto',
            'form_type' => 'claim',
            'email'     => 'jeanpierre.nono@example.com',
            'answers'   => [
                'incident_date'       => '2024-05-10',
                'incident_place'      => 'Akwa, Douala',
                'description'         => 'Choc avant droit lors d\'un ralentissement.',
                'vehicle_plate'       => 'LT 123 AB',
                'full_name'           => 'Jean-Pierre Nono',
                'policy_number'       => 'POL-2024-9988',
                'phone'               => '+237699112233',
                'address'             => 'Bonanjo, Douala',
                'signature_name'      => 'Jean-Pierre Nono',
                'honor_declaration'   => true,
                'choc_responsabilite' => '0%_Responsable',
                'devis_expert'        => 500000,
                'valeur_venale'       => 3500000,
                'type_garantie'       => 'Tous_Risques',
            ],
        ]);

        $response->assertStatus(201);
        $ref = $response->json('reference');
        $this->assertNotNull($ref);

        $submission = Submission::where('reference', $ref)->first();
        $this->assertNotNull($submission);
        $this->assertEquals('claim', $submission->form_type);
        // Le calcul n'est plus automatique à la soumission : quote_calculation reste null
        $this->assertNull($submission->quote_calculation);

        // L'administrateur déclenche et valide le calcul depuis l'espace admin
        $admin = \App\Models\User::factory()->create([
            'role' => 'admin',
        ]);

        $calcResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/admin/submissions/{$submission->id}/calculate", [
            'admin_note' => 'Validé par l\'expert sinistre',
        ]);

        $calcResponse->assertStatus(200);
        $submission->refresh();
        $this->assertNotNull($submission->quote_calculation);
        $this->assertTrue($submission->quote_calculation['admin_validated']);
        $this->assertEquals(500000, $submission->quote_calculation['indemnisation_estimee']);
    }
}
