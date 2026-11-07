<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>{{ $typeLabel }} — {{ $submission->reference }}</title>
<style>
  /* ─── RESET & FORMAT PAGE A4 ────────────────────────────────────── */
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
    font-size: 8.5pt;
    color: #1e293b;
    line-height: 1.45;
    background: #ffffff;
  }

  /* ─── FILIGRANE EN ARRIÈRE-PLAN ─────────────────────────────────── */
  .watermark {
    position: fixed;
    top: 25%;
    left: 15%;
    width: 440px;
    height: auto;
    z-index: -1000;
  }

  /* ─── BARRE SUPÉRIEURE DÉCORATIVE INSTITUTIONNELLE ──────────────── */
  .top-strip {
    width: 100%;
    height: 4px;
    background: #0c2340;
    border-bottom: 2px solid #c59b27;
    margin-bottom: 12px;
  }

  /* ─── EN-TÊTE : DEUX COLONNES PARFAITEMENT ÉQUILIBRÉES ───────────── */
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }

  .header-left {
    width: 58%;
    vertical-align: top;
    padding-right: 14px;
  }

  .header-right {
    width: 42%;
    vertical-align: top;
  }

  /* Bloc Entreprise (Gauche) */
  .brand-table {
    border-collapse: collapse;
    width: 100%;
  }

  .brand-logo-cell {
    width: 62px;
    vertical-align: top;
    padding-right: 10px;
  }

  .brand-logo-cell img {
    width: 58px;
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
    font-size: 7.5pt;
    color: #475569;
    line-height: 1.4;
  }

  .company-details strong {
    color: #0c2340;
  }

  .company-tags {
    margin-top: 4px;
    font-size: 7pt;
    color: #0c2340;
    font-weight: bold;
  }

  .tag-pill {
    display: inline-block;
    background: #e2e8f0;
    color: #0c2340;
    padding: 1px 5px;
    border-radius: 3px;
    margin-right: 4px;
    font-size: 6.5pt;
  }

  /* Bloc Client (Droite) */
  .client-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #0c2340;
    border-radius: 4px;
    padding: 8px 10px;
  }

  .client-card-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding-bottom: 4px;
    border-bottom: 1px dashed #cbd5e1;
    margin-bottom: 6px;
  }

  .client-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
  }

  .client-info-table td {
    padding: 1.5px 0;
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
    font-size: 8.5pt;
  }

  /* ─── BANDEAU PRINCIPAL DU DOSSIER (HERO) ────────────────────────── */
  .ref-banner {
    background: #0c2340;
    color: #ffffff;
    border-left: 5px solid #c59b27;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 14px;
  }

  .ref-banner-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ref-banner-left {
    vertical-align: middle;
  }

  .ref-doc-kind {
    font-size: 7pt;
    font-weight: bold;
    color: #f1c40f;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 1px;
  }

  .ref-doc-num {
    font-size: 13pt;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 1.2px;
    font-family: 'Courier New', Courier, monospace;
  }

  .ref-banner-right {
    vertical-align: middle;
    text-align: right;
  }

  .ref-meta-label {
    font-size: 7pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ref-meta-val {
    font-size: 8.5pt;
    font-weight: bold;
    color: #ffffff;
  }

  .ref-badge {
    display: inline-block;
    background: #10b981;
    color: #ffffff;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 7.5pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .ref-badge.claim {
    background: #e11d48;
  }

  .ref-badge.quote {
    background: #2563eb;
  }

  /* ─── SECTIONS DU FORMULAIRE ─────────────────────────────────────── */
  .section-block {
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .section-header {
    background: #f1f5f9;
    border-left: 3px solid #0c2340;
    padding: 4px 8px;
    margin-bottom: 6px;
  }

  .section-header table {
    width: 100%;
    border-collapse: collapse;
  }

  .section-title-text {
    font-size: 8.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .section-badge {
    text-align: right;
    font-size: 7pt;
    font-weight: bold;
    color: #64748b;
  }

  /* Grille des réponses */
  .fields-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e2e8f0;
    font-size: 8pt;
  }

  .fields-table tr:nth-child(even) {
    background: #f8fafc;
  }

  .fields-table tr:nth-child(odd) {
    background: #ffffff;
  }

  .fields-table td {
    padding: 5px 8px;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
  }

  .field-label {
    width: 40%;
    color: #475569;
    font-weight: bold;
    border-right: 1px solid #e2e8f0;
  }

  .field-label-bullet {
    color: #c59b27;
    font-size: 8pt;
    margin-right: 3px;
  }

  .field-value {
    width: 60%;
    color: #0f172a;
    font-weight: 500;
  }

  .field-value.longtext {
    white-space: pre-wrap;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 4px 6px;
    margin-top: 2px;
    color: #1e293b;
    font-size: 7.5pt;
    line-height: 1.4;
  }

  .field-value.empty {
    color: #94a3b8;
    font-style: italic;
  }

  .bool-pill {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 7pt;
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
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 7pt;
    margin-right: 3px;
    margin-bottom: 2px;
  }

  /* ─── BLOC PIÈCES JOINTES ────────────────────────────────────────── */
  .attachment-card {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
    padding: 6px 10px;
    margin-top: 10px;
  }

  .attachment-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .attachment-item {
    font-size: 7.5pt;
    color: #334155;
    padding: 1px 0;
  }

  /* ─── BLOC ATTESTATION & SIGNATURES ──────────────────────────────── */
  .security-box {
    background: #fffdf5;
    border: 1px solid #fde68a;
    border-left: 3px solid #c59b27;
    border-radius: 4px;
    padding: 6px 9px;
    margin-top: 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .security-box-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .security-box-text {
    font-size: 7pt;
    color: #78350f;
    line-height: 1.35;
  }

  .signatures-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }

  .signature-card {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: #ffffff;
    padding: 8px 10px;
    height: 75px;
    vertical-align: top;
  }

  .signature-card-title {
    font-size: 7.5pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 3px;
    margin-bottom: 4px;
  }

  .signature-note {
    font-size: 6.5pt;
    color: #64748b;
    font-style: italic;
  }

  .electronic-stamp {
    display: inline-block;
    border: 1.5px solid #0c2340;
    border-radius: 4px;
    padding: 3px 6px;
    color: #0c2340;
    font-size: 6.5pt;
    font-weight: bold;
    text-align: center;
    margin-top: 6px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* ─── PIED DE PAGE FIXE ─────────────────────────────────────────── */
  .footer {
    position: fixed;
    bottom: -8mm;
    left: 0;
    right: 0;
    height: 10mm;
    border-top: 1px solid #cbd5e1;
    padding-top: 4px;
    font-size: 6.5pt;
    color: #64748b;
  }

  .footer-table {
    width: 100%;
    border-collapse: collapse;
  }

  .footer-left {
    text-align: left;
    width: 70%;
    line-height: 1.3;
  }

  .footer-right {
    text-align: right;
    width: 30%;
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
        <strong>LD ASSURANCES SA</strong> — Société Anonyme au capital de 5 000 000 000 FCFA entièrement libéré | Agrément N° 0000815/MINFI du 15 NOV 2024<br>
        Code CIMA · Acte Uniforme OHADA · Siège : Carrefour Arno, Douala | Tél urgence 24/7 : (+237) 640 65 67 93 | contact@ldassurances.cm
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

{{-- ── EN-TÊTE DEUX COLONNES : ENTREPRISE & CLIENT ──────────────────── --}}
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
            <div class="company-title">LD ASSURANCES SA</div>
            <div class="company-subtitle">Assurément Proche de Vous</div>
            <div class="company-details">
              <strong>Siège social :</strong> Carrefour Arno, Akwa — B.P. 2854 Douala, Cameroun<br>
              <strong>Téléphones :</strong> (+237) 640 65 67 93 · (+237) 233 43 99 24 · (+237) 233 42 51 82<br>
              <strong>Email :</strong> contact@ldassurances.cm · <strong>Portail :</strong> www.ldassurances.cm<br>
              <strong>Réseau :</strong> Direction Générale Douala · Agences Yaoundé · Bafoussam
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
        @php
          $clientName  = $submission->answers['full_name'] ?? $submission->answers['nom_complet'] ?? $submission->answers['nom'] ?? null;
          $clientPhone = $submission->answers['phone']     ?? $submission->answers['telephone']   ?? null;
          $clientCity  = $submission->answers['city']      ?? $submission->answers['ville']        ?? null;
        @endphp
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
            <td class="client-label">Dépôt :</td>
            <td class="client-val">
              {{ $submission->created_at ? $submission->created_at->format('d/m/Y à H:i') : now()->format('d/m/Y à H:i') }}
            </td>
          </tr>
        </table>
      </div>
    </td>
  </tr>
</table>

{{-- ── BANDEAU HERO : RÉFÉRENCE & STATUT DU DOSSIER ─────────────────── --}}
<div class="ref-banner">
  <table class="ref-banner-table">
    <tr>
      <td class="ref-banner-left">
        <div class="ref-doc-kind">
          @if($submission->form_type === 'claim')
            Récépissé Officiel de Déclaration de Sinistre
          @else
            Récépissé Officiel de Demande de Devis d’Assurance
          @endif
        </div>
        <div class="ref-doc-num">{{ $submission->reference }}</div>
      </td>
      <td class="ref-banner-right">
        <div class="ref-meta-label">Branche / Produit</div>
        <div class="ref-meta-val">{{ $submission->category?->name ?? 'Général' }}</div>
        <div>
          <span class="ref-badge {{ $submission->form_type }}">
            ● {{ $submission->statusLabel() }}
          </span>
        </div>
      </td>
    </tr>
  </table>
</div>

{{-- ── CONTENU : DONNÉES DU FORMULAIRE ORGANISÉES PAR RUBRIQUES ─────── --}}
@php
  $sections = [];
  $snapshot = collect($submission->form_snapshot ?? []);
  $answers  = $submission->answers ?? [];

  // Regroupement par section selon le snapshot de formulaire
  foreach ($snapshot as $field) {
    $sec = trim($field['section'] ?? '') ?: 'Informations Générales';
    if (!isset($sections[$sec])) {
      $sections[$sec] = [];
    }
    $sections[$sec][] = $field;
  }
@endphp

@if(empty($sections))
  {{-- Si aucun snapshot de formulaire n’est associé (données brutes) --}}
  <div class="section-block">
    <div class="section-header">
      <div class="section-title-text">Données Enregistrées</div>
    </div>
    <table class="fields-table">
      @foreach($answers as $key => $val)
        <tr>
          <td class="field-label">
            <span class="field-label-bullet">■</span>
            {{ ucfirst(str_replace('_', ' ', $key)) }}
          </td>
          <td class="field-value">
            @if(is_array($val))
              @foreach($val as $item)
                <span class="tag-chip">{{ $item }}</span>
              @endforeach
            @elseif($val === true || $val === '1' || $val === 1)
              <span class="bool-pill bool-yes">✓ OUI</span>
            @elseif($val === false || $val === '0' || $val === 0)
              <span class="bool-pill bool-no">NON</span>
            @elseif($val === '' || $val === null)
              <span class="field-value empty">— Non renseigné —</span>
            @elseif(strlen((string)$val) > 80)
              <div class="field-value longtext">{{ $val }}</div>
            @else
              {{ $val }}
            @endif
          </td>
        </tr>
      @endforeach
    </table>
  </div>
@else
  @php $sectionIndex = 1; @endphp
  @foreach($sections as $secName => $fields)
    <div class="section-block">
      <div class="section-header">
        <table>
          <tr>
            <td class="section-title-text">
              {{ $secName }}
            </td>
            <td class="section-badge">
              Rubrique {{ $sectionIndex }} / {{ count($sections) }}
            </td>
          </tr>
        </table>
      </div>

      <table class="fields-table">
        @foreach($fields as $field)
          @php
            $fieldName  = $field['name'];
            $fieldLabel = $field['label'] ?? ucfirst(str_replace('_', ' ', $fieldName));
            $fieldVal   = $answers[$fieldName] ?? null;
          @endphp
          <tr>
            <td class="field-label">
              <span class="field-label-bullet">■</span>
              {{ $fieldLabel }}
            </td>
            <td class="field-value">
              @if(is_array($fieldVal))
                @if(empty($fieldVal))
                  <span class="field-value empty">— Aucun choix —</span>
                @else
                  @foreach($fieldVal as $item)
                    <span class="tag-chip">{{ $item }}</span>
                  @endforeach
                @endif
              @elseif($fieldVal === true || $fieldVal === '1' || $fieldVal === 1)
                <span class="bool-pill bool-yes">✓ OUI</span>
              @elseif($fieldVal === false || $fieldVal === '0' || $fieldVal === 0)
                <span class="bool-pill bool-no">NON</span>
              @elseif($fieldVal === '' || $fieldVal === null)
                <span class="field-value empty">— Non renseigné —</span>
              @elseif(strlen((string)$fieldVal) > 75 || str_contains((string)$fieldVal, "\n"))
                <div class="field-value longtext">{{ $fieldVal }}</div>
              @else
                {{ $fieldVal }}
              @endif
            </td>
          </tr>
        @endforeach
      </table>
    </div>
    @php $sectionIndex++; @endphp
  @endforeach
@endif

{{-- ── LISTE DES PIÈCES JOINTES TÉLÉVERSÉES (SI APPLICABLE) ─────────── --}}
@if($submission->relationLoaded('attachments') && $submission->attachments->isNotEmpty())
  <div class="attachment-card">
    <div class="attachment-title">Pièces Justificatives et Documents Transmis ({{ $submission->attachments->count() }})</div>
    @foreach($submission->attachments as $att)
      <div class="attachment-item">
        📎 <strong>{{ $att->original_name }}</strong> ({{ number_format($att->size / 1024, 1, ',', ' ') }} Ko)
      </div>
    @endforeach
  </div>
@endif

{{-- ── ATTESTATION ET VALIDITÉ DU DÉPÔT NUMÉRIQUE ───────────────────── --}}
<div class="security-box">
  <div class="security-box-title">Attestation de Transmission Électronique</div>
  <div class="security-box-text">
    Le présent document certifie que la déclaration / demande ci-dessus a été enregistrée avec succès dans le système informatique central de <strong>LD ASSURANCES SA</strong>. Ce récépissé fait foi de dépôt sous la référence <strong>{{ $submission->reference }}</strong>, sous réserve de la vérification des pièces justificatives par nos gestionnaires agréés conformément aux dispositions du Code CIMA.
  </div>
</div>

{{-- ── BLOC DE SIGNATURES OFFICIELLES (DOUBLE ENCADRÉ) ──────────────── --}}
<table class="signatures-table">
  <tr>
    {{-- SIGNATURE DEMANDEUR --}}
    <td style="width: 50%; padding-right: 6px;">
      <div class="signature-card">
        <div class="signature-card-title">Pour le Souscripteur / Demandeur</div>
        <div class="signature-note">
          Date de dépôt : {{ $submission->created_at ? $submission->created_at->format('d/m/Y') : now()->format('d/m/Y') }}<br>
          Transmission validée en ligne par :<br>
          <strong>{{ $clientName ?: $submission->email }}</strong>
        </div>
      </div>
    </td>

    {{-- VISA COMPAGNIE D'ASSURANCE --}}
    <td style="width: 50%; padding-left: 6px;">
      <div class="signature-card">
        <div class="signature-card-title">Pour LD ASSURANCES SA</div>
        <div class="signature-note">
          Direction des Opérations & Souscription<br>
          Carrefour Arno, Douala (Cameroun)
        </div>
        <div class="electronic-stamp">
          ✓ ENREGISTRÉ NUMÉRIQUEMENT · CERTIFIÉ CONFORME
        </div>
      </div>
    </td>
  </tr>
</table>

</body>
</html>
