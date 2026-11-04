<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            InsuranceFormSeeder::class,
            QuoteFormSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}