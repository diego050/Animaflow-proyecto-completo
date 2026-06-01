import { useState } from 'react';
import { ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp, Plus, Trash2, Upload, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignTemplateManager } from './DesignTemplateManager';

interface WizardStepScriptProps {
  mode: 'own-script' | 'ai-generate' | 'animation-only';
  ownScriptMode: 'with-prompts' | 'text-only' | null;
  info: string;
  scenes: Array<{text: string; media_query: string; duration_seconds?: number}>;
  designMd: string;
  templateId: string;
  customPrompt: string;
  onOwnScriptModeChange: (mode: 'with-prompts' | 'text-only') => void;
  onInfoChange: (value: string) => void;
  onScenesChange: (scenes: Array<{text: string; media_query: string; duration_seconds?: number}>) => void;
  onDesignMdChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onCustomPromptChange: (value: string) => void;
  onContinue?: () => void;
  onGenerate?: () => void;
  loading?: boolean;
}

const TEMPLATES = [
  { id: 'viral_shorts', name: 'Viral Shorts', description: 'Cortos y pegajosos para TikTok/Reels' },
  { id: 'educational', name: 'Educativo', description: 'Contenido claro y estructurado' },
  { id: 'storytelling', name: 'Storytelling', description: 'Narrativa emocional' },
  { id: 'promotional', name: 'Promocional', description: 'Para promover productos' },
];

const sceneVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

