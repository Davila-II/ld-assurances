<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>{{ $typeLabel }} — {{ $submission->reference }}</title>
<style>
  /* ─── FORMAT PAGE A4 & MARGES ───────────────────────────────────── */
  @page {
    margin: 10mm 12mm 14mm 12mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
    font-size: 8pt;
    color: #1e293b;
    line-height: 1.45;
    background: #ffffff;
  }

  /* ─── FILIGRANE DISCRET EN FOND DE PAGE ─────────────────────────── */
  .watermark {
    position: fixed;
    top: 25%;
    left: 15%;
    width: 440px;
    height: auto;
    z-index: -1000;
  }

  /* ─── BANDE SUPÉRIEURE CORPORATE ────────────────────────────────── */
  .top-strip {
    width: 100%;
    height: 4px;
    background: #0c2340;
    border-bottom: 2px solid #c59b27;
    margin-bottom: 10px;
  }

  /* ─── EN-TÊTE : DEUX COLONNES (ENTREPRISE / CLIENT) ─────────────── */
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }

  .header-left {
    width: 58%;
    vertical-align: top;
    padding-right: 12px;
  }

  .header-right {
    width: 42%;
    vertical-align: top;
  }

  /* Marque & Coordonnées de l'assureur */
  .brand-table {
    border-collapse: collapse;
    width: 100%;
  }

  .brand-logo-cell {
    width: 60px;
    vertical-align: top;
    padding-right: 10px;
  }

  .brand-logo-cell img {
    width: 55px;
    height: auto;
    display: block;
  }

  .brand-text-cell {
    vertical-align: top;
  }

  .company-title {
    font-size: 13pt;
    font-weight: bold;
    color: #0c2340;
    letter-spacing: 0.5px;
    line-height: 1.15;
  }

  .company-subtitle {
    font-size: 7.5pt;
    font-weight: bold;
    color: #c59b27;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .company-details {
    font-size: 7pt;
    color: #475569;
    line-height: 1.35;
  }

  .company-details strong {
    color: #0c2340;
  }

  .company-tags {
    margin-top: 4px;
    font-size: 6.5pt;
    color: #0c2340;
    font-weight: bold;
  }

  .tag-pill {
    display: inline-block;
    background: #e2e8f0;
    color: #0c2340;
    padding: 1px 5px;
    border-radius: 3px;
    margin-right: 3px;
    font-size: 6.5pt;
  }

  /* Fiche Demandeur / Souscripteur */
  .client-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #0c2340;
    border-radius: 4px;
    padding: 7px 9px;
  }

  .client-card-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding-bottom: 3px;
    border-bottom: 1px dashed #cbd5e1;
    margin-bottom: 5px;
  }

  .client-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
  }

  .client-info-table td {
    padding: 1px 0;
    vertical-align: top;
  }

  .client-label {
    width: 28%;
    color: #64748b;
    font-weight: bold;
  }

  .client-val {
    width: 72%;
    color: #0f172a;
    font-weight: 500;
  }

  .client-val strong {
    color: #0c2340;
    font-size: 8pt;
  }

  /* ─── BANDEAU HERO : DOSSIER & STATUT ───────────────────────────── */
  .ref-banner {
    background: #0c2340;
    color: #ffffff;
    border-left: 5px solid #c59b27;
    border-radius: 4px;
    padding: 7px 10px;
    margin-bottom: 10px;
  }

  .ref-banner-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ref-banner-left {
    vertical-align: middle;
    width: 60%;
  }

  .ref-doc-kind {
    font-size: 7pt;
    font-weight: bold;
    color: #f1c40f;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 1px;
  }

  .ref-doc-num {
    font-size: 12pt;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 1px;
    font-family: 'Courier New', Courier, monospace;
  }

  .ref-banner-right {
    vertical-align: middle;
    text-align: right;
    width: 40%;
  }

  .ref-meta-label {
    font-size: 6.5pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ref-meta-val {
    font-size: 8.5pt;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 2px;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .status-desc-text {
    font-size: 6.5pt;
    color: #cbd5e1;
    margin-top: 2px;
    line-height: 1.25;
  }

  /* ─── RUBRIQUES DU FORMULAIRE ───────────────────────────────────── */
  .section-block {
    margin-bottom: 9px;
    page-break-inside: avoid;
  }

  .section-header {
    background: #f1f5f9;
    border-left: 3px solid #0c2340;
    padding: 3px 7px;
    margin-bottom: 4px;
  }

  .section-header table {
    width: 100%;
    border-collapse: collapse;
  }

  .section-title-text {
    font-size: 8pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-badge {
    text-align: right;
    font-size: 6.5pt;
    font-weight: bold;
    color: #64748b;
  }

  /* Tableau des champs */
  .fields-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e2e8f0;
    font-size: 7.5pt;
  }

  .fields-table tr:nth-child(even) {
    background: #f8fafc;
  }

  .fields-table tr:nth-child(odd) {
    background: #ffffff;
  }

  .fields-table td {
    padding: 4px 7px;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
  }

  .field-label {
    width: 38%;
    color: #475569;
    font-weight: bold;
    border-right: 1px solid #e2e8f0;
  }

  .field-label-bullet {
    color: #c59b27;
    font-size: 7pt;
    margin-right: 3px;
  }

  .field-value {
    width: 62%;
    color: #0f172a;
    font-weight: 500;
  }

  .field-value strong {
    color: #0c2340;
  }

  .field-value-currency {
    color: #0c2340;
    font-weight: bold;
    font-size: 8pt;
  }

  .field-value-number {
    color: #0c2340;
    font-weight: bold;
  }

  .field-value.longtext {
    white-space: pre-wrap;
    word-wrap: break-word;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 3px 6px;
    margin-top: 2px;
    color: #1e293b;
    font-size: 7pt;
    line-height: 1.35;
  }

  .field-value.empty {
    color: #94a3b8;
    font-style: italic;
  }

  .bool-pill {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 6.5pt;
    font-weight: bold;
  }

  .bool-yes {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
  }

  .bool-no {
    background: #f1f5f9;
    color: #64748b;
    border: 1px solid #cbd5e1;
  }

  .tag-chip {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 6.5pt;
    margin-right: 3px;
    margin-bottom: 2px;
  }

  /* ─── BLOC PIÈCES JOINTES TÉLÉVERSÉES ───────────────────────────── */
  .attachment-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 2px solid #0c2340;
    border-radius: 4px;
    padding: 7px 10px;
    margin-top: 10px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }

  .attachment-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .attachment-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }

  .attachment-table th {
    background: #0c2340;
    color: #ffffff;
    font-size: 6.5pt;
    font-weight: bold;
    text-transform: uppercase;
    padding: 3px 6px;
    text-align: left;
    letter-spacing: 0.4px;
  }

  .attachment-table td {
    padding: 4px 6px;
    font-size: 7pt;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: middle;
  }

  .attachment-badge {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 6pt;
    font-weight: bold;
    margin-right: 4px;
    text-transform: uppercase;
  }

  /* ─── BLOC TARIFICATION DU DEVIS ────────────────────────────────── */
  .pricing-card {
    background: #f8fafc;
    border: 1px solid #c59b27;
    border-top: 3px solid #0c2340;
    border-radius: 4px;
    padding: 7px 10px;
    margin-top: 10px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }

  .pricing-header-table {
    width: 100%;
    margin-bottom: 6px;
  }

  .pricing-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .pricing-subtitle {
    font-size: 6.5pt;
    color: #475569;
    font-style: italic;
  }

  .pricing-total-badge {
    background: #0c2340;
    color: #ffffff;
    padding: 3px 8px;
    border-radius: 3px;
    display: inline-block;
    text-align: right;
  }

  .pricing-total-label {
    display: block;
    font-size: 5.5pt;
    color: #c59b27;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .pricing-total-val {
    display: block;
    font-size: 8.5pt;
    font-weight: bold;
    color: #ffffff;
  }

  .pricing-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }

  .pricing-table th {
    background: #0c2340;
    color: #ffffff;
    font-size: 6.5pt;
    font-weight: bold;
    text-transform: uppercase;
    padding: 3px 6px;
    text-align: left;
    letter-spacing: 0.4px;
  }

  .pricing-table td {
    padding: 3px 6px;
    font-size: 7pt;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
  }

  .pricing-total-row td {
    background: #f1f5f9;
    border-top: 1.5px solid #0c2340;
    border-bottom: none;
    font-weight: bold;
  }

  /* ─── ATTESTATION DE RÉCEPTION TECHNIQUE ─────────────────────────── */
  .security-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 3px solid #0c2340;
    border-radius: 4px;
    padding: 6px 9px;
    margin-top: 10px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }

  .security-box-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
  }

  .security-box-text {
    font-size: 6.5pt;
    color: #334155;
    line-height: 1.35;
  }

  .security-box-warning {
    font-size: 6pt;
    color: #64748b;
    font-style: italic;
    margin-top: 3px;
    border-top: 1px dashed #e2e8f0;
    padding-top: 3px;
  }

  /* ─── BLOC D'AUTHENTIFICATION EN 3 VOLETS ────────────────────────── */
  .auth-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }

  .auth-cell {
    width: 33.33%;
    vertical-align: top;
    padding: 0 3px;
  }

  .auth-cell:first-child {
    padding-left: 0;
  }

  .auth-cell:last-child {
    padding-right: 0;
  }

  .auth-card {
    border: 1px solid #cbd5e1;
    border-top: 2px solid #0c2340;
    border-radius: 3px;
    background: #ffffff;
    padding: 6px 7px;
    min-height: 58px;
  }

  .auth-card-title {
    font-size: 6.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 3px;
  }

  .auth-card-body {
    font-size: 6pt;
    color: #475569;
    line-height: 1.3;
  }

  .auth-card-body strong {
    color: #0c2340;
  }

  .auth-system-badge {
    display: inline-block;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 2px;
    padding: 1px 4px;
    font-size: 5.5pt;
    font-weight: bold;
    color: #0c2340;
    margin-top: 3px;
    text-transform: uppercase;
  }

  /* ─── PIED DE PAGE FIXE ─────────────────────────────────────────── */
  .footer {
    position: fixed;
    bottom: -8mm;
    left: 0;
    right: 0;
    height: 9mm;
    border-top: 1px solid #cbd5e1;
    padding-top: 3px;
    font-size: 6pt;
    color: #64748b;
  }

  .footer-table {
    width: 100%;
    border-collapse: collapse;
  }

  .footer-left {
    text-align: left;
    width: 72%;
    line-height: 1.25;
  }

  .footer-right {
    text-align: right;
    width: 28%;
    vertical-align: middle;
    font-weight: bold;
    color: #0c2340;
  }
