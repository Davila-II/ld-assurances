import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminLogout } from '../api';
import { clearToken, getToken } from '../auth';
import { errorMessage } from './labels';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <>
      <header className="admin-header">
        <div className="admin-header-brand">
          <Link to="/admin">Administration · LD Assurances</Link>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Tableau de bord
          </NavLink>
          <NavLink
            to="/admin/submissions"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Soumissions
          </NavLink>
          <NavLink
            to="/admin/formulaires"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Formulaires
          </NavLink>
        </nav>

        <button type="button" disabled={loggingOut} onClick={logout}>
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </>
  );
}
