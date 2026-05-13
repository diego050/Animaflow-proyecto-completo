import { useState } from 'react';
import { PreviewPlayer } from './components/PreviewPlayer';
import { SceneEditor } from './components/SceneEditor';
import { Dashboard } from './components/Dashboard';
import type { TimelineSpec } from './types/spec';

const defaultSpec: TimelineSpec = {
  scenes: [
    {
      start_time_seconds: 0,
      duration_seconds: 6,
      text: "El motor generativo de AnimaFlow",
      type: "FadeText",
      media_query: "Slide in animado con tema oscuro",
      remotion_props: {
        backgroundColor: "#0f172a",
        textColor: "#38bdf8"
      },
      sfx: []
    }
  ]
};

export default function App() {
  const [view, setView] = useState<"dashboard" | "editor">("dashboard");
  const [inputText, setInputText] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [spec, setSpec] = useState<TimelineSpec>(defaultSpec);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const generateScriptIA = async () => {
    if (!scriptTopic.trim()) return;
    setGeneratingScript(true);
    setStatus("Generando guion con IA...");
    try {
      const res = await fetch("http://localhost:8000/api/jobs/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ info: scriptTopic })
      });
      const data = await res.json();
      if (data.script_text) {
         setInputText(data.script_text);
         setStatus("Guion generado exitosamente. Revísalo y presiona Generar Proyecto Visual.");
      } else {
         setStatus("Error al generar el guion.");
      }
    } catch (e) {
      setStatus("Error conectando con el backend.");
    } finally {
      setGeneratingScript(false);
    }
  };

  const generateVideo = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setVideoUrl(null);
    setStatus("Enviando trabajo a la cola...");
    try {
      const res = await fetch("http://localhost:8000/api/jobs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_text: inputText })
      });
      const data = await res.json();
      setJobId(data.job_id);
      pollJob(data.job_id);
    } catch (e) {
      setStatus("Error conectando con el backend");
      setLoading(false);
    }
  };

  const pollJob = async (currentJobId: string, isRendering = false) => {
    const statusMessages: Record<string, string> = {
      segmenting: "📝 Segmentando guion en escenas...",
      visuals_generating: "🎨 Generando prompts visuales con IA...",
      processing_scenes: "🎬 Procesando escenas (TTS + animaciones)...",
      completed: "✅ ¡Timeline Generada!",
      queued_render: "⏳ En cola para renderizado...",
      rendering: "🎥 Renderizando video MP4...",
      completed_video: "🎉 ¡Video Renderizado con Éxito!"
    };
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/jobs/${currentJobId}`);
        const data = await res.json();
        
        const displayStatus = statusMessages[data.status] || `Procesando: ${data.status}`;
        setStatus(displayStatus);
        
        if (data.status === "completed" && !isRendering) {
          setSpec(data.result_spec);
          setLoading(false);
          clearInterval(interval);
        } else if (data.status === "completed_video") {
          setVideoUrl(data.video_url);
          setLoading(false);
          clearInterval(interval);
        } else if (data.status.startsWith("failed")) {
          setStatus("❌ Error: " + data.status);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e) {
        clearInterval(interval);
        setStatus("❌ Error haciendo polling");
        setLoading(false);
      }
    }, 2000);
  };

  const triggerRender = async () => {
    if (!jobId) return;
    setLoading(true);
    setVideoUrl(null);
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/render`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.status === "queued_render") {
         pollJob(jobId, true);
      } else {
         setStatus("Error al encolar el renderizado");
         setLoading(false);
      }
    } catch (e) {
      setStatus("Error conectando con el backend para renderizar");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-12 text-center relative">
        {view === "editor" && (
           <button 
             onClick={() => setView("dashboard")} 
             className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center gap-2 font-semibold transition-colors"
           >
             ← Volver
           </button>
        )}
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          AnimaFlow Auto-Director
        </h1>
        <p className="text-slate-400 mt-2">Escribe tu guion y deja que la IA organice las escenas y paletas visuales</p>
      </header>
      
      {view === "dashboard" ? (
        <Dashboard 
          onCreateNew={() => {
            setJobId(null);
            setSpec(defaultSpec);
            setInputText("");
            setVideoUrl(null);
            setStatus("");
            setView("editor");
          }}
          onSelectJob={(id, loadedSpec, loadedStatus, loadedVideoUrl, loadedScriptText) => {
            setJobId(id);
            if (loadedSpec) setSpec(loadedSpec);
            setStatus(loadedStatus);
            setVideoUrl(loadedVideoUrl);
            setInputText(loadedScriptText);
            setView("editor");
          }}
        />
      ) : (
        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold">Paso Opcional: ¿No tienes guion? Deja que la IA lo cree</h2>
            <p className="text-sm text-slate-400">Describe brevemente tu idea, producto o la información clave.</p>
            <textarea
              className="w-full h-24 bg-slate-900 border border-slate-700 text-slate-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              value={scriptTopic}
              onChange={(e) => setScriptTopic(e.target.value)}
              placeholder="Ej: Somos una plataforma SaaS que ayuda a optimizar las rutas de logística..."
            />
            <button 
              onClick={generateScriptIA}
              disabled={generatingScript || !scriptTopic.trim()}
              className={`py-2 px-6 rounded-lg font-bold self-start transition-all ${generatingScript || !scriptTopic.trim() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
            >
              {generatingScript ? "Escribiendo..." : "Generar Guion Mágico ✨"}
            </button>
          </div>
          
          <hr className="border-slate-800 my-2" />
          
          <h2 className="text-xl font-bold">1. Ingresa o revisa tu guion principal</h2>
          <textarea
            className="w-full h-40 bg-slate-900 border border-slate-700 text-slate-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe varias oraciones aquí o usa la IA de arriba para generarlas..."
          />
          <button 
            onClick={generateVideo}
            disabled={loading}
            className={`py-3 px-6 rounded-lg font-bold transition-all ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'}`}
          >
            {loading ? (status.includes("Renderizando") ? status : "Generando...") : "Generar Proyecto Visual"}
          </button>
          
          {jobId && status !== "Enviando trabajo a la cola..." && status !== "Procesando con Gemini..." && (
             <SceneEditor 
                jobId={jobId} 
                spec={spec} 
                onSpecUpdated={(newSpec) => setSpec(newSpec)} 
             />
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">2. Preview del Director</h2>
          <PreviewPlayer spec={spec} />
          {loading && <p className="mt-4 text-emerald-400 animate-pulse">{status}</p>}

          {!loading && jobId && !videoUrl && (status.includes("Timeline") || status.includes("completed")) && (
            <button 
              onClick={triggerRender}
              className="mt-6 py-3 px-8 rounded-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/0000.svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar a MP4 Final
            </button>
          )}

          {videoUrl && (
            <div className="mt-6 p-6 bg-slate-900/80 border border-emerald-500/30 rounded-xl flex flex-col items-center gap-3 w-full max-w-sm">
              <span className="text-emerald-400 font-bold">¡Renderización Completada!</span>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noreferrer"
                download
                className="w-full py-3 text-center rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition-all"
              >
                📥 Descargar MP4
              </a>
            </div>
          )}

          {jobId && (status.includes("Timeline") || status.includes("completed")) && (
            <div className="mt-6 flex flex-col gap-3 w-full max-w-sm">
              <p className="text-slate-400 text-sm text-center">Exportar proyecto:</p>
              <button
                onClick={async () => {
                  setDownloading("ae");
                  try {
                    const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/export/after-effects`);
                    if (!res.ok) throw new Error("Error al exportar");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `animaflow_${jobId}_ae.zip`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    alert("Error al descargar After Effects: " + e);
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading === "ae"}
                className={`w-full py-3 px-6 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${downloading === "ae" ? 'bg-purple-600 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/30'}`}
              >
                <svg xmlns="http://www.w3.org/2000.svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {downloading === "ae" ? "⏳ Descargando After Effects..." : "🎬 Descargar After Effects (.zip)"}
              </button>
              <button
                onClick={async () => {
                  setDownloading("spec");
                  try {
                    const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/export/spec-json`);
                    if (!res.ok) throw new Error("Error al exportar");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `animaflow_${jobId}_spec.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    alert("Error al descargar spec.json: " + e);
                  } finally {
                    setDownloading(null);
                  }
                }}
                disabled={downloading === "spec"}
                className={`w-full py-3 px-6 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${downloading === "spec" ? 'bg-slate-600 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-500 hover:to-gray-500 shadow-slate-500/30'}`}
              >
                <svg xmlns="http://www.w3.org/2000.svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {downloading === "spec" ? "⏳ Descargando spec.json..." : "📋 Descargar spec.json"}
              </button>
            </div>
          )}
          </div>
        </main>
      )}
    </div>
  );
}
