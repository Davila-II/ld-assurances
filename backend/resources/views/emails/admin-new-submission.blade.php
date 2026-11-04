<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, Helvetica, sans-serif; color: #1c2733; line-height: 1.5;">
    <h2 style="color: #1e4d8f;">LD Assurances — Nouvelle demande</h2>

    <p>Une nouvelle demande vient d'être soumise.</p>

    <ul>
        <li>Référence : <strong>{{ $submission->reference }}</strong></li>
        <li>Type : {{ $submission->form_type === 'claim' ? 'Déclaration de sinistre' : 'Demande de devis' }}</li>
        <li>Catégorie : {{ $submission->category?->name ?? '—' }}</li>
        <li>Email du client : {{ $submission->email }}</li>
        <li>Date : {{ $submission->created_at?->format('d/m/Y H:i') }}</li>
    </ul>

    <p>Traitez cette demande depuis l'espace d'administration.</p>
</body>
</html>
