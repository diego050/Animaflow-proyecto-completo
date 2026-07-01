import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, fetchMe } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, [isAuthenticated, fetchMe]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Onboarding: usuarios (no-admin) que aún no lo completaron → pantallas de bienvenida.
  // Se espera a que `user` cargue (fetchMe) para no redirigir en falso.
  if (user && user.role !== 'admin' && !user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
