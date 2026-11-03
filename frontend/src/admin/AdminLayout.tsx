import { useState } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
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
        <Link to="/admin">Administration · LD Assurances</Link>
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
