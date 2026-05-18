import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Palette, Key, CreditCard, Save, Loader2, Eye, EyeOff, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAuthStore } from '../../store/useAuthStore';

const TABS = [
  { key: 'profile' as const, label: 'Perfil', icon: User },
  { key: 'preferences' as const, label: 'Preferencias', icon: Palette },
  { key: 'api' as const, label: 'API Keys', icon: Key },
  { key: 'billing' as const, label: 'Facturación', icon: CreditCard },
];

type TabKey = (typeof TABS)[number]['key'];

export function SettingsPage() {
  const { settings, updateSettings, voices } = useDashboardStore();
  const { user, updateProfile, isLoading: isProfileSaving, error: profileError, clearError } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Profile form state — initialized from auth store user
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

  // Sync form fields when user data first loads
  const initializedRef = useRef(false);
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Preferences form state — initialized from settings
  const [prefAspectRatio, setPrefAspectRatio] = useState(settings.defaultAspectRatio);
  const [prefVoice, setPrefVoice] = useState(settings.defaultVoiceId);
  const [prefLanguage, setPrefLanguage] = useState(settings.language);
  const [prefTheme, setPrefTheme] = useState(settings.theme);

  const handleSaveProfile = useCallback(async () => {
    setSaveError(null);
    clearError();

    if (!name.trim() && !email.trim()) {
      setSaveError('Completa al menos el nombre o email.');
      return;
    }

    // Validate password change if attempted
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
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setSaveError(profileError || 'Error al actualizar el perfil.');
    }
  }, [name, email, currentPassword, newPassword, confirmPassword, updateProfile, profileError, clearError]);

  const handleSavePreferences = useCallback(() => {
    updateSettings({
      defaultAspectRatio: prefAspectRatio,
      defaultVoiceId: prefVoice,
      language: prefLanguage,
      theme: prefTheme,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [prefAspectRatio, prefVoice, prefLanguage, prefTheme, updateSettings]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
          <Settings size={24} className="text-mint-precision" />
          Configuración
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Ajustes de cuenta y preferencias de la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1 mb-6 max-w-2xl mx-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-highest text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <ProfileTab
                name={name}
                email={email}
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                showCurrentPw={showCurrentPw}
                showNewPw={showNewPw}
                showConfirmPw={showConfirmPw}
                saving={isProfileSaving}
                saved={saved}
                error={saveError || profileError}
                onNameChange={setName}
                onEmailChange={setEmail}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onToggleCurrentPw={() => setShowCurrentPw(!showCurrentPw)}
                onToggleNewPw={() => setShowNewPw(!showNewPw)}
                onToggleConfirmPw={() => setShowConfirmPw(!showConfirmPw)}
                onSave={handleSaveProfile}
              />
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <PreferencesTab
                aspectRatio={prefAspectRatio}
                voice={prefVoice}
                language={prefLanguage}
                theme={prefTheme}
                voices={voices}
                onAspectRatioChange={setPrefAspectRatio}
                onVoiceChange={setPrefVoice}
                onLanguageChange={setPrefLanguage}
                onThemeChange={setPrefTheme}
                onSave={handleSavePreferences}
                saved={saved}
              />
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div
              key="api"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <ComingSoonTab
                icon={Key}
                title="API Keys"
                description="Próximamente: genera API keys para integración con tus propias aplicaciones y automatizaciones."
              />
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <ComingSoonTab
                icon={CreditCard}
                title="Facturación"
                description="Próximamente: gestiona tu plan, métodos de pago y historial de facturación."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function ProfileTab({
  name,
  email,
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPw,
  showNewPw,
  showConfirmPw,
  saving,
  saved,
  error,
  onNameChange,
  onEmailChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleCurrentPw,
  onToggleNewPw,
  onToggleConfirmPw,
  onSave,
}: {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPw: boolean;
  showNewPw: boolean;
  showConfirmPw: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCurrentPasswordChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onToggleCurrentPw: () => void;
  onToggleNewPw: () => void;
  onToggleConfirmPw: () => void;
  onSave: () => void;
}) {
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
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-2.5 text-sm text-error">
          {error}
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
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onEmailChange(e.target.value)}
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
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onToggleCurrentPw}
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
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onToggleNewPw}
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
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onToggleConfirmPw}
              className="absolute right-3 top-[30px] text-text-secondary/40 hover:text-text-secondary transition-colors"
            >
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saving}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
        }`}
      >
        {saving ? (
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

// ---------------------------------------------------------------------------
// Preferences Tab
// ---------------------------------------------------------------------------

function PreferencesTab({
  aspectRatio,
  voice,
  language,
  theme,
  voices,
  onAspectRatioChange,
  onVoiceChange,
  onLanguageChange,
  onThemeChange,
  onSave,
  saved,
}: {
  aspectRatio: string;
  voice: string;
  language: string;
  theme: string;
  voices: { id: string; name: string }[];
  onAspectRatioChange: (v: string) => void;
  onVoiceChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onThemeChange: (v: string) => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-6 space-y-5">
      {/* Default aspect ratio */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Relación de aspecto por defecto
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['9:16', '4:5', '1:1', '16:9'].map((ratio) => (
            <button
              key={ratio}
              onClick={() => onAspectRatioChange(ratio)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                aspectRatio === ratio
                  ? 'border-mint-precision bg-mint-precision/10 text-mint-precision'
                  : 'border-border-tech bg-surface-lowest text-text-secondary hover:border-outline-variant'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Default voice */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Voz por defecto
        </label>
        <select
          value={voice}
          onChange={(e) => onVoiceChange(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Idioma de la interfaz
        </label>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Tema
        </label>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          <option value="dark">Oscuro</option>
          <option value="light" disabled>
            Claro (próximamente)
          </option>
        </select>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
        }`}
      >
        {saved ? (
          <>
            <Save size={14} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={14} />
            Guardar preferencias
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coming Soon Tab (for API Keys and Billing)
// ---------------------------------------------------------------------------

function ComingSoonTab({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-high flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-text-secondary/30" />
      </div>
      <h3 className="text-lg font-display font-bold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary text-sm max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}
