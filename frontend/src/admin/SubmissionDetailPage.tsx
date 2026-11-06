import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadAttachment, getSubmission, replyToSubmission, updateSubmissionNotes, updateSubmissionStatus } from '../api';
import type { AttachmentInfo, SubmissionDetail, SubmissionStatus } from '../types';
import StatusBadge from './StatusBadge';
import {
  FORM_TYPE_LABELS,
  STATUSES,
  STATUS_LABELS,
  errorMessage,
  formatAnswer,
  formatDate,
  formatSize,
} from './labels';

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loadedSubmission, setLoadedSubmission] = useState<{
    id: string;
    data: SubmissionDetail;
  } | null>(null);
  const [requestError, setRequestError] = useState<{ id: string; message: string } | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const [newStatus, setNewStatus] = useState<SubmissionStatus>('received');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [notesNotice, setNotesNotice] = useState('');
  const [replyNotice, setReplyNotice] = useState('');
  const invalidId = !id || !/^\d+$/.test(id);
  const submission =
    !invalidId && loadedSubmission?.id === id ? loadedSubmission.data : null;
  const error = invalidId
    ? 'Numéro de déclaration invalide.'
    : requestError?.id === id
      ? requestError.message
      : actionError?.id === id
        ? actionError.message
        : '';
  const loading = !invalidId && submission === null && requestError?.id !== id;

  useEffect(() => {
    let cancelled = false;

    if (!id || !/^\d+$/.test(id)) {
      return () => {
        cancelled = true;
      };
    }

    getSubmission(id)
      .then((data) => {
        if (cancelled) return;
        setLoadedSubmission({ id, data });
        setNewStatus(data.status);
        setRejectionReason(data.rejection_reason ?? '');
        setNotes(data.notes ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setRequestError({ id, message: errorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveStatus = async () => {
    if (!submission || !id) return;
    if (newStatus === 'rejected' && !rejectionReason.trim()) {
      setActionError({ id, message: 'Veuillez saisir le motif du rejet (obligatoire).' });
      return;
    }
    setSaving(true);
    setNotice('');
    setActionError(null);

    try {
      const result = await updateSubmissionStatus(submission.id, newStatus, rejectionReason.trim());
      setLoadedSubmission({
        id,
        data: {
          ...submission,
          status: result.status,
          rejection_reason: result.rejection_reason ?? (newStatus === 'rejected' ? rejectionReason.trim() : null),
        },
      });
      setNotice(newStatus === 'rejected' ? 'Dossier rejeté et client notifié par email avec le motif.' : 'Statut mis à jour.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!submission || !id) return;
    setSavingNotes(true);
    setNotesNotice('');
    setActionError(null);

    try {
      const result = await updateSubmissionNotes(submission.id, notes);
      setLoadedSubmission({ id, data: { ...submission, notes: result.notes } });
      setNotesNotice('Observations enregistrées.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSavingNotes(false);
    }
  };

  const sendReply = async () => {
    if (!submission || !id || !replyMessage.trim()) return;
    setSendingReply(true);
    setReplyNotice('');
    setActionError(null);

    try {
      await replyToSubmission(submission.id, replyMessage.trim());
      setReplyMessage('');
      setReplyNotice('Réponse envoyée au client.');
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDownload = async (attachment: AttachmentInfo) => {
    if (!submission || !id) return;
    setDownloadingId(attachment.id);
    setActionError(null);

    try {
      await downloadAttachment(attachment.id, attachment.original_name);
    } catch (err) {
      setActionError({ id, message: errorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Link to="/admin/submissions" className="back-link">
        ← Retour à la liste
      </Link>

      {loading && <p role="status">Chargement…</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      {submission && (
        <>
          <div className="detail-head">
            <h1>{submission.reference}</h1>
            <StatusBadge status={submission.status} />
          </div>

          <section className="card">
            <dl className="answers">
              <div className="answer">
                <dt>Nature</dt>
                <dd>{FORM_TYPE_LABELS[submission.form_type]}</dd>
              </div>
              <div className="answer">
                <dt>Type</dt>
                <dd>{submission.type ?? '—'}</dd>
              </div>
              <div className="answer">
                <dt>Catégorie</dt>
                <dd>{submission.category ?? '—'}</dd>
              </div>
              <div className="answer">
                <dt>Email</dt>
                <dd>{submission.email}</dd>
              </div>
              <div className="answer">
                <dt>Reçu le</dt>
                <dd>{formatDate(submission.created_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2>Traitement du dossier</h2>

            {submission.status === 'rejected' && submission.rejection_reason && (
              <div className="alert" style={{ background: '#fdf2f2', borderColor: '#f98080', color: '#9b1c1c', marginBottom: '16px' }}>
                <strong>Dossier rejeté</strong>
                <p style={{ margin: '4px 0 0' }}>Motif : {submission.rejection_reason}</p>
              </div>
            )}

            <div className="status-row">
              <label htmlFor="new-status">Statut</label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value as SubmissionStatus)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={newStatus === 'rejected' ? 'btn btn-danger' : 'btn'}
                disabled={
                  saving ||
                  (newStatus === submission.status &&
                    (newStatus !== 'rejected' || rejectionReason.trim() === (submission.rejection_reason ?? '')))
                }
                onClick={saveStatus}
              >
                {saving
                  ? 'Enregistrement…'
                  : newStatus === 'rejected'
                    ? 'Confirmer le rejet'
                    : 'Mettre à jour'}
              </button>
            </div>

            {newStatus === 'rejected' && (
              <div className="field" style={{ marginTop: '14px' }}>
                <label htmlFor="rejection-reason" style={{ color: '#9b1c1c', fontWeight: 600 }}>
                  Motif du rejet (obligatoire — sera envoyé par email au client) :
                </label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  required
                  placeholder="Ex : Délai légal dépassé, pièces justificatives non conformes, garantie non souscrite..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            {notice && <p className="notice" role="status" style={{ marginTop: '12px' }}>{notice}</p>}
          </section>

          <section className="card">
            <h2>Réponses du client</h2>
            <dl className="answers">
              {submission.answers.map((answer, index) => (
                <div className="answer" key={`${answer.label}-${index}`}>
                  <dt>{answer.label}</dt>
                  <dd>{formatAnswer(answer.value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card">
            <h2>Observations internes</h2>
            <div className="field">
              <label htmlFor="notes">Notes (non visibles par le client)</label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <button type="button" className="btn" disabled={savingNotes} onClick={saveNotes}>
              {savingNotes ? 'Enregistrement…' : 'Enregistrer les observations'}
            </button>
            {notesNotice && <p className="notice" role="status">{notesNotice}</p>}
          </section>

          <section className="card">
            <h2>Répondre au client</h2>
            <div className="field">
              <label htmlFor="reply">Message</label>
              <textarea
                id="reply"
                rows={4}
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                placeholder="Votre message sera envoyé par email au client."
              />
            </div>
            <button
              type="button"
              className="btn"
              disabled={sendingReply || !replyMessage.trim()}
              onClick={sendReply}
            >
              {sendingReply ? 'Envoi…' : 'Envoyer la réponse'}
            </button>
            {replyNotice && <p className="notice" role="status">{replyNotice}</p>}
          </section>

          <section className="card">
            <h2>Pièces jointes ({submission.attachments.length})</h2>
            {submission.attachments.length === 0 ? (
              <p>Aucune pièce jointe.</p>
            ) : (
              <ul className="attachments">
                {submission.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <span>
                      {attachment.original_name} <small>({formatSize(attachment.size)})</small>
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={downloadingId === attachment.id}
                      onClick={() => handleDownload(attachment)}
                    >
                      {downloadingId === attachment.id ? 'Téléchargement…' : 'Télécharger'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
