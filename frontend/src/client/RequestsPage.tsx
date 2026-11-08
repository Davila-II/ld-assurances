import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Edit2, ExternalLink, FileText, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { getMySubmissions, clientErrorMessage, downloadSubmissionPdf, downloadClientAttachment } from '../clientApi';
import type { ClientSubmission } from '../clientTypes';
import EmptyState from './EmptyState';
import StatusBadge from '../admin/StatusBadge';
import type { SubmissionStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate, formatSize } from '../admin/labels';
import RepliesModal from '../components/RepliesModal';

export default function RequestsPage() {
  const { lang, t } = useLanguage();
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAttId, setDownloadingAttId] = useState<number | null>(null);
  const [activeModalSub, setActiveModalSub] = useState<ClientSubmission | null>(null);

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

  const handleDownloadAttachment = async (reference: string, attachmentId: number, filename: string) => {
    setDownloadingAttId(attachmentId);
    try {
      await downloadClientAttachment(reference, attachmentId, filename);
    } catch {
      // silently fail
    } finally {
      setDownloadingAttId(null);
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
                <th>{t('client.col_status')}</th>
                <th style={{ textAlign: 'right' }}>{t('client.col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const dateStr = sub.created_at ? formatDate(sub.created_at, lang) : '-';
                const takenStr = sub.taken_at ? formatDate(sub.taken_at, lang) : t('client.taken_pending');
                const processedStr = sub.processed_at ? formatDate(sub.processed_at, lang) : t('client.taken_pending');
                const replyCount = (sub.replies_count && sub.replies_count > 0)
                  ? sub.replies_count
                  : (sub.replies && sub.replies.length > 0 ? sub.replies.length : 0);

                return (
                  <tr key={sub.reference}>
                    <td>
                      <span className="client-ref-code">{sub.reference}</span>

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
                      {sub.status === 'rejected' && sub.rejection_reason && (
                        <div className="client-rejection-note">
                          <strong>{t('client.reason_rejected')}</strong> {sub.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {replyCount > 0 && (
                          <button
                            type="button"
                            className="client-table-action-btn client-replies-btn"
                            title={t('client.replies_btn')}
                            onClick={() => setActiveModalSub(sub)}
                          >
                            <MessageSquare size={13} />
                            <span>{t('client.replies_btn')}</span>
                            <span className="client-replies-badge">{replyCount}</span>
                          </button>
                        )}
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

      {activeModalSub && (
        <RepliesModal
          isOpen={true}
          onClose={() => setActiveModalSub(null)}
          reference={activeModalSub.reference}
          replies={activeModalSub.replies || []}
          onDownloadAttachment={(attId, filename) =>
            handleDownloadAttachment(activeModalSub.reference, attId, filename)
          }
        />
      )}
    </div>
  );
}
