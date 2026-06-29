import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { useJobsStore } from '../../store/useJobsStore';
import { useToastStore } from '../../store/useToastStore';
import { History, RotateCcw, Loader2 } from 'lucide-react';

interface Version {
  id: string;
  created_at: string | null;
  source: string;
  status: string | null;
  is_current: boolean;
}

const sourceLabel = (s: string) =>
  s === 'pipeline' ? 'Original' : s === 'edit' ? 'Edición' : s === 'regenerate' ? 'Variación' : s;

const fmtTime = (s: string | null) =>
  s ? new Date(s).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

/** Historial de versiones (checkpoints) de UNA escena code-gen, con botón restaurar. */
export function SceneVersionHistory({
  jobId,
  sceneIndex,
  refreshKey = 0,
}: {
  jobId: string;
  sceneIndex: number;
  refreshKey?: number;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ versions: Version[] }>(`/api/jobs/${jobId}/scenes/${sceneIndex}/history`);
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, sceneIndex]);

  useEffect(() => {
    load();
    // refreshKey cambia tras cada edición del asistente → recarga aunque la escena sea la misma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshKey]);

  const revert = async (id: string) => {
    setReverting(id);
    try {
      await useJobsStore.getState().revertSceneCode(jobId, sceneIndex, id);
      addToast('success', 'Versión restaurada');
      await load();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'No se pudo restaurar');
    } finally {
      setReverting(null);
    }
  };

  return (
    <div className="border-t border-border-tech pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <History size={13} /> Historial — Escena {sceneIndex + 1}
        </span>
        <button onClick={load} className="text-[11px] text-text-secondary/50 hover:text-mint-precision">
          Actualizar
        </button>
      </div>
      {loading && versions.length === 0 ? (
        <p className="text-[11px] text-text-secondary/40">Cargando…</p>
      ) : versions.length === 0 ? (
        <p className="text-[11px] text-text-secondary/40">Sin versiones todavía (genera o edita la escena).</p>
      ) : (
        <ul className="space-y-1 max-h-44 overflow-auto">
          {versions.map((v) => (
            <li
              key={v.id}
              className={`flex items-center justify-between text-[11px] px-2 py-1.5 rounded ${
                v.is_current ? 'bg-mint-precision/10 border border-mint-precision/30' : 'hover:bg-surface-high'
              }`}
            >
              <span className="text-text-secondary/80">
                {sourceLabel(v.source)} · {fmtTime(v.created_at)}{' '}
                {v.is_current && <span className="text-mint-precision">(actual)</span>}
              </span>
              {!v.is_current && (
                <button
                  onClick={() => revert(v.id)}
                  disabled={reverting === v.id}
                  className="flex items-center gap-1 text-mint-precision hover:underline disabled:opacity-50"
                >
                  {reverting === v.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                  Restaurar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
