import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { LoginPage } from './pages/LoginPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ProjectsList } from './pages/dashboard/ProjectsList';
import { ProjectDetail } from './pages/dashboard/ProjectDetail';
import { NewProjectWizard } from './pages/dashboard/NewProjectWizard';
import { VoicesPage } from './pages/dashboard/VoicesPage';
import { ScriptsPage } from './pages/dashboard/ScriptsPage';
import { DownloadsPage } from './pages/dashboard/DownloadsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { ComingSoon } from './pages/dashboard/ComingSoon';

export default function App() {
  return (
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
        <Route path="videos" element={<ComingSoon title="Videos" description="Galería de videos renderizados y listos para publicar." />} />
        <Route path="downloads" element={<DownloadsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
