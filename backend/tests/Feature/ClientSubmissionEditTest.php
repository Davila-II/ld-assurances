<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientSubmissionEditTest extends TestCase
{
    use RefreshDatabase;

    private function makeClient(): User
    {
        return User::factory()->create([
            'role'           => 'client',
            'email_verified_at' => now(),
        ]);
    }

    private function makeSubmission(User $user, string $status = 'received'): Submission
    {
        $category = Category::create([
            'name'       => 'Habitation',
            'slug'       => 'habitation-edit-test',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        return Submission::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'email'       => $user->email,
            'user_id'     => $user->id,
            'status'      => $status,
            'answers'     => ['full_name' => 'Jean Test', 'phone' => '0600000000'],
        ]);
    }

    // --- processed_at ---

    public function test_processed_at_is_null_on_creation(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);
        $this->assertNull($submission->processed_at);
    }

    public function test_processed_at_is_set_when_status_changes_from_received(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        // Date de prise en charge lors du passage à in_progress
        $submission->update(['status' => 'in_progress']);
        $this->assertNotNull($submission->fresh()->taken_at);

        // Date de traitement lors du passage à closed
        $submission->update(['status' => 'closed']);
        $this->assertNotNull($submission->fresh()->processed_at);
    }

    public function test_processed_at_is_not_set_when_answers_updated_without_status_change(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        $submission->update(['answers' => ['full_name' => 'Modifié']]);

        $this->assertNull($submission->fresh()->processed_at);
    }

    public function test_processed_at_is_not_overwritten_once_set(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        $submission->update(['status' => 'closed']);
        $firstDate = $submission->fresh()->processed_at;

        // Changer à nouveau le statut ne doit pas modifier processed_at
        $submission->fresh()->update(['status' => 'rejected']);

        $this->assertEquals($firstDate->toIso8601String(), $submission->fresh()->processed_at->toIso8601String());
    }

    // --- Édition via API client authentifiée ---

    public function test_authenticated_client_can_edit_received_submission(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        Sanctum::actingAs($client, ['client']);

        $this->putJson("/api/client/submissions/{$submission->reference}", [
            'answers' => ['full_name' => 'Jean Modifié', 'phone' => '0700000000'],
        ])
            ->assertOk()
            ->assertJsonPath('reference', $submission->reference)
            ->assertJsonPath('status', 'received');

        $fresh = $submission->fresh();
        $this->assertSame('Jean Modifié', $fresh->answers['full_name']);
        $this->assertSame('0700000000', $fresh->answers['phone']);
    }

    public function test_client_cannot_edit_submission_already_in_progress(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client, 'in_progress');

        Sanctum::actingAs($client, ['client']);

        $this->putJson("/api/client/submissions/{$submission->reference}", [
            'answers' => ['full_name' => 'Tentative'],
        ])->assertStatus(403);
    }

    public function test_client_cannot_edit_another_clients_submission(): void
    {
        $client1 = $this->makeClient();
        $client2 = $this->makeClient();
        $submission = $this->makeSubmission($client1);

        Sanctum::actingAs($client2, ['client']);

        $this->putJson("/api/client/submissions/{$submission->reference}", [
            'answers' => ['full_name' => 'Hacker'],
        ])->assertStatus(403);
    }

    public function test_edit_returns_404_for_unknown_reference(): void
    {
        $client = $this->makeClient();

        Sanctum::actingAs($client, ['client']);

        $this->putJson('/api/client/submissions/REF-INEXISTANT', [
            'answers' => ['full_name' => 'Test'],
        ])->assertNotFound();
    }

    public function test_unauthenticated_edit_is_rejected(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        $this->putJson("/api/client/submissions/{$submission->reference}", [
            'answers' => ['full_name' => 'Test'],
        ])->assertStatus(401);
    }

    // --- processed_at dans les réponses API Admin ---

    public function test_admin_list_includes_processed_at(): void
    {
        $client = $this->makeClient();
        $submission = $this->makeSubmission($client);

        // Changer le statut pour déclencher processed_at
        $submission->update(['status' => 'in_progress']);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/submissions')
            ->assertOk()
            ->assertJsonStructure(['data' => [['processed_at']]]);
    }
}
