<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('name_en')->nullable()->after('name');
            $table->string('form_type')->nullable()->after('slug'); // 'quote' ou 'claim'
        });

        Schema::table('form_fields', function (Blueprint $table) {
            $table->string('label_en')->nullable()->after('label');
            $table->string('placeholder_en')->nullable()->after('placeholder');
            $table->string('section_en')->nullable()->after('section');
            $table->json('options_en')->nullable()->after('options');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'form_type']);
        });

        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn(['label_en', 'placeholder_en', 'section_en', 'options_en']);
        });
    }
};
