import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import type { AdminStats } from '../types';
import StatusBadge from './StatusBadge';
import { STATUSES, errorMessage, formatDate } from './labels';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <h1>{t('admin.nav_dashboard')}</h1>

      {error && <p className="alert" role="alert">{error}</p>}
      {!stats && !error && <p role="status">Chargement…</p>}

      {stats && (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{stats.total}</strong>
              <span>{t('admin.total_files')}</span>
            </div>
            {STATUSES.map((status) => (
              <div className="admin-stat" key={status}>
                <strong>{stats.by_status[status] ?? 0}</strong>
                <span>{t(`status.${status}` as const)}</span>
              </div>
            ))}
          </div>

          <section className="card">
            <h2>{t('admin.recent_submissions')}</h2>
            {stats.recent.length === 0 ? (
              <p>{t('admin.no_recent_submissions')}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('admin.th_reference')}</th>
                    <th scope="col">{t('admin.th_type')}</th>
                    <th scope="col">{t('admin.th_status')}</th>
                    <th scope="col">{t('admin.th_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((submission) => (
                    <tr key={submission.id}>
                      <td data-label="Dossier">
                        <Link to={`/admin/submissions/${submission.id}`}>{submission.reference}</Link>
                      </td>
                      <td data-label="Type">{submission.form_type === 'quote' ? t('status.quote') : t('status.claim')}</td>
                      <td data-label="Statut">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td data-label="Reçu le">{formatDate(submission.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
