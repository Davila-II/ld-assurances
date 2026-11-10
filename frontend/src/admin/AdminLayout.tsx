import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { adminLogout, getAdminMe } from '../api';
import { clearToken, getAdminUser, getToken, hasAnyPermission, hasPermission, setAdminUser } from '../auth';
import { errorMessage } from './labels';
import { LanguageToggle, useLanguage } from '../i18n/LanguageContext';
import { SITE } from '../siteConfig';
import logoImg from '../images/logo.png';

export default function AdminLayout() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(getAdminUser());

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // Si l'utilisateur n'est pas encore en cache, on appelle /admin/me
    if (!user && getToken()) {
      getAdminMe()
        .then((fetchedUser) => {
          setAdminUser(fetchedUser);
          setUser(fetchedUser);
        })
        .catch(() => {
          clearToken();
          navigate('/admin/login', { replace: true });
        });
    }
  }, [user, navigate]);

  if (!getToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    setLoggingOut(true);
    let notice = '';

    try {
      await adminLogout();
    } catch (error) {
      notice = `La session locale est fermée, mais la déconnexion du serveur a échoué : ${errorMessage(error)}`;
    } finally {
      clearToken();
      navigate('/admin/login', { replace: true, state: notice ? { notice } : null });
      setLoggingOut(false);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const currentFormType = searchParams.get('form_type');
  const isSubmissionsPath = location.pathname.startsWith('/admin/submissions');

  // Détermination des droits d'affichage pour la navigation
  const canViewDashboard = hasPermission('view_stats');
  const canViewSubmissions = hasAnyPermission(['view_submissions', 'view_all_submissions']);
  const canViewClients = hasAnyPermission(['view_clients', 'manage_clients']);
  const canViewSettings = hasAnyPermission(['manage_form_builder', 'manage_roles', 'manage_settings', 'manage_pricing_rules']);

  return (
    <div className="admin-app-layout">
      {/* En-tête à deux barres */}
      <header className="admin-header">

        {/* Barre supérieure : Gradient bleu → sarcelle */}
        <div className="admin-header-topbar">
          <span className="admin-topbar-brand">LD Assurances — Courtier &amp; Conseils en Assurances</span>
          <div className="admin-topbar-actions">
            {user && (
              <span className="admin-user-badge" style={{ fontSize: '0.82rem', color: '#e0f2fe', marginRight: '12px' }}>
                {user.name} ({user.role_name || user.role})
              </span>
            )}
            <LanguageToggle />
          </div>
        </div>

        {/* Barre inférieure : Fond blanc — Logo | Nav | Actions */}
        <div className="admin-header-bottombar">
          {/* Logo */}
          <Link to="/admin" onClick={closeMenu} className="admin-brand-link">
            <div className="admin-brand-logo-wrap">
              <img src={logoImg} alt="LD Assurances" className="admin-brand-logo-img" />
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="admin-nav admin-nav-desktop">
            {canViewDashboard && (
              <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
                <LayoutDashboard size={16} />
                <span>{t('admin.nav_dashboard')}</span>
              </NavLink>
            )}

            {canViewSubmissions && (
              <>
                <NavLink
                  to="/admin/submissions?form_type=claim"
                  className={() => (isSubmissionsPath && currentFormType === 'claim' ? 'active' : '')}
                >
                  <AlertTriangle size={16} />
                  <span>{t('admin.nav_claims')}</span>
                </NavLink>
                <NavLink
                  to="/admin/submissions?form_type=quote"
                  className={() => (isSubmissionsPath && currentFormType === 'quote' ? 'active' : '')}
                >
                  <FileText size={16} />
                  <span>{t('admin.nav_quotes')}</span>
                </NavLink>
              </>
            )}

            {canViewClients && (
              <NavLink to="/admin/clients" className={({ isActive }) => (isActive ? 'active' : '')}>
                <Users size={16} />
                <span>{t('admin.nav_clients')}</span>
              </NavLink>
            )}

            {canViewSettings && (
              <NavLink to="/admin/parametres" className={({ isActive }) => (isActive ? 'active' : '')}>
                <Settings size={16} />
                <span>{t('admin.nav_settings')}</span>
              </NavLink>
            )}
          </nav>

          {/* Actions Desktop */}
          <div className="admin-header-actions-desktop">
            <button type="button" disabled={loggingOut} onClick={logout} className="admin-logout-btn">
              <LogOut size={16} />
              <span>{loggingOut ? t('admin.logging_out') : t('admin.logout')}</span>
            </button>
          </div>

          {/* Bouton Hamburger 3 barres pour Mobile */}
          <button
            type="button"
            className="admin-hamburger-btn"
            aria-label={menuOpen ? 'Fermer le menu admin' : 'Ouvrir le menu admin'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Fond estompé derrière le tiroir mobile */}
      {menuOpen && <div className="admin-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* Tiroir coulissant mobile (Drawer contenant tous les liens de navigation admin) */}
      <aside className={`admin-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="admin-drawer-header">
          <div className="admin-drawer-brand">
            <div className="admin-brand-logo-wrap">
              <img src={logoImg} alt="LD Assurances" className="admin-brand-logo-img" />
            </div>
            <span className="admin-brand-text">LD ASSURANCES</span>
            <span className="admin-brand-badge">{user?.role_name || 'Admin'}</span>
          </div>
          <button type="button" className="admin-drawer-close" onClick={closeMenu} aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>

        <nav className="admin-drawer-nav">
          {canViewDashboard && (
            <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
              <LayoutDashboard size={18} />
              <span>{t('admin.nav_dashboard')}</span>
            </NavLink>
          )}

          {canViewSubmissions && (
            <>
              <NavLink
                to="/admin/submissions?form_type=claim"
                className={() => (isSubmissionsPath && currentFormType === 'claim' ? 'active' : '')}
                onClick={closeMenu}
              >
                <AlertTriangle size={18} />
                <span>{t('admin.nav_claims_long')}</span>
              </NavLink>
              <NavLink
                to="/admin/submissions?form_type=quote"
                className={() => (isSubmissionsPath && currentFormType === 'quote' ? 'active' : '')}
                onClick={closeMenu}
              >
                <FileText size={18} />
                <span>{t('admin.nav_quotes_long')}</span>
              </NavLink>
            </>
          )}

          {canViewClients && (
            <NavLink to="/admin/clients" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
              <Users size={18} />
              <span>{t('admin.nav_clients')}</span>
            </NavLink>
          )}

          {canViewSettings && (
            <NavLink to="/admin/parametres" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
              <Settings size={18} />
              <span>{t('admin.nav_settings_long')}</span>
            </NavLink>
          )}
        </nav>

        <div className="admin-drawer-footer">
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Langue :</span>
            <LanguageToggle />
          </div>

          <Link to={SITE.mainUrl} className="admin-drawer-link" onClick={closeMenu}>
            <ArrowLeft size={16} />
            <span>{t('admin.back_to_site')}</span>
          </Link>

          <button type="button" disabled={loggingOut} onClick={logout} className="admin-drawer-logout-btn">
            <LogOut size={16} />
            <span>{loggingOut ? t('admin.logging_out') : t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
