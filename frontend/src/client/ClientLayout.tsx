import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
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

  // Déconnexion factice (l'authentification réelle arrive plus tard)
  const logout = () => navigate('/espace-client/connexion');

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
          <Link to={SITE.mainUrl}>← Retour au site</Link>
          <button type="button" onClick={logout}>
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="client-content">
        <Outlet />
      </main>
    </div>
  );
}
