<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubmission(string $email = 'client@example.com', string $status = 'received'): Submission
    {
        $category = Category::create([
            'name'       => 'Habitation',
            'slug'       => 'habitation',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        return Submission::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'email'       => $email,
            'status'      => $status,
            'answers'     => ['full_name' => 'Jean Test'],
        ]);
    }

    public function test_track_returns_status_without_sensitive_data(): void
    {
        $submission = $this->makeSubmission();

        $this->postJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('reference', $submission->reference)
            ->assertJsonPath('status', 'received')
            ->assertJsonMissingPath('email');
    }

    public function test_track_ignores_letter_case_of_reference_and_email(): void
    {
        $submission = $this->makeSubmission('Client@Example.com');

        $this->postJson('/api/track', [
            'reference' => strtolower($submission->reference),
            'email'     => 'client@example.com',
        ])->assertOk();
    }

    public function test_wrong_email_and_unknown_reference_give_the_same_answer(): void
    {
        $submission = $this->makeSubmission();

        $wrongEmail = $this->postJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'autre@example.com',
        ]);

        $unknown = $this->postJson('/api/track', [
            'reference' => 'SIN-2026-ZZZZZZ',
            'email'     => 'client@example.com',
        ]);

        $wrongEmail->assertNotFound();
        $unknown->assertNotFound();
        $this->assertSame($wrongEmail->json(), $unknown->json());
    }

    public function test_track_requires_reference_and_email(): void
    {
        $this->postJson('/api/track', ['reference' => 'SIN-2026-ABC123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/track', ['email' => 'client@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reference');
    }

    public function test_old_reference_only_route_no_longer_exists(): void
    {
        $submission = $this->makeSubmission();

        $this->getJson('/api/track/' . $submission->reference)->assertNotFound();
    }

    public function test_track_exposes_processed_at(): void
    {
        $submission = $this->makeSubmission();

        $response = $this->postJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
        ])->assertOk();

        // processed_at est null tant que le statut est 'received'
        $this->assertNull($response->json('processed_at'));
    }

    public function test_client_can_edit_submission_while_status_is_received(): void
    {
        $submission = $this->makeSubmission();

        $this->putJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
            'answers'   => ['full_name' => 'Jean Modifié', 'phone' => '0600000000'],
        ])
            ->assertOk()
            ->assertJsonPath('reference', $submission->reference)
            ->assertJsonPath('status', 'received');

        $this->assertDatabaseHas('submissions', [
            'id' => $submission->id,
        ]);
        $fresh = $submission->fresh();
        $this->assertSame('Jean Modifié', $fresh->answers['full_name']);
        $this->assertSame('0600000000', $fresh->answers['phone']);
    }

    public function test_client_cannot_edit_submission_when_status_is_not_received(): void
    {
        $submission = $this->makeSubmission('client@example.com', 'in_progress');

        $this->putJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
            'answers'   => ['full_name' => 'Tentative'],
        ])->assertStatus(403);
    }

    public function test_edit_returns_404_for_wrong_credentials(): void
    {
        $submission = $this->makeSubmission();

        $this->putJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'intrus@example.com',
            'answers'   => ['full_name' => 'Hacker'],
        ])->assertNotFound();
    }

    public function test_processed_at_is_set_when_status_changes_from_received(): void
    {
        $submission = $this->makeSubmission();

        $this->assertNull($submission->processed_at);

        $submission->update(['status' => 'in_progress']);

        $this->assertNotNull($submission->fresh()->processed_at);
    }

    public function test_processed_at_is_not_set_when_status_stays_received(): void
    {
        $submission = $this->makeSubmission();

        // Mise à jour des réponses uniquement, sans changer le statut
        $submission->update(['answers' => ['full_name' => 'Nouveau Nom']]);

        $this->assertNull($submission->fresh()->processed_at);
    }

    public function test_processed_at_is_not_overwritten_once_set(): void
    {
        $submission = $this->makeSubmission();

        $submission->update(['status' => 'in_progress']);
        $firstDate = $submission->fresh()->processed_at;

        // Un deuxième changement ne doit pas écraser la première date
        $submission->fresh()->update(['status' => 'answered']);
        $this->assertEquals($firstDate, $submission->fresh()->processed_at);
    }
}

