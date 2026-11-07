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
            PricingRuleSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
