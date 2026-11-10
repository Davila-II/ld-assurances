import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Layers,
  Loader2,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { getAdminMe, getStats } from '../api';
import { getAdminUser, hasPermission, setAdminUser } from '../auth';
import { useLanguage } from '../i18n/LanguageContext';
import type { AdminStats, AdminUser } from '../types';
import StatusBadge from './StatusBadge';
import { formatDate } from './labels';

export default function RoleDashboardPage() {
  const { t, lang } = useLanguage();

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getAdminUser());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger le profil frais si besoin
    getAdminMe()
      .then((user) => {
        setAdminUser(user);
        setCurrentUser(user);
      })
      .catch(() => {});

    // Charger les statistiques adaptées
    getStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const canClaims = hasPermission('view_claims');
  const canQuotes = hasPermission('view_quotes');
  const canClients = hasPermission('view_clients');
  const canRoles = hasPermission('manage_roles') || currentUser?.is_admin;
  const canForms = hasPermission('manage_form_builder') || currentUser?.is_admin;

  return (
    <div className="role-portal-root">
      {/* ── 1. En-tête Espace Rôle ── */}
      <div className="role-portal-hero">
        <div className="role-portal-hero-info">
          <div className="role-portal-avatar">
            <User size={30} />
          </div>
          <div>
            <div className="role-portal-badge-wrap">
              <span className="role-portal-role-badge">
                <Shield size={14} />
                {currentUser?.role_name || (currentUser?.is_admin ? 'Super Administrateur' : 'Collaborateur')}
              </span>
              <span className="role-portal-status-online">
                <span className="role-portal-dot" /> En ligne
              </span>
            </div>
            <h1 className="role-portal-title">
              {lang === 'en' ? 'Workspace' : 'Espace Collaborateur'} : {currentUser?.name}
            </h1>
            <p className="role-portal-email">{currentUser?.email}</p>
          </div>
        </div>

        <div className="role-portal-hero-actions">
          <Link
            to="/admin/mon-profil"
            className="role-portal-pwd-btn"
          >
            <User size={15} />
            <span>{lang === 'en' ? 'My Profile' : 'Mon Profil'}</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Raccourcis métiers direct ── */}
      <div className="role-portal-section-title">
        <h2>{lang === 'en' ? 'Your Quick Actions' : 'Vos accès rapides'}</h2>
        <p>{lang === 'en' ? 'Direct shortcuts according to your role authorizations' : 'Raccourcis directs autorisés pour votre mission'}</p>
      </div>

      <div className="role-portal-actions-grid">
        {canClaims && (
          <Link to="/admin/submissions?form_type=claim" className="role-portal-action-card role-card-claim">
            <div className="role-action-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={26} />
            </div>
            <div className="role-action-content">
              <h3>{lang === 'en' ? 'Claims Management' : 'Gestion des Sinistres'}</h3>
              <p>{lang === 'en' ? 'View claim files, update status, calculate indemnity and reply to insured.' : 'Consulter les déclarations, traiter les statuts, chiffrer et répondre aux assurés.'}</p>
            </div>
            <div className="role-action-arrow">
              <span>{lang === 'en' ? 'Open' : 'Accéder'}</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        )}

        {canQuotes && (
          <Link to="/admin/submissions?form_type=quote" className="role-portal-action-card role-card-quote">
            <div className="role-action-icon-wrap" style={{ background: '#eff6ff', color: '#1e4d8f' }}>
              <FileText size={26} />
            </div>
            <div className="role-action-content">
              <h3>{lang === 'en' ? 'Quotes Management' : 'Gestion des Devis'}</h3>
              <p>{lang === 'en' ? 'Process quote requests, apply CIMA tariffs and send proposals.' : 'Traiter les demandes, appliquer les barèmes CIMA et transmettre les devis.'}</p>
            </div>
            <div className="role-action-arrow">
              <span>{lang === 'en' ? 'Open' : 'Accéder'}</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        )}

        {canClients && (
          <Link to="/admin/clients" className="role-portal-action-card role-card-client">
            <div className="role-action-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Users size={26} />
            </div>
            <div className="role-action-content">
              <h3>{lang === 'en' ? 'Clients Directory' : 'Répertoire Clients'}</h3>
              <p>{lang === 'en' ? 'View client accounts and insured files.' : 'Consulter les comptes assurés et leurs dossiers rattachés.'}</p>
            </div>
            <div className="role-action-arrow">
              <span>{lang === 'en' ? 'Open' : 'Accéder'}</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        )}

        {canRoles && (
          <Link to="/admin/parametres/role" className="role-portal-action-card role-card-roles">
            <div className="role-action-icon-wrap" style={{ background: '#e6f7f5', color: '#0e7a6e' }}>
              <Shield size={26} />
            </div>
            <div className="role-action-content">
              <h3>{lang === 'en' ? 'Roles & Staff' : 'Rôles & Collaborateurs'}</h3>
              <p>{lang === 'en' ? 'Manage roles, permissions and team assignments.' : 'Gérer les rôles, les permissions et affecter les collaborateurs.'}</p>
            </div>
            <div className="role-action-arrow">
              <span>{lang === 'en' ? 'Open' : 'Accéder'}</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        )}

        {canForms && (
          <Link to="/admin/parametres/formulaire" className="role-portal-action-card role-card-builder">
            <div className="role-action-icon-wrap" style={{ background: '#faf5ff', color: '#7c3aed' }}>
              <Layers size={26} />
            </div>
            <div className="role-action-content">
              <h3>{lang === 'en' ? 'Form Builder' : 'Constructeur de formulaires'}</h3>
              <p>{lang === 'en' ? 'Customize questionnaire questions and options.' : 'Personnaliser les questions et les champs des formulaires publics.'}</p>
            </div>
            <div className="role-action-arrow">
              <span>{lang === 'en' ? 'Open' : 'Accéder'}</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        )}
      </div>

      {/* ── 3. Synthèse de l'activité ── */}
      <div className="role-portal-section-title" style={{ marginTop: '32px' }}>
        <h2>{lang === 'en' ? 'Your Activity Overview' : 'Aperçu de votre périmètre'}</h2>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={28} className="roles-spinner" />
        </div>
      ) : stats ? (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <strong>{stats.total}</strong>
              <span>{lang === 'en' ? 'Total dossiers' : 'Total de vos dossiers'}</span>
            </div>
            <div className="admin-stat">
              <strong>{stats.by_status?.received ?? 0}</strong>
              <span>{lang === 'en' ? 'New received' : 'Nouveaux reçus'}</span>
            </div>
            <div className="admin-stat">
              <strong>{stats.by_status?.in_progress ?? 0}</strong>
              <span>{lang === 'en' ? 'In progress' : 'En cours de traitement'}</span>
            </div>
            <div className="admin-stat">
              <strong>{stats.by_status?.answered ?? 0}</strong>
              <span>{lang === 'en' ? 'Answered' : 'Répondus'}</span>
            </div>
            <div className="admin-stat">
              <strong>{(stats.by_status?.closed ?? 0) + (stats.by_status?.rejected ?? 0)}</strong>
              <span>{lang === 'en' ? 'Processed' : 'Traités / Clôturés'}</span>
            </div>
          </div>

          {/* Récents dossiers */}
          <section className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>
              {lang === 'en' ? 'Recent submissions to handle' : 'Derniers dossiers de votre file d\'attente'}
            </h2>
            {stats.recent.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', margin: '16px 0' }}>
                {lang === 'en' ? 'No recent dossier.' : 'Aucun dossier récent dans votre périmètre.'}
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">{t('admin.th_reference')}</th>
                      <th scope="col">{t('admin.th_type')}</th>
                      <th scope="col">{t('admin.th_status')}</th>
                      <th scope="col">{t('admin.th_date')}</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((s) => (
                      <tr key={s.id}>
                        <td data-label="Référence">
                          <strong>{s.reference}</strong>
                        </td>
                        <td data-label="Type">
                          {s.form_type === 'quote' ? (
                            <span style={{ color: '#1e4d8f', fontWeight: 600 }}>Devis</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Sinistre</span>
                          )}
                        </td>
                        <td data-label="Statut">
                          <StatusBadge status={s.status} />
                        </td>
                        <td data-label="Reçu le">{formatDate(s.created_at)}</td>
                        <td data-label="Action">
                          <Link to={`/admin/submissions/${s.id}`} className="role-portal-open-link">
                            Traiter le dossier &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
