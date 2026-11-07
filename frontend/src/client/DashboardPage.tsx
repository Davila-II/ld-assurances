import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Download, ExternalLink, FileText, ShieldAlert } from 'lucide-react';
import { getMySubmissions, downloadSubmissionPdf } from '../clientApi';
import type { ClientSubmission } from '../clientTypes';
import StatusBadge from '../admin/StatusBadge';
import type { SubmissionStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySubmissions()
      .then((res) => {
        if (!cancelled) setSubmissions(res.data);
      })
      .catch(() => {})
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
      // silently ignore
    } finally {
      setDownloading(null);
    }
  };

  const quotesCount = submissions.filter((s) => s.form_type === 'quote').length;
  const claimsCount = submissions.filter((s) => s.form_type === 'claim').length;

  const stats = [
    { label: t('client.stat_quotes'), value: loading ? '…' : quotesCount, icon: <FileText size={22} /> },
    { label: t('client.stat_claims'), value: loading ? '…' : claimsCount, icon: <ShieldAlert size={22} /> },
  ];

  const recent = submissions.slice(0, 4);

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('client.dashboard')}</h1>
      <p className="client-page-subtitle">{t('client.welcome_sub')}</p>

      <div className="client-stats">
        {stats.map((stat) => (
          <div className="client-stat" key={stat.label}>
            {stat.icon}
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="client-actions">
        <Link className="client-action-card" to="/?service=devis">
          <FileText size={24} />
          <strong>{t('client.action_quote_title')}</strong>
          <span>{t('client.action_quote_desc')}</span>
        </Link>

        <Link className="client-action-card" to="/?service=sinistre">
          <AlertTriangle size={24} />
          <strong>{t('client.action_claim_title')}</strong>
          <span>{t('client.action_claim_desc')}</span>
        </Link>
      </div>

      {!loading && recent.length > 0 && (
        <section style={{ marginTop: '36px' }}>
          <div className="client-recent-header">
            <h2>{t('client.recent_submissions')}</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/espace-client/demandes" className="btn btn-outline btn-sm">
                {t('client.view_all_quotes')} <ArrowRight size={13} />
              </Link>
              <Link to="/espace-client/sinistres" className="btn btn-outline btn-sm">
                {t('client.view_all_claims')} <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>{t('client.col_reference')}</th>
                  <th>Type</th>
                  <th>{t('client.col_category')}</th>
                  <th>{t('client.col_date')}</th>
                  <th>{t('client.col_status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('client.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sub) => {
                  const dateStr = sub.created_at
                    ? new Date(sub.created_at).toLocaleDateString(
                        lang === 'en' ? 'en-US' : 'fr-FR',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )
                    : '-';

                  return (
                    <tr key={sub.reference}>
                      <td>
                        <span className="client-ref-code">{sub.reference}</span>
                      </td>
                      <td>
                        <span className={`badge ${sub.form_type === 'quote' ? 'badge-blue' : 'badge-danger'}`}>
                          {sub.form_type === 'quote' ? t('status.quote') : t('status.claim')}
                        </span>
                      </td>
                      <td>
                        <strong>{lang === 'en' && sub.category_en ? sub.category_en : (sub.category || '-')}</strong>
                      </td>
                      <td>{dateStr}</td>
                      <td>
                        <StatusBadge status={sub.status as SubmissionStatus} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="client-table-action-btn"
                            title={lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
                            onClick={() => handleDownloadPdf(sub.reference)}
                            disabled={downloading === sub.reference}
                          >
                            <Download size={13} />
                            <span>{downloading === sub.reference ? '…' : 'PDF'}</span>
                          </button>
                          <Link
                            to={`/suivi?ref=${encodeURIComponent(sub.reference)}`}
                            className="client-table-action-btn"
                            title={t('client.track_btn')}
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
        </section>
      )}
    </div>
  );
}
