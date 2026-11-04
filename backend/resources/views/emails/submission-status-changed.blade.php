<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.5;">
    <h2 style="color: #1e4d8f;">LD Assurances — Mise à jour de votre dossier</h2>

    <p>Bonjour,</p>

    <p>Le statut de votre dossier a été mis à jour.</p>

    <ul>
        <li>Référence : <strong>{{ $submission->reference }}</strong></li>
        <li>Nouveau statut : <strong>{{ $submission->statusLabel() }}</strong></li>
    </ul>

    <p>Un agent de LD Assurances reste à votre disposition pour toute question.</p>

    <p>Cordialement,<br>LD Assurances</p>
</body>
</html>
