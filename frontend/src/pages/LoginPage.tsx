import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthDivider } from '../components/auth/AuthDivider';
import { SocialButton } from '../components/auth/SocialButton';
import { useAuthStore } from '../store/useAuthStore';
import { SEOHead } from '../components/SEOHead';

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'Al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'Al menos un número';
  return null;
};

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
        <div className="flex gap-3">
          <SocialButton
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            }
            label="Google"
            disabled
            title="Próximamente"
          />
          <SocialButton
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>}
            label="GitHub"
            disabled
            title="Próximamente"
          />
        </div>

        <AuthDivider />

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
