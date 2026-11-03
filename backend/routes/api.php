<?php

use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\SubmissionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/categories', [FormController::class, 'categories']);
Route::get('/categories/{slug}/form', [FormController::class, 'show']);

Route::post('/submissions', [SubmissionController::class, 'store'])
    ->middleware('throttle:10,1');