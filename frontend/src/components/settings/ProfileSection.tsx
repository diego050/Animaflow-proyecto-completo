import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function ProfileSection() {
  const { user, updateProfile, isLoading: isProfileSaving, error: profileError, clearError } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    setSaveError(null);
    clearError();

    if (!name.trim() && !email.trim()) {
      setSaveError('Completa al menos el nombre o email.');
      return;
    }

    if (currentPassword || newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setSaveError('Las contraseñas nuevas no coinciden.');
        return;
      }
      if (newPassword.length < 6) {
        setSaveError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (!currentPassword) {
        setSaveError('Ingresa tu contraseña actual para cambiarla.');
        return;
      }
    }

    try {
      await updateProfile({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        current_password: currentPassword || undefined,
        new_password: (currentPassword && newPassword) ? newPassword : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setSaveError(profileError || 'Error al actualizar el perfil.');
    }
  }, [name, email, currentPassword, newPassword, confirmPassword, updateProfile, profileError, clearError]);

  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-6 space-y-6">
      {/* Avatar placeholder - centered */}
      <div className="flex flex-col items-center gap-3 pb-4 border-b border-border-tech/50">
        <div className="w-20 h-20 rounded-full bg-mint-precision/20 text-mint-precision flex items-center justify-center text-2xl font-semibold">
          {name
            ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : <User size={32} />}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">
            {name || 'Tu nombre'}
          </p>
          <p className="text-xs text-text-secondary/50">{email || 'tu@email.com'}</p>
        </div>
      </div>

      {/* Error message */}
      {saveError && (
        <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-2.5 text-sm text-error">
          {saveError}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juan Pérez"
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="juan@email.com"
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
        />
      </div>

      {/* Password section */}
      <div className="pt-4 border-t border-border-tech/50">
        <p className="text-sm font-semibold text-text-primary mb-4">
          Cambiar contraseña
        </p>

        <div className="space-y-3">
          {/* Current password */}
          <div className="relative">
            <label className="block text-text-secondary text-xs font-medium mb-1.5">
              Contraseña actual
            </label>
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="absolute right-3 top-[30px] text-text-secondary/40 hover:text-text-secondary transition-colors"
            >
              {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <label className="block text-text-secondary text-xs font-medium mb-1.5">
              Nueva contraseña
            </label>
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-[30px] text-text-secondary/40 hover:text-text-secondary transition-colors"
            >
              {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative">
            <label className="block text-text-secondary text-xs font-medium mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="absolute right-3 top-[30px] text-text-secondary/40 hover:text-text-secondary transition-colors"
            >
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSaveProfile}
        disabled={isProfileSaving}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
        }`}
      >
        {isProfileSaving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Guardando...
          </>
        ) : saved ? (
          <>
            <Save size={14} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={14} />
            Guardar cambios
          </>
        )}
      </button>
    </div>
  );
}
