<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0e7a6e; margin-bottom: 20px;">LD Assurances SA — Espace Collaborateur</h2>

    <p>Bonjour {{ $user->name }},</p>

    <p>Vous venez d'être assigné(e) au rôle <strong>{{ $role->name }}</strong> sur la plateforme de gestion <strong>LD Assurances</strong>.</p>

    <div style="background-color: #f0fdfa; border-left: 4px solid #0e7a6e; padding: 14px 18px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Vos informations de connexion :</strong></p>
        <p style="margin: 0 0 6px 0; font-size: 14px;">Identifiant (Email) : <strong>{{ $user->email }}</strong></p>
        <p style="margin: 0 0 6px 0; font-size: 14px;">Mot de passe @if($isNewAccount) par défaut @else actuel ou réinitialisé @endif : <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">{{ $plainPassword }}</code></p>
        <p style="margin: 0; font-size: 14px;">Rôle attribué : <strong>{{ $role->name }}</strong></p>
    </div>

    <p style="margin: 28px 0;">
        <a href="{{ rtrim(config('app.url'), '/') }}/admin/login" style="display: inline-block; padding: 12px 24px; background: #0e7a6e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accéder à l'espace d'administration
        </a>
    </p>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        <em>Sécurité :</em> Nous vous invitons à modifier votre mot de passe dès votre première connexion pour sécuriser votre accès.
    </p>

    <p style="margin-top: 25px;">
        Cordialement,<br>
        <strong>L'équipe LD Assurances</strong>
    </p>
</body>
</html>
