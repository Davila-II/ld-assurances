# Documentation Technique : Récépissé PDF officiel de LD ASSURANCES SA

Ce document décrit l'architecture, la sécurité, l'affichage des pièces jointes, la gestion des assets et les procédures de test du système de génération du récépissé PDF des demandes de devis et déclarations de sinistre.

---

## 1. Architecture Générale

Le système s'articule autour des composants suivants :

| Composant | Emplacement | Rôle |
|---|---|---|
| **Service PDF** | `backend/app/Services/SubmissionPdfService.php` | Préparation et normalisation des données (`prepareViewData`), détection des formats, conversion des montants, gestion des assets en base64 et génération binaire avec DomPDF (`generate`). |
| **Vue Blade** | `backend/resources/views/pdf/submission.blade.php` | Template HTML/CSS institutionnel adapté au format A4 portrait, intégrant l'identité visuelle de LD ASSURANCES SA (Bleu marine `#0c2340`, Or `#c59b27`, Blanc `#ffffff`). |
| **Configuration** | `backend/config/company.php` | Données légales et coordonnées officielles de l'entreprise (agrément MINFI, capital, adresses, téléphones, chemins des assets). |
| **Contrôleurs** | `Client/SubmissionController.php`, `Admin/AdminSubmissionController.php`, `TrackingController.php` | Endpoints de téléchargement avec contrôle d'accès strict. |

---

## 2. Contrôle d'Accès & Sécurité

L'accès aux documents PDF est rigoureusement protégé selon le contexte d'utilisation :

### 2.1 Espace Client (`GET /api/client/submissions/{reference}/pdf`)
- **Authentification requise** : Token Bearer Sanctum valide.
- **Rôle requis** : Rôle `client` avec email obligatoirement vérifié (`EnsureUserIsClient:verified`). Les comptes non vérifiés reçoivent un code `403` avec le libellé `email_unverified`.
- **Contrôle de propriété** :
  - Si la demande appartient au client connecté (`submission->user_id === user->id`) : accès autorisé.
  - Si la demande a été soumise avant la création du compte avec le même email vérifié (`submission->user_id === null` et emails identiques) : le système rattache automatiquement la soumission au compte client et autorise le téléchargement.
  - Si la demande appartient à un autre utilisateur : rejet immédiat avec code **`403 Forbidden`** (« Accès refusé »).
- **Protection DoS** : Rate limiting dédié `throttle:30,1`.

### 2.2 Espace Administration (`GET /api/admin/submissions/{submission}/pdf`)
- **Authentification requise** : Token Bearer Sanctum valide.
- **Rôle requis** : Administrateur (`EnsureUserIsAdmin`). Tout accès par un client ou un visiteur non authentifié est rejeté (`401` ou `403`).

### 2.3 Suivi Public (`POST /api/track/pdf`)
- **Méthode POST** : L'adresse email n'apparaît jamais dans l'URL.
- **Vérification double facteur** : Exige la référence officielle (ex. `LD-DV-0001-07112026`) **ET** l'adresse email exacte ayant servi à la soumission.
- **Protection contre l'énumération** : Utilisation de `hash_equals()` pour éviter les attaques temporelles. Si la référence n'existe pas ou si l'email ne correspond pas, la réponse est rigoureusement identique : `404 Not Found` (« Aucun dossier ne correspond à ces informations »).
- **Rate limiting strict** (`throttle:tracking`) :
  - 10 requêtes par minute par IP.
  - 60 requêtes par heure par IP.
  - 10 requêtes par heure par référence.

### 2.4 En-têtes HTTP de sécurité
Toutes les réponses de téléchargement PDF intègrent les en-têtes suivants :
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="LD-DV-XXXX-XXXXXXXX.pdf"
Content-Length: <taille_en_octets>
X-Content-Type-Options: nosniff
Cache-Control: private, no-cache, no-store, must-revalidate
```

---

## 3. Affichage des Pièces Jointes

Lorsqu'un usager téléverse des documents (permis, carte grise, devis, photos, etc.) :
1. Les fichiers sont stockés dans le storage privé sécurisé sous `submissions/{reference}/`.
2. Les métadonnées sont enregistrées dans la table `attachments` liée à la soumission.
3. Lors de la génération du PDF, le service charge automatiquement les pièces jointes (`$submission->loadMissing(['category', 'attachments'])`).
4. La méthode `buildAttachmentsList` structure les données :
   - **Badges de format visuels** : `[PDF]` (rouge), `[IMAGE]` (bleu), `[DOC]` (gris).
   - **Taille lisible** : formatée automatiquement en Ko ou Mo (ex. `245,0 Ko`, `1,50 Mo`).
   - **Tableau institutionnel** : inséré proprement dans le récépissé avec la mention technique `✓ Réceptionné`.
5. Si aucune pièce n'est jointe, le bloc est masqué pour préserver l'équilibre visuel de la page A4.

---

## 4. Gestion des Assets (Logos & Filigranes)

Pour assurer une autonomie totale du backend et éviter les erreurs liées aux extensions graphiques :
- Les logos optimisés au format JPEG/PNG sont stockés dans :
  - `backend/public/logo-icon.jpg`
  - `backend/public/logo-watermark.jpg`
  - `backend/resources/images/logo-icon.jpg` *(copie pérenne dans les sources)*
- Le service `SubmissionPdfService` utilise une **cascade de fallbacks** (`resolveImageBase64`) :
  1. Chemin configuré dans `config/company.php` (`logo_path`, `watermark_path`).
  2. Chemin public `public_path('logo-icon.jpg')`.
  3. Chemin de ressources `resource_path('images/logo-icon.jpg')`.
  4. Chemin du frontend compilé `frontend/dist/logo-icon.jpg`.
- L'image est encodée directement en base64 (`data:image/jpeg;base64,...`) ce qui garantit un rendu instantané dans DomPDF sans dépendance réseau.

---

## 5. Tests Automatisés

Une suite complète de tests fonctionnels et unitaires est disponible dans `backend/tests/Feature/SubmissionPdfTest.php`.

### Scénarios couverts :
- Génération binaire d'un PDF valide (%PDF-).
- Téléchargement légitime par un client connecté et vérifié.
- Téléchargement par un administrateur connecté.
- Téléchargement via le suivi public avec le couple référence + email.
- Présence du PDF en pièce jointe des e-mails automatiques de notification.
- Contrôle d'accès : rejet des requêtes non authentifiées (401).
- Contrôle d'accès : rejet des clients à email non vérifié (403).
- Contrôle d'accès critique : interdiction formelle pour un client de télécharger le PDF d'un autre client (403).
- Contrôle d'accès : interdiction pour un client d'accéder à l'endpoint admin (403).
- Suivi public : rejet sécurisé (404) avec email incorrect.
- Rattachement automatique d'une soumission orpheline lors de la connexion du client propriétaire.
- Gestion complète des pièces jointes (documents PDF, images, tailles, badges).
- Résolution dynamique des statuts métiers (`received`, `in_progress`, `answered`).
- Formatage strict des données complexes (devis santé multi-assurés, budget FCFA, superficies m², narrations longues).
- Résolution et intégrité des assets graphiques (logos et filigranes).

### Exécution des tests :
```bash
# Exécuter uniquement les tests PDF
cd backend && php artisan test --filter=SubmissionPdfTest

# Exécuter l'ensemble des tests du projet
cd backend && php artisan test
```
