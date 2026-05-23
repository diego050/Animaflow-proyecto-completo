import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Player } from '@remotion/player';
import * as Components from '../../remotion/components';

export function AnimationPlayground() {
  const { componentName } = useParams();
  const navigate = useNavigate();

  // Find the component dynamically
  const Component = componentName ? (Components as any)[componentName] : null;

  // Default editable props based on common universal props
  const [props, setProps] = useState({
    text: '¿Por qué los mejores empleos piden siempre este software?',
    color: '#38bdf8',
    bgColor: '#0f172a',
    textColor: '#f8fafc',
    fontSize: 40,
    width: 900,
    delay: 0,
    theme: 'default'
  });

  const handlePropChange = (key: string, value: string | number) => {
    setProps(p => ({ ...p, [key]: value }));
  };

  if (!Component) {
    return <div className="p-8 text-white">Componente no encontrado.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 bg-surface-container border-r border-border-tech p-6 overflow-y-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/admin/animations')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium mb-4"
          >
            <ArrowLeft size={16} />
            Volver a la galería
          </button>
          <h2 className="text-xl font-display font-bold text-text-primary">{componentName}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Texto de Prueba</label>
            <textarea
              value={props.text}
              onChange={(e) => handlePropChange('text', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-3 text-sm text-text-primary"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Color Principal (Hex)</label>
            <input
              type="text"
              value={props.color}
              onChange={(e) => handlePropChange('color', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Color Fondo (Hex)</label>
            <input
              type="text"
              value={props.bgColor}
              onChange={(e) => handlePropChange('bgColor', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Color Texto (Hex)</label>
            <input
              type="text"
              value={props.textColor}
              onChange={(e) => handlePropChange('textColor', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Font Size (px)</label>
            <input
              type="number"
              value={props.fontSize}
              onChange={(e) => handlePropChange('fontSize', Number(e.target.value))}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Width (px)</label>
            <input
              type="number"
              value={props.width}
              onChange={(e) => handlePropChange('width', Number(e.target.value))}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-2 text-sm text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* Player Area */}
      <div className="flex-1 bg-surface-lowest p-8 flex flex-col items-center justify-center relative">
        <div className="bg-surface-container p-4 rounded-xl shadow-2xl border border-border-tech">
          <Player
            component={Component}
            inputProps={{...props, x: 540, y: 960}}
            durationInFrames={150} // 5 segundos
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            style={{
              width: '360px',
              height: '640px',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: props.bgColor
            }}
            controls
            autoPlay
            loop
          />
        </div>
        <p className="mt-4 text-xs text-text-secondary/60 text-center max-w-sm">
          Vista previa del componente en un canvas de 1080x1920 escalado a 360x640 para previsualización.
        </p>
      </div>
    </div>
  );
}
