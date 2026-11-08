import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Paperclip, X } from 'lucide-react';
import { downloadAttachment, downloadSubmissionPdfAdmin, getSubmission, replyToSubmission, updateSubmissionNotes, updateSubmissionStatus } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import type { AttachmentInfo, SubmissionDetail, SubmissionStatus } from '../types';
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

    getSubmission(id)
      .then((data) => {
        if (cancelled) return;
        setLoadedSubmission({ id, data });
        setNewStatus(data.status);
        setRejectionReason(data.rejection_reason ?? '');
        setNotes(data.notes ?? '');
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

            {notice && <p className="notice" role="status" style={{ marginTop: '12px' }}>{notice}</p>}
          </section>

          {submission.quote_calculation && (
            <section className="card" style={{ borderLeft: submission.form_type === 'claim' ? '4px solid #1aaca8' : '4px solid #144983' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ margin: 0, color: submission.form_type === 'claim' ? '#0f766e' : '#144983' }}>
                  📊 {submission.form_type === 'claim'
                    ? (lang === 'en' ? 'Claim Compensation Estimation (CIMA / IDA)' : 'Estimation Indemnisation Sinistre (CIMA / IDA)')
                    : (lang === 'en' ? 'Calculated Pricing (CIMA Code)' : 'Tarification calculée (Code CIMA)')}
                </h2>
                <span className="badge badge-success" style={{ fontSize: '0.95rem', padding: '6px 12px', background: submission.form_type === 'claim' ? '#0f766e' : '#1aaca8' }}>
                  {submission.form_type === 'claim'
                    ? formatFcfa(submission.quote_calculation.indemnisation_estimee_formatted || submission.quote_calculation.indemnisation_estimee || submission.quote_calculation.prime_ttc)
                    : formatFcfa(submission.quote_calculation.prime_ttc_formatted || submission.quote_calculation.prime_ttc)}
                </span>
              </div>

              {submission.form_type === 'claim' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0', background: '#f0fdfa', padding: '14px', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
                  <div>
                    <small style={{ color: '#64748b' }}>{lang === 'en' ? 'Assessed Gross Damage' : 'Dommages Bruts Évalués'}</small>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {formatFcfa(submission.quote_calculation.montant_brut_formatted || submission.quote_calculation.montant_brut)}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#64748b' }}>{lang === 'en' ? 'Deductible' : 'Franchise Déduite'}</small>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#dc2626' }}>
                      {formatFcfa(submission.quote_calculation.franchise_formatted || submission.quote_calculation.franchise)}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#0f766e', fontWeight: 600 }}>{lang === 'en' ? 'Estimated Net Indemnity' : 'Indemnité Nette Estimée'}</small>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f766e' }}>
                      {formatFcfa(submission.quote_calculation.indemnisation_estimee_formatted || submission.quote_calculation.indemnisation_estimee || submission.quote_calculation.prime_ttc)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                  <div>
                    <small style={{ color: '#64748b' }}>{lang === 'en' ? 'Net Premium' : 'Prime Nette'}</small>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {formatFcfa(submission.quote_calculation.prime_nette_formatted || submission.quote_calculation.prime_nette)}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#64748b' }}>{lang === 'en' ? 'Accessories / Fees' : 'Accessoires / Vignette'}</small>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {formatFcfa(submission.quote_calculation.accessoires_formatted || submission.quote_calculation.accessoires)}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#64748b' }}>{lang === 'en' ? 'Unique Tax (15%)' : 'Taxe Unique (15%)'}</small>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {formatFcfa(submission.quote_calculation.taxe_unique_formatted || submission.quote_calculation.taxe_unique)}
                    </div>
                  </div>
                  <div>
                    <small style={{ color: '#144983', fontWeight: 600 }}>{lang === 'en' ? 'Total Premium (TTC)' : 'Prime Totale TTC'}</small>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#144983' }}>
                      {formatFcfa(submission.quote_calculation.prime_ttc_formatted || submission.quote_calculation.prime_ttc)}
                    </div>
                  </div>
                </div>
              )}

              {submission.quote_calculation.notes_explicatives && (
                <p style={{ margin: '8px 0 12px', fontSize: '0.88rem', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                  <strong>ℹ️ {lang === 'en' ? 'Rule Applied:' : 'Règle CIMA / Convention :'}</strong>{' '}
                  {lang === 'en' && submission.quote_calculation.notes_explicatives_en
                    ? submission.quote_calculation.notes_explicatives_en
                    : submission.quote_calculation.notes_explicatives}
                </p>
              )}

              {submission.quote_calculation.breakdown?.length > 0 && (
                <div className="table-responsive" style={{ margin: '10px 0 0' }}>
                  <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px 4px' }}>{lang === 'en' ? 'Coverage / Items' : 'Garantie / Éléments'}</th>
                        <th style={{ padding: '8px 4px', textAlign: 'right' }}>{lang === 'en' ? 'Amount' : 'Montant'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submission.quote_calculation.breakdown.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 4px' }}>
                            {lang === 'en' && item.label_en ? item.label_en : item.label} {item.detail && <small style={{ color: '#64748b' }}>({item.detail})</small>}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: item.amount < 0 ? '#dc2626' : undefined }}>
                            {formatFcfa(item.formatted || item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

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

          {/* 5. Répondre au client */}
          <section className="card">
            <h2>{t('admin.detail_reply_title')}</h2>
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
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

            {/* Liste des pièces envoyées par l'administration */}
            {submission.attachments.filter(a => a.source === 'admin').length > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '1rem', color: '#144983', margin: '0 0 10px' }}>
                  📎 {lang === 'en' ? 'Attachments sent with replies:' : 'Pièces jointes transmises au client :'}
                </h3>
                <ul className="attachments">
                  {submission.attachments.filter(a => a.source === 'admin').map((att) => (
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
