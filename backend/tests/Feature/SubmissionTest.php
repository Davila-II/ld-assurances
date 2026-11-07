<?php

namespace Tests\Feature;

use App\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function validQuotePayload(): array
    {
        return [
            'category'  => 'habitation',
            'form_type' => 'quote',
            'email'     => 'client@example.com',
            'answers'   => [
                'full_name'        => 'Jean Dupont',
                'phone'            => '690000000',
                'city'             => 'Douala',
                'property_type'    => 'Maison',
                'property_address' => 'Akwa, Douala',
                'occupant_status'  => 'Propriétaire',
                'residence_usage'  => 'Résidence principale',
                'guarantees'       => ['Incendie'],
                'start_date'       => '2026-12-01',
            ],
        ];
    }

    public function test_valid_quote_creates_submission(): void
    {
        $this->postJson('/api/submissions', $this->validQuotePayload())
            ->assertCreated()
            ->assertJsonStructure(['message', 'reference']);

        $this->assertDatabaseHas('submissions', [
            'form_type' => 'quote',
            'email'     => 'client@example.com',
        ]);
    }

    public function test_reference_is_generated_with_uniform_sequential_format(): void
    {
        $this->postJson('/api/submissions', $this->validQuotePayload())->assertCreated();

        $first = Submission::latest('id')->first();
        $this->assertNotNull($first);
        $this->assertMatchesRegularExpression('/^LD-DV-\d{4}-\d{8}$/', $first->reference);

        $this->postJson('/api/submissions', $this->validQuotePayload())->assertCreated();
        $second = Submission::latest('id')->first();
        $this->assertNotNull($second);
        $this->assertMatchesRegularExpression('/^LD-DV-\d{4}-\d{8}$/', $second->reference);

        $firstSeq = (int) explode('-', $first->reference)[2];
        $secondSeq = (int) explode('-', $second->reference)[2];
        $this->assertSame($firstSeq + 1, $secondSeq);
    }

    public function test_missing_required_field_fails(): void
    {
        $payload = $this->validQuotePayload();
        unset($payload['answers']['property_address']);

        $this->postJson('/api/submissions', $payload)->assertStatus(422);
    }

    public function test_select_value_must_be_in_options(): void
    {
        $payload = $this->validQuotePayload();
        $payload['answers']['property_type'] = 'Valeur invalide';

        $this->postJson('/api/submissions', $payload)->assertStatus(422);
    }

    public function test_honeypot_returns_fake_reference_without_saving(): void
    {
        $before = Submission::count();

        $payload = $this->validQuotePayload();
        $payload['website'] = 'https://spam.example.com';

        $this->postJson('/api/submissions', $payload)->assertCreated();

        $this->assertSame($before, Submission::count());
    }

    public function test_conditional_required_field_enforced_only_when_visible(): void
    {
        $base = [
            'category'  => 'responsabilite-civile',
            'form_type' => 'quote',
            'email'     => 'client@example.com',
            'answers'   => [
                'rc_type'        => 'Chef de famille (particulier)',
                'rc_description' => 'Description de test',
                'assured_type'   => 'Particulier',
                'start_date'     => '2026-12-01',
                'full_name'      => 'Jean Dupont',
                'phone'          => '690000000',
                'city'           => 'Douala',
            ],
        ];

        // Particulier : « company_name » (conditionnel) n'est pas exigé
        $this->postJson('/api/submissions', $base)->assertCreated();

        // Entreprise : « company_name » devient obligatoire
        $base['answers']['assured_type'] = 'Entreprise ou association';
        unset($base['answers']['company_name']);

        $this->postJson('/api/submissions', $base)->assertStatus(422);
    }
}