</style>
</head>
<body>

{{-- ── FILIGRANE OFFICIEL CENTRÉ ───────────────────────────────────── --}}
@if(!empty($watermarkBase64))
  <img class="watermark" src="{{ $watermarkBase64 }}" alt="Filigrane LD Assurances" />
@endif

{{-- ── PIED DE PAGE FIXE ────────────────────────────────────────────── --}}
<div class="footer">
  <table class="footer-table">
    <tr>
      <td class="footer-left">
        <strong>{{ $company['name'] }}</strong> — {{ $company['legal'] }}<br>
        Siège : {{ $company['address'] }} | Tél urgence 24/7 : {{ $company['emergency_phone'] }} | Email : {{ $company['email'] }}
      </td>
      <td class="footer-right">
        RÉCÉPISSÉ OFFICIEL<br>
        {{ $submission->reference }}
      </td>
    </tr>
  </table>
</div>

{{-- ── BANDE DÉCORATIVE SUPÉRIEURE ─────────────────────────────────── --}}
<div class="top-strip"></div>

{{-- ── EN-TÊTE : DEUX COLONNES (ENTREPRISE / CLIENT) ────────────────── --}}
<table class="header-table">
  <tr>
    {{-- GAUCHE : IDENTITÉ DE LA COMPAGNIE --}}
    <td class="header-left">
      <table class="brand-table">
        <tr>
          @if(!empty($logoBase64))
            <td class="brand-logo-cell">
              <img src="{{ $logoBase64 }}" alt="Logo LD Assurances" />
            </td>
          @endif
          <td class="brand-text-cell">
            <div class="company-title">{{ $company['name'] }}</div>
            <div class="company-subtitle">{{ $company['tagline'] }}</div>
            <div class="company-details">
              <strong>Siège social :</strong> {{ $company['address'] }} — {{ $company['postal_box'] }}<br>
              <strong>Téléphones :</strong> {{ implode(' · ', $company['phones']) }}<br>
              <strong>Email :</strong> {{ $company['email'] }} · <strong>Site :</strong> {{ $company['website'] }}<br>
              <strong>Agences :</strong> {{ $company['agencies'] }}
            </div>
            <div class="company-tags">
              <span class="tag-pill">CODE CIMA</span>
              <span class="tag-pill">AGRÉÉ MINFI</span>
              <span class="tag-pill">OHADA</span>
              <span class="tag-pill">CAPITAL : 5 MILLIARDS FCFA</span>
            </div>
          </td>
        </tr>
      </table>
    </td>

    {{-- DROITE : IDENTITÉ DU CLIENT / DEMANDEUR --}}
    <td class="header-right">
      <div class="client-card">
        <div class="client-card-title">Dossier Souscripteur / Assuré</div>
        <table class="client-info-table">
          <tr>
            <td class="client-label">Nom :</td>
            <td class="client-val">
              <strong>{{ $clientName ?: 'Non communiqué' }}</strong>
            </td>
          </tr>
          <tr>
            <td class="client-label">Email :</td>
            <td class="client-val">{{ $submission->email }}</td>
          </tr>
          @if($clientPhone)
          <tr>
            <td class="client-label">Téléphone :</td>
            <td class="client-val">{{ $clientPhone }}</td>
          </tr>
          @endif
          @if($clientCity)
          <tr>
            <td class="client-label">Ville :</td>
            <td class="client-val">{{ $clientCity }}</td>
          </tr>
          @endif
          <tr>
            <td class="client-label">Enregistré le :</td>
            <td class="client-val">
              {{ $dateFormatted }}
            </td>
          </tr>
        </table>
      </div>
    </td>
  </tr>
