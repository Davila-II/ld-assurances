<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            // 'client' (pièces déposées par le client lors du formulaire) ou 'admin' (pièces jointes à la réponse)
            $table->string('source')->default('client')->after('size');
        });
    }

    public function down(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
