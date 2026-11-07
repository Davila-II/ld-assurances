import { useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Edit2, X, Check } from 'lucide-react';
import { trackSubmission, downloadTrackPdf, updateTrackSubmission, ApiError } from '../api';
import { formatDate } from '../admin/labels';
import type { TrackResult } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function TrackPage() {
  const { t } = useLanguage();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Edition state
  const [editing, setEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setEditing(false);
    setEditSuccess('');
    setLoading(true);

    try {
      const data = await trackSubmission(reference.trim().toUpperCase(), email.trim());
      setResult(data);

      // Pré-remplir le formulaire d'édition avec les réponses existantes
      if (data.answers && typeof data.answers === 'object') {
        const pre: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.answers)) {
          pre[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        }
        setEditAnswers(pre);
      } else {
        setEditAnswers({});
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
              <dt>Branche</dt>
              <dd>{result.category ?? '—'}</dd>
              <dt>{t('track.status_label')}</dt>
              <dd>
                <span className={`badge badge-${result.status}`}>{statusLabel(result.status)}</span>
              </dd>
              {result.status === 'rejected' && result.rejection_reason && (
                <>
                  <dt style={{ color: '#b91c1c' }}>Motif du rejet</dt>
                  <dd style={{ color: '#b91c1c', fontWeight: 600 }}>{result.rejection_reason}</dd>
                </>
              )}
              <dt>{t('track.date_label')}</dt>
              <dd>{formatDate(result.created_at)}</dd>
              {result.processed_at && (
                <>
                  <dt style={{ color: '#1aaca8', fontWeight: 600 }}>Date de prise en charge</dt>
                  <dd style={{ color: '#1aaca8', fontWeight: 600 }}>{formatDate(result.processed_at)}</dd>
                </>
              )}
            </dl>

            {/* Formulaire d'édition — uniquement quand status === 'received' */}
            {result.status === 'received' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                {!editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#44556a' }}>
                      Votre demande est encore en attente de traitement. Vous pouvez la modifier.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditing(true); setEditError(''); setEditSuccess(''); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit2 size={13} />
                      Modifier ma demande
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#144983' }}>Modifier ma demande</h3>

                    {Object.keys(editAnswers).length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Aucune réponse à modifier.
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
                        {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditing(false); setEditError(''); }}
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <X size={13} />
                        Annuler
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
                {downloadingPdf ? '…' : 'Télécharger le PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
