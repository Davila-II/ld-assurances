<?php

use App\Http\Controllers\Api\Admin\AdminSubmissionController;
use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// --- Public ---
Route::get('/categories', [FormController::class, 'categories']);
Route::get('/categories/{slug}/form', [FormController::class, 'show']);

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

        Route::get('/attachments/{attachment}/download', [AdminSubmissionController::class, 'download']);
    });