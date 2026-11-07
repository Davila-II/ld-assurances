<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ServiceQuotesSeeder::class,
            InsuranceFormSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
