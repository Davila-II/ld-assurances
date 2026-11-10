#!/bin/sh
set -e

echo "==> Optimisation du cache Laravel..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "==> Exécution automatique des migrations et seeders..."
php artisan migrate --force || true
php artisan db:seed --class=StaffRolesSeeder --force || true

echo "==> Démarrage de PHP-FPM..."
php-fpm -D

echo "==> Démarrage de Nginx sur le port 80..."
exec nginx -g "daemon off;"
