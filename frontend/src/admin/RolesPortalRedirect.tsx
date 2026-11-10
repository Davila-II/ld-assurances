import { Navigate } from 'react-router-dom';
import { getToken } from '../auth';

/**
 * Routeur pour l'accès /role et /roles :
 * - Si non connecté -> redirige vers la page de connexion
 * - Si connecté -> dirige vers la page d'accueil personnalisée de l'espace rôle
 */
export default function RolesPortalRedirect() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: '/role' }} replace />;
  }

  return <Navigate to="/admin/mon-role" replace />;
}
