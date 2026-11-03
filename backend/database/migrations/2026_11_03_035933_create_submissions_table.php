<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();   // numéro de dossier
            $table->foreignId('category_id')->constrained();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // null = invité
            $table->string('form_type');             // quote ou claim
            $table->string('email');
            $table->string('status')->default('received'); // received, in_progress, answered, closed
            $table->json('answers');                 // réponses du client
            $table->json('form_snapshot')->nullable(); // copie des questions au moment de l'envoi
            $table->timestamps();

            $table->index(['form_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};