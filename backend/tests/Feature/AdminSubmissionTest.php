<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSubmissionTest extends TestCase
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

    private function makeSubmission(): Submission
    {
        $category = Category::where('slug', 'auto')->first() ?? Category::firstOrFail();

        return Submission::create([
            'reference'     => 'SIN-2026-TEST01',
            'category_id'   => $category->id,
            'form_type'     => 'claim',
            'email'         => 'client@example.com',
            'status'        => 'received',
            'answers'       => ['sinistre_type' => 'Automobile'],
            'form_snapshot' => [],
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/admin/submissions')->assertStatus(401);
        $this->getJson('/api/admin/stats')->assertStatus(401);
    }

    public function test_non_admin_is_forbidden(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/submissions')->assertStatus(403);
    }

    public function test_admin_can_list_submissions_with_type(): void
    {
        $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/submissions')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.reference', 'SIN-2026-TEST01')
            ->assertJsonPath('data.0.type', 'Automobile');
    }

    public function test_admin_can_filter_by_sinistre_type(): void
    {
        $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/submissions?type=Automobile')->assertJsonPath('total', 1);
        $this->getJson('/api/admin/submissions?type=Habitation')->assertJsonPath('total', 0);
    }

    public function test_admin_can_get_stats(): void
    {
        $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonStructure(['total', 'by_status', 'by_form_type', 'recent'])
            ->assertJsonPath('total', 1);
    }

    public function test_admin_can_update_status(): void
    {
        $submission = $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->patchJson("/api/admin/submissions/{$submission->id}/status", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('status', 'in_progress');
    }

    public function test_admin_can_reject_submission_with_reason(): void
    {
        $submission = $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->patchJson("/api/admin/submissions/{$submission->id}/status", [
            'status'           => 'rejected',
            'rejection_reason' => 'Dossier incomplet, pièces manquantes.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('rejection_reason', 'Dossier incomplet, pièces manquantes.');

        $this->assertDatabaseHas('submissions', [
            'id'               => $submission->id,
            'status'           => 'rejected',
            'rejection_reason' => 'Dossier incomplet, pièces manquantes.',
        ]);
    }

    public function test_admin_rejection_requires_reason(): void
    {
        $submission = $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->patchJson("/api/admin/submissions/{$submission->id}/status", [
            'status' => 'rejected',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rejection_reason');
    }

    public function test_admin_can_save_notes_and_reply(): void
    {
        $submission = $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        $this->patchJson("/api/admin/submissions/{$submission->id}/notes", ['notes' => 'Note interne'])
            ->assertOk()
            ->assertJsonPath('notes', 'Note interne');

        $this->postJson("/api/admin/submissions/{$submission->id}/reply", ['message' => 'Bonjour'])
            ->assertOk();

        $submission->refresh();
        $this->assertSame('answered', $submission->status);
        $this->assertNotNull($submission->taken_at);
        $this->assertCount(1, $submission->replies);
        $this->assertSame('Bonjour', $submission->replies->first()->message);
    }

    public function test_multiple_replies_appear_in_client_and_tracking(): void
    {
        $submission = $this->makeSubmission();

        Sanctum::actingAs($this->admin());

        // Premier message
        $this->postJson("/api/admin/submissions/{$submission->id}/reply", ['message' => 'Premier message'])
            ->assertOk();

        // Deuxième message
        $this->postJson("/api/admin/submissions/{$submission->id}/reply", ['message' => 'Deuxième message'])
            ->assertOk();

        $submission->refresh();
        $this->assertCount(2, $submission->replies);

        // Suivi public
        $trackRes = $this->postJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => $submission->email,
        ])->assertOk();

        $trackRes->assertJsonPath('replies_count', 2);
        $this->assertCount(2, $trackRes->json('replies'));

        // Admin detail
        $adminShow = $this->getJson("/api/admin/submissions/{$submission->id}")
            ->assertOk();
        $this->assertCount(2, $adminShow->json('replies'));
    }

    public function test_taken_at_locks_on_first_departure_and_processed_at_sets_on_closed(): void
    {
        $submission = $this->makeSubmission();
        $this->assertSame('received', $submission->status);
        $this->assertNull($submission->taken_at);
        $this->assertNull($submission->processed_at);

        Sanctum::actingAs($this->admin());

        // Passage à in_progress -> taken_at défini
        $this->patchJson("/api/admin/submissions/{$submission->id}/status", ['status' => 'in_progress'])
            ->assertOk();
        $submission->refresh();
        $initialTakenAt = $submission->taken_at;
        $this->assertNotNull($initialTakenAt);
        $this->assertNull($submission->processed_at);

        // Passage à closed -> taken_at NE CHANGE PAS, processed_at défini
        $this->patchJson("/api/admin/submissions/{$submission->id}/status", ['status' => 'closed'])
            ->assertOk();
        $submission->refresh();
        $this->assertSame($initialTakenAt->toIso8601String(), $submission->taken_at->toIso8601String());
        $this->assertNotNull($submission->processed_at);
    }

    public function test_attachment_download_requires_auth(): void
    {
        $this->getJson('/api/admin/attachments/1/download')->assertStatus(401);
    }
}
