import { useEffect, useState, useMemo } from 'react';
import { Bell, CheckCheck, Clock, FileText, MessageSquare, Paperclip, ShieldAlert } from 'lucide-react';
import { getClientNotifications, downloadClientAttachment, markSubmissionRepliesAsRead, clientErrorMessage } from '../clientApi';
import type { ClientNotificationItem } from '../clientTypes';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate } from '../admin/labels';
import EmptyState from './EmptyState';
import RepliesModal, { type ModalReply } from '../components/RepliesModal';

export default function NotificationsPage() {
  const { lang, t } = useLanguage();
  const [notifications, setNotifications] = useState<ClientNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Modal de consultation du message
  const [activeModalRef, setActiveModalRef] = useState<string | null>(null);
  const [activeModalReplies, setActiveModalReplies] = useState<ModalReply[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await getClientNotifications();
      setNotifications(res.notifications);
    } catch (err: unknown) {
      setError(clientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    const handleUpdate = () => {
      void fetchNotifications();
    };

    window.addEventListener('unread-notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('unread-notifications-updated', handleUpdate);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleOpenNotification = (notif: ClientNotificationItem) => {
    // Regroupe toutes les réponses appartenant à ce même dossier pour la modale
    const dossierReplies = notifications
      .filter((n) => n.submission_reference === notif.submission_reference)
      .map((n) => ({
        id: n.id,
        message: n.message,
        created_at: n.created_at,
        is_read: n.is_read,
        read_at: n.read_at,
        attachments: n.attachments,
      }));

    setActiveModalRef(notif.submission_reference);
    setActiveModalReplies(dossierReplies);
    setActiveReplyId(notif.id);

    // Mise à jour optimiste locale de l'état "lu"
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    try {
      // Pour chaque dossier contenant des messages non lus, on marque les réponses comme lues
      const unreadRefs = Array.from(
        new Set(notifications.filter((n) => !n.is_read).map((n) => n.submission_reference))
      );

      await Promise.all(unreadRefs.map((ref) => markSubmissionRepliesAsRead(ref)));

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('unread-notifications-updated'));
    } catch {
      // silently ignore
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, filename: string) => {
    if (!activeModalRef) return;
    await downloadClientAttachment(activeModalRef, attachmentId, filename);
  };

  return (
    <div className="client-content-inner">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <h1 className="client-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={24} style={{ color: '#0d9488' }} />
          <span>{t('client.notifications_title')}</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                background: '#ef4444',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {unreadCount} {lang === 'en' ? 'new' : 'non lu(s)'}
            </span>
          )}
        </h1>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleMarkAllRead}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={14} />
            <span>{t('client.notifications_mark_all_read')}</span>
          </button>
        )}
      </div>

      <p className="client-page-subtitle">{t('client.notifications_sub')}</p>

      {error && <div className="alert">{error}</div>}

      {/* Filtres Tous / Non lus */}
      {!loading && notifications.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', margin: '20px 0 16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: filter === 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              background: filter === 'all' ? '#0d9488' : '#ffffff',
              color: filter === 'all' ? '#ffffff' : '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t('client.notifications_all')} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: filter === 'unread' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              background: filter === 'unread' ? '#0d9488' : '#ffffff',
              color: filter === 'unread' ? '#ffffff' : '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t('client.notifications_unread_only')} ({unreadCount})
          </button>
        </div>
      )}

      {loading && <p className="center">{t('client.loading')}</p>}

      {!loading && displayedNotifications.length === 0 && (
        <EmptyState
          icon={<Bell size={40} />}
          title={t('client.notifications_empty_title')}
          message={
            filter === 'unread'
              ? (lang === 'en' ? 'You have no unread notifications.' : 'Vous avez lu toutes vos notifications.')
              : t('client.notifications_empty_desc')
          }
        />
      )}

      {!loading && displayedNotifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedNotifications.map((notif) => {
            const isUnread = !notif.is_read;
            const attCount = notif.attachments?.length || 0;

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotification(notif)}
                style={{
                  background: isUnread ? '#f0fdfa' : '#ffffff',
                  border: isUnread ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                  borderLeft: isUnread ? '5px solid #0d9488' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  boxShadow: isUnread ? '0 4px 6px -1px rgba(13, 148, 136, 0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge ${notif.form_type === 'quote' ? 'badge-blue' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                      {notif.form_type === 'quote' ? <FileText size={11} /> : <ShieldAlert size={11} />}
                      <span style={{ marginLeft: '4px' }}>{notif.form_type === 'quote' ? t('status.quote') : t('status.claim')}</span>
                    </span>

                    <span className="client-ref-code" style={{ fontSize: '0.8rem' }}>
                      {notif.submission_reference}
                    </span>

                    {notif.category && (
                      <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                        · {lang === 'en' && notif.category_en ? notif.category_en : notif.category}
                      </span>
                    )}

                    {isUnread && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '1px 7px',
                          borderRadius: '999px',
                        }}
                      >
                        {t('client.notification_new')}
                      </span>
                    )}

                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                      <Clock size={12} />
                      {formatDate(notif.created_at, lang)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: '0.92rem',
                      color: isUnread ? '#0f172a' : '#475569',
                      fontWeight: isUnread ? 600 : 400,
                      lineHeight: '1.5',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {notif.message}
                  </p>

                  {attCount > 0 && (
                    <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>
                      <Paperclip size={12} />
                      <span>{attCount} {lang === 'en' ? 'attachment(s) received' : 'pièce(s) jointe(s) reçue(s)'}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="client-table-action-btn client-replies-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNotification(notif);
                  }}
                  style={{ alignSelf: 'center' }}
                >
                  <MessageSquare size={13} />
                  <span>{t('client.open_message')}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale de consultation des réponses */}
      {activeModalRef && (
        <RepliesModal
          isOpen={true}
          onClose={() => {
            setActiveModalRef(null);
            setActiveReplyId(null);
          }}
          reference={activeModalRef}
          replies={activeModalReplies}
          initialReplyId={activeReplyId}
          onDownloadAttachment={handleDownloadAttachment}
          onMarkAsRead={(replyId) => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === replyId ? { ...n, is_read: true } : n))
            );
          }}
        />
      )}
    </div>
  );
}
