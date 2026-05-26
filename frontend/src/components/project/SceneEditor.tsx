import { useState, useCallback } from 'react';
import { Edit3, MessageSquare, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Spec } from '../../types/spec';
import { ManualPanel } from './SceneEditor/ManualPanel';
import { ChatPanel } from './SceneEditor/ChatPanel';
import { editScene } from '../../api/sceneEdit';
import { useToastStore } from '../../store/useToastStore';

interface SceneEditorProps {
  scene: Spec;
  sceneIndex: number;
  jobId: string;
  onSpecChange: (newScene: Spec) => void;
}

type EditorMode = 'manual' | 'chat';

export function SceneEditor({
  scene,
  sceneIndex,
  jobId,
  onSpecChange,
}: SceneEditorProps) {
  const [mode, setMode] = useState<EditorMode>('chat');
  const [loading, setLoading] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { addToast } = useToastStore();

  const handleManualEdit = useCallback(
    async (changes: Array<{ field_path: string; value: unknown }>) => {
      setLoading(true);
      setWarnings([]);
      try {
        const response = await editScene(jobId, sceneIndex, {
          mode: 'manual',
          changes,
        });
        onSpecChange(response.updated_scene as unknown as Spec);
        setLastExplanation(response.explanation);
        setWarnings(response.warnings);
        addToast('success', response.explanation);
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : 'Error editing scene',
        );
      } finally {
        setLoading(false);
      }
    },
    [jobId, sceneIndex, onSpecChange, addToast],
  );

  const handleChatEdit = useCallback(
    async (prompt: string) => {
      setLoading(true);
      setWarnings([]);
      try {
        const response = await editScene(jobId, sceneIndex, {
          mode: 'conversational',
          prompt,
        });
        onSpecChange(response.updated_scene as unknown as Spec);
        setLastExplanation(response.explanation);
        setWarnings(response.warnings);
        addToast('success', response.explanation);
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : 'Error editing scene',
        );
      } finally {
        setLoading(false);
      }
    },
    [jobId, sceneIndex, onSpecChange, addToast],
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 border-b border-border-tech/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Edit3 size={14} className="text-mint-precision" />
            Editor &mdash; Escena {sceneIndex + 1}
          </h3>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-lowest rounded-lg p-1">
          <button
            onClick={() => setMode('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === 'chat'
                ? 'bg-mint-precision/10 text-mint-precision'
                : 'text-text-secondary/60 hover:text-text-primary'
            }`}
          >
            <MessageSquare size={12} />
            Chat
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-mint-precision/10 text-mint-precision'
                : 'text-text-secondary/60 hover:text-text-primary'
            }`}
          >
            <Edit3 size={12} />
            Manual
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-surface-lowest/80 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-mint-precision" />
            <p className="text-xs text-text-secondary">
              Aplicando cambios...
            </p>
          </div>
        </div>
      )}

      {/* Editor panels */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'chat' ? (
          <ChatPanel onSend={handleChatEdit} disabled={loading} />
        ) : (
          <ManualPanel
            scene={scene}
            onApply={handleManualEdit}
            disabled={loading}
          />
        )}
      </div>

      {/* Last action feedback */}
      {lastExplanation && (
        <div className="p-3 border-t border-border-tech/50 bg-surface-lowest">
          <div className="flex items-start gap-2">
            <CheckCircle
              size={14}
              className="text-mint-precision mt-0.5 shrink-0"
            />
            <p className="text-xs text-text-secondary">{lastExplanation}</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 border-t border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={14}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400/80">
                  {w}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
