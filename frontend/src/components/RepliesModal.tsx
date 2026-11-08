import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, ChevronRight, Download, FileText, MessageSquare, Paperclip, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate, formatSize } from '../admin/labels';
import { markReplyAsRead } from '../clientApi';

export interface ReplyAttachment {
  id: number;
  original_name: string;
  mime_type?: string;
  size: number;
}

export interface ModalReply {
  id: number;
  message: string;
  created_at: string;
  is_read?: boolean;
  read_at?: string | null;
  attachments?: ReplyAttachment[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reference: string;
  replies: ModalReply[];
  initialReplyId?: number | null;
  onDownloadAttachment?: (attachmentId: number, filename: string) => Promise<void> | void;
  onMarkAsRead?: (replyId: number) => void;
}

export default function RepliesModal({
  isOpen,
  onClose,
  reference,
  replies,
  initialReplyId,
  onDownloadAttachment,
  onMarkAsRead,
}: Props) {
  const { lang, t } = useLanguage();
  const [selectedReplyId, setSelectedReplyId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // When modal opens or replies change:
  // If initialReplyId is specified, select that one.
  // Else if only 1 reply, automatically open it directly.
  // If multiple replies, show list view first (selectedReplyId = null).
  useEffect(() => {
    if (isOpen) {
      if (initialReplyId) {
        setSelectedReplyId(initialReplyId);
      } else if (replies.length === 1) {
        setSelectedReplyId(replies[0].id);
      } else {
        setSelectedReplyId(null);
      }
    }
  }, [isOpen, initialReplyId, replies]);

  // When a reply is viewed, mark it as read immediately if it was unread!
  useEffect(() => {
    if (!isOpen || !selectedReplyId) return;
    const target = replies.find((r) => r.id === selectedReplyId);
    if (target && target.is_read === false) {
      target.is_read = true;
      markReplyAsRead(target.id).catch(() => {});
      onMarkAsRead?.(target.id);
      window.dispatchEvent(new Event('unread-notifications-updated'));
    }
  }, [isOpen, selectedReplyId, replies, onMarkAsRead]);

  if (!isOpen) return null;

  const sortedReplies = [...replies].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const selectedReply = replies.find((r) => r.id === selectedReplyId);

  const handleDownload = async (attachmentId: number, filename: string) => {
    if (!onDownloadAttachment) return;
    setDownloadingId(attachmentId);
    try {
      await onDownloadAttachment(attachmentId, filename);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      style={{
        zIndex: 150,
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="admin-modal-card"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>
                {t('client.replies_title')}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {t('client.replies_subtitle', { ref: reference })}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              color: '#475569',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Empty state if 0 replies */}
          {replies.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{t('client.reply_empty')}</p>
            </div>
          )}

          {/* List view if multiple replies and none selected */}
          {replies.length > 1 && !selectedReply && (
            <div>
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  {lang === 'en'
                    ? `You have received ${replies.length} replies from LD Assurances administration for this request. Click a message to read it.`
                    : `Vous avez reçu ${replies.length} réponses de l'administration LD Assurances pour ce dossier. Cliquez sur un message pour le consulter.`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedReplies.map((reply, idx) => {
                  const replyDate = formatDate(reply.created_at, lang);
                  const attCount = reply.attachments?.length || 0;
                  return (
                    <div
                      key={reply.id}
                      onClick={() => setSelectedReplyId(reply.id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0284c7';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            #{sortedReplies.length - idx}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} />
                            {replyDate}
                          </span>
                          {reply.is_read === false && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                padding: '1px 6px',
                                borderRadius: '999px',
                              }}
                            >
                              {t('client.notification_new')}
                            </span>
                          )}
                          {attCount > 0 && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#0d9488',
                                background: '#f0fdfa',
                                border: '1px solid #ccfbf1',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Paperclip size={11} />
                              {attCount} {lang === 'en' ? 'file(s)' : 'pièce(s)'}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {reply.message}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#0284c7',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        <span>{t('client.reply_read')}</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed view of selected reply (or sole reply) */}
          {selectedReply && (
            <div>
              {/* Back button if there are multiple replies */}
              {replies.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedReplyId(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    color: '#334155',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    fontWeight: 500,
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>{t('client.reply_back')}</span>
                </button>
              )}

              {/* Message Box */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  overflow: 'hidden',
                }}
              >
                {/* Meta header */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>
                        {t('client.reply_admin_sender')}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        LD Assurances Cameroun
                      </span>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    {formatDate(selectedReply.created_at, lang)}
                  </span>
                </div>

                {/* Message body */}
                <div
                  style={{
                    padding: '18px',
                    fontSize: '0.92rem',
                    lineHeight: '1.6',
                    color: '#1e293b',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedReply.message}
                </div>

                {/* Attached files to this reply */}
                {selectedReply.attachments && selectedReply.attachments.length > 0 && (
                  <div
                    style={{
                      padding: '14px 18px',
                      background: '#f1f5f9',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Paperclip size={13} />
                      <span>{t('client.reply_attachments')} ({selectedReply.attachments.length})</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedReply.attachments.map((att) => (
                        <div
                          key={att.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileText size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 500,
                                  color: '#0f172a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={att.original_name}
                              >
                                {att.original_name}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {formatSize(att.size, lang)}
                              </span>
                            </div>
                          </div>

                          {onDownloadAttachment && (
                            <button
                              type="button"
                              onClick={() => handleDownload(att.id, att.original_name)}
                              disabled={downloadingId === att.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              <Download size={13} />
                              <span>{downloadingId === att.id ? '…' : t('client.download_attachment')}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            {lang === 'en' ? 'Close' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
