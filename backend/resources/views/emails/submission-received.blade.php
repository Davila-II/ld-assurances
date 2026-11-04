<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.5;">
    <h2 style="color: #1e4d8f;">LD Assurances</h2>

    <p>Bonjour,</p>

    @if ($submission->form_type === 'claim')
        <p>Nous avons bien reçu votre déclaration de sinistre ({{ $submission->category->name }}).</p>
    @else
        <p>Nous avons bien reçu votre demande de devis ({{ $submission->category->name }}).</p>
    @endif

    <p>
        Votre numéro de dossier :
        <strong>{{ $submission->reference }}</strong>
    </p>

    <p>Conservez ce numéro : il vous sera demandé pour toute question sur votre dossier.</p>

    <p>Un agent de LD Assurances va traiter votre dossier et vous contactera.</p>

    <p>Cordialement,<br>LD Assurances</p>
</body>
</html>