<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>{{ $typeLabel }} - {{ $submission->reference }}</title>
<style>
  /* ─── Reset & Base ─────────────────────────────────────────────── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: 10pt;
    color: #1c2733;
    line-height: 1.5;
    background: #fff;
    position: relative;
  }

  /* ─── Watermark logo centré ───────────────────────────────────── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
    width: 320px;
    height: 320px;
    opacity: 0.07;
    z-index: 0;
  }

  /* ─── Tout le contenu passe au-dessus du watermark ───────────── */
  .page-content {
    position: relative;
    z-index: 1;
  }

  /* ─── En-tête : deux colonnes ─────────────────────────────────── */
  .header {
    width: 100%;
    border-bottom: 3px solid #1e4d8f;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }

  .header-table {
    width: 100%;
    border-collapse: collapse;
  }

  .header-logo-col {
    width: 60px;
    vertical-align: top;
    padding-right: 10px;
  }

  .header-logo-col img {
    width: 55px;
    height: auto;
  }

  .header-company-col {
    vertical-align: top;
    padding-right: 20px;
  }

  .header-client-col {
    vertical-align: top;
    text-align: right;
    min-width: 200px;
  }

  .company-name {
    font-size: 14pt;
    font-weight: bold;
    color: #1e4d8f;
    letter-spacing: 0.5px;
  }

  .company-tagline {
    font-size: 8pt;
    color: #c0392b;
    font-style: italic;
    margin-bottom: 4px;
  }

  .company-info {
    font-size: 8.5pt;
    color: #444;
    line-height: 1.6;
  }

  .client-box {
    background: #f0f4fb;
    border: 1px solid #c5d5ef;
    border-radius: 4px;
    padding: 8px 10px;
    display: inline-block;
    text-align: left;
  }

  .client-box-title {
    font-size: 8pt;
    font-weight: bold;
    color: #1e4d8f;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    padding-bottom: 3px;
    border-bottom: 1px solid #c5d5ef;
  }

  .client-info-line {
    font-size: 8.5pt;
    color: #333;
    line-height: 1.6;
  }

  /* ─── Bandeau de référence ──────────────────────────────────────── */
  .ref-banner {
    background: #1e4d8f;
    color: #fff;
    padding: 8px 14px;
    margin-bottom: 18px;
    border-radius: 3px;
  }

  .ref-banner-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ref-banner-left {
    font-size: 11pt;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .ref-banner-right {
    text-align: right;
    font-size: 9pt;
    opacity: 0.85;
  }

  .ref-code {
    font-size: 13pt;
    font-weight: bold;
    letter-spacing: 1px;
    display: block;
    margin-top: 1px;
  }

  /* ─── Corps : réponses ──────────────────────────────────────────── */
  .section-title {
    font-size: 10pt;
    font-weight: bold;
    color: #1e4d8f;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 5px 0 4px 0;
    border-bottom: 1.5px solid #c5d5ef;
    margin-top: 16px;
    margin-bottom: 10px;
  }

  .answers-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  .answers-table tr:nth-child(even) td {
    background: #f7f9fd;
  }

  .answers-table td {
    padding: 5px 8px;
    vertical-align: top;
    border-bottom: 1px solid #e8edf5;
  }

  .answer-label {
    width: 42%;
    font-weight: bold;
    color: #2c3e50;
    font-size: 9pt;
  }

  .answer-value {
    color: #1c2733;
    font-size: 9.5pt;
  }

  .answer-value.empty {
    color: #aaa;
    font-style: italic;
  }

  /* ─── Badges / statut ───────────────────────────────────────────── */
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 8pt;
    font-weight: bold;
  }

  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-red  { background: #fee2e2; color: #b91c1c; }

  /* ─── Pied de page ──────────────────────────────────────────────── */
  .footer {
    position: fixed;
    bottom: 10px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7.5pt;
    color: #888;
    border-top: 1px solid #ddd;
    padding-top: 5px;
  }

  /* ─── Note urgence ──────────────────────────────────────────────── */
  .note-box {
    background: #fff8e1;
    border-left: 3px solid #f59e0b;
    padding: 7px 10px;
    margin-top: 20px;
    font-size: 8.5pt;
    color: #7c5700;
    border-radius: 2px;
  }

  .note-box strong {
    display: block;
    margin-bottom: 2px;
    font-size: 9pt;
  }
</style>
</head>
<body>

{{-- ── Watermark logo ─────────────────────────────────────────────── --}}
<img class="watermark" src="{{ $logoBase64 }}" alt="" />

<div class="page-content">

  {{-- ── Pied de page fixe ──────────────────────────────────────────── --}}
  <div class="footer">
    {{ config('app.name', 'LD ASSURANCES SA') }} — Carrefour Arno, Akwa-Douala — Tél : (237) 640 65 67 93 — contact@ldassurances.cm<br>
    Document généré le {{ now()->locale('fr')->isoFormat('LL') }} à {{ now()->format('H:i') }} — Référence : {{ $submission->reference }}
  </div>

  {{-- ── En-tête ─────────────────────────────────────────────────────── --}}
  <div class="header">
    <table class="header-table">
      <tr>
        {{-- Logo --}}
        <td class="header-logo-col">
          <img src="{{ $logoBase64 }}" alt="Logo LD Assurances" />
        </td>

        {{-- Infos entreprise (gauche) --}}
        <td class="header-company-col">
          <div class="company-name">LD ASSURANCES SA</div>
          <div class="company-tagline">Assurément Proche de Vous</div>
          <div class="company-info">
            Carrefour Arno, Akwa-Douala<br>
            B.P : 2854 – DOUALA – CAMEROUN<br>
            Tél : (237) 640 65 67 93 | (237) 233 43 99 24<br>
            contact@ldassurances.cm<br>
            Agences : Douala · Yaoundé · Bafoussam
          </div>
        </td>

        {{-- Infos client (droite) --}}
        <td class="header-client-col">
          <div class="client-box">
            <div class="client-box-title">Client / Demandeur</div>
            @php
              $clientName  = $submission->answers['full_name'] ?? $submission->answers['nom_complet'] ?? null;
              $clientPhone = $submission->answers['phone']     ?? $submission->answers['telephone']   ?? null;
              $clientCity  = $submission->answers['city']      ?? $submission->answers['ville']        ?? null;
            @endphp
            <div class="client-info-line">
              @if($clientName)
                <strong>{{ $clientName }}</strong><br>
              @endif
              {{ $submission->email }}<br>
              @if($clientPhone) Tél : {{ $clientPhone }}<br> @endif
              @if($clientCity)  Ville : {{ $clientCity }}<br> @endif
              Date : {{ $submission->created_at->locale('fr')->isoFormat('LL') }}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  {{-- ── Bandeau de référence ────────────────────────────────────────── --}}
  <div class="ref-banner">
    <table class="ref-banner-table">
      <tr>
        <td class="ref-banner-left">
          {{ $typeLabel }}
          <span class="ref-code">{{ $submission->reference }}</span>
        </td>
        <td class="ref-banner-right">
          Statut : {{ $submission->statusLabel() }}<br>
          Catégorie : {{ $submission->category?->name ?? '—' }}
        </td>
      </tr>
    </table>
  </div>

  {{-- ── Réponses au formulaire ──────────────────────────────────────── --}}
  @php
    // Regrouper par section depuis le snapshot
    $sections = [];
    $snapshot = collect($submission->form_snapshot ?? []);
    $answers  = $submission->answers ?? [];

    foreach ($snapshot as $field) {
      $section = trim($field['section'] ?? '') ?: 'Informations générales';
      if (!isset($sections[$section])) {
        $sections[$section] = [];
      }
      $sections[$section][] = $field;
    }

    // Champs de contact (email, etc.) pas toujours dans le snapshot
    $reservedKeys = ['full_name','nom_complet','phone','telephone','city','ville'];
  @endphp

  @if(empty($sections))
    {{-- Pas de snapshot : afficher les réponses brutes --}}
    <div class="section-title">Réponses du formulaire</div>
    <table class="answers-table">
      @foreach($answers as $key => $value)
        <tr>
          <td class="answer-label">{{ ucfirst(str_replace('_', ' ', $key)) }}</td>
          <td class="answer-value">
            @if(is_array($value))
              {{ implode(', ', $value) }}
            @elseif($value === '' || $value === null)
              <span class="empty">—</span>
            @else
              {{ $value }}
            @endif
          </td>
        </tr>
      @endforeach
    </table>
  @else
    @foreach($sections as $sectionName => $fields)
      <div class="section-title">{{ $sectionName }}</div>
      <table class="answers-table">
        @foreach($fields as $field)
          @php
            $key   = $field['name'];
            $label = $field['label'] ?? ucfirst(str_replace('_', ' ', $key));
            $raw   = $answers[$key] ?? null;
          @endphp
          <tr>
            <td class="answer-label">{{ $label }}</td>
            <td class="answer-value">
              @if(is_array($raw))
                {{ implode(', ', $raw) }}
              @elseif($raw === true || $raw === '1' || $raw === 1)
                Oui
              @elseif($raw === false || $raw === '0' || $raw === 0)
                Non
              @elseif($raw === '' || $raw === null)
                <span class="empty">Non renseigné</span>
              @else
                {{ $raw }}
              @endif
            </td>
          </tr>
        @endforeach
      </table>
    @endforeach
  @endif

  {{-- ── Note de bas de page ──────────────────────────────────────────── --}}
  <div class="note-box">
    <strong>Important</strong>
    Conservez précieusement ce document. Il constitue votre preuve de dépôt pour le dossier
    <strong>{{ $submission->reference }}</strong>. Un conseiller LD Assurances vous contactera
    dans les meilleurs délais.
  </div>

  {{-- ── Légal ───────────────────────────────────────────────────────── --}}
  <div style="margin-top:24px; font-size:7pt; color:#aaa; text-align:center;">
    LD ASSURANCES SA — Société Anonyme au capital de 5 000 000 000 FCFA — Agréée par arrêté N°0000815/MINFI du 15 NOV 2024
  </div>

</div>{{-- .page-content --}}

</body>
</html>
