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
import ClientLayout from './client/ClientLayout';
import ClientLoginPage from './client/LoginPage';
import ClientRegisterPage from './client/RegisterPage';
import ClientDashboardPage from './client/DashboardPage';
import ClientRequestsPage from './client/RequestsPage';
import ClientClaimsPage from './client/ClaimsPage';
import ClientContractsPage from './client/ContractsPage';
import ClientDocumentsPage from './client/DocumentsPage';
import ClientProfilePage from './client/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<PublicPage />} />
        <Route path="/devis/:slug" element={<QuotePage />} />
        <Route path="/suivi" element={<TrackPage />} />
        <Route path="/espace-client/connexion" element={<ClientLoginPage />} />
        <Route path="/espace-client/inscription" element={<ClientRegisterPage />} />
      </Route>

      {/* Espace client : layout autonome (sidebar), sans le header/footer public */}
      <Route path="/espace-client" element={<ClientLayout />}>
        <Route index element={<ClientDashboardPage />} />
        <Route path="demandes" element={<ClientRequestsPage />} />
        <Route path="sinistres" element={<ClientClaimsPage />} />
        <Route path="contrats" element={<ClientContractsPage />} />
        <Route path="documents" element={<ClientDocumentsPage />} />
        <Route path="profil" element={<ClientProfilePage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="submissions/:id" element={<SubmissionDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
