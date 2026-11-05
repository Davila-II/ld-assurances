<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.5;">
    <h2 style="color: #1e4d8f;">LD Assurances</h2>

    <p>Bonjour {{ $user->name }},</p>

    <p>Voici votre code pour vérifier votre adresse email :</p>

    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">{{ $code }}</p>

    <p>Ce code est valable {{ $minutes }} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>

    <p>Cordialement,<br>LD Assurances</p>
</body>
</html>