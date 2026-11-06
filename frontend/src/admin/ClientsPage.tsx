import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, Phone, Plus, Search, User, UserPlus, X } from 'lucide-react';
import { createClient, getClients } from '../api';
import type { AdminClient, Paginated } from '../types';
import PhoneInput from '../components/PhoneInput';
import { errorMessage, formatDate } from './labels';

export default function ClientsPage() {
  const [clients, setClients] = useState<Paginated<AdminClient> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal / Formulaire d'ajout
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    message: string;
    email: string;
    temporary_password?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    getClients({ q: search, page })
      .then((data) => {
        if (!cancelled) {
          setClients(data);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, page, reloadKey]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const handleResetSearch = () => {
    setSearch('');
    setPage(1);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const handleOpenModal = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setFormError('');
    setCreatedResult(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCreatedResult(null);
  };

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);

    try {
      const res = await createClient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
      });

      setCreatedResult({
        message: res.message,
        email: res.user.email,
        temporary_password: res.temporary_password,
      });

      // Rafraîchir la liste
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="detail-head" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Clients</h1>
          <p style={{ margin: '4px 0 0', color: '#44556a' }}>
            Consultez les comptes clients et ajoutez-en de nouveaux avec envoi direct de leurs accès par email.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenModal}>
          <UserPlus size={18} style={{ marginRight: '6px' }} />
          Ajouter un client
        </button>
      </div>

      {/* Barre de recherche */}
      <form className="filters" onSubmit={handleSearchSubmit} style={{ marginTop: '20px' }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="search-clients">Recherche par nom, email ou téléphone</label>
          <input
            id="search-clients"
            type="text"
            placeholder="Ex : Dupont, client@exemple.com, 69911..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn">
            <Search size={16} style={{ marginRight: '4px' }} /> Rechercher
          </button>
          {search && (
            <button type="button" className="btn" onClick={handleResetSearch}>
              Réinitialiser
            </button>
          )}
        </div>
      </form>

      {/* État de chargement / erreur */}
      {loading && <p role="status">Chargement des clients…</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      {/* Liste des clients */}
      {!loading && clients && (
        <>
          <p className="count">
            {clients.total} client{clients.total > 1 ? 's' : ''} enregistré{clients.total > 1 ? 's' : ''}
          </p>

          {clients.data.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
              <User size={36} style={{ color: '#8fa0b8', marginBottom: '8px' }} />
              <p style={{ margin: 0, color: '#44556a' }}>Aucun client ne correspond à votre recherche.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nom du client</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Dossiers rattachés</th>
                  <th>Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {clients.data.map((client) => (
                  <tr key={client.id}>
                    <td data-label="Nom">
                      <strong>{client.name}</strong>
                    </td>
                    <td data-label="Email">
                      <a href={`mailto:${client.email}`} style={{ color: '#1e4d8f' }}>
                        {client.email}
                      </a>
                    </td>
                    <td data-label="Téléphone">{client.phone || '—'}</td>
                    <td data-label="Dossiers">
                      <span className="badge badge-received">
                        {client.submissions_count} dossier{client.submissions_count > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td data-label="Inscrit le">{formatDate(client.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {clients.last_page > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn"
                disabled={clients.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </button>
              <span>
                Page {clients.current_page} sur {clients.last_page}
              </span>
              <button
                type="button"
                className="btn"
                disabled={clients.current_page >= clients.last_page}
                onClick={() => setPage((p) => Math.min(clients.last_page, p + 1))}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal d'ajout de client */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Ajouter un nouveau client</h2>
              <button type="button" className="admin-modal-close" onClick={handleCloseModal} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            {createdResult ? (
              <div style={{ padding: '20px 0' }}>
                <div className="notice" style={{ marginBottom: '16px' }}>
                  <strong>{createdResult.message}</strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>Identifiant (Email) :</strong> {createdResult.email}
                  </p>
                  {createdResult.temporary_password && (
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>Mot de passe généré :</strong>{' '}
                      <code style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold' }}>
                        {createdResult.temporary_password}
                      </code>
                    </p>
                  )}
                  <small style={{ color: '#64748b' }}>
                    Ces coordonnées ont été envoyées automatiquement à l’adresse email du client.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-primary" onClick={handleOpenModal}>
                    <Plus size={16} /> Ajouter un autre client
                  </button>
                  <button type="button" className="btn" onClick={handleCloseModal}>
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} style={{ marginTop: '16px' }}>
                {formError && <p className="alert" role="alert">{formError}</p>}

                <div className="field">
                  <label htmlFor="client-name">
                    <User size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Nom complet du client *
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    required
                    placeholder="Ex : Paul Biya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="client-email">
                    <Mail size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Adresse email *
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    required
                    placeholder="Ex : client@exemple.cm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <small style={{ color: '#64748b' }}>
                    Les identifiants d’accès à l’espace client seront envoyés directement à cette adresse.
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="client-phone">
                    <Phone size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Numéro de téléphone
                  </label>
                  <PhoneInput id="client-phone" value={phone} onChange={(val) => setPhone(val)} />
                </div>

                <div className="field">
                  <label htmlFor="client-password">Mot de passe initial (optionnel)</label>
                  <input
                    id="client-password"
                    type="text"
                    placeholder="Laissez vide pour générer automatiquement un mot de passe sécurisé"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <small style={{ color: '#64748b' }}>
                    Si vous laissez ce champ vide, un mot de passe temporaire sera généré et communiqué par email au client.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                  <button type="button" className="btn" onClick={handleCloseModal} disabled={creating}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Création et envoi en cours…' : 'Créer et envoyer les coordonnées'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
