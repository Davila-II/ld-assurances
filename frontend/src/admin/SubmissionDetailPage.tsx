import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Download,
  Paperclip,
  X,
  Calculator,
  RefreshCw,
  CheckCircle,
  Percent,
  Sliders,
  Edit3,
  RotateCcw,
  Clock,
  Info,
  Eye,
  MessageSquare,
} from 'lucide-react';
import {
  calculateSubmission,
  downloadAttachment,
  downloadSubmissionPdfAdmin,
  getPricingRules,
  getSubmission,
  replyToSubmission,
  resetSubmissionCalculation,
  updateSubmissionNotes,
  updateSubmissionStatus,
  type CalculateSubmissionPayload,
} from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { hasPermission } from '../auth';
import type { AttachmentInfo, PricingRule, QuoteCalculation, SubmissionDetail, SubmissionStatus } from '../types';
import StatusBadge from './StatusBadge';
import {
  STATUSES,
  STATUS_LABELS,
  errorMessage,
  formatAnswer,
  formatDate,
  formatSize,
} from './labels';

// Rang hiérarchique des statuts (plus le rang est élevé, plus le statut est avancé)
const STATUS_RANK: Record<SubmissionStatus, number> = {
  received:    1,
  in_progress: 2,
  answered:    3,
  closed:      4,
  rejected:    4,
};

function formatFcfa(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0 FCFA';
  if (typeof val === 'string' && val.includes('FCFA')) return val;
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString('fr-FR') + ' FCFA';
}

