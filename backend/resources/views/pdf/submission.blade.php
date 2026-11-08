<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>{{ $typeLabel }} — {{ $submission->reference }}</title>
<style>
  @page {
    margin: 12mm 15mm 16mm 15mm;
  }

  body {
    font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
    font-size: 7.6pt;
    color: #1e2d3d;
    line-height: 1.3;
    background: #ffffff;
  }

  /* ─── EN-TÊTE : DEUX COLONNES (LD ASSURANCES / DOSSIER CLIENT) ─── */
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6pt;
  }

  .header-left {
    width: 58%;
    vertical-align: top;
    padding-right: 12pt;
  }

  .header-right {
    width: 42%;
    vertical-align: top;
  }

  .company-title {
    font-size: 16pt;
    font-weight: bold;
    color: #144983;
    line-height: 1.1;
    margin-bottom: 2pt;
    letter-spacing: 0.2px;
  }

  .company-tagline {
    font-size: 7.5pt;
    font-weight: bold;
    color: #1aaca8;
    letter-spacing: 0.5px;
    margin-bottom: 4pt;
    text-transform: uppercase;
  }

  .company-contact {
    font-size: 6.8pt;
    color: #66788a;
    line-height: 1.25;
  }

  .client-card {
    background: #f7f9fb;
    border: 0.7pt solid #d7e0e8;
    padding: 5pt 7pt;
    border-radius: 2px;
  }

  .client-card-title {
    font-size: 7.2pt;
    font-weight: bold;
    color: #144983;
    letter-spacing: 0.5px;
    margin-bottom: 2.5pt;
    text-transform: uppercase;
  }

  .client-card-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.4pt;
    line-height: 1.25;
  }

  .client-card-table td {
    padding: 0.5pt 0;
    color: #1e2d3d;
    vertical-align: top;
  }

  .client-card-registered {
    font-size: 6.6pt;
    color: #66788a;
    padding-top: 2pt;
  }

  /* ─── BANNIÈRE HERO BLEU LD & CYAN ─── */
  .hero-banner {
    background: #144983;
    border-radius: 3px;
    padding: 5pt 8pt;
    margin-bottom: 6pt;
    page-break-inside: avoid;
  }

  .hero-table {
    width: 100%;
    border-collapse: collapse;
  }

  .hero-title {
    font-size: 12.5pt;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .hero-category-label {
    font-size: 6.5pt;
    color: #b9d8f3;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
    margin-bottom: 1pt;
  }

  .hero-category-val {
    font-size: 8pt;
    font-weight: bold;
    color: #ffffff;
    line-height: 1.1;
  }

  .hero-divider {
    border-top: 0.8pt solid #1aaca8;
    height: 1px;
    padding: 0;
    margin: 3pt 0;
  }

  .hero-reference {
    font-size: 8.8pt;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.5px;
  }

  .hero-badge {
    font-size: 7.5pt;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  /* ─── CONFIRMATION DE RÉCEPTION ─── */
  .confirmation-box {
    margin-bottom: 6pt;
    page-break-inside: avoid;
  }

  .confirmation-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: #144983;
    margin-bottom: 2pt;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }

  .confirmation-text {
    font-size: 7.6pt;
    color: #1e2d3d;
    line-height: 1.3;
  }

  /* ─── TITRES DES SECTIONS ─── */
  .section-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: #144983;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 6pt;
    margin-bottom: 3pt;
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  /* ─── TABLEAUX DE DONNÉES À DEUX COLONNES (GRIS BLEUTÉ / BLANC) ─── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5pt;
    page-break-inside: avoid;
  }

  .data-table tr {
    page-break-inside: avoid;
  }

  .data-table td {
    border: 0.4pt solid #d7e0e8;
    padding: 3pt 5pt;
    vertical-align: top;
  }

  .data-table .label-cell {
    width: 32%;
    background: #eef3f7;
    font-size: 7.2pt;
    font-weight: bold;
    color: #144983;
    line-height: 1.2;
  }

  .data-table .val-cell {
    width: 68%;
    background: #ffffff;
    font-size: 7.5pt;
    color: #1e2d3d;
    line-height: 1.25;
  }

  /* ─── TABLE DE TARIFICATION CIMA ─── */
  .pricing-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5pt;
    page-break-inside: avoid;
  }

  .pricing-table tr {
    page-break-inside: avoid;
  }

  .pricing-table td {
    border: 0.4pt solid #d7e0e8;
    padding: 3pt 5pt;
    vertical-align: top;
  }

  .pricing-table .label-cell {
    width: 65%;
    background: #eef3f7;
    font-size: 7.2pt;
    font-weight: bold;
    color: #144983;
  }

  .pricing-table .val-cell {
    width: 35%;
    background: #ffffff;
    font-size: 7.5pt;
    color: #1e2d3d;
    text-align: right;
  }

  .pricing-table .total-label {
    width: 65%;
    background: #144983;
    color: #ffffff;
    font-size: 7.4pt;
    font-weight: bold;
    letter-spacing: 0.3px;
  }

  .pricing-table .total-val {
    width: 35%;
    background: #144983;
    color: #ffffff;
    font-size: 8pt;
    font-weight: bold;
    text-align: right;
  }

  /* ─── PROCHAINE ÉTAPE ─── */
  .next-steps-box {
    margin-top: 6pt;
    margin-bottom: 6pt;
    page-break-inside: avoid;
  }

  .next-steps-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: #144983;
    margin-bottom: 2pt;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }

  .next-steps-text {
    font-size: 7.6pt;
    color: #1e2d3d;
    line-height: 1.3;
  }

  /* ─── ENCADRÉ LÉGAL IMPORTANT (CYAN ET BLEU LD) ─── */
  .legal-box {
    background: #f0f9f9;
    border: 0.8pt solid #1aaca8;
    padding: 5pt 7pt;
    margin-top: 6pt;
    margin-bottom: 6pt;
    border-radius: 2px;
    page-break-inside: avoid;
  }

  .legal-box-title {
    font-size: 7.2pt;
    font-weight: bold;
    color: #144983;
    margin-bottom: 2pt;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .legal-box-text {
    font-size: 7.2pt;
    color: #1e3a5f;
    line-height: 1.25;
  }

  /* ─── LIGNE CONTACT EN BAS DE PAGE ─── */
  .contact-line {
    font-size: 7pt;
    color: #66788a;
    margin-top: 6pt;
    margin-bottom: 4pt;
    page-break-inside: avoid;
  }

  .contact-line strong {
    color: #144983;
  }
</style>
</head>
<body>

{{-- ── 1. EN-TÊTE OFFICIEL : DEUX COLONNES (LD ASSURANCES / DOSSIER CLIENT) ── --}}
<table class="header-table">
  <tr>
    <td class="header-left">
      <table style="border-collapse: collapse; margin-bottom: 2pt;">
        <tr>
          @if(!empty($logoBase64))
            <td style="vertical-align: middle; padding-right: 7pt; width: 34pt;">
              <img src="{{ $logoBase64 }}" style="width: 32pt; height: auto; display: block;" alt="Logo LD Assurances">
            </td>
          @endif
          <td style="vertical-align: middle;">
            <div class="company-title">LD ASSURANCES SA</div>
            <div class="company-tagline">ASSURÉMENT PROCHE DE VOUS</div>
          </td>
        </tr>
      </table>
      <div class="company-contact">
        Carrefour Arno, Akwa-Douala — B.P. 2854, Douala, Cameroun<br>
        (+237) 640 65 67 93 · (+237) 233 43 99 24<br>
        contact@ldassurances.cm · www.ldassurances.cm
      </div>
    </td>
    <td class="header-right">
      <div class="client-card">
        <div class="client-card-title">DOSSIER CLIENT</div>
        <table class="client-card-table">
          <tr>
            <td>Nom : <strong>{{ $clientName }}</strong></td>
          </tr>
          <tr>
            <td>Email : {{ $clientEmail }}</td>
          </tr>
          <tr>
            <td>Téléphone : {{ $clientPhone }}</td>
          </tr>
          <tr>
            <td>Ville : {{ $clientCity }}</td>
          </tr>
          <tr>
            <td class="client-card-registered">Enregistré le : {{ $registeredDate }}</td>
          </tr>
        </table>
      </div>
    </td>
  </tr>
</table>

{{-- ── 2. BANNIÈRE HERO BLEU NUIT (TITRE, RÉFÉRENCE, BRANCHE, STATUT) ── --}}
<div class="hero-banner">
  <table class="hero-table">
    <tr>
      <td style="width: 65%; vertical-align: top; padding-bottom: 4pt;">
        <div class="hero-title">{{ $docTitle }}</div>
      </td>
      <td style="width: 35%; vertical-align: top; text-align: right; padding-bottom: 4pt;">
        <div class="hero-category-label">BRANCHE / PRODUIT</div>
        <div class="hero-category-val">{{ $categoryName }}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" class="hero-divider"></td>
    </tr>
    <tr>
      <td style="vertical-align: middle; padding-top: 4pt;">
        <div class="hero-reference">{{ $submission->reference }}</div>
      </td>
      <td style="vertical-align: middle; text-align: right; padding-top: 4pt;">
        <div class="hero-badge">{{ $statusInfo['badge'] ?? ($isQuote ? 'DEMANDE REÇUE' : 'DÉCLARATION REÇUE') }}</div>
      </td>
    </tr>
  </table>
</div>

{{-- ── 3. CONFIRMATION DE RÉCEPTION ── --}}
<div class="confirmation-box">
  <div class="confirmation-title">CONFIRMATION DE RÉCEPTION</div>
  <div class="confirmation-text">
    @if($isQuote)
      Bonjour <strong>{{ $clientName }}</strong>, votre demande de devis a bien été transmise à LD ASSURANCES SA. Voici le récapitulatif des informations communiquées.
    @else
      Bonjour <strong>{{ $clientName }}</strong>, votre déclaration de sinistre a été enregistrée sur la plateforme de LD ASSURANCES SA. Ce document récapitule les informations transmises.
    @endif
  </div>
</div>

{{-- ── 4. INFORMATIONS SUR LA DEMANDE / LE DOSSIER ── --}}
@if($isQuote)
  <div class="section-title">INFORMATIONS SUR LA DEMANDE</div>
  <table class="data-table">
    <tr>
      <td class="label-cell">Référence</td>
      <td class="val-cell">{{ $submission->reference }}</td>
    </tr>
    <tr>
      <td class="label-cell">Produit demandé</td>
      <td class="val-cell">Assurance {{ $categoryName }}</td>
    </tr>
    <tr>
      <td class="label-cell">Date et heure de réception</td>
      <td class="val-cell">{{ $dateFormatted }}</td>
    </tr>
    <tr>
      <td class="label-cell">Statut actuel</td>
      <td class="val-cell">{{ $statusInfo['status_line'] ?? ($statusInfo['label'] . ' — en attente de traitement') }}</td>
    </tr>
  </table>
@else
  <div class="section-title">INFORMATIONS SUR LE DOSSIER</div>
  <table class="data-table">
    <tr>
      <td class="label-cell">Référence du sinistre</td>
      <td class="val-cell">{{ $submission->reference }}</td>
    </tr>
    <tr>
      <td class="label-cell">Branche / produit</td>
      <td class="val-cell">Assurance {{ $categoryName }}</td>
    </tr>
    <tr>
      <td class="label-cell">Date et heure de réception</td>
      <td class="val-cell">{{ $dateFormatted }}</td>
    </tr>
    <tr>
      <td class="label-cell">Statut actuel</td>
      <td class="val-cell">{{ $statusInfo['status_line'] ?? ($statusInfo['label'] . ' — en attente d\'examen') }}</td>
    </tr>
    @if(!empty($policyNumber))
      <tr>
        <td class="label-cell">Numéro de police</td>
        <td class="val-cell">{{ $policyNumber }}</td>
      </tr>
    @endif
  </table>
@endif

{{-- ── 5. SECTIONS DE DONNÉES DU FORMULAIRE ── --}}
@foreach($sections as $section)
  <div class="section-title">{{ mb_strtoupper($section['name']) }}</div>
  <table class="data-table">
    @foreach($section['fields'] as $field)
      <tr>
        <td class="label-cell">{{ $field['label'] }}</td>
        <td class="val-cell">
          @if(is_array($field['formatted']))
            {{ implode(', ', $field['formatted']) }}
          @elseif(!empty($field['is_multiline']))
            {!! nl2br(e($field['formatted'])) !!}
          @else
            {{ $field['formatted'] }}
          @endif
        </td>
      </tr>
    @endforeach
  </table>
@endforeach

{{-- ── 6. PIÈCES JOINTES TRANSMISES (POUR SINISTRES OU DOSSIERS AVEC PIÈCES) ── --}}
@if(!$isQuote || !empty($attachments))
  <div class="section-title">PIÈCES JOINTES TRANSMISES</div>
  <table class="data-table">
    <tr>
      <td class="label-cell">Pièces reçues</td>
      <td class="val-cell">
        @if(!empty($attachments) && count($attachments) > 0)
          {{ count($attachments) }} pièce(s) jointe(s) transmise(s) :
          @foreach($attachments as $att)
            {{ $att['name'] }} ({{ $att['type_label'] }}, {{ $att['size_formatted'] }})@if(!$loop->last), @endif
          @endforeach
        @else
          Aucune pièce jointe transmise à ce stade
        @endif
      </td>
    </tr>
    <tr>
      <td class="label-cell">État des pièces</td>
      <td class="val-cell">À vérifier par le gestionnaire lors de l'examen du dossier</td>
    </tr>
  </table>
@endif

{{-- ── 7. TARIFICATION OU INDEMNISATION VALIDÉE PAR L'ADMINISTRATION ── --}}
@if(!empty($quoteCalculation) && !empty($quoteCalculation['has_calculation']))
  @if(!empty($quoteCalculation['indemnisation_estimee']) || ($submission->form_type ?? '') === 'claim')
    <div class="section-title">ESTIMATION D'INDEMNISATION DU SINISTRE (CODE CIMA / CONVENTION IDA)</div>
    <table class="pricing-table">
      @if(!empty($quoteCalculation['breakdown']))
        @foreach($quoteCalculation['breakdown'] as $item)
          <tr>
            <td class="label-cell">{{ $item['label'] ?? '' }}</td>
            <td class="val-cell" style="font-weight: 600;">
              {{ number_format($item['amount'] ?? 0, 0, ',', ' ') }} FCFA
            </td>
          </tr>
        @endforeach
      @else
        @if(isset($quoteCalculation['montant_brut']))
          <tr>
            <td class="label-cell">Dommages bruts évalués</td>
            <td class="val-cell">{{ number_format($quoteCalculation['montant_brut'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
        @if(isset($quoteCalculation['franchise']))
          <tr>
            <td class="label-cell">Franchise contractuelle déduite</td>
            <td class="val-cell" style="color: #991b1b;">- {{ number_format($quoteCalculation['franchise'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
      @endif
      @if(!empty($quoteCalculation['reduction_applied_percent']) || !empty($quoteCalculation['reduction_applied_fixed']))
        <tr>
          <td class="label-cell">Ajustement / Réduction accordée</td>
          <td class="val-cell" style="color: #059669;">
            @if(!empty($quoteCalculation['reduction_applied_percent'])) -{{ $quoteCalculation['reduction_applied_percent'] }}% @endif
            @if(!empty($quoteCalculation['reduction_applied_fixed'])) -{{ number_format($quoteCalculation['reduction_applied_fixed'], 0, ',', ' ') }} FCFA @endif
          </td>
        </tr>
      @endif
      <tr>
        <td class="total-label">TOTAL INDEMNITÉ NETTE ESTIMÉE</td>
        <td class="total-val">{{ number_format($quoteCalculation['indemnisation_estimee'] ?? 0, 0, ',', ' ') }} FCFA</td>
      </tr>
    </table>
  @else
    <div class="section-title">ESTIMATION TARIFAIRE CERTIFIÉE (CODE CIMA)</div>
    <table class="pricing-table">
      @if(!empty($quoteCalculation['breakdown']))
        @foreach($quoteCalculation['breakdown'] as $item)
          @if(!str_contains(strtolower($item['label'] ?? ''), 'total prime'))
            <tr>
              <td class="label-cell">{{ $item['label'] }}</td>
              <td class="val-cell" style="font-weight: {{ str_contains(strtolower($item['label'] ?? ''), 'prime nette') ? 'bold' : 'normal' }};">
                {{ number_format($item['amount'] ?? 0, 0, ',', ' ') }} FCFA
              </td>
            </tr>
          @endif
        @endforeach
      @else
        @if(isset($quoteCalculation['prime_nette']))
          <tr>
            <td class="label-cell">Prime Nette HT</td>
            <td class="val-cell">{{ number_format($quoteCalculation['prime_nette'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
        @if(isset($quoteCalculation['accessoires']))
          <tr>
            <td class="label-cell">Accessoires &amp; Frais de gestion</td>
            <td class="val-cell">{{ number_format($quoteCalculation['accessoires'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
        @if(isset($quoteCalculation['taxe_unique']))
          <tr>
            <td class="label-cell">Taxe unique sur les assurances (15%)</td>
            <td class="val-cell">{{ number_format($quoteCalculation['taxe_unique'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
      @endif
      @if(!empty($quoteCalculation['reduction_applied_percent']) || !empty($quoteCalculation['reduction_applied_fixed']))
        <tr>
          <td class="label-cell">Remise commerciale / Réduction</td>
          <td class="val-cell" style="color: #059669;">
            @if(!empty($quoteCalculation['reduction_applied_percent'])) -{{ $quoteCalculation['reduction_applied_percent'] }}% @endif
            @if(!empty($quoteCalculation['reduction_applied_fixed'])) -{{ number_format($quoteCalculation['reduction_applied_fixed'], 0, ',', ' ') }} FCFA @endif
          </td>
        </tr>
      @endif
      <tr>
        <td class="total-label">TOTAL PRIME TTC</td>
        <td class="total-val">{{ number_format($quoteCalculation['prime_ttc'] ?? 0, 0, ',', ' ') }} FCFA</td>
      </tr>
    </table>
  @endif
  @if(!empty($quoteCalculation['notes_explicatives']))
    <div style="font-size: 7.5pt; color: #475569; margin-top: 4px; font-style: italic;">
      ℹ️ {{ $quoteCalculation['notes_explicatives'] }}
    </div>
  @endif
@endif

{{-- ── 8. PROCHAINE ÉTAPE ── --}}
<div class="next-steps-box">
  <div class="next-steps-title">PROCHAINE ÉTAPE</div>
  <div class="next-steps-text">{{ $nextStepsText }}</div>
</div>

{{-- ── 9. IMPORTANT — NATURE DU DOCUMENT (ENCADRÉ LÉGAL BEIGE ET OR) ── --}}
<div class="legal-box">
  <div class="legal-box-title">IMPORTANT — NATURE DU DOCUMENT</div>
  <div class="legal-box-text">{{ $legalNoticeText }}</div>
</div>

{{-- ── 10. LIGNE CONTACT OFFICIELLE ── --}}
<div class="contact-line">
  <strong>{{ $contactLabel }}</strong> (+237) 640 65 67 93 · contact@ldassurances.cm
</div>

</body>
</html>
