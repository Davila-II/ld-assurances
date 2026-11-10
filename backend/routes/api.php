<?php

use App\Http\Controllers\Api\Admin\AdminClientController;
use App\Http\Controllers\Api\Admin\AdminSubmissionController;
use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\FormBuilderController;
use App\Http\Controllers\Api\Admin\PricingRuleController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Client\AuthController as ClientAuthController;
use App\Http\Controllers\Api\Client\SubmissionController as ClientSubmissionController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Middleware\CheckStaffPermission;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsClient;
use Illuminate\Support\Facades\Route;

// Test de diagnostic SMTP pour vérifier en direct l'envoi d'emails
Route::get('/test-email', function (\Illuminate\Http\Request $request) {
    $to = $request->query('to', 'nyatchebe703@gmail.com');
    try {
        \Illuminate\Support\Facades\Mail::raw('Test d\'envoi réussi depuis LD Assurances en production !', function ($message) use ($to) {
            $message->to($to)->subject('Test d\'envoi d\'e-mail LD Assurances');
        });
        return response()->json([
            'status'  => 'success',
            'message' => "E-mail de test envoyé avec succès à {$to}.",
            'mailer'  => config('mail.default'),
            'host'    => config('mail.mailers.smtp.host'),
            'port'    => config('mail.mailers.smtp.port'),
            'from'    => config('mail.from.address'),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage(),
            'mailer'  => config('mail.default'),
            'host'    => config('mail.mailers.smtp.host'),
            'port'    => config('mail.mailers.smtp.port'),
        ], 500);
    }
});

// Diagnostic connectivité SMTP (ports)
Route::get('/test-smtp-ports', function () {
    $hosts = [
        'smtp-relay.brevo.com' => [587, 465, 25],
        'smtp.gmail.com'       => [587, 465],
    ];
    $results = [];
    foreach ($hosts as $host => $ports) {
        foreach ($ports as $port) {
            $errno  = 0;
            $errstr = '';
            $start  = microtime(true);
            $conn   = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 5);
            $ms     = round((microtime(true) - $start) * 1000);
            $results[] = [
                'host'   => $host,
                'port'   => $port,
                'open'   => $conn !== false,
                'ms'     => $ms,
                'error'  => $conn ? null : $errstr,
            ];
            if ($conn) fclose($conn);
        }
    }
    return response()->json($results);
});

// --- Public ---
Route::get('/categories', [FormController::class, 'categories']);
Route::get('/categories/{slug}/form', [FormController::class, 'show']);
Route::post('/quotes/calculate', [SubmissionController::class, 'calculateQuote']);
Route::post('/claims/calculate', [SubmissionController::class, 'calculateClaim']);

Route::post('/submissions', [SubmissionController::class, 'store'])
    ->middleware('throttle:submissions');

// Suivi : référence + email (POST, pour que l'email ne figure jamais dans l'adresse)
Route::post('/track', [TrackingController::class, 'show'])
    ->middleware('throttle:tracking');
Route::put('/track', [TrackingController::class, 'update'])
    ->middleware('throttle:tracking');
Route::post('/track/pdf', [TrackingController::class, 'downloadPdf'])
    ->middleware('throttle:tracking');
Route::post('/track/attachment', [TrackingController::class, 'downloadAttachment'])
    ->middleware('throttle:tracking');

// --- Espace client ---
Route::prefix('client')->group(function () {
    Route::post('/register', [ClientAuthController::class, 'register'])->middleware('throttle:client-register');
    Route::post('/login', [ClientAuthController::class, 'login'])->middleware('throttle:client-login');
    Route::post('/forgot-password', [ClientAuthController::class, 'forgotPassword'])->middleware('throttle:client-reset');
    Route::post('/reset-password', [ClientAuthController::class, 'resetPassword'])->middleware('throttle:client-reset');

    // Connecté (email pas forcément vérifié)
    Route::middleware(['auth:sanctum', EnsureUserIsClient::class])->group(function () {
        Route::get('/me', [ClientAuthController::class, 'me']);
        Route::post('/logout', [ClientAuthController::class, 'logout']);
        Route::post('/email/verify', [ClientAuthController::class, 'verifyEmail'])->middleware('throttle:client-verify');
        Route::post('/email/resend', [ClientAuthController::class, 'resendCode'])->middleware('throttle:client-resend');
        Route::patch('/profile', [ClientAuthController::class, 'updateProfile']);
        Route::post('/password', [ClientAuthController::class, 'changePassword']);
    });

    // Connecté ET email vérifié : accès aux données du client
    Route::middleware(['auth:sanctum', EnsureUserIsClient::class . ':verified'])->group(function () {
        Route::get('/submissions', [ClientSubmissionController::class, 'index']);
        Route::put('/submissions/{reference}', [ClientSubmissionController::class, 'update']);
        Route::get('/submissions/{reference}/pdf', [ClientSubmissionController::class, 'downloadPdf'])
            ->middleware('throttle:30,1');
        Route::get('/submissions/{reference}/attachments/{attachment}', [ClientSubmissionController::class, 'downloadAttachment'])
            ->middleware('throttle:30,1');
        Route::get('/notifications', [ClientSubmissionController::class, 'notifications']);
        Route::get('/notifications/unread-count', [ClientSubmissionController::class, 'unreadCount']);
        Route::post('/replies/{reply}/mark-read', [ClientSubmissionController::class, 'markReplyRead']);
        Route::post('/submissions/{reference}/replies/mark-read', [ClientSubmissionController::class, 'markSubmissionRepliesRead']);
    });
});

