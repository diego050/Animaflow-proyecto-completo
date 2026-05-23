import { useEffect, useState } from 'react';
import {
  Check,
  X,
  Eye,
  Clock,
  AlertTriangle,
  ShoppingBag,
  Loader2,
  Gem,
  Copy,
  FileCode,
} from 'lucide-react';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import type { MarketplaceComponent } from '../../store/useMarketplaceStore';

// ─── TSX Template Generator ──────────────────────────────────────────────────

function generateNativeTsx(comp: MarketplaceComponent): string {
  const componentName = toPascalCase(comp.name || 'UnnamedComponent');
  const specJson = comp.content || '{}';
  const formattedSpec = formatJson(specJson);

  return `// Auto-generated native component from AnimaFlow Marketplace
// Source: "${comp.name}"${comp.description ? ` — ${comp.description}` : ''}
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { AnimaComposer } from '../composer/AnimaComposer';

// ─── Props ───────────────────────────────────────────────────────────────────
interface ${componentName}Props {
  /** Main text content to display */
  text?: string;
  /** Duration in frames (30fps base) */
  durationInFrames?: number;
  /** Additional class name for the container */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ${componentName}: React.FC<${componentName}Props> = ({
  text = '',
  durationInFrames = 150,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <AnimaComposer
        spec={${formattedSpec} as const}
        text={text}
        frame={frame}
        fps={fps}
        durationInFrames={durationInFrames}
      />
    </div>
  );
};

// ─── Default export for dynamic imports ──────────────────────────────────────
export default ${componentName};
`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function formatJson(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonStr;
  }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function AdminMarketplacePage() {
  const {
    pendingComponents,
    fetchPending,
    fetchComponentDetail,
    approveComponent,
    rejectComponent,
    loading,
  } = useMarketplaceStore();
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Nativizar state
  const [nativizeModal, setNativizeModal] = useState<{
    comp: MarketplaceComponent;
    tsxCode: string;
    componentName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveComponent(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await rejectComponent(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNativize = async (comp: MarketplaceComponent) => {
    setActionLoading(`nativize-${comp.id}`);
    try {
      // Fetch full detail to get the content/spec if not already loaded
      let component = comp;
      if (!comp.content) {
        const detail = await fetchComponentDetail(comp.id);
        if (detail) {
          component = detail;
        }
      }

      const componentName = toPascalCase(comp.name || 'UnnamedComponent');
      const tsxCode = generateNativeTsx(component);

      setNativizeModal({ comp: component, tsxCode, componentName });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyCode = async () => {
    if (!nativizeModal) return;
    try {
      await navigator.clipboard.writeText(nativizeModal.tsxCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text manually
      const textarea = document.getElementById('native-tsx-code') as HTMLTextAreaElement;
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag
            size={22}
            className="text-mint-precision"
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-white">
            Marketplace — Moderación
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          Revisa, aprueba o nativiza componentes generados por IA
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container border border-border-tech rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="text-yellow-400" size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {pendingComponents.length}
              </p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container border border-border-tech rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Gem className="text-purple-400" size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">—</p>
              <p className="text-xs text-gray-500">Por nativizar</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container border border-border-tech rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertTriangle className="text-orange-400" size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">—</p>
              <p className="text-xs text-gray-500">Reportados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de componentes pendientes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mint-precision" />
        </div>
      ) : pendingComponents.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto mb-4">
            <Check size={32} className="text-green-400" />
          </div>
          <p className="text-lg">No hay componentes pendientes</p>
          <p className="text-sm mt-2 text-gray-600">
            Todos los componentes han sido revisados
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingComponents.map((comp: MarketplaceComponent) => (
            <div
              key={comp.id}
              className="bg-surface-container border border-border-tech rounded-xl p-5 flex items-start gap-4"
            >
              {/* Mini preview */}
              <div className="w-20 h-36 bg-black rounded-lg shrink-0 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-600">
                    {comp.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2 gap-4">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {comp.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                      {comp.description || 'Sin descripción'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-lg font-medium whitespace-nowrap shrink-0">
                    Pendiente
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    Por:{' '}
                    <span className="text-gray-400">
                      {comp.author_name || 'Anónimo'}
                    </span>
                  </span>
                  <span>
                    Formato:{' '}
                    <span className="text-gray-400">
                      {comp.format?.toUpperCase() || 'JSON'}
                    </span>
                  </span>
                  <span>
                    Categoría:{' '}
                    <span className="text-gray-400">
                      {comp.category || 'Sin categoría'}
                    </span>
                  </span>
                  {comp.created_at && (
                    <span>
                      Enviado:{' '}
                      <span className="text-gray-400">
                        {new Date(comp.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleNativize(comp)}
                  disabled={
                    actionLoading === `nativize-${comp.id}` ||
                    actionLoading === comp.id
                  }
                  className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Nativizar — convertir a componente React nativo"
                >
                  {actionLoading === `nativize-${comp.id}` ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Gem size={18} />
                  )}
                </button>
                <button
                  onClick={() => handleApprove(comp.id)}
                  disabled={actionLoading === comp.id}
                  className="p-2.5 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Aprobar"
                >
                  {actionLoading === comp.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                </button>
                <button
                  onClick={() =>
                    setRejectModal({ id: comp.id, name: comp.name })
                  }
                  disabled={actionLoading === comp.id}
                  className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Rechazar"
                >
                  <X size={18} />
                </button>
                <button
                  className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-colors"
                  title="Vista previa"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Nativizar ── */}
      {nativizeModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setNativizeModal(null);
            setCopied(false);
          }}
        >
          <div
            className="bg-surface-container border border-border-tech rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border-tech">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Gem size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Nativizar: {nativizeModal.comp.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Componente React nativo generado a partir del spec JSON
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNativizeModal(null);
                  setCopied(false);
                }}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors shrink-0"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Code preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {nativizeModal.componentName}.tsx
                  </span>
                </div>
                <span className="text-xs text-gray-600 font-mono">
                  {nativizeModal.tsxCode.split('\n').length} líneas
                </span>
              </div>

              <div className="relative">
                <pre className="bg-black/60 border border-border-tech rounded-xl p-4 overflow-x-auto text-sm font-mono leading-relaxed max-h-[50vh] overflow-y-auto">
                  <code className="text-gray-300">{nativizeModal.tsxCode}</code>
                </pre>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-border-tech">
              <p className="text-xs text-gray-600 max-w-md">
                <span className="text-purple-400 font-medium">Sugerencia:</span>{' '}
                Copia este código y guárdalo en{' '}
                <code className="text-gray-400 bg-black/40 px-1 rounded">
                  frontend/src/remotion/generated/marketplace/{nativizeModal.componentName}.tsx
                </code>
              </p>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border-tech rounded-xl text-gray-300 hover:bg-surface-elevated transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-green-400" />
                      <span className="text-sm">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span className="text-sm">Copiar código</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setNativizeModal(null);
                    setCopied(false);
                  }}
                  className="px-4 py-2.5 bg-mint-precision text-deep-slate rounded-xl text-sm font-semibold hover:bg-mint-precision/90 transition-colors"
                >
                  Guardar como componente nativo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de rechazo ── */}
      {rejectModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setRejectModal(null);
            setRejectReason('');
          }}
        >
          <div
            className="bg-surface-container border border-border-tech rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              Rechazar componente
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              ¿Por qué rechazas{' '}
              <span className="text-white font-medium">
                "{rejectModal.name}"
              </span>
              ?
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razón del rechazo (opcional)"
              className="w-full px-4 py-3 bg-surface-elevated border border-border-tech rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-mint-precision mb-4 min-h-[100px] resize-none transition-colors"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2.5 border border-border-tech rounded-xl text-gray-300 hover:bg-surface-elevated transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === rejectModal.id ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  'Rechazar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
