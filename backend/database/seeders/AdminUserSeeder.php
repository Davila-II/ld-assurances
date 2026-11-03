<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@local.test');

        $user = User::firstOrNew(['email' => $email]);

        // On ne crée le compte qu'une fois : relancer le seeder ne change pas le mot de passe
        if ($user->exists) {
            $this->command->info("Le compte {$email} existe déjà.");
            return;
        }

        $password = env('ADMIN_PASSWORD') ?: Str::random(16);

        $user->name = 'Administrateur';
        $user->password = $password; // haché automatiquement
        $user->role = 'admin';
        $user->save();

        $this->command->info("Compte admin créé : {$email} / mot de passe : {$password}");
    }
}