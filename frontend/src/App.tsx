import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { LoginPage } from './pages/LoginPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { ScriptsPage } from './pages/dashboard/ScriptsPage';
import { DownloadsPage } from './pages/dashboard/DownloadsPage';
import { VideosPage } from './pages/dashboard/VideosPage';
// import { ImagesPage } from './pages/dashboard/ImagesPage'; // MVP: oculto
import { AdminSystemPage } from './pages/admin/AdminSystemPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { ToastContainer } from './components/ToastContainer';

const ProjectsList = lazy(() => import('./pages/dashboard/ProjectsList').then(m => ({ default: m.ProjectsList })));
const ProjectDetail = lazy(() => import('./pages/dashboard/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const NewProjectWizard = lazy(() => import('./pages/dashboard/NewProjectWizard').then(m => ({ default: m.NewProjectWizard })));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const VoicesPage = lazy(() => import('./pages/dashboard/VoicesPage').then(m => ({ default: m.VoicesPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminJobsPage = lazy(() => import('./pages/admin/AdminJobsPage').then(m => ({ default: m.AdminJobsPage })));
const AnimationsGallery = lazy(() => import('./pages/admin/AnimationsGallery').then(m => ({ default: m.AnimationsGallery })));
const AnimationPlayground = lazy(() => import('./pages/admin/AnimationPlayground').then(m => ({ default: m.AnimationPlayground })));

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<div className="min-h-screen bg-deep-slate flex items-center justify-center"><Loader2 className="animate-spin text-mint-precision" size={32} /></div>}>
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
            {/* <Route path="images" element={<ImagesPage />} /> // MVP: oculto */}
            <Route path="downloads" element={<DownloadsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin routes (protected by role) */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="jobs" element={<AdminJobsPage />} />
            <Route path="system" element={<AdminSystemPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="animations" element={<AnimationsGallery />} />
            <Route path="animations/:componentName" element={<AnimationPlayground />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
