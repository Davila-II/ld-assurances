import { Navigate } from 'react-router-dom';
import { getAdminUser, getToken, hasPermission } from '../auth';

/**
 * Routeur de redirection pour l'URL /roles :
 * - Si non connecté -> redirige vers la page de connexion
 * - Si connecté en tant qu'admin avec permission manage_roles -> page de gestion des rôles
 * - Si gestionnaire de sinistres -> page des sinistres
 * - Si gestionnaire de devis -> page des devis
 * - Autre collaborateur -> tableau de bord ou dossiers
 */
export default function RolesPortalRedirect() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: '/roles' }} replace />;
  }

  const user = getAdminUser();
  if (user?.is_admin || hasPermission('manage_roles')) {
    return <Navigate to="/admin/roles" replace />;
  }

  if (hasPermission('view_claims') && !hasPermission('view_quotes')) {
    return <Navigate to="/admin/submissions?form_type=claim" replace />;
  }

  if (hasPermission('view_quotes') && !hasPermission('view_claims')) {
    return <Navigate to="/admin/submissions?form_type=quote" replace />;
  }

  return <Navigate to="/admin" replace />;
}
