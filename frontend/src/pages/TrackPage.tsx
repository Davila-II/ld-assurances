import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Edit2, X, Check, Paperclip } from 'lucide-react';
import { trackSubmission, downloadTrackPdf, downloadTrackAttachment, updateTrackSubmission, ApiError } from '../api';
import { clientMe } from '../clientApi';
import { getClientToken } from '../clientAuth';
import { formatDate, formatSize } from '../admin/labels';
import type { TrackResult } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function TrackPage() {
  const { lang, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') ?? '';
  const shouldEdit = searchParams.get('edit') === '1';

  const [reference, setReference] = useState(urlRef);
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingAttId, setDownloadingAttId] = useState<number | null>(null);

  // Edition state
  const [editing, setEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const fetchTrack = useCallback(async (refVal: string, emailVal: string, startEditing = false) => {
    setError('');
    setResult(null);
    setEditSuccess('');
    setLoading(true);

    try {
      const data = await trackSubmission(refVal.trim().toUpperCase(), emailVal.trim());
      setResult(data);

      if (data.answers && typeof data.answers === 'object') {
        const pre: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.answers)) {
          pre[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        }
        setEditAnswers(pre);
      } else {
        setEditAnswers({});
      }

      if (startEditing && data.status === 'received') {
        setEditing(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t('track.not_found'));
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inattendue.');
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Si l'utilisateur arrive depuis l'espace client avec un token et un paramètre ref
  useEffect(() => {
    if (!urlRef) return;

    if (getClientToken()) {
      clientMe()
        .then((user) => {
          setEmail(user.email);
          return fetchTrack(urlRef, user.email, shouldEdit);
        })
        .catch(() => {
          // Si pas connecté ou échec, l'utilisateur tapera son email manuellement
        });
    }
  }, [urlRef, shouldEdit, fetchTrack]);

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      await downloadTrackPdf(result.reference, email.trim());
    } catch {
      // ignore
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, filename: string) => {
    if (!result) return;
    setDownloadingAttId(attachmentId);
    try {
      await downloadTrackAttachment(result.reference, email.trim(), attachmentId, filename);
    } catch {
      // ignore
    } finally {
      setDownloadingAttId(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditing(false);
    void fetchTrack(reference, email, false);
  };

  const handleEditSave = async () => {
    if (!result) return;
    setSaving(true);
    setEditError('');
    setEditSuccess('');

    try {
      const answers: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editAnswers)) {
        answers[k] = v;
      }
      await updateTrackSubmission(result.reference, email.trim(), answers);
      setEditSuccess('Vos modifications ont bien été enregistrées.');
      setEditing(false);
      // Re-fetch to get updated data
      const refreshed = await trackSubmission(result.reference, email.trim());
      setResult(refreshed);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'received':
        return t('status.received');
      case 'in_progress':
        return t('status.in_progress');
      case 'answered':
        return t('status.answered');
      case 'closed':
        return t('status.closed');
      case 'rejected':
        return t('status.rejected');
      default:
        return status;
    }
  };

  const formTypeLabel = (type: string) => {
    return type === 'claim' ? t('status.claim') : t('status.quote');
  };

  // Libellé lisible pour une clé de réponse
  const answerLabel = (key: string, snapshot: TrackResult['form_snapshot']): string => {
    if (snapshot) {
      const field = snapshot.find((f) => f.name === key);
      if (field) return field.label;
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <main className="page">
      <h1 className="page-title">{t('track.title')}</h1>
      <p className="page-subtitle">{t('track.subtitle')}</p>

      <div className="form-wrap track-wrap">
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="reference">{t('track.ref_label')}</label>
            <input
              id="reference"
              type="text"
              required
              placeholder={t('track.ref_placeholder')}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="track-email">{t('track.email_label')}</label>
            <input
              id="track-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Ex : nom@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? t('track.searching') : t('track.submit')}
          </button>
        </form>

        {error && <p className="alert">{error}</p>}

        {result && (
          <div className="track-result">
            <h2>{t('track.result_title')}</h2>
            <dl>
              <dt>{t('track.ref_label')}</dt>
              <dd>{result.reference}</dd>
              <dt>{t('track.category_label')}</dt>
              <dd>{formTypeLabel(result.form_type)}</dd>
              <dt>{t('track.branch_label')}</dt>
              <dd>{result.category ?? '—'}</dd>
              <dt>{t('track.status_label')}</dt>
              <dd>
                <span className={`badge badge-${result.status}`}>{statusLabel(result.status)}</span>
              </dd>
              {result.status === 'rejected' && result.rejection_reason && (
                <>
                  <dt style={{ color: '#b91c1c' }}>{t('track.rejection_reason_label')}</dt>
                  <dd style={{ color: '#b91c1c', fontWeight: 600 }}>{result.rejection_reason}</dd>
                </>
              )}
              <dt>{t('client.col_date')}</dt>
              <dd>{formatDate(result.created_at, lang)}</dd>
              {result.taken_at && (
                <>
                  <dt style={{ color: '#2563eb', fontWeight: 600 }}>{t('client.col_taken_at')}</dt>
                  <dd style={{ color: '#2563eb', fontWeight: 600 }}>{formatDate(result.taken_at, lang)}</dd>
                </>
              )}
              <dt style={result.processed_at ? { color: result.status === 'rejected' ? '#dc2626' : '#16a34a', fontWeight: 600 } : undefined}>
                {t('client.col_processed_at')}
              </dt>
              <dd style={result.processed_at ? { color: result.status === 'rejected' ? '#dc2626' : '#16a34a', fontWeight: 600 } : { color: '#64748b' }}>
                {result.processed_at ? formatDate(result.processed_at, lang) : t('client.not_processed')}
              </dd>
            </dl>

            {/* Pièces jointes administratives reçues */}
            {result.admin_attachments && result.admin_attachments.length > 0 && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#144983' }}>
                  {t('client.admin_attachments')}
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#64748b' }}>
                  {t('client.admin_attachments_help')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.admin_attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Paperclip size={16} color="#0284c7" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{att.original_name}</span>
                        <small style={{ color: '#64748b' }}>({formatSize(att.size, lang)})</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadAttachment(att.id, att.original_name)}
                        disabled={downloadingAttId === att.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={13} />
                        <span>{downloadingAttId === att.id ? '…' : t('client.download_attachment')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulaire d'édition — uniquement quand status === 'received' */}
            {result.status === 'received' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                {!editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#44556a' }}>
                      {t('track.pending_edit_hint')}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditing(true); setEditError(''); setEditSuccess(''); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit2 size={13} />
                      {t('track.edit_btn')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#144983' }}>{t('track.edit_title')}</h3>

                    {Object.keys(editAnswers).length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        {t('track.no_answers_to_edit')}
                      </p>
                    )}

                    {Object.entries(editAnswers).map(([key, value]) => (
                      <div className="field" key={key}>
                        <label htmlFor={`edit-${key}`}>
                          {answerLabel(key, result.form_snapshot ?? null)}
                        </label>
                        <input
                          id={`edit-${key}`}
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setEditAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}

                    {editError && <p className="alert" style={{ marginTop: '8px' }}>{editError}</p>}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={handleEditSave}
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Check size={13} />
                        {saving ? t('track.saving') : t('track.save_changes')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditing(false); setEditError(''); }}
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <X size={13} />
                        {t('track.cancel')}
                      </button>
                    </div>
                  </div>
                )}
                {editSuccess && (
                  <p className="notice" role="status" style={{ marginTop: '10px', color: '#1aaca8' }}>
                    {editSuccess}
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                {downloadingPdf ? '…' : t('track.download_pdf')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
