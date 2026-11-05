<?php

namespace Tests\Feature;

use App\Mail\AccountCreated;
use App\Mail\PasswordResetLink;
use App\Models\Category;
use App\Models\FormField;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientAuthTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return array_merge([
            'name'                  => 'Jean Client',
            'email'                 => 'jean@example.com',
            'phone'                 => '690123456',
            'password'              => 'motdepasse1',
            'password_confirmation' => 'motdepasse1',
        ], $override);
    }

    private function registerClient(array $override = [])
    {
        return $this->postJson('/api/client/register', $this->payload($override));
    }

    // Plusieurs requêtes avec des jetons différents dans un même test : on réinitialise l'authentification
    private function asClient(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function makeSubmission(string $email, ?int $userId = null): Submission
    {
        $category = Category::firstOrCreate(
            ['slug' => 'habitation'],
            ['name' => 'Habitation', 'is_active' => true, 'sort_order' => 1]
        );

        $submission = Submission::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'email'       => $email,
            'status'      => 'received',
            'answers'     => ['full_name' => 'Test'],
        ]);

        if ($userId !== null) {
            $submission->forceFill(['user_id' => $userId])->save();
        }

        return $submission;
    }

    public function test_register_creates_active_client_and_sends_welcome_email(): void
    {
        Mail::fake();

        $this->registerClient()
            ->assertCreated()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.email', 'jean@example.com')
            ->assertJsonPath('user.email_verified', true);

        $user = User::where('email', 'jean@example.com')->firstOrFail();

        $this->assertSame('client', $user->role);
        $this->assertNotNull($user->email_verified_at);

        Mail::assertSent(AccountCreated::class, function (AccountCreated $mail) {
            return $mail->hasTo('jean@example.com')
                && $mail->envelope()->from->name === 'LD Assurance';
        });
    }

    public function test_register_ignores_a_role_sent_by_the_client(): void
    {
        Mail::fake();

        $this->registerClient(['role' => 'admin'])->assertCreated();

        $this->assertSame('client', User::where('email', 'jean@example.com')->value('role'));
    }

    public function test_register_rejects_duplicate_email_and_weak_password(): void
    {
        Mail::fake();

        $this->registerClient()->assertCreated();

        $this->registerClient()
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->registerClient([
            'email'                 => 'autre@example.com',
            'password'              => 'abcdefgh',
            'password_confirmation' => 'abcdefgh',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_login_works_for_clients_only(): void
    {
        User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);
        User::factory()->create(['email' => 'admin@example.com', 'role' => 'admin']);

        $this->postJson('/api/client/login', ['email' => 'client@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/client/login', ['email' => 'admin@example.com', 'password' => 'password'])
            ->assertStatus(401);

        $this->postJson('/api/client/login', ['email' => 'client@example.com', 'password' => 'mauvais'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Identifiants incorrects.');
    }

    public function test_registering_immediately_links_previous_submissions(): void
    {
        Mail::fake();

        $guest = $this->makeSubmission('Jean@Example.com');
        $other = $this->makeSubmission('quelquun@example.com');

        $this->registerClient()->assertCreated();

        $userId = User::where('email', 'jean@example.com')->value('id');

        $this->assertSame($userId, $guest->fresh()->user_id);
        $this->assertNull($other->fresh()->user_id);
    }

    public function test_registered_client_can_immediately_access_submissions(): void
    {
        Mail::fake();

        $token = $this->registerClient()->json('token');

        $this->asClient($token)
            ->getJson('/api/client/submissions')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_a_client_only_sees_their_own_submissions(): void
    {
        $me = User::factory()->create(['email' => 'me@example.com', 'role' => 'client']);
        $other = User::factory()->create(['email' => 'other@example.com', 'role' => 'client']);

        $mine = $this->makeSubmission('me@example.com', $me->id);
        $this->makeSubmission('other@example.com', $other->id);

        Sanctum::actingAs($me, ['client']);

        $this->getJson('/api/client/submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reference', $mine->reference);
    }

    public function test_client_and_admin_areas_are_separated(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($client, ['client']);
        $this->getJson('/api/admin/stats')->assertStatus(403);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin, ['*']);
        $this->getJson('/api/client/me')->assertStatus(403);
    }

    public function test_logout_revokes_the_token(): void
    {
        User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);

        $token = $this->postJson('/api/client/login', ['email' => 'client@example.com', 'password' => 'password'])
            ->json('token');

        $this->asClient($token)->getJson('/api/client/me')->assertOk();
        $this->asClient($token)->postJson('/api/client/logout')->assertOk();
        $this->asClient($token)->getJson('/api/client/me')->assertStatus(401);
    }

    public function test_forgot_password_does_not_reveal_which_accounts_exist(): void
    {
        Mail::fake();

        User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);

        $known = $this->postJson('/api/client/forgot-password', ['email' => 'client@example.com']);
        $unknown = $this->postJson('/api/client/forgot-password', ['email' => 'personne@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());

        Mail::assertSent(PasswordResetLink::class, 1);
        Mail::assertSent(PasswordResetLink::class, fn ($mail) => $mail->hasTo('client@example.com'));
    }

    public function test_password_reset_changes_the_password_and_closes_sessions(): void
    {
        $user = User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);
        $user->createToken('client');

        $resetToken = Password::broker()->createToken($user);

        $payload = [
            'token'                 => $resetToken,
            'email'                 => 'client@example.com',
            'password'              => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ];

        $this->postJson('/api/client/reset-password', $payload)->assertOk();

        $this->assertSame(0, $user->tokens()->count());

        $this->postJson('/api/client/login', ['email' => 'client@example.com', 'password' => 'nouveau123'])
            ->assertOk();

        // Le lien ne marche qu'une seule fois
        $this->postJson('/api/client/reset-password', $payload)->assertStatus(422);
    }

    public function test_profile_and_password_can_be_changed(): void
    {
        $user = User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);

        Sanctum::actingAs($user, ['client']);

        $this->patchJson('/api/client/profile', ['name' => 'Nouveau Nom', 'phone' => '699000000'])
            ->assertOk()
            ->assertJsonPath('name', 'Nouveau Nom');

        $this->postJson('/api/client/password', [
            'current_password'      => 'mauvais',
            'password'              => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ])->assertStatus(422);

        $this->postJson('/api/client/password', [
            'current_password'      => 'password',
            'password'              => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ])->assertOk();
    }

    public function test_a_signed_in_client_gets_their_new_submission_linked(): void
    {
        Mail::fake();

        $category = Category::create(['name' => 'Habitation', 'slug' => 'habitation', 'is_active' => true, 'sort_order' => 1]);

        FormField::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'name'        => 'full_name',
            'label'       => 'Nom',
            'field_type'  => 'text',
            'is_required' => true,
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        $user = User::factory()->create(['email' => 'me@example.com', 'role' => 'client']);
        $token = $user->createToken('client', ['client'])->plainTextToken;

        $this->asClient($token)
            ->postJson('/api/submissions', [
                'category'  => 'habitation',
                'form_type' => 'quote',
                'email'     => 'me@example.com',
                'answers'   => ['full_name' => 'Jean'],
            ])
            ->assertCreated();

        $this->assertSame($user->id, Submission::first()->user_id);
    }
}