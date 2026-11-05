<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('submissions', function (Request $request) {
            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perHour(60)->by($request->ip()),
            ];
        });

        RateLimiter::for('admin-login', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->ip() . '|' . strtolower((string) $request->input('email'))
            );
        });

        RateLimiter::for('tracking', function (Request $request) {
            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perHour(60)->by($request->ip()),
                Limit::perHour(10)->by('ref|' . strtoupper((string) $request->input('reference'))),
            ];
        });

        // --- Espace client ---
        RateLimiter::for('client-register', function (Request $request) {
            return Limit::perHour(10)->by($request->ip());
        });

        RateLimiter::for('client-login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip() . '|' . strtolower((string) $request->input('email'))),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('client-verify', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('client-resend', function (Request $request) {
            $key = (string) ($request->user()?->id ?: $request->ip());

            return [
                Limit::perMinute(1)->by($key),
                Limit::perHour(5)->by($key),
            ];
        });

        RateLimiter::for('client-reset', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(5)->by('email|' . strtolower((string) $request->input('email'))),
            ];
        });
    }
}
