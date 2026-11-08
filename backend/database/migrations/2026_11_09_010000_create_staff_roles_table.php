<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');           // Nom affiché (FR)
            $table->string('name_en')->nullable();
            $table->string('slug')->unique(); // identifiant machine (ex: gestionnaire_sinistres)
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false); // rôles protégés (admin)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('staff_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();  // ex: view_submissions
            $table->string('name');           // Libellé FR
            $table->string('name_en')->nullable();
            $table->string('group');          // dossiers | utilisateurs | parametres | finances
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('staff_role_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('permission_id');
            $table->primary(['role_id', 'permission_id']);
            $table->foreign('role_id')->references('id')->on('staff_roles')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('staff_permissions')->onDelete('cascade');
        });

        // Colonne role_id sur users pour les membres du staff
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('staff_role_id')->nullable()->after('role');
            $table->foreign('staff_role_id')->references('id')->on('staff_roles')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['staff_role_id']);
            $table->dropColumn('staff_role_id');
        });
        Schema::dropIfExists('staff_role_permissions');
        Schema::dropIfExists('staff_permissions');
        Schema::dropIfExists('staff_roles');
    }
};
