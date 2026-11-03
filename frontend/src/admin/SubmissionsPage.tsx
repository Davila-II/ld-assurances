import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getSubmissions } from '../api';
import type { Category, Paginated, SubmissionSummary } from '../types';
import StatusBadge from './StatusBadge';
import {
  FORM_TYPE_LABELS,
  STATUSES,
  STATUS_LABELS,
  errorMessage,
  formatDate,
} from './labels';

export default function SubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const formType = params.get('form_type') ?? '';
  const category = params.get('category') ?? '';
  const query = params.get('q') ?? '';
  const requestedPage = Number(params.get('page') ?? '1');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestKey = JSON.stringify([status, formType, category, query, page]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [resultState, setResultState] = useState<{
    key: string;
    data: Paginated<SubmissionSummary>;
  } | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const result = resultState?.key === requestKey ? resultState.data : null;
  const error = errorState?.key === requestKey ? errorState.message : '';
  const loading = result === null && error === '';

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setCategoriesError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCategoriesError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getSubmissions({ status, form_type: formType, category, q: query, page })
      .then((data) => {
        if (cancelled) return;
        setResultState({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorState({ key: requestKey, message: errorMessage(err) });
      })

    return () => {
      cancelled = true;
    };
  }, [status, formType, category, query, page, requestKey]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    if (!('page' in changes)) next.delete('page');
    if (next.toString() !== params.toString()) setParams(next);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchTerm = formData.get('q');
    update({ q: typeof searchTerm === 'string' ? searchTerm.trim() : '' });
  };

  const reset = () => {
    update({ status: '', form_type: '', category: '', q: '' });
  };

  const filtersActive = Boolean(status || formType || category || query);

  return (
    <>
      <h1>Déclarations et demandes</h1>

      <form className="filters" onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="search">Recherche</label>
          <input
            key={query}
            id="search"
            name="q"
            type="text"
            placeholder="Numéro de dossier ou email"
            defaultValue={query}
          />
        </div>

        <div className="field">
          <label htmlFor="status">Statut</label>
          <select
            id="status"
            value={status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">Tous</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="form_type">Type</label>
          <select
            id="form_type"
            value={formType}
            onChange={(event) => update({ form_type: event.target.value })}
          >
            <option value="">Tous</option>
            <option value="claim">{FORM_TYPE_LABELS.claim}</option>
            <option value="quote">{FORM_TYPE_LABELS.quote}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="category">Catégorie</label>
          <select
            id="category"
            value={category}
            onChange={(event) => update({ category: event.target.value })}
          >
            <option value="">Toutes</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn">
            Rechercher
          </button>
          {filtersActive && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Réinitialiser
            </button>
          )}
        </div>
      </form>

      {categoriesError && <p className="alert" role="alert">{categoriesError}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {loading && <p role="status">Chargement…</p>}

      {!loading && result && result.data.length === 0 && !error && (
        <p>Aucune déclaration trouvée.</p>
      )}

      {!loading && result && result.data.length > 0 && (
        <>
          <p className="count">
            {result.total} résultat{result.total > 1 ? 's' : ''}
          </p>

          <table className="table">
            <thead>
              <tr>
                <th scope="col">Dossier</th>
                <th scope="col">Type</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Email</th>
                <th scope="col">Statut</th>
                <th scope="col">Pièces</th>
                <th scope="col">Reçu le</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((submission) => (
                <tr key={submission.id}>
                  <td data-label="Dossier">
                    <Link to={`/admin/submissions/${submission.id}`}>{submission.reference}</Link>
                  </td>
                  <td data-label="Type">{FORM_TYPE_LABELS[submission.form_type]}</td>
                  <td data-label="Catégorie">{submission.category ?? '—'}</td>
                  <td data-label="Email">{submission.email}</td>
                  <td data-label="Statut">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td data-label="Pièces">{submission.attachments_count}</td>
                  <td data-label="Reçu le">{formatDate(submission.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination" aria-label="Pagination des déclarations">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={result.current_page <= 1}
              onClick={() => update({ page: String(result.current_page - 1) })}
            >
              Précédent
            </button>
            <span>
              Page {result.current_page} sur {result.last_page}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={result.current_page >= result.last_page}
              onClick={() => update({ page: String(result.current_page + 1) })}
            >
              Suivant
            </button>
          </nav>
        </>
      )}
    </>
  );
}
