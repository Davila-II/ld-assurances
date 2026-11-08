<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\FormField;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DateValidationTest extends TestCase
{
    use RefreshDatabase;

    private function createAutoCategory(): Category
    {
        $category = Category::create([
            'name'       => 'Automobile',
            'slug'       => 'auto',
            'is_active'  => true,
            'sort_order' => 1,
            'form_type'  => 'quote',
        ]);

        FormField::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'name'        => 'driver_birthdate',
            'label'       => 'Date de naissance du conducteur',
            'field_type'  => 'date',
            'is_required' => true,
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        FormField::create([
            'category_id' => $category->id,
            'form_type'   => 'quote',
            'name'        => 'start_date',
            'label'       => 'Date de début souhaitée',
            'field_type'  => 'date',
            'is_required' => true,
            'sort_order'  => 2,
            'is_active'   => true,
        ]);

        return $category;
    }

    private function createClaimCategory(): Category
    {
        $category = Category::create([
            'name'       => 'Sinistre Auto',
            'slug'       => 'sinistre-auto',
            'is_active'  => true,
            'sort_order' => 2,
            'form_type'  => 'claim',
        ]);

        FormField::create([
            'category_id' => $category->id,
            'form_type'   => 'claim',
            'name'        => 'incident_date',
            'label'       => 'Date du sinistre',
            'field_type'  => 'date',
            'is_required' => true,
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        return $category;
    }

    // ── 1. Date de naissance du conducteur (au moins 21 ans) ───────────────────

    public function test_driver_under_21_is_rejected(): void
    {
        $this->createAutoCategory();

        // 19 ans : né il y a 19 ans
        $tooYoungDate = now()->subYears(19)->format('Y-m-d');

        $response = $this->postJson('/api/submissions', [
            'category'  => 'auto',
            'form_type' => 'quote',
            'email'     => 'driver@example.com',
            'answers'   => [
                'driver_birthdate' => $tooYoungDate,
                'start_date'       => now()->addDays(2)->format('Y-m-d'),
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('driver_birthdate');
    }

    public function test_driver_aged_21_or_more_is_accepted(): void
    {
        $this->createAutoCategory();

        // 25 ans : né il y a 25 ans
        $validDate = now()->subYears(25)->format('Y-m-d');

        $response = $this->postJson('/api/submissions', [
            'category'  => 'auto',
            'form_type' => 'quote',
            'email'     => 'driver@example.com',
            'answers'   => [
                'driver_birthdate' => $validDate,
                'start_date'       => now()->addDays(2)->format('Y-m-d'),
            ],
        ]);

        $response->assertCreated();
    }

    // ── 2. Dates dans le futur interdites pour les événements passés ───────────

    public function test_incident_date_in_the_future_is_rejected(): void
    {
        $this->createClaimCategory();

        // Date de demain
        $futureDate = now()->addDay()->format('Y-m-d');

        $response = $this->postJson('/api/submissions', [
            'category'  => 'sinistre-auto',
            'form_type' => 'claim',
            'email'     => 'victim@example.com',
            'answers'   => [
                'incident_date' => $futureDate,
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('incident_date');
    }

    public function test_incident_date_today_or_in_the_past_is_accepted(): void
    {
        $this->createClaimCategory();

        $todayDate = now()->format('Y-m-d');

        $response = $this->postJson('/api/submissions', [
            'category'  => 'sinistre-auto',
            'form_type' => 'claim',
            'email'     => 'victim@example.com',
            'answers'   => [
                'incident_date' => $todayDate,
            ],
        ]);

        $response->assertCreated();
    }

    // ── 3. Date de début de contrat dans le passé interdite ─────────────────────

    public function test_start_date_in_the_past_is_rejected(): void
    {
        $this->createAutoCategory();

        $yesterday = now()->subDay()->format('Y-m-d');
        $validBirthDate = now()->subYears(30)->format('Y-m-d');

        $response = $this->postJson('/api/submissions', [
            'category'  => 'auto',
            'form_type' => 'quote',
            'email'     => 'driver@example.com',
            'answers'   => [
                'driver_birthdate' => $validBirthDate,
                'start_date'       => $yesterday,
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('start_date');
    }

    // ── 4. Validation lors de l'édition du suivi client ───────────────────────

    public function test_client_cannot_edit_to_invalid_dates_via_tracking(): void
    {
        $category = $this->createClaimCategory();

        $submission = Submission::create([
            'category_id' => $category->id,
            'form_type'   => 'claim',
            'email'       => 'client@example.com',
            'status'      => 'received',
            'answers'     => ['incident_date' => now()->subDays(2)->format('Y-m-d')],
        ]);

        // Tentative de mettre une date de sinistre dans le futur lors de la modification
        $response = $this->putJson('/api/track', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
            'answers'   => ['incident_date' => now()->addDays(5)->format('Y-m-d')],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('incident_date');
    }
}
