import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, Edit2, ExternalLink, FileText, Paperclip, ShieldAlert } from 'lucide-react';
import { getMySubmissions, downloadSubmissionPdf, downloadClientAttachment } from '../clientApi';
import type { ClientSubmission } from '../clientTypes';
import StatusBadge from '../admin/StatusBadge';
import type { SubmissionStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatSize } from '../admin/labels';

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAttId, setDownloadingAttId] = useState<number | null>(null);

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

  const handleDownloadAttachment = async (reference: string, attachmentId: number, filename: string) => {
    setDownloadingAttId(attachmentId);
    try {
      await downloadClientAttachment(reference, attachmentId, filename);
    } catch {
      // silently ignore
    } finally {
      setDownloadingAttId(null);
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
          </div>

          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>{t('client.col_reference')}</th>
                  <th>{t('admin.th_type')}</th>
                  <th>{t('client.col_category')}</th>
                  <th>{t('client.col_date')}</th>
                  <th>{t('client.col_taken_at')}</th>
                  <th>{t('client.col_processed_at')}</th>
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
                    : t('client.not_processed');

                  return (
                    <tr key={sub.reference}>
                      <td>
                        <span className="client-ref-code">{sub.reference}</span>
                        {/* Pièces jointes administratives reçues */}
                        {sub.admin_attachments && sub.admin_attachments.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {sub.admin_attachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => handleDownloadAttachment(sub.reference, att.id, att.original_name)}
                                disabled={downloadingAttId === att.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#e0f2fe',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                                title={`${att.original_name} (${formatSize(att.size, lang)})`}
                              >
                                <Paperclip size={11} />
                                <span>{att.original_name.length > 18 ? att.original_name.slice(0, 16) + '…' : att.original_name}</span>
                              </button>
                            ))}
                          </div>
                        )}
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
                      <td style={{ color: sub.taken_at ? '#2563eb' : '#94a3b8', fontSize: '0.85rem' }}>
                        {takenStr}
                      </td>
                      <td style={{ color: sub.processed_at ? '#1aaca8' : '#94a3b8', fontWeight: sub.processed_at ? 600 : 400, fontSize: '0.85rem' }}>
                        {processedStr}
                      </td>
                      <td>
                        <StatusBadge status={sub.status as SubmissionStatus} />
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
        </section>
      )}
    </div>
  );
}
