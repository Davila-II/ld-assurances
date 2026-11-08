<?php

namespace Database\Seeders;

use App\Models\StaffRole;
use App\Models\StaffPermission;
use Illuminate\Database\Seeder;

class StaffRolesSeeder extends Seeder
{
    public function run(): void
    {
        // ── Permissions ──────────────────────────────────────────────────────
        $permissions = [
            // Groupe : dossiers
            ['key' => 'view_submissions',    'name' => 'Voir les dossiers',             'name_en' => 'View submissions',         'group' => 'dossiers'],
            ['key' => 'view_all_submissions','name' => 'Voir tous les dossiers',         'name_en' => 'View all submissions',     'group' => 'dossiers'],
            ['key' => 'reply_submissions',   'name' => 'Répondre aux dossiers',          'name_en' => 'Reply to submissions',     'group' => 'dossiers'],
            ['key' => 'change_status',       'name' => 'Changer le statut',              'name_en' => 'Change status',            'group' => 'dossiers'],
            ['key' => 'reject_submissions',  'name' => 'Rejeter un dossier',             'name_en' => 'Reject submission',        'group' => 'dossiers'],
            ['key' => 'close_submissions',   'name' => 'Clôturer un dossier',            'name_en' => 'Close submission',         'group' => 'dossiers'],
            ['key' => 'download_pdf',        'name' => 'Télécharger les PDF',            'name_en' => 'Download PDFs',            'group' => 'dossiers'],

            // Groupe : calcul & finances
            ['key' => 'manage_calculation',  'name' => 'Gérer les calculs de devis',     'name_en' => 'Manage calculations',     'group' => 'finances'],
            ['key' => 'manage_pricing_rules','name' => 'Gérer les règles tarifaires',    'name_en' => 'Manage pricing rules',    'group' => 'finances'],

            // Groupe : clients
            ['key' => 'view_clients',        'name' => 'Voir les clients',               'name_en' => 'View clients',             'group' => 'clients'],
            ['key' => 'manage_clients',      'name' => 'Gérer les clients',              'name_en' => 'Manage clients',          'group' => 'clients'],

            // Groupe : paramètres
            ['key' => 'manage_form_builder', 'name' => 'Gérer le constructeur de formulaires', 'name_en' => 'Manage form builder', 'group' => 'parametres'],
            ['key' => 'manage_users',        'name' => 'Gérer les utilisateurs',         'name_en' => 'Manage users',            'group' => 'parametres'],
            ['key' => 'manage_roles',        'name' => 'Gérer les rôles & permissions',  'name_en' => 'Manage roles & permissions','group' => 'parametres'],
            ['key' => 'manage_settings',     'name' => 'Accéder aux paramètres',         'name_en' => 'Access settings',         'group' => 'parametres'],
            ['key' => 'view_stats',          'name' => 'Voir les statistiques',          'name_en' => 'View statistics',         'group' => 'parametres'],
        ];

        foreach ($permissions as $perm) {
            StaffPermission::firstOrCreate(['key' => $perm['key']], $perm);
        }

        $allKeys = collect($permissions)->pluck('key')->all();

        // ── Rôles ────────────────────────────────────────────────────────────
        $roles = [
            [
                'name'        => 'Administrateur',
                'name_en'     => 'Administrator',
                'slug'        => 'administrateur',
                'description' => 'Accès complet à toutes les fonctionnalités de la plateforme.',
                'is_system'   => true,
                'permissions' => $allKeys,
            ],
            [
                'name'        => 'Superviseur',
                'name_en'     => 'Supervisor',
                'slug'        => 'superviseur',
                'description' => 'Supervision de l\'ensemble des dossiers et des équipes, sans accès aux paramètres avancés.',
                'is_system'   => false,
                'permissions' => [
                    'view_submissions','view_all_submissions','reply_submissions',
                    'change_status','reject_submissions','close_submissions',
                    'download_pdf','manage_calculation','view_clients','view_stats',
                ],
            ],
            [
                'name'        => 'Gestionnaire de sinistres',
                'name_en'     => 'Claims Manager',
                'slug'        => 'gestionnaire_sinistres',
                'description' => 'Traitement des déclarations de sinistres : consultation, réponse et gestion du statut.',
                'is_system'   => false,
                'permissions' => [
                    'view_submissions','reply_submissions','change_status',
                    'reject_submissions','close_submissions','download_pdf','manage_calculation',
                ],
            ],
            [
                'name'        => 'Gestionnaire de devis',
                'name_en'     => 'Quote Manager',
                'slug'        => 'gestionnaire_devis',
                'description' => 'Traitement des demandes de devis : consultation, réponse et gestion du statut.',
                'is_system'   => false,
                'permissions' => [
                    'view_submissions','reply_submissions','change_status',
                    'reject_submissions','close_submissions','download_pdf','manage_calculation',
                    'manage_pricing_rules',
                ],
            ],
            [
                'name'        => 'Chargé de clientèle',
                'name_en'     => 'Customer Relations Officer',
                'slug'        => 'charge_clientele',
                'description' => 'Consultation des dossiers et communication avec les clients. Pas de modification de statut.',
                'is_system'   => false,
                'permissions' => [
                    'view_submissions','view_all_submissions','reply_submissions',
                    'download_pdf','view_clients',
                ],
            ],
            [
                'name'        => 'Comptable',
                'name_en'     => 'Accountant',
                'slug'        => 'comptable',
                'description' => 'Accès aux données financières, aux règles tarifaires et aux statistiques.',
                'is_system'   => false,
                'permissions' => [
                    'view_submissions','view_all_submissions','download_pdf',
                    'manage_pricing_rules','view_stats',
                ],
            ],
        ];

        $permMap = StaffPermission::pluck('id', 'key');

        foreach ($roles as $roleData) {
            $permKeys = $roleData['permissions'];
            unset($roleData['permissions']);

            $role = StaffRole::firstOrCreate(['slug' => $roleData['slug']], $roleData);

            $permIds = collect($permKeys)->map(fn ($k) => $permMap[$k] ?? null)->filter()->values()->all();
            $role->permissions()->sync($permIds);
        }
    }
}
