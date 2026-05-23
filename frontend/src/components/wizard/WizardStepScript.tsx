import { useState } from 'react';
import { ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp, Plus, Trash2, Upload } from 'lucide-react';
import { DesignTemplateManager } from './DesignTemplateManager';

interface WizardStepScriptProps {
  mode: 'own-script' | 'ai-generate' | 'animation-only';
  ownScriptMode: 'with-prompts' | 'text-only' | null;
  info: string;
  scenes: Array<{text: string; media_query: string}>;
  designMd: string;
  templateId: string;
  customPrompt: string;
  onOwnScriptModeChange: (mode: 'with-prompts' | 'text-only') => void;
  onInfoChange: (value: string) => void;
  onScenesChange: (scenes: Array<{text: string; media_query: string}>) => void;
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

  const handleAddScene = () => {
    onScenesChange([...scenes, { text: '', media_query: '' }]);
  };

  const handleSceneChange = (index: number, field: 'text' | 'media_query' | 'duration_seconds', value: string | number) => {
    const newScenes = [...scenes];
    (newScenes[index] as any)[field] = value;
    onScenesChange(newScenes);
  };

  const handleRemoveScene = (index: number) => {
    const newScenes = [...scenes];
    newScenes.splice(index, 1);
    onScenesChange(newScenes);
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
          <DesignTemplateManager value={designMd} onChange={onDesignMdChange} />
        </div>
      )}
    </div>
  );

  if (mode === 'own-script' || mode === 'animation-only') {
    return (
      <div className="space-y-5">
        {mode !== 'animation-only' && (
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
                  onScenesChange([{ text: '', media_query: '', duration_seconds: 7 } as any]);
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
        )}

        {(!ownScriptMode || ownScriptMode === 'text-only') ? (
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Tu guión
            </label>
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
                  {mode !== 'animation-only' && (
                    <textarea
                      value={scene.text}
                      onChange={(e) => handleSceneChange(idx, 'text', e.target.value)}
                      placeholder="Texto de la escena..."
                      className="w-full h-20 bg-surface-container border border-border-tech rounded-md p-2 text-sm text-text-primary focus:border-mint-precision outline-none resize-none"
                    />
                  )}
                  {mode === 'animation-only' && (
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-text-secondary">Duración (s):</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={(scene as any).duration_seconds || 7}
                        onChange={(e) => handleSceneChange(idx, 'duration_seconds' as any, Number(e.target.value) || 7)}
                        className="bg-surface-container border border-border-tech rounded-md px-2 py-1 text-sm text-text-primary focus:border-mint-precision outline-none w-20"
                      />
                    </div>
                  )}
                  <textarea
                    value={scene.media_query}
                    onChange={(e) => handleSceneChange(idx, 'media_query', e.target.value)}
                    placeholder="Prompt visual de la escena (ej: Cinematic shot of a coffee cup)..."
                    className="w-full h-12 bg-surface-container border border-border-tech rounded-md p-2 text-xs text-text-secondary focus:border-mint-precision outline-none resize-none"
                  />
                </div>
                <button
                  onClick={() => handleRemoveScene(idx)}
                  className="p-1.5 text-text-secondary/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
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

        {renderCustomInstructions()}

        <button
          onClick={onContinue}
          disabled={ownScriptMode === 'with-prompts' ? scenes.length === 0 || scenes.some(s => mode !== 'animation-only' && !s.text.trim()) : !info.trim()}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all mt-4 ${
            (ownScriptMode === 'with-prompts' ? scenes.length > 0 && !scenes.some(s => mode !== 'animation-only' && !s.text.trim()) : info.trim())
              ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
              : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
          }`}
        >
          <ArrowRight size={16} />
          Continuar
        </button>
      </div>
    );
  }

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

      {renderCustomInstructions()}

      <button
        onClick={onGenerate}
        disabled={loading || !info.trim()}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
          info.trim() && !loading
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
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
