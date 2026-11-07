<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('driver')->default('custom'); // automobile, voyage, habitation, sante, professionnelle, responsabilite_civile, autres, custom
            $table->json('parameters')->nullable();
            $table->text('formula_code')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('pricing_rule_id')->nullable()->after('form_type')->constrained('pricing_rules')->nullOnDelete();
        });

        Schema::table('submissions', function (Blueprint $table) {
            $table->json('quote_calculation')->nullable()->after('form_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn('quote_calculation');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['pricing_rule_id']);
            $table->dropColumn('pricing_rule_id');
        });

        Schema::dropIfExists('pricing_rules');
    }
};
