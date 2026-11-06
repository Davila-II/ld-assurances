<?php

namespace Tests\Feature;

use App\Mail\ClientAccountCreatedByAdmin;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminClientTest extends TestCase
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

    public function test_admin_can_list_clients(): void
    {
        User::factory()->create([
            'role'  => 'client',
            'name'  => 'Client Test',
            'email' => 'client@test.cm',
        ]);

        Sanctum::actingAs($this->admin());

        $this->getJson('/api/admin/clients')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.name', 'Client Test');
    }

    public function test_admin_can_create_client_and_email_credentials(): void
    {
        Mail::fake();

        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/clients', [
            'name'     => 'Alice Dupont',
            'email'    => 'alice@test.cm',
            'phone'    => '+237 699112233',
            'password' => 'SecurePass123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.name', 'Alice Dupont')
            ->assertJsonPath('user.email', 'alice@test.cm')
            ->assertJsonPath('temporary_password', 'SecurePass123!');

        $this->assertDatabaseHas('users', [
            'name'  => 'Alice Dupont',
            'email' => 'alice@test.cm',
            'role'  => 'client',
            'phone' => '+237 699112233',
        ]);

        Mail::assertSent(ClientAccountCreatedByAdmin::class, function ($mail) {
            return $mail->hasTo('alice@test.cm') && $mail->plainPassword === 'SecurePass123!';
        });
    }

    public function test_admin_can_create_client_with_auto_generated_password(): void
    {
        Mail::fake();

        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/clients', [
            'name'  => 'Bob Martin',
            'email' => 'bob@test.cm',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.name', 'Bob Martin');

        $this->assertNotEmpty($response->json('temporary_password'));

        Mail::assertSent(ClientAccountCreatedByAdmin::class, function ($mail) {
            return $mail->hasTo('bob@test.cm');
        });
    }

    public function test_client_creation_attaches_unattached_submissions(): void
    {
        Mail::fake();

        $submission = Submission::create([
            'reference'     => 'DEV-2026-TEST01',
            'category_id'   => 1,
            'form_type'     => 'quote',
            'email'         => 'carol@test.cm',
            'status'        => 'received',
            'user_id'       => null,
            'answers'       => [],
            'form_snapshot' => [],
        ]);

        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/clients', [
            'name'  => 'Carol White',
            'email' => 'carol@test.cm',
        ])->assertCreated();

        $createdUser = User::where('email', 'carol@test.cm')->firstOrFail();
        $this->assertEquals($createdUser->id, $submission->fresh()->user_id);
    }
}