// --- Administration ---
Route::prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:admin-login');

    Route::middleware(['auth:sanctum', EnsureUserIsAdmin::class])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/password', [AuthController::class, 'changePassword']);

        Route::get('/stats', [AdminSubmissionController::class, 'stats'])
            ->middleware(CheckStaffPermission::class . ':view_stats,view_claims,view_quotes');

        Route::get('/submissions', [AdminSubmissionController::class, 'index'])
            ->middleware(CheckStaffPermission::class . ':view_claims,view_quotes');
        Route::get('/submissions/{submission}', [AdminSubmissionController::class, 'show'])
            ->middleware(CheckStaffPermission::class . ':view_claims,view_quotes');
        Route::patch('/submissions/{submission}/status', [AdminSubmissionController::class, 'updateStatus'])
            ->middleware(CheckStaffPermission::class . ':change_status_claims,change_status_quotes,reject_claims,close_claims');
        Route::patch('/submissions/{submission}/notes', [AdminSubmissionController::class, 'updateNotes'])
            ->middleware(CheckStaffPermission::class . ':change_status_claims,change_status_quotes,reply_claims,reply_quotes');
        Route::post('/submissions/{submission}/reply', [AdminSubmissionController::class, 'reply'])
            ->middleware(CheckStaffPermission::class . ':reply_claims,reply_quotes');
        Route::post('/submissions/{submission}/calculate', [AdminSubmissionController::class, 'calculateForSubmission'])
            ->middleware(CheckStaffPermission::class . ':manage_calculation');
        Route::delete('/submissions/{submission}/calculate', [AdminSubmissionController::class, 'resetCalculation'])
            ->middleware(CheckStaffPermission::class . ':manage_calculation');

        Route::get('/attachments/{attachment}/download', [AdminSubmissionController::class, 'download'])
            ->middleware(CheckStaffPermission::class . ':view_submissions,download_pdf');
        Route::get('/submissions/{submission}/pdf', [AdminSubmissionController::class, 'downloadPdf'])
            ->middleware(CheckStaffPermission::class . ':download_pdf');

        // Gestion des clients
        Route::get('/clients', [AdminClientController::class, 'index'])
            ->middleware(CheckStaffPermission::class . ':view_clients,manage_clients');
        Route::post('/clients', [AdminClientController::class, 'store'])
            ->middleware(CheckStaffPermission::class . ':manage_clients');

        // Règles de calcul & Tarification (Algorithmes CIMA et Personnalisés)
        Route::get('/pricing-rules', [PricingRuleController::class, 'index'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');
        Route::get('/pricing-rules/{pricingRule}', [PricingRuleController::class, 'show'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');
        Route::post('/pricing-rules', [PricingRuleController::class, 'store'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');
        Route::patch('/pricing-rules/{pricingRule}', [PricingRuleController::class, 'update'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');
        Route::delete('/pricing-rules/{pricingRule}', [PricingRuleController::class, 'destroy'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');
        Route::post('/pricing-rules/{pricingRule}/test', [PricingRuleController::class, 'test'])
            ->middleware(CheckStaffPermission::class . ':manage_pricing_rules');

        // Constructeur de formulaires
        Route::get('/form-builder/categories', [FormBuilderController::class, 'categories'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::post('/form-builder/categories', [FormBuilderController::class, 'storeCategory'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::patch('/form-builder/categories/{category}', [FormBuilderController::class, 'updateCategory'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::delete('/form-builder/categories/{category}', [FormBuilderController::class, 'destroyCategory'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::get('/form-builder/categories/{category}/fields', [FormBuilderController::class, 'fields'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::post('/form-builder/categories/{category}/fields', [FormBuilderController::class, 'storeField'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::post('/form-builder/categories/{category}/fields/reorder', [FormBuilderController::class, 'reorder'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::patch('/form-builder/fields/{field}', [FormBuilderController::class, 'updateField'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');
        Route::delete('/form-builder/fields/{field}', [FormBuilderController::class, 'destroyField'])
            ->middleware(CheckStaffPermission::class . ':manage_form_builder');

        // Rôles & Permissions du staff
        Route::get('/roles', [RoleController::class, 'index'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::post('/roles', [RoleController::class, 'store'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::patch('/roles/{role}', [RoleController::class, 'update'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::get('/roles/{role}/users', [RoleController::class, 'users'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::post('/roles/{role}/assign', [RoleController::class, 'assignUser'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
        Route::post('/roles/{role}/remove-user', [RoleController::class, 'removeUser'])
            ->middleware(CheckStaffPermission::class . ':manage_roles');
    });
});