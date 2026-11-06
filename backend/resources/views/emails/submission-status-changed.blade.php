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

    @if ($submission->status === 'rejected' && $submission->rejection_reason)
        <div style="background: #fdf2f2; border-left: 4px solid #e02424; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #9b1c1c;">Motif du rejet :</p>
            <p style="margin: 0; color: #771d1d;">{{ $submission->rejection_reason }}</p>
        </div>
    @endif

    <p>Un agent de LD Assurances reste à votre disposition pour toute question.</p>

    <p>Cordialement,<br>LD Assurances</p>
</body>
</html>
