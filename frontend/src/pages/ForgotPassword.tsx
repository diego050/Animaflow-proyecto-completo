import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';

export function ForgotPassword() {
  return (
    <AuthPageLayout title="Recupera tu contrasena" subtitle="Ingresa tu email y te enviaremos un link para restablecerla">
      <div className="space-y-6">
        <AuthInput label="Email" type="email" placeholder="tu@email.com" icon={Mail} autoComplete="email" />
        <AuthButton type="button" onClick={() => window.location.href = '/login'}>Enviar link</AuthButton>
        <p className="text-center text-text-secondary text-sm font-body">
          <Link to="/login" className="text-mint-precision font-semibold hover:text-mint-precision/80 transition-colors flex items-center justify-center gap-1"><ArrowLeft size={14} strokeWidth={2} />Volver al login</Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}