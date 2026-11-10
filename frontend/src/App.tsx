import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import PublicPage from './pages/PublicPage';
import QuotePage from './pages/QuotePage';
import TrackPage from './pages/TrackPage';
import AdminLayout from './admin/AdminLayout';
import LoginPage from './admin/LoginPage';
import DashboardPage from './admin/DashboardPage';
import SubmissionsPage from './admin/SubmissionsPage';
import SubmissionDetailPage from './admin/SubmissionDetailPage';
import FormBuilderPage from './admin/FormBuilderPage';
import ClientsPage from './admin/ClientsPage';
import SettingsPage from './admin/SettingsPage';
import RolesPage from './admin/RolesPage';
import ClientLayout from './client/ClientLayout';
import ClientLoginPage from './client/LoginPage';
import ClientRegisterPage from './client/RegisterPage';
import ClientDashboardPage from './client/DashboardPage';
import ClientRequestsPage from './client/RequestsPage';
import ClientClaimsPage from './client/ClaimsPage';
import ClientNotificationsPage from './client/NotificationsPage';
import ClientProfilePage from './client/ProfilePage';
import ForgotPasswordPage from './client/ForgotPasswordPage';
import ResetPasswordPage from './client/ResetPasswordPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<PublicPage />} />
        <Route path="/devis/:slug" element={<QuotePage />} />
        <Route path="/sinistre" element={<PublicPage />} />
        <Route path="/sinistre/:slug" element={<PublicPage />} />
        <Route path="/suivi" element={<TrackPage />} />
        <Route path="/espace-client/connexion" element={<ClientLoginPage />} />
        <Route path="/espace-client/inscription" element={<ClientRegisterPage />} />
        <Route path="/espace-client/verification" element={<Navigate to="/espace-client" replace />} />
        <Route path="/espace-client/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="/espace-client/reinitialiser" element={<ResetPasswordPage />} />
      </Route>

      {/* Espace client : layout autonome (sidebar), sans le header/footer public */}
      <Route path="/espace-client" element={<ClientLayout />}>
        <Route index element={<ClientDashboardPage />} />
        <Route path="demandes" element={<ClientRequestsPage />} />
        <Route path="sinistres" element={<ClientClaimsPage />} />
        <Route path="notifications" element={<ClientNotificationsPage />} />
        <Route path="contrats" element={<Navigate to="/espace-client" replace />} />
        <Route path="documents" element={<Navigate to="/espace-client" replace />} />
        <Route path="profil" element={<ClientProfilePage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="submissions/:id" element={<SubmissionDetailPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="formulaires" element={<FormBuilderPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="roles" element={<RolesPage />} />
      </Route>

      {/* Raccourci direct /roles demandé par l'utilisateur */}
      <Route path="/roles" element={<Navigate to="/admin/roles" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
