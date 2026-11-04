<?php

use App\Http\Controllers\Api\Admin\AdminSubmissionController;
use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\FormBuilderController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// --- Public ---
Route::get('/categories', [FormController::class, 'categories']);
Route::get('/categories/{slug}/form', [FormController::class, 'show']);

Route::get('/track/{reference}', [TrackingController::class, 'show'])
    ->middleware('throttle:tracking');

Route::post('/submissions', [SubmissionController::class, 'store'])
    ->middleware('throttle:submissions');

// --- Administration ---
Route::post('/admin/login', [AuthController::class, 'login'])
    ->middleware('throttle:admin-login');

Route::middleware(['auth:sanctum', EnsureUserIsAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('/submissions', [AdminSubmissionController::class, 'index']);
        Route::get('/submissions/{submission}', [AdminSubmissionController::class, 'show']);
        Route::patch('/submissions/{submission}/status', [AdminSubmissionController::class, 'updateStatus']);
        Route::patch('/submissions/{submission}/notes', [AdminSubmissionController::class, 'updateNotes']);
        Route::post('/submissions/{submission}/reply', [AdminSubmissionController::class, 'reply']);

        Route::get('/stats', [AdminSubmissionController::class, 'stats']);

        // Constructeur de formulaires dynamiques
        Route::get('/form-builder/categories', [FormBuilderController::class, 'categories']);
        Route::post('/form-builder/categories', [FormBuilderController::class, 'storeCategory']);
        Route::patch('/form-builder/categories/{category}', [FormBuilderController::class, 'updateCategory']);
        Route::get('/form-builder/categories/{category}/fields', [FormBuilderController::class, 'fields']);
        Route::post('/form-builder/categories/{category}/fields', [FormBuilderController::class, 'storeField']);
        Route::post('/form-builder/categories/{category}/fields/reorder', [FormBuilderController::class, 'reorder']);
        Route::patch('/form-builder/fields/{field}', [FormBuilderController::class, 'updateField']);
        Route::delete('/form-builder/fields/{field}', [FormBuilderController::class, 'destroyField']);

        Route::get('/attachments/{attachment}/download', [AdminSubmissionController::class, 'download']);
    });