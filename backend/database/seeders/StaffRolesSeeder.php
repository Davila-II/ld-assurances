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
            // Groupe : Sinistres
            ['key' => 'view_claims',          'name' => 'Voir les sinistres',              'name_en' => 'View claims',              'group' => 'sinistres'],
            ['key' => 'change_status_claims', 'name' => 'Changer le statut d\'un sinistre', 'name_en' => 'Change claim status',     'group' => 'sinistres'],
            ['key' => 'reply_claims',         'name' => 'Répondre aux sinistres',          'name_en' => 'Reply to claims',          'group' => 'sinistres'],
            ['key' => 'reject_claims',        'name' => 'Rejeter un sinistre',             'name_en' => 'Reject claim',             'group' => 'sinistres'],
            ['key' => 'close_claims',         'name' => 'Clôturer un sinistre',            'name_en' => 'Close claim',              'group' => 'sinistres'],

            // Groupe : Devis
            ['key' => 'view_quotes',          'name' => 'Voir les demandes de devis',      'name_en' => 'View quotes',              'group' => 'devis'],
            ['key' => 'change_status_quotes', 'name' => 'Changer le statut d\'un devis',   'name_en' => 'Change quote status',      'group' => 'devis'],
            ['key' => 'reply_quotes',         'name' => 'Répondre aux devis',              'name_en' => 'Reply to quotes',          'group' => 'devis'],
            ['key' => 'manage_calculation',   'name' => 'Gérer les calculs & tarification','name_en' => 'Manage calculations',      'group' => 'devis'],

            // Groupe : Documents & Export
            ['key' => 'download_pdf',         'name' => 'Télécharger les récapitulatifs PDF', 'name_en' => 'Download PDFs',         'group' => 'dossiers'],

            // Groupe : Finances & Règles
            ['key' => 'manage_pricing_rules', 'name' => 'Gérer les règles tarifaires (CIMA)', 'name_en' => 'Manage pricing rules',   'group' => 'finances'],

            // Groupe : Clients
            ['key' => 'view_clients',         'name' => 'Voir la liste des clients',       'name_en' => 'View clients',             'group' => 'clients'],
            ['key' => 'manage_clients',       'name' => 'Créer & modifier des clients',    'name_en' => 'Manage clients',           'group' => 'clients'],

            // Groupe : Administration & Paramètres
            ['key' => 'manage_form_builder',  'name' => 'Gérer le constructeur de formulaires', 'name_en' => 'Manage form builder',  'group' => 'parametres'],
            ['key' => 'manage_roles',         'name' => 'Gérer les rôles & collaborateurs',     'name_en' => 'Manage roles & staff',   'group' => 'parametres'],
            ['key' => 'manage_settings',      'name' => 'Accéder aux paramètres avancés',       'name_en' => 'Access settings',        'group' => 'parametres'],
            ['key' => 'view_stats',           'name' => 'Consulter les statistiques générales', 'name_en' => 'View statistics',       'group' => 'parametres'],
        ];

        // Mettre à jour ou créer les permissions
        foreach ($permissions as $perm) {
            StaffPermission::updateOrCreate(['key' => $perm['key']], $perm);
        }

        $allKeys = collect($permissions)->pluck('key')->all();

        // ── Rôles ────────────────────────────────────────────────────────────
        $roles = [
            [
                'name'        => 'Administrateur',
                'name_en'     => 'Administrator',
                'slug'        => 'administrateur',
                'description' => 'Accès complet à toutes les fonctionnalités et paramètres de la plateforme.',
                'is_system'   => true,
                'permissions' => $allKeys,
            ],
            [
                'name'        => 'Superviseur',
                'name_en'     => 'Supervisor',
                'slug'        => 'superviseur',
                'description' => 'Supervision complète des sinistres, des devis, des clients et des statistiques.',
                'is_system'   => false,
                'permissions' => [
                    'view_claims', 'change_status_claims', 'reply_claims', 'reject_claims', 'close_claims',
                    'view_quotes', 'change_status_quotes', 'reply_quotes', 'manage_calculation',
                    'download_pdf', 'view_clients', 'view_stats',
                ],
            ],
            [
                'name'        => 'Gestionnaire de sinistres',
                'name_en'     => 'Claims Manager',
                'slug'        => 'gestionnaire_sinistres',
                'description' => 'Gestion dédiée aux déclarations de sinistres : consultation, traitement, décision et réponses aux assurés.',
                'is_system'   => false,
                'permissions' => [
                    'view_claims', 'change_status_claims', 'reply_claims', 'reject_claims', 'close_claims',
                    'download_pdf',
                ],
            ],
            [
                'name'        => 'Gestionnaire de devis',
                'name_en'     => 'Quote Manager',
                'slug'        => 'gestionnaire_devis',
                'description' => 'Gestion dédiée aux demandes de devis : tarification, calcul des primes, propositions et réponses aux prospects.',
                'is_system'   => false,
                'permissions' => [
                    'view_quotes', 'change_status_quotes', 'reply_quotes', 'manage_calculation',
                    'manage_pricing_rules', 'download_pdf',
                ],
            ],
            [
                'name'        => 'Chargé de clientèle',
                'name_en'     => 'Customer Relations Officer',
                'slug'        => 'charge_clientele',
                'description' => 'Relation assurés : consultation des dossiers et messagerie avec les clients, sans modification des décisions.',
                'is_system'   => false,
                'permissions' => [
                    'view_claims', 'reply_claims',
                    'view_quotes', 'reply_quotes',
                    'download_pdf', 'view_clients',
                ],
            ],
            [
                'name'        => 'Comptable',
                'name_en'     => 'Accountant',
                'slug'        => 'comptable',
                'description' => 'Pôle financier : consultation des devis, règles tarifaires, pièces justificatives et rapports d\'activité.',
                'is_system'   => false,
                'permissions' => [
                    'view_quotes', 'download_pdf', 'manage_pricing_rules', 'view_stats',
                ],
            ],
        ];

        $permMap = StaffPermission::pluck('id', 'key');

        foreach ($roles as $roleData) {
            $permKeys = $roleData['permissions'];
            unset($roleData['permissions']);

            $role = StaffRole::firstOrCreate(['slug' => $roleData['slug']], $roleData);
            $role->update($roleData);

            $permIds = collect($permKeys)->map(fn ($k) => $permMap[$k] ?? null)->filter()->values()->all();
            $role->permissions()->sync($permIds);
        }
    }
}
