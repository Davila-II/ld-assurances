<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function makeSubmission(): Submission
    {
        $category = Category::where('slug', 'sinistre')->firstOrFail();

        return Submission::create([
            'reference'     => 'SIN-2026-TEST01',
            'category_id'   => $category->id,
            'form_type'     => 'claim',
            'email'         => 'secret@example.com',
            'status'        => 'in_progress',
            'answers'       => ['sinistre_type' => 'Automobile'],
            'form_snapshot' => [],
        ]);
    }

    public function test_track_returns_status_without_sensitive_data(): void
    {
        $this->makeSubmission();

        $response = $this->getJson('/api/track/SIN-2026-TEST01');

        $response->assertOk()
            ->assertJsonPath('reference', 'SIN-2026-TEST01')
            ->assertJsonPath('status', 'in_progress')
            ->assertJsonPath('status_label', 'En cours');

        // Ne jamais exposer l'email ni les réponses au public
        $this->assertArrayNotHasKey('email', $response->json());
        $this->assertArrayNotHasKey('answers', $response->json());
    }

    public function test_track_unknown_reference_returns_404(): void
    {
        $this->getJson('/api/track/INCONNU')->assertStatus(404);
    }
}
