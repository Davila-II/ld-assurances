import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import LoginPage from './admin/LoginPage';
import SubmissionDetailPage from './admin/SubmissionDetailPage';
import SubmissionsPage from './admin/SubmissionsPage';
import PublicPage from './pages/PublicPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<SubmissionsPage />} />
        <Route path="submissions/:id" element={<SubmissionDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}