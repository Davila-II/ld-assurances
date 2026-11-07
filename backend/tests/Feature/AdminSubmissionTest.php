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
    }

    public function test_attachment_download_requires_auth(): void
    {
        $this->getJson('/api/admin/attachments/1/download')->assertStatus(401);
    }
}
