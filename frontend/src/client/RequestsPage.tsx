import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, Plus } from 'lucide-react';
import { getMySubmissions, clientErrorMessage } from '../clientApi';
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

  return (
    <div className="client-content-inner">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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

                return (
                  <tr key={sub.reference}>
                    <td>
                      <span className="client-ref-code">{sub.reference}</span>
                    </td>
                    <td>
                      <strong>{sub.category || '-'}</strong>
                    </td>
                    <td>{dateStr}</td>
                    <td>
                      <StatusBadge status={sub.status as SubmissionStatus} />
                      {sub.status === 'rejected' && sub.rejection_reason && (
                        <div className="client-rejection-note">
                          <strong>{t('client.reason_rejected')}</strong> {sub.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/suivi?ref=${encodeURIComponent(sub.reference)}`}
                        className="client-table-action-btn"
                        title={t('client.track_btn')}
                      >
                        <ExternalLink size={13} />
                        <span>{t('client.track_btn')}</span>
                      </Link>
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
