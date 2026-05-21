import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
// import { AuthDivider } from '../components/auth/AuthDivider'; // MVP: ocultado hasta OAuth
// import { SocialButton } from '../components/auth/SocialButton'; // MVP: ocultado hasta OAuth
import { useAuthStore } from '../store/useAuthStore';
import { SEOHead } from '../components/SEOHead';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect to the page the user was trying to access, or dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      clearError();

      if (!email.trim() || !password.trim()) {
        setFormError('Completa todos los campos.');
        return;
      }

      try {
        await login({ email: email.trim(), password });
        navigate(from, { replace: true });
      } catch {
        // Error is already set in the store
        setFormError(error || 'Credenciales incorrectas. Intenta de nuevo.');
      }
    },
    [email, password, login, navigate, from, error, clearError],
  );

  return (
    <>
      <SEOHead title="Iniciar sesión | AnimaFlow" noindex />
      <AuthPageLayout title="Bienvenido de vuelta" subtitle="Ingresa tus credenciales para acceder a tu pipeline">
      <div className="space-y-6">
        {/* MVP: OAuth deshabilitado — solo email+password */}
        {/*
        <div className="flex gap-3">
          <SocialButton ... />
          <SocialButton ... />
        </div>
        <AuthDivider />
        */}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Store-level error */}
          {(error || formError) && (
            <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-2.5 text-sm text-error">
              {error || formError}
            </div>
          )}

          <AuthInput
            label="Email"
            type="email"
            placeholder="tu@email.com"
            icon={Mail}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={formError && !email ? 'El email es requerido' : undefined}
          />
          <AuthInput
            label="Contraseña"
            type="password"
            placeholder="..."
            icon={Lock}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={formError && !password ? 'La contraseña es requerida' : undefined}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="peer sr-only" />
                <div className="w-4 h-4 rounded border border-border-tech bg-[#0b101a] peer-checked:bg-mint-precision peer-checked:border-mint-precision transition-all duration-200" />
                <svg className="absolute inset-0 w-4 h-4 text-deep-slate opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-text-secondary text-sm font-body group-hover:text-text-primary transition-colors">Recordarme</span>
            </label>
            <Link to="/forgot-password" className="text-text-secondary text-sm font-body hover:text-mint-precision transition-colors">¿Olvidaste tu contraseña?</Link>
          </div>

          <AuthButton type="submit" loading={isLoading}>Iniciar Sesión</AuthButton>
        </form>

        <p className="text-center text-text-secondary text-sm font-body">
          No tienes cuenta?{' '}
          <a href="/#waitlist-form" className="text-mint-precision font-semibold hover:text-mint-precision/80 transition-colors">Solicita acceso a la beta</a>
        </p>
      </div>
    </AuthPageLayout>
    </>
  );
}
