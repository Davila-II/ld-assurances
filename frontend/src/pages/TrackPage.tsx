import { useState } from 'react';
import type { FormEvent } from 'react';
import { trackSubmission, ApiError } from '../api';
import { FORM_TYPE_LABELS, formatDate } from '../admin/labels';
import type { TrackResult } from '../types';

export default function TrackPage() {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await trackSubmission(reference.trim());
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Référence introuvable. Vérifiez le numéro de dossier saisi.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inattendue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <h1 className="page-title">Suivre ma demande</h1>
      <p className="page-subtitle">
        Saisissez le numéro de dossier reçu lors de votre demande de devis ou de votre déclaration
        de sinistre.
      </p>

      <div className="form-wrap track-wrap">
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="reference">Numéro de dossier</label>
            <input
              id="reference"
              type="text"
              required
              placeholder="Ex : SIN-2026-ABC123"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>

        {error && <p className="alert">{error}</p>}

        {result && (
          <div className="track-result">
            <h2>Statut de votre dossier</h2>
            <dl>
              <dt>Référence</dt>
              <dd>{result.reference}</dd>
              <dt>Type</dt>
              <dd>{FORM_TYPE_LABELS[result.form_type]}</dd>
              <dt>Catégorie</dt>
              <dd>{result.category ?? '—'}</dd>
              <dt>Statut</dt>
              <dd>
                <span className={`badge badge-${result.status}`}>{result.status_label}</span>
              </dd>
              <dt>Déposé le</dt>
              <dd>{formatDate(result.created_at)}</dd>
              <dt>Dernière mise à jour</dt>
              <dd>{formatDate(result.updated_at)}</dd>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
