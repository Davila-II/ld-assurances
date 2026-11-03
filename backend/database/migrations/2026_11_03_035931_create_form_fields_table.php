<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('form_type');          // quote ou claim
            $table->string('label');
            $table->string('name');               // identifiant technique, ex: vehicle_plate
            $table->string('field_type');         // text, textarea, number, date, select, multiselect, checkbox, file
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable();    // choix des listes
            $table->json('condition')->nullable();  // ex: {"field":"nature","equals":"accident"}
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['category_id', 'form_type', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_fields');
    }
};