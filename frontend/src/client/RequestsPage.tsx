import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Edit2, ExternalLink, FileText, Plus } from 'lucide-react';
import { getMySubmissions, clientErrorMessage, downloadSubmissionPdf } from '../clientApi';
import type { ClientSubmission } from '../clientTypes';
import EmptyState from './EmptyState';
import StatusBadge from '../admin/StatusBadge';
import type { SubmissionStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function RequestsPage() {
  const { lang, t } = useLanguage();
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySubmissions('quote')
      .then((res) => {
        if (!cancelled) setSubmissions(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(clientErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadPdf = async (reference: string) => {
    setDownloading(reference);
    try {
      await downloadSubmissionPdf(reference);
    } catch {
      // silently fail
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="client-content-inner">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <h1 className="client-page-title" style={{ margin: 0 }}>{t('client.my_requests')}</h1>
        <Link className="btn btn-sm" to="/?service=devis">
          <Plus size={14} /> {t('client.action_quote_title')}
        </Link>
      </div>
      <p className="client-page-subtitle">{t('client.requests_sub')}</p>

      {error && <div className="alert">{error}</div>}

      {loading && <p className="center">{t('client.loading')}</p>}

      {!loading && submissions.length === 0 && (
        <EmptyState
          icon={<FileText size={40} />}
          title={t('client.empty_quotes_title')}
          message={t('client.empty_quotes_desc')}
          action={
            <Link className="btn" to="/?service=devis">
              {t('client.action_quote_title')}
            </Link>
          }
        />
      )}

      {!loading && submissions.length > 0 && (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>{t('client.col_reference')}</th>
                <th>{t('client.col_category')}</th>
                <th>{t('client.col_date')}</th>
                <th>{t('client.col_taken_at')}</th>
                <th>{t('client.col_processed_at')}</th>
                <th>{t('client.col_closed_at')}</th>
                <th>{t('client.col_status')}</th>
                <th style={{ textAlign: 'right' }}>{t('client.col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const dateStr = sub.created_at
                  ? new Date(sub.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-';

                const takenStr = sub.taken_at
                  ? new Date(sub.taken_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : t('client.taken_pending');

                const processedStr = sub.processed_at
                  ? new Date(sub.processed_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : (sub.status === 'received' ? t('client.not_processed') : '—');

                const closedStr = sub.closed_at
                  ? new Date(sub.closed_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : t('client.closed_pending');

                return (
                  <tr key={sub.reference}>
                    <td>
                      <span className="client-ref-code">{sub.reference}</span>
                    </td>
                    <td>
                      <strong>{lang === 'en' && sub.category_en ? sub.category_en : (sub.category || '-')}</strong>
                    </td>
                    <td>{dateStr}</td>
                    <td style={{ color: sub.taken_at ? '#2563eb' : '#94a3b8', fontSize: '0.85rem' }}>
                      {takenStr}
                    </td>
                    <td style={{ color: sub.processed_at ? '#1aaca8' : '#94a3b8', fontWeight: sub.processed_at ? 600 : 400, fontSize: '0.85rem' }}>
                      {processedStr}
                    </td>
                    <td style={{ color: sub.closed_at ? (sub.status === 'rejected' ? '#dc2626' : '#16a34a') : '#94a3b8', fontSize: '0.85rem' }}>
                      {closedStr}
                    </td>
                    <td>
                      <StatusBadge status={sub.status as SubmissionStatus} />
                      {sub.status === 'rejected' && sub.rejection_reason && (
                        <div className="client-rejection-note">
                          <strong>{t('client.reason_rejected')}</strong> {sub.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {sub.status === 'received' && (
                          <Link
                            to={`/suivi?ref=${encodeURIComponent(sub.reference)}&edit=1`}
                            className="client-table-action-btn"
                            title={t('client.edit_btn')}
                            style={{ background: '#2563eb', color: '#fff' }}
                          >
                            <Edit2 size={13} />
                            <span>{t('client.edit_btn')}</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          className="client-table-action-btn"
                          title={lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
                          onClick={() => handleDownloadPdf(sub.reference)}
                          disabled={downloading === sub.reference}
                          style={{ background: '#475569', color: '#fff' }}
                        >
                          <Download size={13} />
                          <span>{downloading === sub.reference ? '…' : 'PDF'}</span>
                        </button>
                        <Link
                          to={`/suivi?ref=${encodeURIComponent(sub.reference)}`}
                          className="client-table-action-btn"
                          title={t('client.track_btn')}
                          style={{ background: '#0284c7', color: '#fff' }}
                        >
                          <ExternalLink size={13} />
                          <span>{t('client.track_btn')}</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
