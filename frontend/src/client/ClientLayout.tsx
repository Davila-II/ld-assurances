import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import { SITE } from '../siteConfig';
import { clientErrorMessage, clientLogout, clientMe } from '../clientApi';
import { clearClientToken, getClientToken } from '../clientAuth';
import type { ClientUser } from '../clientTypes';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

export interface ClientOutletContext {
  user: ClientUser;
  refresh: () => Promise<void>;
}

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/espace-client', labelKey: 'client.dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/espace-client/demandes', labelKey: 'client.my_requests', icon: <FileText size={18} /> },
  { to: '/espace-client/sinistres', labelKey: 'client.my_claims', icon: <AlertTriangle size={18} /> },
  { to: '/espace-client/profil', labelKey: 'client.my_profile', icon: <User size={18} /> },
];

export default function ClientLayout() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasToken = Boolean(getClientToken());

  const [user, setUser] = useState<ClientUser | null>(null);
  const [ready, setReady] = useState(!hasToken);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Chargement du compte connecté
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    clientMe()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(clientErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  const refresh = useCallback(async () => {
    setUser(await clientMe());
  }, []);

  const logout = async () => {
    try {
      await clientLogout();
    } catch {
      // Même si le serveur ne répond pas, on ferme la session locale
    }
    clearClientToken();
    navigate('/espace-client/connexion', { replace: true });
  };

  if (!hasToken) {
    return <Navigate to="/espace-client/connexion" replace />;
  }

  if (!ready) {
    return (
      <p role="status" className="center">
        {t('claims.loading')}
      </p>
    );
  }

  if (!user) {
    return (
      <main className="login">
        <p className="alert">{error || "Impossible de charger votre espace client."}</p>
        <p className="center">
          <Link to="/espace-client/connexion">{t('auth.back_to_login')}</Link>
        </p>
      </main>
    );
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');

  return (
    <div className="client-layout">
      {/* Barre supérieure mobile avec bouton 3 barres (hamburger) */}
      <header className="client-mobile-bar">
        <Link className="client-mobile-brand" to="/espace-client" onClick={closeMenu}>
          <img src="/logo-icon.png" alt="" />
          <span>
            <strong className="brand-ld">LD</strong> ASSURANCES SA
          </span>
        </Link>

        <button
          type="button"
          className="client-hamburger-btn"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Fond obscurci lorsque le menu mobile est ouvert */}
      {menuOpen && <div className="client-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* Barre latérale gauche (sur PC) / Tiroir déroulant (sur téléphone) */}
      <aside className={`client-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="client-sidebar-header">
          <Link className="client-brand" to="/espace-client" onClick={closeMenu}>
            <img src="/logo-icon.png" alt="" />
            <span>
              <span className="brand-ld">LD</span> ASSURANCES SA
              <span className="client-brand-sub">{t('nav.client_space')}</span>
            </span>
          </Link>

          <button
            type="button"
            className="client-sidebar-close"
            aria-label="Fermer le menu"
            onClick={closeMenu}
          >
            <X size={20} />
          </button>
        </div>

        {/* Badge récapitulatif utilisateur */}
        <div className="client-user-badge">
          <div className="client-user-avatar">{initials || 'U'}</div>
          <div className="client-user-info">
            <strong className="client-user-name">{user.name}</strong>
            <span className="client-user-email">{user.email}</span>
          </div>
        </div>

        <nav className="client-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={closeMenu}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="client-sidebar-footer">
          <Link to={SITE.mainUrl} onClick={closeMenu}>
            {t('nav.back_to_site')}
          </Link>
          <button type="button" onClick={logout}>
            <LogOut size={18} /> {t('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="client-content">
        <Outlet context={{ user, refresh } satisfies ClientOutletContext} />
      </main>
    </div>
  );
}