</table>

{{-- ── BANDEAU HERO : DOSSIER & STATUT DU TRAITEMENT ───────────────── --}}
<div class="ref-banner">
  <table class="ref-banner-table">
    <tr>
      <td class="ref-banner-left">
        <div class="ref-doc-kind">{{ $docSubTitle }}</div>
        <div class="ref-doc-num">{{ $submission->reference }}</div>
      </td>
      <td class="ref-banner-right">
        <div class="ref-meta-label">Branche / Produit</div>
        <div class="ref-meta-val">{{ $submission->category?->name ?? 'Général' }}</div>
        <div>
          <span class="status-badge" style="background: {{ $statusInfo['bg'] }}; color: {{ $statusInfo['color'] }}; border: 1px solid {{ $statusInfo['border'] }};">
            ● {{ $statusInfo['label'] }}
          </span>
        </div>
        <div class="status-desc-text">{{ $statusInfo['description'] }}</div>
      </td>
    </tr>
  </table>
</div>

{{-- ── CONTENU DU FORMULAIRE : RUBRIQUES & INFORMATIONS ────────────── --}}
@php $secCounter = 1; @endphp
@foreach($sections as $sec)
  <div class="section-block">
    <div class="section-header">
      <table>
        <tr>
          <td class="section-title-text">{{ $sec['name'] }}</td>
          <td class="section-badge">Rubrique {{ $secCounter }} / {{ count($sections) }}</td>
        </tr>
      </table>
    </div>

    <table class="fields-table">
      @foreach($sec['fields'] as $f)
        <tr>
          <td class="field-label">
            <span class="field-label-bullet">■</span>
            {{ $f['label'] }}
          </td>
          <td class="field-value">
            @if($f['type'] === 'currency')
              <span class="field-value-currency">{{ $f['formatted'] }}</span>
            @elseif($f['type'] === 'number')
              <span class="field-value-number">{{ $f['formatted'] }}</span>
            @elseif($f['type'] === 'unit')
              <strong>{{ $f['formatted'] }}</strong>
            @elseif($f['type'] === 'boolean')
              @if(!empty($f['is_yes']))
                <span class="bool-pill bool-yes">✓ Oui</span>
              @else
                <span class="bool-pill bool-no">Non</span>
              @endif
            @elseif($f['type'] === 'list')
              @foreach($f['formatted'] as $opt)
                <span class="tag-chip">{{ $opt }}</span>
              @endforeach
            @elseif($f['type'] === 'empty')
              <span class="field-value empty">— Non renseigné —</span>
            @elseif(!empty($f['is_multiline']))
              <div class="field-value longtext">{{ $f['formatted'] }}</div>
            @else
              {{ $f['formatted'] }}
            @endif
          </td>
        </tr>
      @endforeach
    </table>
  </div>
  @php $secCounter++; @endphp
