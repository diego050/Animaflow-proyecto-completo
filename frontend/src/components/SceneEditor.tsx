import React, { useState } from 'react';
import { useToastStore } from '../store/useToastStore';
import type { TimelineSpec } from '../types/spec';

interface SceneEditorProps {
  jobId: string;
  spec: TimelineSpec;
  onSpecUpdated: (newSpec: TimelineSpec) => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ jobId, spec, onSpecUpdated }) => {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editMedia, setEditMedia] = useState("");
  const { addToast } = useToastStore();

  const startEdit = (index: number, currentText: string, currentMedia: string) => {
    setEditingIndex(index);
    setEditText(currentText);
    setEditMedia(currentMedia);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const handleRegenerate = async (index: number) => {
    const currentScene = spec.scenes[index];
    if (editText === currentScene.text && editMedia === currentScene.media_query) {
      setEditingIndex(null);
      return;
    }

    setLoadingIndex(index);
    setEditingIndex(null);
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/scenes/${index}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_query: editMedia, text: editText })
      });
      const data = await res.json();
      if (data.status && !data.status.includes("failed") && data.result_spec) {
        onSpecUpdated(data.result_spec);
        addToast('success', 'Escena regenerada correctamente');
      } else {
        addToast('error', 'Error regenerando la escena');
      }
    } catch (e) {
      addToast('error', 'Error de conexión al regenerar la escena');
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <h2 className="text-xl font-bold mb-2">Editor Interactivo de Escenas</h2>
      <p className="text-slate-400 text-sm mb-4">Haz clic en editar para cambiar el texto o el estilo de una escena específica. La IA re-programará solo esa parte.</p>
      
      <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #0f172a' }}>
        {spec?.scenes?.map((scene, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:border-slate-500 transition-colors">
            <div className="flex justify-between items-start">
              <span className="bg-blue-900/50 text-blue-300 text-xs font-bold px-2 py-1 rounded">Escena {idx + 1}</span>
              <span className="text-slate-400 text-xs">{scene.duration_seconds}s</span>
            </div>
            
            {editingIndex === idx ? (
               <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Texto a Mostrar y Narrar (TTS)</label>
                    <textarea 
                      value={editText} 
                      onChange={(e) => setEditText(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Prompt Visual (Motor Generativo)</label>
                    <textarea 
                      value={editMedia} 
                      onChange={(e) => setEditMedia(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-900/50 rounded p-2 text-sm text-emerald-400 focus:border-emerald-500 outline-none font-mono"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleRegenerate(idx)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded text-sm transition-colors">✓ Guardar y Regenerar</button>
                    <button onClick={cancelEdit} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors">Cancelar</button>
                  </div>
               </div>
            ) : (
               <>
                  <div>
                    <p className="text-slate-200 font-medium text-sm">"{scene.text}"</p>
                  </div>
                  
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <p className="text-emerald-400 font-mono text-xs whitespace-normal break-words">
                       {scene.media_query}
                    </p>
                  </div>
                  
                  <button
                    disabled={loadingIndex !== null}
                    onClick={() => startEdit(idx, scene.text, scene.media_query)}
                    className="mt-2 text-xs py-2 px-4 rounded bg-slate-800 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50"
                  >
                    {loadingIndex === idx ? "⏳ Re-programando con IA..." : "✏️ Editar y Regenerar"}
                  </button>
               </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
