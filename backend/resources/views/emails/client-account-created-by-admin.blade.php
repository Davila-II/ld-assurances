<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e4d8f; margin-bottom: 20px;">LD Assurances SA</h2>

    <p>Bonjour {{ $user->name }},</p>

    <p>Un compte client a été créé pour vous par notre équipe <strong>LD Assurances</strong>.</p>

    <p>Votre compte est d'ores et déjà <strong>actif</strong>. Vous pouvez vous connecter dès maintenant pour suivre vos demandes de devis et déclarations de sinistres.</p>

    <div style="background-color: #f1f6fc; border-left: 4px solid #1e4d8f; padding: 14px 18px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Vos coordonnées d'accès :</strong></p>
        <p style="margin: 0 0 6px 0; font-size: 14px;">Identifiant (Email) : <strong>{{ $user->email }}</strong></p>
        <p style="margin: 0 0 6px 0; font-size: 14px;">Mot de passe temporaire : <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">{{ $plainPassword }}</code></p>
        @if ($user->phone)
            <p style="margin: 0; font-size: 14px;">Téléphone : <strong>{{ $user->phone }}</strong></p>
        @endif
    </div>

    <p style="margin: 28px 0;">
        <a href="{{ rtrim(config('app.url'), '/') }}/espace-client/connexion" style="display: inline-block; padding: 12px 24px; background: #1e4d8f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Se connecter à mon espace client
        </a>
    </p>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        <em>Conseil de sécurité :</em> Nous vous recommandons de modifier ce mot de passe temporaire depuis la section « Mon profil » dès votre première connexion.
    </p>

    <p style="margin-top: 25px;">
        Cordialement,<br>
        <strong>LD Assurance</strong>
    </p>
</body>
</html>
