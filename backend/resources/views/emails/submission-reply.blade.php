<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.5;">
    <h2 style="color: #1e4d8f;">LD Assurances</h2>

    <p>Bonjour,</p>

    <p>Concernant votre dossier <strong>{{ $submission->reference }}</strong> :</p>

    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; white-space: pre-wrap;">
        {{ $message }}
    </div>

    <p>Cordialement,<br>LD Assurances</p>
</body>
</html>
