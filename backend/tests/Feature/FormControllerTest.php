<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FormControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_categories_returns_active_categories(): void
    {
        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonStructure([['id', 'name', 'slug']]);
    }

    public function test_categories_filtered_by_quote_type(): void
    {
        $slugs = collect($this->getJson('/api/categories?type=quote')->json())->pluck('slug');

        $this->assertTrue($slugs->contains('habitation'));
        // La catégorie « sinistre » (générale) n'a pas de formulaire de devis
        $this->assertFalse($slugs->contains('sinistre'));
    }

    public function test_categories_rejects_invalid_type(): void
    {
        $this->getJson('/api/categories?type=invalid')->assertStatus(422);
    }

    public function test_show_returns_quote_form_fields(): void
    {
        $this->getJson('/api/categories/habitation/form?type=quote')
            ->assertOk()
            ->assertJsonStructure(['category', 'form_type', 'fields'])
            ->assertJsonPath('form_type', 'quote');
    }

    public function test_show_returns_404_for_unknown_slug(): void
    {
        $this->getJson('/api/categories/inconnu/form?type=quote')->assertStatus(404);
    }
}