export function WizardStepScript({
  mode,
  ownScriptMode,
  info,
  scenes,
  designMd,
  templateId,
  customPrompt,
  onOwnScriptModeChange,
  onInfoChange,
  onScenesChange,
  onDesignMdChange,
  onTemplateChange,
  onCustomPromptChange,
  onContinue,
  onGenerate,
  loading,
}: WizardStepScriptProps) {
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleAddScene = () => {
    onScenesChange([...scenes, { text: '', media_query: '', duration_seconds: 7 }]);
  };

  const handleSceneChange = (index: number, field: 'text' | 'media_query' | 'duration_seconds', value: string | number) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    onScenesChange(newScenes);
  };

  const handleRemoveScene = (index: number) => {
    if (scenes.length <= 1) return;
    const newScenes = [...scenes];
    newScenes.splice(index, 1);
    onScenesChange(newScenes);
    setDeletingIndex(null);
  };

  const handleDurationStep = (index: number, delta: number) => {
    const current = scenes[index].duration_seconds || 7;
    const newVal = Math.min(60, Math.max(1, current + delta));
    handleSceneChange(index, 'duration_seconds', newVal);
  };

  const renderCustomInstructions = () => (
    <div className="mt-4 border-t border-border-tech/50 pt-4">
      <button
        onClick={() => setShowCustomPrompt(!showCustomPrompt)}
        className="flex items-center gap-1 text-xs text-mint-precision hover:underline mb-2"
      >
        {showCustomPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showCustomPrompt ? 'Ocultar' : 'Personalizar'} instrucciones de IA
      </button>

      {showCustomPrompt && (
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-xs font-medium mb-1">Prompt de sistema (Opcional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="Escribe instrucciones personalizadas para la IA..."
              className="w-full bg-surface-container border border-border-tech rounded-lg p-3 text-sm text-text-primary mb-2"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Animation-only mode — storyboard cards
  // ---------------------------------------------------------------------------
  if (mode === 'animation-only') {
    return (
      <div className="space-y-5">
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Tus escenas (storyboard)
        </label>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {scenes.map((scene, idx) => (
              <motion.div
                key={idx}
                custom={idx}
                variants={sceneVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className="relative flex gap-3 items-start bg-surface-lowest border border-border-tech rounded-xl p-4 border-l-[3px] border-l-mint-precision/30"
              >
                {/* Scene number */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-mint-precision/10 text-mint-precision font-display font-bold text-sm">
                    {idx + 1}
                  </div>
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  {/* Duration stepper */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-secondary shrink-0">Duración:</label>
                    <div className="flex items-center bg-surface-container border border-border-tech rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleDurationStep(idx, -1)}
                        disabled={(scene.duration_seconds || 7) <= 1}
                        className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-mint-precision hover:bg-surface-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={scene.duration_seconds || 7}
                        onChange={(e) => handleSceneChange(idx, 'duration_seconds', Number(e.target.value) || 7)}
                        className="w-12 bg-transparent text-center text-sm text-text-primary font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                      />
                      <button
                        onClick={() => handleDurationStep(idx, 1)}
                        disabled={(scene.duration_seconds || 7) >= 60}
                        className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-mint-precision hover:bg-surface-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-text-secondary/60">segundos</span>
                  </div>

                  {/* Visual prompt textarea */}
                  <textarea
                    value={scene.media_query}
                    onChange={(e) => handleSceneChange(idx, 'media_query', e.target.value)}
                    placeholder="Describe la escena visualmente... (ej: Cinematic shot of a coffee cup on a wooden table, warm morning light, slow pan right)"
                    className="w-full h-20 bg-surface-container border border-border-tech rounded-lg p-3 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
                  />
                </div>

                {/* Delete button */}
                <div className="shrink-0 pt-1">
                  {scenes.length > 1 && (
                    deletingIndex === idx ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleRemoveScene(idx)}
                          className="px-2 py-1 rounded bg-error/20 text-error text-[10px] font-medium hover:bg-error/30 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeletingIndex(null)}
                          className="px-2 py-1 rounded bg-surface-high text-text-secondary text-[10px] font-medium hover:bg-surface-container transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingIndex(idx)}
                        className="p-2 text-text-secondary/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Eliminar escena"
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add scene button */}
        <button
          onClick={handleAddScene}
          className="w-full py-3 border-2 border-dashed border-border-tech text-text-secondary rounded-xl hover:border-mint-precision/40 hover:text-mint-precision hover:bg-mint-precision/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={16} />
          Agregar nueva escena
        </button>

        {/* Design.md section */}
        <div className="border-t border-border-tech/50 pt-4">
          <DesignTemplateManager value={designMd} onChange={onDesignMdChange} />
        </div>

        {renderCustomInstructions()}

        <button
          onClick={onContinue}
          disabled={scenes.length === 0 || scenes.some(s => !s.media_query.trim())}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            scenes.length > 0 && !scenes.some(s => !s.media_query.trim())
              ? 'bg-mint-precision text-deep-slate hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,171,0.25)] hover:-translate-y-0.5'
              : 'bg-surface-high text-text-secondary/40 cursor-not-allowed opacity-40'
          }`}
        >
          <ArrowRight size={16} />
          Crear Proyecto
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Own-script mode (text-only or with-prompts)
  // ---------------------------------------------------------------------------
  if (mode === 'own-script') {
    return (
      <div className="space-y-5">
        <div className="flex bg-surface-lowest border border-border-tech rounded-lg p-1">
          <button
            onClick={() => onOwnScriptModeChange('text-only')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              ownScriptMode === 'text-only' || !ownScriptMode
                ? 'bg-surface-elevated text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Solo texto
          </button>
          <button
            onClick={() => {
              onOwnScriptModeChange('with-prompts');
              if (scenes.length === 0) {
                onScenesChange([{ text: '', media_query: '', duration_seconds: 7 }]);
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              ownScriptMode === 'with-prompts'
                ? 'bg-surface-elevated text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Con prompts
          </button>
        </div>

        {(!ownScriptMode || ownScriptMode === 'text-only') ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-text-secondary text-sm font-medium">
                Tu guión
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  id="own-script-file-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      onInfoChange(info ? info + '\n\n' + text : text);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="own-script-file-upload"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated cursor-pointer transition-colors"
                >
                  <Upload size={14} />
                  Subir guión (.md, .txt)
                </label>
              </div>
            </div>
            <textarea
              value={info}
              onChange={(e) => onInfoChange(e.target.value)}
              placeholder="Pega o escribe tu guión aquí. La IA lo dividirá en escenas automáticamente..."
              className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-text-secondary/60">
                {info.trim() ? info.trim().split(/\s+/).length : 0} palabras
                {info.trim() ? ` (aprox. ${Math.round((info.trim().split(/\s+/).length) / 2.17)} seg)` : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Tus escenas (texto + prompt)
            </label>
            {scenes.map((scene, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-surface-lowest border border-border-tech p-3 rounded-lg">
                <span className="bg-surface-high text-text-secondary text-[10px] font-bold px-1.5 py-1 rounded shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={scene.text}
                    onChange={(e) => handleSceneChange(idx, 'text', e.target.value)}
                    placeholder="Texto de la escena..."
                    className="w-full h-20 bg-surface-container border border-border-tech rounded-md p-2 text-sm text-text-primary focus:border-mint-precision outline-none resize-none"
                  />
                  <textarea
                    value={scene.media_query}
                    onChange={(e) => handleSceneChange(idx, 'media_query', e.target.value)}
                    placeholder="Prompt visual de la escena (ej: Cinematic shot of a coffee cup)..."
                    className="w-full h-12 bg-surface-container border border-border-tech rounded-md p-2 text-xs text-text-secondary focus:border-mint-precision outline-none resize-none"
                  />
                </div>
                <button
                  onClick={() => handleRemoveScene(idx)}
                  className="p-1.5 text-text-secondary/50 hover:text-error hover:bg-error/10 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddScene}
              className="w-full py-2 border border-dashed border-border-tech text-text-secondary rounded-lg hover:border-mint-precision hover:text-mint-precision transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> Agregar escena
            </button>
          </div>
        )}

        {/* Design.md section */}
        <div className="border-t border-border-tech/50 pt-4">
          <DesignTemplateManager value={designMd} onChange={onDesignMdChange} />
        </div>

        {renderCustomInstructions()}

        <button
          onClick={onContinue}
          disabled={ownScriptMode === 'with-prompts' ? scenes.length === 0 || scenes.some(s => !s.text.trim()) : !info.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 ${
            (ownScriptMode === 'with-prompts' ? scenes.length > 0 && !scenes.some(s => !s.text.trim()) : info.trim())
              ? 'bg-mint-precision text-deep-slate hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,171,0.25)] hover:-translate-y-0.5'
              : 'bg-surface-high text-text-secondary/40 cursor-not-allowed opacity-40'
          }`}
        >
          <ArrowRight size={16} />
          Continuar
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AI generate mode
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Template selector */}
      <div>
        <label className="text-xs text-text-secondary/60 mb-2 block">Estilo de guión</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTemplateChange(t.id)}
              className={`p-3 rounded-lg text-left text-sm transition-all ${
                templateId === t.id
                  ? 'bg-mint-precision/10 border border-mint-precision/40 text-mint-precision'
                  : 'bg-surface-lowest border border-border-tech text-text-secondary hover:text-text-primary'
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs opacity-70">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-text-secondary text-sm font-medium">
            Describe tu proyecto
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".txt,.md"
              className="hidden"
              id="info-file-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result as string;
                  onInfoChange(info ? info + '\n\n' + text : text);
                };
                reader.readAsText(file);
                e.target.value = ''; // Reset
              }}
            />
            <label
              htmlFor="info-file-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated cursor-pointer transition-colors"
            >
              <Upload size={14} />
              Subir info (.md, .txt)
            </label>
          </div>
        </div>
        <textarea
          value={info}
          onChange={(e) => onInfoChange(e.target.value)}
          placeholder="Ej: Un video promocional para mi tienda de ropa, enfocado en la colección de verano..."
          className="w-full h-32 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
        />
      </div>

      {/* Design.md section */}
      <div className="border-t border-border-tech/50 pt-4">
        <DesignTemplateManager value={designMd} onChange={onDesignMdChange} />
      </div>

      {renderCustomInstructions()}

      <button
        onClick={onGenerate}
        disabled={loading || !info.trim()}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 ${
          info.trim() && !loading
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,171,0.25)] hover:-translate-y-0.5'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed opacity-40'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generando guión...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generar Guión con IA
          </>
        )}
      </button>
    </div>
  );
}
