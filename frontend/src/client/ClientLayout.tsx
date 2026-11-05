import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { SITE } from '../siteConfig';
import { clientErrorMessage, clientLogout, clientMe } from '../clientApi';
import { clearClientToken, getClientToken } from '../clientAuth';
import type { ClientUser } from '../clientTypes';

export interface ClientOutletContext {
  user: ClientUser;
  refresh: () => Promise<void>;
}

const NAV = [
  { to: '/espace-client', label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/espace-client/demandes', label: 'Mes demandes', icon: <FileText size={18} /> },
  { to: '/espace-client/sinistres', label: 'Mes sinistres', icon: <AlertTriangle size={18} /> },
  { to: '/espace-client/contrats', label: 'Mes contrats', icon: <FileCheck size={18} /> },
  { to: '/espace-client/documents', label: 'Mes documents', icon: <FolderOpen size={18} /> },
  { to: '/espace-client/profil', label: 'Mon profil', icon: <User size={18} /> },
];

export default function ClientLayout() {
  const navigate = useNavigate();
  const hasToken = Boolean(getClientToken());

  const [user, setUser] = useState<ClientUser | null>(null);
  const [ready, setReady] = useState(!hasToken);
  const [error, setError] = useState('');

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
      // Même si le serveur ne répond pas, on ferme la session dans le navigateur
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
        Chargement…
      </p>
    );
  }

  if (!user) {
    return (
      <main className="login">
        <p className="alert">{error || "Impossible de charger votre espace client."}</p>
        <p className="center">
          <Link to="/espace-client/connexion">Retour à la connexion</Link>
        </p>
      </main>
    );
  }


  return (
    <div className="client-layout">
      <aside className="client-sidebar">
        <Link className="client-brand" to="/espace-client">
          <img src="/logo-icon.png" alt="" />
          <span>
            <span className="brand-ld">LD</span> ASSURANCES SA
            <span className="client-brand-sub">Espace client</span>
          </span>
        </Link>

        <nav className="client-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="client-sidebar-footer">
          <small style={{ display: 'block', padding: '0 4px 8px', opacity: 0.8 }}>{user.name}</small>
          <Link to={SITE.mainUrl}>← Retour au site</Link>
          <button type="button" onClick={logout}>
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="client-content">
        <Outlet context={{ user, refresh } satisfies ClientOutletContext} />
      </main>
    </div>
  );
}
