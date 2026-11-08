<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Date de prise en charge : quand le statut passe de 'received' à 'in_progress'
            $table->timestamp('taken_at')->nullable()->after('processed_at');
            // Date de clôture / rejet : quand le statut passe à 'closed' ou 'rejected'
            $table->timestamp('closed_at')->nullable()->after('taken_at');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn(['taken_at', 'closed_at']);
        });
    }
};
