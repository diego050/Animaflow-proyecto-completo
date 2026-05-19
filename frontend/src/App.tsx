import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { LoginPage } from './pages/LoginPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { ProjectsList } from './pages/dashboard/ProjectsList';
import { ProjectDetail } from './pages/dashboard/ProjectDetail';
import { NewProjectWizard } from './pages/dashboard/NewProjectWizard';
import { VoicesPage } from './pages/dashboard/VoicesPage';
import { ScriptsPage } from './pages/dashboard/ScriptsPage';
import { DownloadsPage } from './pages/dashboard/DownloadsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { VideosPage } from './pages/dashboard/VideosPage';
import { ImagesPage } from './pages/dashboard/ImagesPage';
import { ComingSoon } from './pages/dashboard/ComingSoon';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminJobsPage } from './pages/admin/AdminJobsPage';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Dashboard routes (protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProjectsList />} />
        <Route path="new" element={<NewProjectWizard />} />
        <Route path="project/:jobId" element={<ProjectDetail />} />
        <Route path="voices" element={<VoicesPage />} />
        <Route path="scripts" element={<ScriptsPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="images" element={<ImagesPage />} />
        <Route path="downloads" element={<DownloadsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Admin routes (protected by role) */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="system" element={<AdminSystemPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
    </>
  );
}
