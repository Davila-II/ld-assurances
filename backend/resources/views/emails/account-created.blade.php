<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e4d8f; margin-bottom: 20px;">LD Assurances</h2>

    <p>Bonjour {{ $user->name }},</p>

    <p>Nous vous confirmons que votre compte <strong>LD Assurances</strong> a été créé avec succès et qu'il est d'ores et déjà <strong>actif</strong>.</p>

    <p>Vous pouvez dès à présent accéder à votre espace client sécurisé pour :</p>
    <ul style="color: #334155; padding-left: 20px;">
        <li>Suivre l'état d'avancement de vos demandes de devis</li>
        <li>Déclarer et suivre vos sinistres en ligne</li>
        <li>Consulter vos contrats et télécharger vos documents d'assurance</li>
    </ul>

    <div style="background-color: #f1f6fc; border-left: 4px solid #1e4d8f; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;"><strong>Identifiant de connexion :</strong> {{ $user->email }}</p>
    </div>

    <p style="margin: 30px 0;">
        <a href="{{ $loginUrl }}" style="display: inline-block; padding: 12px 24px; background: #1e4d8f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accéder à mon espace client
        </a>
    </p>

    <p style="font-size: 13px; color: #64748b; margin-top: 30px;">
        Si vous n'êtes pas à l'origine de cette inscription, veuillez contacter immédiatement notre service client à <a href="mailto:contact@ldassurances.cm" style="color: #1e4d8f;">contact@ldassurances.cm</a>.
    </p>

    <p style="margin-top: 25px;">
        Cordialement,<br>
        <strong>LD Assurance</strong>
    </p>
</body>
</html>