export default function SubmissionDetailPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [loadedSubmission, setLoadedSubmission] = useState<{
    id: string;
    data: SubmissionDetail;
  } | null>(null);
  const [requestError, setRequestError] = useState<{ id: string; message: string } | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [newStatus, setNewStatus] = useState<SubmissionStatus>('received');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [notes, setNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [savingNotes, setSavingNotes] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [notesNotice, setNotesNotice] = useState('');
  const [replyNotice, setReplyNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour le calcul manuel & tarification admin
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [manualMontant, setManualMontant] = useState<string>('');
  const [manualFranchise, setManualFranchise] = useState<string>('');
  const [reductionPercent, setReductionPercent] = useState<string>('');
  const [reductionFixed, setReductionFixed] = useState<string>('');
  const [calcAdminNote, setCalcAdminNote] = useState<string>('');
  const [calculating, setCalculating] = useState<boolean>(false);
  const [calcPreview, setCalcPreview] = useState<QuoteCalculation | null>(null);
  const [calcNotice, setCalcNotice] = useState<string>('');
  const [calcError, setCalcError] = useState<string>('');
  const [showCalcConfig, setShowCalcConfig] = useState<boolean>(false);

  const invalidId = !id || !/^\d+$/.test(id);
  const submission =
    !invalidId && loadedSubmission?.id === id ? loadedSubmission.data : null;
  const error = invalidId
    ? 'Numéro de déclaration invalide.'
    : requestError?.id === id
      ? requestError.message
      : actionError?.id === id
        ? actionError.message
        : '';
  const loading = !invalidId && submission === null && requestError?.id !== id;

  useEffect(() => {
    let cancelled = false;

    if (!id || !/^\d+$/.test(id)) {
      return () => {
        cancelled = true;
      };
    }

    // Charger les règles de tarification pour le sélecteur
    getPricingRules()
      .then((rules) => {
        if (!cancelled) setPricingRules(rules);
      })
      .catch(() => {});

    getSubmission(id)
      .then((data) => {
        if (cancelled) return;
        setLoadedSubmission({ id, data });
        setNewStatus(data.status);
        setRejectionReason(data.rejection_reason ?? '');
        setNotes(data.notes ?? '');

        // Initialiser l'état du calcul
        if (data.quote_calculation) {
          setShowCalcConfig(false);
          if (data.quote_calculation.driver === 'manual') {
            setSelectedRuleId('manual');
            setManualMontant(
              String(
                data.quote_calculation.montant_brut ??
                  data.quote_calculation.prime_ttc ??
                  ''
              )
            );
            setManualFranchise(
              data.quote_calculation.franchise
                ? String(data.quote_calculation.franchise)
                : ''
            );
          } else if (data.quote_calculation.admin_rule_id) {
            setSelectedRuleId(String(data.quote_calculation.admin_rule_id));
          } else {
            setSelectedRuleId('');
          }
          if (data.quote_calculation.reduction_applied_percent) {
            setReductionPercent(String(data.quote_calculation.reduction_applied_percent));
          }
          if (data.quote_calculation.reduction_applied_fixed) {
            setReductionFixed(String(data.quote_calculation.reduction_applied_fixed));
          }
          if (data.quote_calculation.admin_note) {
            setCalcAdminNote(data.quote_calculation.admin_note);
          }
        } else {
          setShowCalcConfig(true);
          setSelectedRuleId('');
          setManualMontant('');
          setManualFranchise('');
          setReductionPercent('');
          setReductionFixed('');
          setCalcAdminNote('');
          setCalcPreview(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setRequestError({ id, message: errorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveStatus = async () => {
    if (!submission || !id) return;
    // Vérification côté client de la hiérarchie des statuts
    const currentRank = STATUS_RANK[submission.status] ?? 0;
    const selectedRank = STATUS_RANK[newStatus] ?? 0;
    if (selectedRank < currentRank) {
      setActionError({ id, message: t('admin.detail_status_no_downgrade') });
      return;
    }
    if (newStatus === 'rejected' && !rejectionReason.trim()) {
      setActionError({ id, message: 'Veuillez saisir le motif du rejet (obligatoire).' });
      return;
    }
    setSaving(true);
    setNotice('');
    setActionError(null);

    try {
      const result = await updateSubmissionStatus(submission.id, newStatus, rejectionReason.trim());
      setLoadedSubmission({
        id,
        data: {
          ...submission,
          status: result.status,
          rejection_reason: result.rejection_reason ?? (newStatus === 'rejected' ? rejectionReason.trim() : null),
          taken_at: (result as typeof result & { taken_at?: string }).taken_at ?? submission.taken_at,
          closed_at: (result as typeof result & { closed_at?: string }).closed_at ?? submission.closed_at,
        },
      });
      setNotice(newStatus === 'rejected' ? 'Dossier rejeté et client notifié par email avec le motif.' : 'Statut mis à jour.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!submission || !id) return;
    setSavingNotes(true);
    setNotesNotice('');
    setActionError(null);

    try {
      const result = await updateSubmissionNotes(submission.id, notes);
      setLoadedSubmission({ id, data: { ...submission, notes: result.notes } });
      setNotesNotice('Observations enregistrées.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSavingNotes(false);
    }
  };

  const sendReply = async () => {
    if (!submission || !id || !replyMessage.trim()) return;
    setSendingReply(true);
    setReplyNotice('');
    setActionError(null);

    try {
      await replyToSubmission(submission.id, replyMessage.trim(), replyFiles);
      setReplyFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setReplyNotice(lang === 'en' ? 'Reply sent to client.' : 'Réponse envoyée au client.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDownload = async (attachment: AttachmentInfo) => {
    if (!submission || !id) return;
    setDownloadingId(attachment.id);
    setActionError(null);

    try {
      await downloadAttachment(attachment.id, attachment.original_name);
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!submission) return;
    setDownloadingPdf(true);
    setActionError(null);

    try {
      await downloadSubmissionPdfAdmin(submission.id, `${submission.reference}.pdf`);
    } catch (err) {
      setActionError({ id: String(submission.id), message: errorMessage(err) });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRunCalculation = async (save: boolean = false) => {
    if (!submission || !id) return;
    setCalculating(true);
    setCalcError('');
    setCalcNotice('');

    try {
      const payload: CalculateSubmissionPayload = {
        preview_only: !save,
        reduction_percent: reductionPercent ? Number(reductionPercent) : undefined,
        reduction_fixed: reductionFixed ? Number(reductionFixed) : undefined,
        admin_note: calcAdminNote.trim() || undefined,
      };

      if (selectedRuleId === 'manual') {
        if (!manualMontant) {
          setCalcError(
            lang === 'en'
              ? 'Please enter a manual amount.'
              : 'Veuillez saisir un montant manuel.'
          );
          setCalculating(false);
          return;
        }
        payload.manual_montant_brut = Number(manualMontant);
        payload.manual_franchise = manualFranchise ? Number(manualFranchise) : 0;
      } else if (selectedRuleId) {
        payload.pricing_rule_id = Number(selectedRuleId);
      }

      const res = await calculateSubmission(submission.id, payload);

      if (save) {
        setLoadedSubmission({
          id,
          data: {
            ...submission,
            quote_calculation: res.quote_calculation,
          },
        });
        setCalcPreview(null);
        setShowCalcConfig(false);
        setCalcNotice(
          lang === 'en'
            ? 'Calculation validated and saved. The official PDF now includes this amount.'
            : 'Calcul validé et sauvegardé. Le PDF officiel du client inclut désormais ce montant.'
        );
      } else {
        setCalcPreview(res.quote_calculation);
        setCalcNotice(
          lang === 'en'
            ? 'Calculation preview ready. Click "Validate and save" to apply it to the file.'
            : 'Prévisualisation réussie. Cliquez sur "Valider et enregistrer sur le dossier" pour l\'appliquer.'
        );
      }
    } catch (err) {
      setCalcError(errorMessage(err));
    } finally {
      setCalculating(false);
    }
  };

  const handleResetCalculation = async () => {
    if (!submission || !id) return;
    const confirmMsg =
      lang === 'en'
        ? 'Are you sure you want to reset this calculation? The client PDF will no longer contain any amount.'
        : 'Êtes-vous sûr de vouloir réinitialiser la tarification de ce dossier ? Le PDF du client ne contiendra plus aucun montant.';
    if (!window.confirm(confirmMsg)) return;

    setCalculating(true);
    setCalcError('');
    setCalcNotice('');

    try {
      await resetSubmissionCalculation(submission.id);
      setLoadedSubmission({
        id,
        data: {
          ...submission,
          quote_calculation: null,
        },
      });
      setCalcPreview(null);
      setShowCalcConfig(true);
      setCalcNotice(
        lang === 'en'
          ? 'Calculation reset. The file now has no validated amount.'
          : 'Calcul réinitialisé. Le dossier n\'a plus de montant validé.'
      );
    } catch (err) {
      setCalcError(errorMessage(err));
    } finally {
      setCalculating(false);
    }
  };

  return (
    <>
      <Link to="/admin/submissions" className="back-link">
        {lang === 'en' ? '← Back to list' : '← Retour à la liste'}
      </Link>

      {loading && <p role="status">{t('admin.loading')}</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      {submission && (
        <>
          <div className="detail-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>{submission.reference}</h1>
              <StatusBadge status={submission.status} />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              {downloadingPdf ? (lang === 'en' ? 'Generating…' : 'Génération…') : (lang === 'en' ? 'Download PDF' : 'Télécharger PDF')}
            </button>
          </div>

          <section className="card">
            <dl className="answers">
              <div className="answer">
                <dt>{t('admin.th_nature')}</dt>
                <dd>{submission.form_type === 'quote' ? t('status.quote') : t('status.claim')}</dd>
              </div>
              <div className="answer">
                <dt>{t('admin.th_type')}</dt>
                <dd>{submission.type ?? '—'}</dd>
              </div>
              <div className="answer">
                <dt>{t('admin.filter_category')}</dt>
                <dd>{submission.category ?? '—'}</dd>
              </div>
              <div className="answer">
                <dt>{t('admin_clients.th_email')}</dt>
                <dd>{submission.email}</dd>
              </div>
              <div className="answer">
                <dt>{t('client.col_date')}</dt>
                <dd>{formatDate(submission.created_at, lang)}</dd>
              </div>
              {submission.taken_at && (
                <div className="answer">
                  <dt>{t('client.col_taken_at')}</dt>
                  <dd style={{ color: '#2563eb', fontWeight: 600 }}>{formatDate(submission.taken_at, lang)}</dd>
                </div>
              )}
              {submission.processed_at && (
                <div className="answer">
                  <dt>{t('client.col_processed_at')}</dt>
                  <dd style={{ color: submission.status === 'rejected' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {formatDate(submission.processed_at, lang)}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="card">
            <h2>{t('admin.detail_title')}</h2>

            {submission.status === 'rejected' && submission.rejection_reason && (
              <div className="alert" style={{ background: '#fdf2f2', borderColor: '#f98080', color: '#9b1c1c', marginBottom: '16px' }}>
                <strong>{t('admin.detail_rejected_badge')}</strong>
                <p style={{ margin: '4px 0 0' }}>Motif : {submission.rejection_reason}</p>
              </div>
            )}

            {((submission.form_type === 'claim' && hasPermission('change_status_claims')) ||
              (submission.form_type === 'quote' && hasPermission('change_status_quotes')) ||
              hasPermission('change_status')) && (
              <>
                <div className="status-row">
                  <label htmlFor="new-status">{t('admin.detail_status_label')}</label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(event) => setNewStatus(event.target.value as SubmissionStatus)}
                  >
                    {STATUSES.map((status) => {
                      const currentRank = STATUS_RANK[submission.status] ?? 0;
                      const optionRank = STATUS_RANK[status] ?? 0;
                      const isDowngrade = optionRank < currentRank;
                      return (
                        <option key={status} value={status} disabled={isDowngrade}>
                          {t(`status.${status}` as const) || STATUS_LABELS[status]}
                          {isDowngrade ? ' (—)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className={newStatus === 'rejected' ? 'btn btn-danger' : 'btn'}
                    disabled={
                      saving ||
                      (newStatus === submission.status &&
                        (newStatus !== 'rejected' || rejectionReason.trim() === (submission.rejection_reason ?? '')))
                    }
                    onClick={saveStatus}
                  >
                    {saving
                      ? t('admin.loading')
                      : newStatus === 'rejected'
                        ? (lang === 'en' ? 'Confirm rejection' : 'Confirmer le rejet')
                        : (lang === 'en' ? 'Update' : 'Mettre à jour')}
                  </button>
                </div>

                {newStatus === 'rejected' && (
                  <div className="field" style={{ marginTop: '14px' }}>
                    <label htmlFor="rejection-reason" style={{ color: '#9b1c1c', fontWeight: 600 }}>
                      {t('admin.detail_rejection_reason_label')} :
                    </label>
                    <textarea
                      id="rejection-reason"
                      rows={3}
                      required
                      placeholder={t('admin.detail_rejection_placeholder')}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {notice && <p className="notice" role="status" style={{ marginTop: '12px' }}>{notice}</p>}
          </section>

          {/* 2. Demande du client / Demande de devis */}
          <section className="card">
            <h2>{submission.form_type === 'claim' ? t('admin.detail_answers_title_claim') : t('admin.detail_answers_title_quote')}</h2>
            <dl className="answers">
              {submission.answers.map((answer, index) => (
                <div className="answer" key={`${answer.label}-${index}`}>
                  <dt>{answer.label}</dt>
                  <dd>{formatAnswer(answer.value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 3. Pièces jointes (ajoutées par le client lors du formulaire) */}
          <section className="card">
            <h2>{t('admin.detail_attachments_title', { count: submission.attachments.filter(a => a.source !== 'admin').length })}</h2>
            {submission.attachments.filter(a => a.source !== 'admin').length === 0 ? (
              <p>{t('admin.detail_no_attachments')}</p>
            ) : (
              <ul className="attachments">
                {submission.attachments.filter(a => a.source !== 'admin').map((attachment) => (
                  <li key={attachment.id}>
                    <span>
                      {attachment.original_name} <small>({formatSize(attachment.size, lang)})</small>
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={downloadingId === attachment.id}
                      onClick={() => handleDownload(attachment)}
                    >
                      {downloadingId === attachment.id ? (lang === 'en' ? 'Downloading…' : 'Téléchargement…') : t('admin.detail_download')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Observations internes */}
          <section className="card">
            <h2>{t('admin.detail_notes_title')}</h2>
            <div className="field">
              <label htmlFor="notes">{t('admin.detail_notes_help')}</label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <button type="button" className="btn" disabled={savingNotes} onClick={saveNotes}>
              {savingNotes ? t('admin.loading') : t('admin.detail_save_notes')}
            </button>
            {notesNotice && <p className="notice" role="status">{notesNotice}</p>}
          </section>

          {/* 5. Tarification & Indemnisation (Gestion Admin) */}
          {hasPermission('manage_calculation') && (
            <section
              className="card"
              style={{
                borderLeft: submission.form_type === 'claim' ? '4px solid #0f766e' : '4px solid #144983',
              }}
            >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: submission.form_type === 'claim' ? '#0f766e' : '#144983',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Calculator size={22} />
                  {submission.form_type === 'claim'
                    ? t('admin.detail_calc_title_claim')
                    : t('admin.detail_calc_title_quote')}
                </h2>
                <small style={{ color: '#64748b' }}>
                  {t('admin.detail_calc_hint')}
                </small>
              </div>

              {submission.quote_calculation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '4px 10px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle size={14} /> {t('admin.detail_calc_validated_badge')}
                  </span>
                  <span
                    className="badge"
                    style={{
                      fontSize: '1rem',
                      padding: '6px 14px',
                      fontWeight: 700,
                      background: submission.form_type === 'claim' ? '#0f766e' : '#144983',
                      color: '#fff',
                    }}
                  >
                    {submission.form_type === 'claim'
                      ? formatFcfa(
                          submission.quote_calculation.indemnisation_estimee_formatted ||
                            submission.quote_calculation.indemnisation_estimee ||
                            submission.quote_calculation.prime_ttc
                        )
                      : formatFcfa(
                          submission.quote_calculation.prime_ttc_formatted ||
                            submission.quote_calculation.prime_ttc
                        )}
                  </span>
                </div>
              ) : (
                <span
                  className="badge"
                  style={{
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock size={14} />
                  {t('admin.detail_calc_pending_badge')}
                </span>
              )}
            </div>

            {/* A. Si un calcul est validé et que la config est repliée */}
            {submission.quote_calculation && !showCalcConfig && (
              <div style={{ marginTop: '12px' }}>
                {submission.form_type === 'claim' ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      margin: '12px 0',
                      background: '#f0fdfa',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid #ccfbf1',
                    }}
                  >
                    <div>
                      <small style={{ color: '#64748b' }}>
                        {lang === 'en' ? 'Assessed Gross Damage' : 'Dommages Bruts Évalués'}
                      </small>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatFcfa(
                          submission.quote_calculation.montant_brut_formatted ||
                            submission.quote_calculation.montant_brut
                        )}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#64748b' }}>
                        {lang === 'en' ? 'Deductible' : 'Franchise Déduite'}
                      </small>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#dc2626' }}>
                        {formatFcfa(
                          submission.quote_calculation.franchise_formatted ||
                            submission.quote_calculation.franchise
                        )}
                      </div>
                    </div>
                    {(submission.quote_calculation.reduction_applied_percent ||
                      submission.quote_calculation.reduction_applied_fixed) && (
                      <div>
                        <small style={{ color: '#059669', fontWeight: 600 }}>
                          {lang === 'en' ? 'Adjustment / Reduction' : 'Ajustement / Réduction'}
                        </small>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#059669' }}>
                          {submission.quote_calculation.reduction_applied_percent
                            ? `-${submission.quote_calculation.reduction_applied_percent}% `
                            : ''}
                          {submission.quote_calculation.reduction_applied_fixed
                            ? `-${formatFcfa(submission.quote_calculation.reduction_applied_fixed)}`
                            : ''}
                        </div>
                      </div>
                    )}
                    <div>
                      <small style={{ color: '#0f766e', fontWeight: 600 }}>
                        {lang === 'en' ? 'Estimated Net Indemnity' : 'Indemnité Nette Estimée'}
                      </small>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f766e' }}>
                        {formatFcfa(
                          submission.quote_calculation.indemnisation_estimee_formatted ||
                            submission.quote_calculation.indemnisation_estimee ||
                            submission.quote_calculation.prime_ttc
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      margin: '12px 0',
                      background: '#f8fafc',
                      padding: '14px',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <small style={{ color: '#64748b' }}>
                        {lang === 'en' ? 'Net Premium' : 'Prime Nette'}
                      </small>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatFcfa(
                          submission.quote_calculation.prime_nette_formatted ||
                            submission.quote_calculation.prime_nette
                        )}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#64748b' }}>
                        {lang === 'en' ? 'Accessories / Fees' : 'Accessoires / Vignette'}
                      </small>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatFcfa(
                          submission.quote_calculation.accessoires_formatted ||
                            submission.quote_calculation.accessoires
                        )}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: '#64748b' }}>
                        {lang === 'en' ? 'Unique Tax (15%)' : 'Taxe Unique (15%)'}
                      </small>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatFcfa(
                          submission.quote_calculation.taxe_unique_formatted ||
                            submission.quote_calculation.taxe_unique
                        )}
                      </div>
                    </div>
                    {(submission.quote_calculation.reduction_applied_percent ||
                      submission.quote_calculation.reduction_applied_fixed) && (
                      <div>
                        <small style={{ color: '#059669', fontWeight: 600 }}>
                          {lang === 'en' ? 'Commercial Discount' : 'Remise commerciale'}
                        </small>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#059669' }}>
                          {submission.quote_calculation.reduction_applied_percent
                            ? `-${submission.quote_calculation.reduction_applied_percent}% `
                            : ''}
                          {submission.quote_calculation.reduction_applied_fixed
                            ? `-${formatFcfa(submission.quote_calculation.reduction_applied_fixed)}`
                            : ''}
                        </div>
                      </div>
                    )}
                    <div>
                      <small style={{ color: '#144983', fontWeight: 600 }}>
                        {lang === 'en' ? 'Total Premium (TTC)' : 'Prime Totale TTC'}
                      </small>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#144983' }}>
                        {formatFcfa(
                          submission.quote_calculation.prime_ttc_formatted ||
                            submission.quote_calculation.prime_ttc
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {submission.quote_calculation.notes_explicatives && (
                  <p
                    style={{
                      margin: '8px 0 12px',
                      fontSize: '0.88rem',
                      color: '#475569',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Info size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                    <span>
                      <strong>{lang === 'en' ? 'Rule Applied / Note:' : 'Règle CIMA / Note :'}</strong>{' '}
                      {lang === 'en' && submission.quote_calculation.notes_explicatives_en
                        ? submission.quote_calculation.notes_explicatives_en
                        : submission.quote_calculation.notes_explicatives}
                    </span>
                  </p>
                )}

                {submission.quote_calculation.breakdown?.length > 0 && (
                  <div className="table-responsive" style={{ margin: '10px 0 0' }}>
                    <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                          <th style={{ padding: '8px 4px' }}>
                            {lang === 'en' ? 'Coverage / Items' : 'Garantie / Éléments'}
                          </th>
                          <th style={{ padding: '8px 4px', textAlign: 'right' }}>
                            {lang === 'en' ? 'Amount' : 'Montant'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {submission.quote_calculation.breakdown.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 4px' }}>
                              {lang === 'en' && item.label_en ? item.label_en : item.label}{' '}
                              {item.detail && <small style={{ color: '#64748b' }}>({item.detail})</small>}
                            </td>
                            <td
                              style={{
                                padding: '8px 4px',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: item.amount < 0 ? '#dc2626' : undefined,
                              }}
                            >
                              {formatFcfa(item.formatted || item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowCalcConfig(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit3 size={15} />
                    {t('admin.detail_calc_btn_edit')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleResetCalculation}
                    disabled={calculating}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={15} />
                    {t('admin.detail_calc_btn_reset')}
                  </button>
                </div>
              </div>
            )}

            {/* B. Formulaire interactif de calcul / modification */}
            {(showCalcConfig || !submission.quote_calculation) && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                {/* 1. Sélection de l'algorithme ou saisie manuelle */}
                <div className="field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="select-calc-rule" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={16} />
                    {t('admin.detail_calc_system')}
                  </label>
                  <select
                    id="select-calc-rule"
                    value={selectedRuleId}
                    onChange={(e) => setSelectedRuleId(e.target.value)}
                  >
                    <option value="">
                      {t('admin.detail_calc_system_default')} ({submission.category ?? 'Auto'})
                    </option>
                    <optgroup label="── Règles Sinistres (Indemnisation CIMA) ──">
                      {pricingRules
                        .filter((r) => r.driver.startsWith('sinistre_'))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} [{r.driver}]
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="── Règles Devis (Tarification CIMA) ──">
                      {pricingRules
                        .filter((r) => !r.driver.startsWith('sinistre_'))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} [{r.driver}]
                          </option>
                        ))}
                    </optgroup>
                    <option value="manual">
                      {t('admin.detail_calc_system_manual')}
                    </option>
                  </select>
                </div>

                {/* Si mode manuel : champs directs */}
                {selectedRuleId === 'manual' && (
                  <div className="grid-2-col" style={{ marginBottom: '14px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {submission.form_type === 'claim' ? 'Montant brut des dommages (FCFA) *' : 'Montant de la prime TTC (FCFA) *'}
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 500000"
                        value={manualMontant}
                        onChange={(e) => setManualMontant(e.target.value)}
                      />
                    </div>
                    {submission.form_type === 'claim' && (
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          Franchise à déduire (FCFA, optionnel)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 50000"
                          value={manualFranchise}
                          onChange={(e) => setManualFranchise(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Ajustements et réductions commerciales */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent size={15} style={{ color: '#059669' }} />
                    {lang === 'en' ? 'Commercial Adjustments & Reductions' : 'Ajustements & Réductions commerciales (optionnel)'}
                  </h4>
                  <div className="grid-2-col" style={{ marginBottom: '10px' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {lang === 'en' ? 'Discount percentage (%)' : 'Réduction en pourcentage (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="Ex: 5 pour -5%"
                        value={reductionPercent}
                        onChange={(e) => setReductionPercent(e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {lang === 'en' ? 'Fixed discount (FCFA)' : 'Réduction fixe en montant (FCFA)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Ex: 15000"
                        value={reductionFixed}
                        onChange={(e) => setReductionFixed(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field" style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {lang === 'en' ? 'Admin note / Justification (visible on PDF)' : 'Note justificative / Motif de la réduction (visible sur le PDF)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Remise commerciale 5% accordée suite à fidélité client..."
                      value={calcAdminNote}
                      onChange={(e) => setCalcAdminNote(e.target.value)}
                    />
                  </div>
                </div>

                {/* Messages de retour */}
                {calcError && (
                  <p className="alert" role="alert" style={{ margin: '12px 0 0' }}>
                    {calcError}
                  </p>
                )}
                {calcNotice && (
                  <p className="notice" role="status" style={{ margin: '12px 0 0' }}>
                    {calcNotice}
                  </p>
                )}

                {/* Prévisualisation immédiate si disponible */}
                {calcPreview && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '14px',
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} />
                        {lang === 'en' ? 'Calculation Preview (not yet saved)' : 'Aperçu du calcul (non sauvegardé)'}
                      </strong>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#065f46' }}>
                        {submission.form_type === 'claim'
                          ? formatFcfa(calcPreview.indemnisation_estimee_formatted || calcPreview.indemnisation_estimee)
                          : formatFcfa(calcPreview.prime_ttc_formatted || calcPreview.prime_ttc)}
                      </span>
                    </div>
                    <small style={{ color: '#047857' }}>
                      {calcPreview.notes_explicatives}
                    </small>
                  </div>
                )}

                {/* Boutons d'action */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={calculating}
                    onClick={() => handleRunCalculation(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={15} />
                    {calculating ? t('admin.loading') : t('admin.detail_calc_btn_preview')}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={calculating}
                    onClick={() => handleRunCalculation(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={15} />
                    {calculating ? t('admin.loading') : t('admin.detail_calc_btn_validate')}
                  </button>

                  {submission.quote_calculation && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={calculating}
                      onClick={() => {
                        setShowCalcConfig(false);
                        setCalcPreview(null);
                        setCalcError('');
                      }}
                    >
                      {lang === 'en' ? 'Cancel edit' : 'Annuler'}
                    </button>
                  )}
                </div>
              </div>
            )}
            </section>
          )}

          {/* 6. Répondre au client */}
          <section className="card">
            <h2>{t('admin.detail_reply_title')}</h2>
            {((submission.form_type === 'claim' && hasPermission('reply_claims')) ||
              (submission.form_type === 'quote' && hasPermission('reply_quotes')) ||
              hasPermission('reply_submissions')) ? (
              <>
                <div className="field">
                  <label htmlFor="reply">{lang === 'en' ? 'Message' : 'Message'}</label>
                  <textarea
                    id="reply"
                    rows={4}
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder={t('admin.detail_reply_placeholder')}
                  />
                </div>

                <div className="field" style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <Paperclip size={16} />
                    <span>{t('admin.detail_reply_attachments')}</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ marginTop: '6px' }}
                    onChange={(e) => {
                      if (e.target.files) {
                        setReplyFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                    {t('admin.detail_reply_attachments_hint')}
                  </small>

                  {replyFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {replyFiles.map((f, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                          }}
                        >
                          {f.name} ({formatSize(f.size, lang)})
                          <button
                            type="button"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                            onClick={() => setReplyFiles((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <X size={14} color="#ef4444" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={sendingReply || !replyMessage.trim()}
                    onClick={sendReply}
                  >
                    {sendingReply ? (lang === 'en' ? 'Sending…' : 'Envoi…') : t('admin.detail_send_reply')}
                  </button>
                  {replyMessage && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={sendingReply}
                      onClick={() => {
                        setReplyMessage('');
                        setReplyFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      {t('admin.detail_reply_cancel_edit')}
                    </button>
                  )}
                </div>
                {replyNotice && <p className="notice" role="status" style={{ marginTop: '12px' }}>{replyNotice}</p>}
              </>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', margin: '4px 0 16px' }}>
                {lang === 'en' 
                  ? 'Your profile does not have permission to send replies to clients.' 
                  : 'Votre rôle ne possède pas la permission d\'envoyer des réponses aux clients.'}
              </p>
            )}

            {/* Historique des réponses envoyées par l'administration */}
            {submission.replies && submission.replies.length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '1rem', color: '#144983', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} />
                  {lang === 'en' ? 'History of replies sent to client:' : 'Historique des réponses transmises au client :'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {submission.replies.map((rep) => (
                    <div
                      key={rep.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                          Administration LD Assurances
                        </strong>
                        <small style={{ color: '#64748b' }}>
                          {formatDate(rep.created_at, lang)}
                        </small>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {rep.message}
                      </p>
                      {rep.attachments && rep.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {rep.attachments.map((att) => (
                            <button
                              key={att.id}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={downloadingId === att.id}
                              onClick={() => handleDownload(att)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                            >
                              <Paperclip size={12} />
                              {att.original_name} <small>({formatSize(att.size, lang)})</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste générale des pièces envoyées par l'administration */}
            {submission.attachments.filter((a) => a.source === 'admin').length > 0 && (!submission.replies || submission.replies.length === 0) && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '1rem', color: '#144983', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={16} />
                  {lang === 'en' ? 'Attachments sent with replies:' : 'Pièces jointes transmises au client :'}
                </h3>
                <ul className="attachments">
                  {submission.attachments.filter((a) => a.source === 'admin').map((att) => (
                    <li key={att.id}>
                      <span>
                        {att.original_name} <small>({formatSize(att.size, lang)})</small>
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={downloadingId === att.id}
                        onClick={() => handleDownload(att)}
                      >
                        {downloadingId === att.id ? (lang === 'en' ? 'Downloading…' : 'Téléchargement…') : t('admin.detail_download')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
