import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import PublicPage from './pages/PublicPage';
import AdminLayout from './admin/AdminLayout';
import LoginPage from './admin/LoginPage';
import SubmissionsPage from './admin/SubmissionsPage';
import SubmissionDetailPage from './admin/SubmissionDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<PublicPage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<SubmissionsPage />} />
        <Route path="submissions/:id" element={<SubmissionDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}