@endforeach

{{-- ── ESTIMATION DE LA TARIFICATION DU DEVIS (ALGORITHME CIMA & LD ASSURANCES) ── --}}
@if(!empty($quoteCalculation) && !empty($quoteCalculation['has_calculation']))
  <div class="pricing-card">
    <table class="pricing-header-table">
      <tr>
        <td style="width: 65%;">
          <div class="pricing-title">ESTIMATION DU DEVIS — {{ $quoteCalculation['rule_name'] ?? 'Tarification Officielle CIMA' }}</div>
          <div class="pricing-subtitle">Simulation tarifaire selon la grille réglementaire en vigueur</div>
        </td>
        <td style="width: 35%; text-align: right;">
          <div class="pricing-total-badge">
            <span class="pricing-total-label">PRIME TOTALE ANNUELLE TTC</span>
            <span class="pricing-total-val">{{ $quoteCalculation['formatted_prime_ttc'] ?? (number_format($quoteCalculation['prime_ttc'] ?? 0, 0, ',', ' ') . ' FCFA') }}</span>
          </div>
        </td>
      </tr>
    </table>

    <table class="pricing-table">
      <thead>
        <tr>
          <th style="width: 65%;">Composantes de la tarification</th>
          <th style="width: 35%; text-align: right;">Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        @if(!empty($quoteCalculation['breakdown']))
          @foreach($quoteCalculation['breakdown'] as $item)
            @if(!str_contains(strtolower($item['label']), 'total prime'))
              <tr>
                <td>{{ $item['label'] }}</td>
                <td style="text-align: right; font-weight: {{ str_contains(strtolower($item['label']), 'prime nette') ? 'bold' : 'normal' }};">
                  {{ number_format($item['amount'], 0, ',', ' ') }} FCFA
                </td>
              </tr>
            @endif
          @endforeach
        @else
          <tr>
            <td>Prime Nette HT</td>
            <td style="text-align: right;">{{ number_format($quoteCalculation['prime_nette'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
          <tr>
            <td>Accessoires & Frais de gestion</td>
            <td style="text-align: right;">{{ number_format($quoteCalculation['accessoires'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
          <tr>
            <td>Taxe unique sur les assurances (15%)</td>
            <td style="text-align: right;">{{ number_format($quoteCalculation['taxe_unique'] ?? 0, 0, ',', ' ') }} FCFA</td>
          </tr>
        @endif
        <tr class="pricing-total-row">
          <td><strong>PRIME TOTALE ANNUELLE À PAYER (TTC)</strong></td>
          <td style="text-align: right; color: #0c2340; font-weight: bold; font-size: 7.5pt;">
            {{ number_format($quoteCalculation['prime_ttc'] ?? 0, 0, ',', ' ') }} FCFA
          </td>
        </tr>
      </tbody>
    </table>
  </div>
@endif

{{-- ── PIÈCES JOINTES TÉLÉVERSÉES ─────────────────────────────────── --}}
@php
  $displayAttachments = $attachments ?? [];
  if (empty($displayAttachments) && $submission->relationLoaded('attachments') && $submission->attachments->isNotEmpty()) {
      $displayAttachments = $submission->attachments->map(fn($a) => [
          'name' => $a->original_name,
          'size_formatted' => number_format($a->size / 1024, 1, ',', ' ') . ' Ko',
          'badge' => 'DOC',
          'badge_color' => '#334155',
          'badge_bg' => '#f1f5f9',
          'badge_border' => '#cbd5e1',
          'type_label' => 'Document joint',
      ])->all();
  }
@endphp
@if(!empty($displayAttachments))
  <div class="attachment-card">
    <div class="attachment-title">Pièces Justificatives Transmises ({{ count($displayAttachments) }})</div>
    <table class="attachment-table">
      <thead>
        <tr>
          <th style="width: 45%;">Nom du document</th>
          <th style="width: 25%;">Nature</th>
          <th style="width: 15%;">Taille</th>
          <th style="width: 15%; text-align: right;">Statut</th>
        </tr>
      </thead>
      <tbody>
        @foreach($displayAttachments as $att)
          <tr>
            <td>
              <span class="attachment-badge" style="color: {{ $att['badge_color'] }}; background: {{ $att['badge_bg'] }}; border: 1px solid {{ $att['badge_border'] }};">
                {{ $att['badge'] }}
              </span>
              <strong>{{ $att['name'] }}</strong>
            </td>
            <td>{{ $att['type_label'] }}</td>
            <td>{{ $att['size_formatted'] }}</td>
            <td style="text-align: right; color: #15803d; font-weight: bold;">✓ Réceptionné</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>
@endif

{{-- ── ATTESTATION DE RÉCEPTION TECHNIQUE (CONFORME AUX EXIGENCES) ─── --}}
<div class="security-box">
  <div class="security-box-title">Attestation de Réception et d'Enregistrement Technique</div>
  <div class="security-box-text">
    <strong>{{ $company['name'] }}</strong> atteste par le présent document de la réception technique et de l'enregistrement de la présente demande sous la référence <strong>{{ $submission->reference }}</strong>, enregistrée sur notre plateforme numérique le <strong>{{ $dateFormatted }}</strong>. L’ensemble des éléments et réponses figurant sur ce récépissé ont été transmis et intégrés à notre système de gestion informatique.
  </div>
  <div class="security-box-warning">
    * Avis d'information : Le présent récépissé atteste exclusivement de l'enregistrement technique de la demande auprès de nos services. Il ne constitue ni une acceptation du risque, ni une validation de contrat d'assurance, ni un engagement de garantie de la part de LD ASSURANCES SA.
  </div>
</div>

{{-- ── BLOC D'AUTHENTIFICATION EN 3 VOLETS CLAIRS ET VÉRIDIQUES ─────── --}}
<table class="auth-table">
  <tr>
    {{-- Volet 1 : Demandeur --}}
    <td class="auth-cell">
      <div class="auth-card">
        <div class="auth-card-title">1. Souscripteur / Demandeur</div>
        <div class="auth-card-body">
          Transmission en ligne effectuée par :<br>
          <strong>{{ $clientName ?: $submission->email }}</strong><br>
          Date : {{ $dateOnly }}<br>
          <span style="color: #64748b; font-style: italic;">Formulaire validé par le client</span>
        </div>
      </div>
    </td>

    {{-- Volet 2 : Plateforme technique --}}
    <td class="auth-cell">
      <div class="auth-card">
        <div class="auth-card-title">2. Plateforme Numérique</div>
        <div class="auth-card-body">
          Système : LD Assurances Central<br>
          Réf. : <strong>{{ $submission->reference }}</strong><br>
          <div class="auth-system-badge">
            ✓ Document généré électroniquement
          </div>
        </div>
      </div>
    </td>

    {{-- Volet 3 : Service Gestionnaire --}}
    <td class="auth-cell">
      <div class="auth-card">
        <div class="auth-card-title">3. Prise en Charge LD Assurances</div>
        <div class="auth-card-body">
          Service : Direction Commerciale & Souscription<br>
          Statut : <strong>{{ $statusInfo['label'] }}</strong><br>
          <span style="color: #64748b; font-size: 5.5pt;">{{ $statusInfo['manager'] }}</span>
        </div>
      </div>
    </td>
  </tr>
</table>

</body>
</html>
