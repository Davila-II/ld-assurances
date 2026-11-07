# #!/bin/bash
# # Script de déploiement — Tarification CIMA
# # À exécuter depuis le dossier backend/ du serveur

# echo "==> Exécution des nouvelles migrations..."
# php artisan migrate --force

# echo "==> Seed des 7 algorithmes CIMA..."
# php artisan db:seed --class=PricingRuleSeeder --force

# echo "==> Vider les caches..."
# php artisan config:clear
# php artisan cache:clear
# php artisan route:clear

# echo "==> Vérification de la table pricing_rules..."
# php artisan tinker --execute="echo PricingRule::count().' règles seedées.';"

# echo "==> Terminé !"
