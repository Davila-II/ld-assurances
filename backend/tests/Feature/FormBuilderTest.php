<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FormBuilderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    public function test_admin_can_list_builder_categories(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/form-builder/categories')
            ->assertOk()
            ->assertJsonStructure([['id', 'name', 'slug', 'is_active']]);
    }

    public function test_admin_can_create_and_deactivate_field(): void
    {
        Sanctum::actingAs($this->admin());
        $category = Category::where('slug', 'habitation')->firstOrFail();

        $response = $this->postJson("/api/admin/form-builder/categories/{$category->id}/fields", [
            'form_type'   => 'quote',
            'name'        => 'test_field',
            'label'       => 'Question de test',
            'field_type'  => 'text',
            'is_required' => true,
        ]);

        $response->assertCreated()->assertJsonPath('name', 'test_field');
        $fieldId = $response->json('id');

        $this->deleteJson("/api/admin/form-builder/fields/{$fieldId}")->assertOk();
        $this->assertDatabaseHas('form_fields', ['id' => $fieldId, 'is_active' => false]);
    }

    public function test_admin_can_reorder_fields(): void
    {
        Sanctum::actingAs($this->admin());
        $category = Category::where('slug', 'habitation')->firstOrFail();

        $ids = collect(
            $this->getJson("/api/admin/form-builder/categories/{$category->id}/fields?type=quote")->json()
        )->pluck('id')->all();

        if (count($ids) < 2) {
            $this->markTestSkipped('Pas assez de champs pour tester le réordonnancement.');
        }

        $this->postJson("/api/admin/form-builder/categories/{$category->id}/fields/reorder", [
            'form_type' => 'quote',
            'field_ids' => array_reverse($ids),
        ])->assertOk();
    }

    public function test_field_creation_immediately_reflects_in_public_api(): void
    {
        Sanctum::actingAs($this->admin());
        $category = Category::where('slug', 'auto')->firstOrFail();

        // 1. L'admin ajoute une question avec options et condition
        $createRes = $this->postJson("/api/admin/form-builder/categories/{$category->id}/fields", [
            'form_type'   => 'quote',
            'name'        => 'garantie_vol',
            'label'       => 'Souscrire la garantie vol ?',
            'field_type'  => 'select',
            'section'     => 'Options supplémentaires',
            'is_required' => true,
            'options'     => ['Oui, niveau standard', 'Oui, niveau premium', 'Non'],
            'condition'   => ['field' => 'vehicle_usage', 'equals' => 'Professionnel'],
        ])->assertCreated();

        $fieldId = $createRes->json('id');

        // 2. L'API publique renvoie immédiatement ce champ
        $publicRes = $this->getJson("/api/categories/{$category->slug}/form?type=quote")->assertOk();
        $fields = collect($publicRes->json('fields'));
        $found = $fields->firstWhere('name', 'garantie_vol');

        $this->assertNotNull($found);
        $this->assertSame('Souscrire la garantie vol ?', $found['label']);
        $this->assertSame('Options supplémentaires', $found['section']);
        $this->assertSame(['Oui, niveau standard', 'Oui, niveau premium', 'Non'], $found['options']);
        $this->assertSame(['field' => 'vehicle_usage', 'equals' => 'Professionnel'], $found['condition']);

        // 3. L'admin modifie la question
        $this->patchJson("/api/admin/form-builder/fields/{$fieldId}", [
            'label'   => 'Souscrire la garantie vol et incendie ?',
            'section' => 'Garanties choisies',
        ])->assertOk();

        // 4. L'API publique est immédiatement à jour
        $updatedPublic = $this->getJson("/api/categories/{$category->slug}/form?type=quote")->assertOk();
        $updatedFound = collect($updatedPublic->json('fields'))->firstWhere('name', 'garantie_vol');
        $this->assertSame('Souscrire la garantie vol et incendie ?', $updatedFound['label']);
        $this->assertSame('Garanties choisies', $updatedFound['section']);

        // 5. Désactivation douce -> n'apparaît plus sur l'API publique
        $this->deleteJson("/api/admin/form-builder/fields/{$fieldId}")->assertOk();
        $finalPublic = $this->getJson("/api/categories/{$category->slug}/form?type=quote")->assertOk();
        $this->assertNull(collect($finalPublic->json('fields'))->firstWhere('name', 'garantie_vol'));
    }

    public function test_category_deactivation_hides_from_public_api(): void
    {
        Sanctum::actingAs($this->admin());
        $category = Category::where('slug', 'auto')->firstOrFail();

        // Désactive la catégorie
        $this->patchJson("/api/admin/form-builder/categories/{$category->id}", [
            'is_active' => false,
        ])->assertOk();

        // N'apparaît plus dans les catégories de devis publiques
        $slugs = collect($this->getJson('/api/categories?type=quote')->json())->pluck('slug');
        $this->assertFalse($slugs->contains('auto'));
    }
}
