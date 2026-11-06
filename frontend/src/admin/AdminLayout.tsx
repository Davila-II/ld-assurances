import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Sliders,
  Users,
  X,
} from 'lucide-react';
import { adminLogout } from '../api';
import { clearToken, getToken } from '../auth';
import { errorMessage } from './labels';
import { LanguageToggle } from '../i18n/LanguageContext';
import { SITE } from '../siteConfig';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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

  return (
    <div className="admin-app-layout">
      {/* Barre supérieure desktop / en-tête principal */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <Link to="/admin" onClick={closeMenu} className="admin-brand-link">
            <span className="admin-brand-ld">LD</span> ASSURANCES
            <span className="admin-brand-badge">Admin</span>
          </Link>
        </div>

        {/* Navigation Desktop */}
        <nav className="admin-nav admin-nav-desktop">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <LayoutDashboard size={16} />
            <span>Tableau de bord</span>
          </NavLink>
          <NavLink
            to="/admin/submissions?form_type=claim"
            className={() => (isSubmissionsPath && currentFormType === 'claim' ? 'active' : '')}
          >
            <AlertTriangle size={16} />
            <span>Déclarations</span>
          </NavLink>
          <NavLink
            to="/admin/submissions?form_type=quote"
            className={() => (isSubmissionsPath && currentFormType === 'quote' ? 'active' : '')}
          >
            <FileText size={16} />
            <span>Devis</span>
          </NavLink>
          <NavLink to="/admin/clients" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Users size={16} />
            <span>Clients</span>
          </NavLink>
          <NavLink to="/admin/formulaires" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Sliders size={16} />
            <span>Formulaires</span>
          </NavLink>
        </nav>

        {/* Actions Desktop */}
        <div className="admin-header-actions-desktop">
          <LanguageToggle />
          <button type="button" disabled={loggingOut} onClick={logout} className="admin-logout-btn">
            <LogOut size={16} />
            <span>{loggingOut ? 'Déconnexion…' : 'Déconnexion'}</span>
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
      </header>

      {/* Fond estompé derrière le tiroir mobile */}
      {menuOpen && <div className="admin-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* Tiroir coulissant mobile (Drawer contenant tous les liens de navigation admin) */}
      <aside className={`admin-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="admin-drawer-header">
          <div className="admin-drawer-brand">
            <span className="admin-brand-ld">LD</span> ASSURANCES
            <span className="admin-brand-badge">Admin</span>
          </div>
          <button type="button" className="admin-drawer-close" onClick={closeMenu} aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>

        <nav className="admin-drawer-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <LayoutDashboard size={18} />
            <span>Tableau de bord</span>
          </NavLink>
          <NavLink
            to="/admin/submissions?form_type=claim"
            className={() => (isSubmissionsPath && currentFormType === 'claim' ? 'active' : '')}
            onClick={closeMenu}
          >
            <AlertTriangle size={18} />
            <span>Déclarations de sinistres</span>
          </NavLink>
          <NavLink
            to="/admin/submissions?form_type=quote"
            className={() => (isSubmissionsPath && currentFormType === 'quote' ? 'active' : '')}
            onClick={closeMenu}
          >
            <FileText size={18} />
            <span>Demandes de devis</span>
          </NavLink>
          <NavLink to="/admin/clients" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <Users size={18} />
            <span>Gestion des clients</span>
          </NavLink>
          <NavLink to="/admin/formulaires" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
            <Sliders size={18} />
            <span>Constructeur de formulaires</span>
          </NavLink>
        </nav>

        <div className="admin-drawer-footer">
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Langue :</span>
            <LanguageToggle />
          </div>

          <Link to={SITE.mainUrl} className="admin-drawer-link" onClick={closeMenu}>
            <ArrowLeft size={16} />
            <span>Retour au site principal</span>
          </Link>

          <button type="button" disabled={loggingOut} onClick={logout} className="admin-drawer-logout-btn">
            <LogOut size={16} />
            <span>{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
