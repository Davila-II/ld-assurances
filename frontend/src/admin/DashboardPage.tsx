import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api';
import type { AdminStats } from '../types';
import StatusBadge from './StatusBadge';
import { FORM_TYPE_LABELS, STATUSES, STATUS_LABELS, errorMessage, formatDate } from './labels';

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <h1>Tableau de bord</h1>

      {error && <p className="alert" role="alert">{error}</p>}
      {!stats && !error && <p role="status">Chargement…</p>}

      {stats && (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{stats.total}</strong>
              <span>Total des dossiers</span>
            </div>
            {STATUSES.map((status) => (
              <div className="admin-stat" key={status}>
                <strong>{stats.by_status[status] ?? 0}</strong>
                <span>{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>

          <section className="card">
            <h2>Dernières demandes</h2>
            {stats.recent.length === 0 ? (
              <p>Aucune demande pour le moment.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Dossier</th>
                    <th scope="col">Type</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Reçu le</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((submission) => (
                    <tr key={submission.id}>
                      <td data-label="Dossier">
                        <Link to={`/admin/submissions/${submission.id}`}>{submission.reference}</Link>
                      </td>
                      <td data-label="Type">{FORM_TYPE_LABELS[submission.form_type]}</td>
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
