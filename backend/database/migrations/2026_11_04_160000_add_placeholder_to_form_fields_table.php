<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->string('placeholder')->nullable()->after('label'); // exemple affiché en grisé
        });
    }

    public function down(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn('placeholder');
        });
    }
};
