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
}
