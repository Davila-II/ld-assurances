<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubmission(string $email = 'client@example.com'): Submission
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
            'status'      => 'received',
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
            ->assertJsonMissingPath('email')
            ->assertJsonMissingPath('answers');
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
}
