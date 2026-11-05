import { useState } from 'react';
import type { FormEvent } from 'react';
import { trackSubmission, ApiError } from '../api';
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await trackSubmission(reference.trim().toUpperCase(), email.trim());
      setResult(data);
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
      default:
        return status;
    }
  };

  const formTypeLabel = (type: string) => {
    return type === 'claim' ? t('status.claim') : t('status.quote');
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
              <dt>{t('track.date_label')}</dt>
              <dd>{formatDate(result.created_at)}</dd>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
