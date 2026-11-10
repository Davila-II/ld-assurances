#!/bin/sh
set -e

echo "==> Optimisation du cache Laravel..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "==> Exécution automatique des migrations et seeders..."
php artisan migrate --force || true
php artisan db:seed --class=DatabaseSeeder --force || true
php artisan db:seed --class=StaffRolesSeeder --force || true

echo "==> Configuration de l'administrateur principal..."
php artisan tinker --execute="
\$admin = \App\Models\User::firstOrNew(['email' => 'nyatchebe703@gmail.com']);
\$admin->name = 'Administrateur';
\$admin->password = \Illuminate\Support\Facades\Hash::make('qwertyui00');
\$admin->role = 'admin';
\$admin->save();
echo 'Admin configured successfully.';
" || true

echo "==> Démarrage de PHP-FPM..."
php-fpm -D

echo "==> Démarrage de Nginx sur le port 80..."
exec nginx -g "daemon off;"
