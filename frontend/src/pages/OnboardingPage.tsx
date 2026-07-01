import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const PERSONAS: [string, string][] = [
  ['founder', 'Founder / Emprendedor'],
  ['creator', 'Creador de contenido'],
  ['agency', 'Agencia'],
  ['company', 'Empresa / Marketing'],
  ['student', 'Estudiante'],
  ['other', 'Otro'],
];

const SOURCES: [string, string][] = [
  ['google', 'Google / Búsqueda'],
  ['youtube', 'YouTube'],
  ['social', 'TikTok / Instagram'],
  ['friend', 'Recomendación'],
  ['other', 'Otro'],
];

// Pantallas de bienvenida (una sola vez). Todo es OPCIONAL y se puede omitir; al terminar se
// marca onboarding_completed y no vuelven a aparecer.
export function OnboardingPage() {
  const { isAuthenticated, user, updateProfile } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [persona, setPersona] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [useCase, setUseCase] = useState('');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Si ya lo completó (o es admin), no mostrar onboarding.
  if (user && (user.onboarding_completed || user.role === 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  const steps = ['welcome', 'persona', 'source', 'usecase', 'password'] as const;
  const isLast = step === steps.length - 1;

  const finish = async () => {
    setError(null);
    // Validación mínima del cambio de contraseña (solo si el usuario lo rellenó).
    const wantsPassword = newPass.length > 0 || curPass.length > 0 || confirmPass.length > 0;
    if (wantsPassword) {
      if (newPass.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
      if (newPass !== confirmPass) return setError('Las contraseñas no coinciden.');
      if (!curPass) return setError('Escribe tu contraseña actual (la que te dieron) para cambiarla.');
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        persona: persona ?? undefined,
        referral_source: referral ?? undefined,
        use_case: useCase.trim() || undefined,
        mark_onboarding_completed: true,
        ...(wantsPassword ? { current_password: curPass, new_password: newPass } : {}),
      });
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Revisa la contraseña actual.');
      setSaving(false);
    }
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl border text-sm text-left transition-colors ${
        active
          ? 'border-mint-precision bg-mint-precision/15 text-mint-precision'
          : 'border-border-tech bg-surface-container text-text-secondary hover:text-text-primary hover:border-mint-precision/50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-deep-slate flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-container border border-border-tech rounded-2xl p-8 shadow-2xl">
        {/* Progreso */}
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-mint-precision' : 'bg-border-tech'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-mint-precision">
              <Sparkles size={22} /> <span className="text-xs uppercase tracking-wider">Bienvenido a AnimaFlow</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">¡Hola! Vamos a configurar tu cuenta</h1>
            <p className="text-sm text-text-secondary/70">
              Solo unas preguntas rápidas (puedes omitirlas). Esto no volverá a aparecer.
            </p>
            <div>
              <label className="text-xs text-text-secondary/60 block mb-1">¿Cómo quieres que te llamemos?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-text-primary text-sm"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-text-primary">¿Qué eres? <span className="text-text-secondary/40 text-sm font-normal">(opcional)</span></h1>
            <p className="text-sm text-text-secondary/70">Nos ayuda a entender qué videos harás.</p>
            <div className="grid grid-cols-2 gap-2">
              {PERSONAS.map(([key, label]) => (
                <Chip key={key} active={persona === key} onClick={() => setPersona(persona === key ? null : key)}>{label}</Chip>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-text-primary">¿Cómo te enteraste de AnimaFlow? <span className="text-text-secondary/40 text-sm font-normal">(opcional)</span></h1>
            <div className="grid grid-cols-2 gap-2">
              {SOURCES.map(([key, label]) => (
                <Chip key={key} active={referral === key} onClick={() => setReferral(referral === key ? null : key)}>{label}</Chip>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-text-primary">¿Para qué usarás la app? <span className="text-text-secondary/40 text-sm font-normal">(opcional)</span></h1>
            <textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              rows={4}
              placeholder="Ej: videos cortos para redes, anuncios, contenido educativo…"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-text-primary text-sm resize-none"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-text-primary">Cambia tu contraseña <span className="text-text-secondary/40 text-sm font-normal">(opcional)</span></h1>
            <p className="text-sm text-text-secondary/70">
              Tu cuenta fue creada por un administrador. Puedes poner tu propia contraseña ahora o hacerlo luego en Ajustes.
            </p>
            <input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} placeholder="Contraseña actual"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-text-primary text-sm" />
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Nueva contraseña (mín. 8)"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-text-primary text-sm" />
            <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirmar nueva contraseña"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-text-primary text-sm" />
          </div>
        )}

        {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-2 mt-4">{error}</p>}

        {/* Controles */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="flex items-center gap-1.5 text-sm text-text-secondary/60 hover:text-text-primary disabled:opacity-0 transition-colors"
          >
            <ArrowLeft size={15} /> Atrás
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && !isLast && (
              <button onClick={next} disabled={saving} className="text-sm text-text-secondary/60 hover:text-text-primary px-3 py-2">
                Omitir
              </button>
            )}
            <button
              onClick={next}
              disabled={saving}
              className="flex items-center gap-2 bg-mint-precision text-deep-slate font-semibold px-5 py-2.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : isLast ? <Check size={16} /> : <ArrowRight size={16} />}
              {isLast ? (saving ? 'Guardando…' : 'Empezar') : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
