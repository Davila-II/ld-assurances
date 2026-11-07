<?php

namespace Tests\Feature;

use App\Mail\AdminNewSubmission;
use App\Mail\SubmissionReceived;
use App\Models\Category;
use App\Models\Submission;
use App\Models\User;
use App\Services\SubmissionPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubmissionPdfTest extends TestCase
{
    use RefreshDatabase;

    private function createDummySubmission(string $formType = 'claim', ?int $userId = null): Submission
    {
        $category = Category::create([
            'name'       => 'Automobile',
            'name_en'    => 'Motor Insurance',
            'slug'       => 'sinistre-auto-' . uniqid(),
            'form_type'  => $formType,
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        return Submission::create([
            'category_id'   => $category->id,
            'user_id'       => $userId,
            'form_type'     => $formType,
            'email'         => 'client@example.com',
            'status'        => 'received',
            'answers'       => [
                'full_name'     => 'Paul Biya',
                'phone'         => '699112233',
                'city'          => 'Yaoundé',
                'sinistre_type' => 'Accident de la route',
                'description'   => 'Choc frontal au carrefour',
            ],
            'form_snapshot' => [
                [
                    'name'        => 'full_name',
                    'label'       => 'Nom complet',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'phone',
                    'label'       => 'Téléphone',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'city',
                    'label'       => 'Ville',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Coordonnées',
                ],
                [
                    'name'        => 'sinistre_type',
                    'label'       => 'Type de sinistre',
                    'field_type'  => 'text',
                    'is_required' => true,
                    'section'     => 'Détails du sinistre',
                ],
                [
                    'name'        => 'description',
                    'label'       => 'Description',
                    'field_type'  => 'textarea',
                    'is_required' => false,
                    'section'     => 'Détails du sinistre',
                ],
            ],
        ]);
    }

    public function test_pdf_service_generates_valid_pdf(): void
    {
        $submission = $this->createDummySubmission();
        $service = app(SubmissionPdfService::class);
        $binary = $service->generate($submission);

        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF-', $binary);
    }

    public function test_client_can_download_their_own_pdf(): void
    {
        $client = User::factory()->create(['email' => 'client@example.com', 'role' => 'client']);
        $submission = $this->createDummySubmission('claim', $client->id);

        Sanctum::actingAs($client, ['client']);

        $res = $this->get("/api/client/submissions/{$submission->reference}/pdf");

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_admin_can_download_submission_pdf(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com', 'role' => 'admin']);
        $submission = $this->createDummySubmission('quote');

        Sanctum::actingAs($admin, ['admin']);

        $res = $this->get("/api/admin/submissions/{$submission->id}/pdf");

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_public_track_pdf_endpoint(): void
    {
        $submission = $this->createDummySubmission('claim');

        $res = $this->postJson('/api/track/pdf', [
            'reference' => $submission->reference,
            'email'     => 'client@example.com',
        ]);

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF-', $res->getContent());
    }

    public function test_emails_have_pdf_attachment(): void
    {
        $submission = $this->createDummySubmission('claim');

        $clientMail = new SubmissionReceived($submission);
        $clientAttachments = $clientMail->attachments();
        $this->assertCount(1, $clientAttachments);

        $adminMail = new AdminNewSubmission($submission);
        $adminAttachments = $adminMail->attachments();
        $this->assertCount(1, $adminAttachments);
    }
}
