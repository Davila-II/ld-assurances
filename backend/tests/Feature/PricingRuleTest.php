<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\PricingRule;
use App\Models\Submission;
use App\Models\User;
use App\Services\PricingService;
use App\Services\SubmissionPdfService;
use Database\Seeders\PricingRuleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PricingRuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PricingRuleSeeder::class);
    }

    /**
     * 1. Test Algorithme Assurance Automobile :
     * Promenade_Trajet, 7 CV (base 45 000), permis 5 ans (pas jeune), 0 sinistre (bonus -10% => coeff 0.9 => 40 500)
     * Options : Incendie (0.5% de 10 000 000 = 50 000) + Vol (1% = 100 000) + Bris de glace (15 000) = 165 000
     * Prime nette = 40 500 + 165 000 = 205 500
     * Accessoires = 5 000
     * Taxe unique (15%) = 30 825
     * Prime TTC = 205 500 + 5 000 + 30 825 = 241 325 FCFA
     */
    public function test_algorithm_automobile_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('automobile', [
            'puissance_fiscale' => 7,
            'usage'             => 'Promenade_Trajet',
            'age_permis'        => 5,
            'claims_count'      => 0,
            'valeur_vehicule'   => 10000000,
            'formula'           => 'Tiers Complet',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(205500, $result['prime_nette']);
        $this->assertEquals(5000, $result['accessoires']);
        $this->assertEquals(30825, $result['taxe_unique']);
        $this->assertEquals(241325, $result['prime_ttc']);
    }

    /**
     * 2. Test Algorithme Assurance Voyage :
     * Destination Europe_Schengen (1500 FCFA/j), 10 jours, voyageur 68 ans (coeff 1.5 => 22 500 / pers), 2 personnes
     * Prime nette = 22 500 * 2 = 45 000
     * Accessoires = 3 000
     * Taxe unique (15%) = 6 750
     * Prime TTC = 45 000 + 3 000 + 6 750 = 54 750 FCFA
     */
    public function test_algorithm_voyage_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('voyage', [
            'destination_country' => 'France',
            'schengen_visa'       => 'Oui',
            'duree_sejour'        => 10,
            'travelers_ages'      => 68,
            'travelers_count'     => 2,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(45000, $result['prime_nette']);
        $this->assertEquals(3000, $result['accessoires']);
        $this->assertEquals(6750, $result['taxe_unique']);
        $this->assertEquals(54750, $result['prime_ttc']);
    }

    public function test_algorithm_voyage_calculation_multi_ages(): void
    {
        $service = app(PricingService::class);
        // 2 personnes : une de 30 ans (15 000) et une de 70 ans (22 500) pour 10 jours en France (Schengen)
        $result = $service->calculate('voyage', [
            'destination_country' => 'France',
            'schengen_visa'       => 'Oui',
            'duree_sejour'        => 10,
            'travelers_ages'      => '30, 70',
            'travelers_count'     => 2,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(37500, $result['prime_nette']);
        $this->assertEquals(3000, $result['accessoires']);
        $this->assertEquals(5625, $result['taxe_unique']);
        $this->assertEquals(46125, $result['prime_ttc']);
        $this->assertEquals('46 125 FCFA', $result['prime_ttc_formatted']);
    }

    /**
     * 3. Test Algorithme Assurance Habitation :
     * Béton dur (taux 0.0010), capital immo 20M + mob 5M = 25M => incendie = 25 000
     * Sécurité Gardiennage_Et_Grilles (vol = 5M * (0.0030 * 0.8) = 12 000)
     * Appartement => annexe = 10 000
     * Prime nette = 25 000 + 12 000 + 10 000 = 47 000
     * Accessoires = 4 000
     * Taxe unique (15%) = 7 050
     * Prime TTC = 47 000 + 4 000 + 7 050 = 58 050 FCFA
     */
    public function test_algorithm_habitation_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('habitation', [
            'materiaux_construction' => 'Beton_Dur',
            'building_value'         => 20000000,
            'contents_value'         => 5000000,
            'security_presence'      => 'Gardiennage_Et_Grilles',
            'property_type'          => 'Appartement',
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(47000, $result['prime_nette']);
        $this->assertEquals(4000, $result['accessoires']);
        $this->assertEquals(7050, $result['taxe_unique']);
        $this->assertEquals(58050, $result['prime_ttc']);
    }

    /**
     * 4. Test Algorithme Assurance Santé :
     * Âge 32 ans (base 90 000), Formule 100% (x1.40 => 126 000), Diabète (+35% => 170 100)
     * 2 enfants à charge (2 * 40 000 = 80 000)
     * Prime nette = 170 100 + 80 000 = 250 100
     * Accessoires = 5 000
     * Taxe unique (15%) = 37 515
     * Prime TTC = 250 100 + 5 000 + 37 515 = 292 615 FCFA
     */
    public function test_algorithm_sante_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('sante', [
            'age_proposant'        => 32,
            'formula'              => 'Formule_100%',
            'antecedents_medicaux' => 'Diabete',
            'nbre_enfants_charge'  => 2,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(250100, $result['prime_nette']);
        $this->assertEquals(5000, $result['accessoires']);
        $this->assertEquals(37515, $result['taxe_unique']);
        $this->assertEquals(292615, $result['prime_ttc']);
    }

    /**
     * 5. Test Algorithme Assurance Professionnelle :
     * Commerce_Magasin (facteur 0.0025), stock + machines = 20M => patrimoine = 50 000
     * Chiffre d'affaires 50M * 0.0008 = 40 000
     * Prime nette = 50 000 + 40 000 = 90 000
     * Accessoires = 10 000
     * Taxe unique (15%) = 13 500
     * Prime TTC = 90 000 + 10 000 + 13 500 = 113 500 FCFA
     */
    public function test_algorithm_professionnelle_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('professionnelle', [
            'activity_sector' => 'Commerce_Magasin',
            'content_value'   => 20000000,
            'turnover'        => 50000000,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(90000, $result['prime_nette']);
        $this->assertEquals(10000, $result['accessoires']);
        $this->assertEquals(13500, $result['taxe_unique']);
        $this->assertEquals(113500, $result['prime_ttc']);
    }

    /**
     * 6. Test Algorithme Responsabilité Civile :
     * Chef_de_Famille, 5 personnes (>4 => 18 000), 1 chien dangereux (+5 000) => 23 000
     * Accessoires = 2 500
     * Taxe unique (15%) = 3 450
     * Prime TTC = 23 000 + 2 500 + 3 450 = 28 950 FCFA
     */
    public function test_algorithm_responsabilite_civile_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('responsabilite_civile', [
            'rc_type'        => 'Chef_de_Famille',
            'family_size'    => 5,
            'dangerous_dogs' => 1,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(23000, $result['prime_nette']);
        $this->assertEquals(2500, $result['accessoires']);
        $this->assertEquals(3450, $result['taxe_unique']);
        $this->assertEquals(28950, $result['prime_ttc']);
    }

    /**
     * 7. Test Algorithme Autres Assurances (Scolaire) :
     * Assurance_Scolaire, 3 élèves * 2 500 = 7 500
     * Accessoires = 1 500
     * Taxe unique (15%) = 1 125
     * Prime TTC = 7 500 + 1 500 + 1 125 = 10 125 FCFA
     */
    public function test_algorithm_autres_scolaire_calculation(): void
    {
        $service = app(PricingService::class);
        $result = $service->calculate('autres', [
            'product_type'        => 'Assurance_Scolaire',
            'beneficiaries_count' => 3,
        ]);

        $this->assertNotNull($result);
        $this->assertEquals(7500, $result['prime_nette']);
        $this->assertEquals(1500, $result['accessoires']);
        $this->assertEquals(1125, $result['taxe_unique']);
        $this->assertEquals(10125, $result['prime_ttc']);
    }

    /**
     * Test de l'endpoint public de calcul en temps réel : /api/quotes/calculate
     */
    public function test_public_quotes_calculate_endpoint(): void
    {
        $res = $this->postJson('/api/quotes/calculate', [
            'category' => 'automobile',
            'answers'  => [
                'fiscal_power'    => 7,
                'usage'           => 'Promenade_Trajet',
                'age_permis'      => 5,
                'claims_count'    => 0,
                'valeur_vehicule' => 10000000,
                'formula'         => 'Tiers Complet',
            ],
        ]);

        $res->assertOk();
        $res->assertJsonFragment([
            'has_calculation' => true,
            'prime_ttc'       => 241325,
        ]);
    }

    /**
     * Test Admin : Listing et modification des paramètres d'une règle de calcul.
     */
    public function test_admin_can_view_and_update_pricing_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin, ['admin']);

        // 1. Lister les règles
        $listRes = $this->getJson('/api/admin/pricing-rules');
        $listRes->assertOk();
        $this->assertGreaterThanOrEqual(7, count($listRes->json()));

        // 2. Modifier les paramètres d'une règle (ex: accessoires automobile passent de 5000 à 6000)
        $autoRule = PricingRule::where('code', 'automobile')->firstOrFail();
        $newParams = $autoRule->parameters;
        $newParams['accessoires'] = 6000;

        $updateRes = $this->patchJson("/api/admin/pricing-rules/{$autoRule->id}", [
            'parameters' => $newParams,
        ]);

        $updateRes->assertOk();
        $this->assertEquals(6000, $autoRule->fresh()->parameters['accessoires']);
    }

    /**
     * Test Admin : Création d'une nouvelle catégorie de devis en réutilisant un calcul existant.
     */
    public function test_admin_can_create_category_with_existing_pricing_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin, ['admin']);

        $autoRule = PricingRule::where('code', 'automobile')->firstOrFail();

        $res = $this->postJson('/api/admin/form-builder/categories', [
            'name'            => 'Flotte Automobile Entreprise',
            'form_type'       => 'quote',
            'pricing_rule_id' => $autoRule->id,
        ]);

        $res->assertStatus(201);
        $this->assertEquals($autoRule->id, $res->json('pricing_rule_id'));
    }

    /**
     * Test Admin : Création d'une nouvelle catégorie de devis en créant un nouveau calcul personnalisé.
     */
    public function test_admin_can_create_category_with_new_pricing_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin, ['admin']);

        $res = $this->postJson('/api/admin/form-builder/categories', [
            'name'             => 'Assurance Drones & Aéronefs',
            'form_type'        => 'quote',
            'new_pricing_rule' => [
                'name'       => 'Calcul Drones Spécifique',
                'driver'     => 'custom',
                'parameters' => [
                    'base_amount' => 50000,
                    'rate'        => 0.05,
                    'accessoires' => 7000,
                    'taxe_unique' => 0.15,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $newCat = Category::find($res->json('id'));
        $this->assertNotNull($newCat->pricing_rule_id);
        $this->assertSame('Calcul Drones Spécifique', $newCat->pricingRule->name);
    }
}
