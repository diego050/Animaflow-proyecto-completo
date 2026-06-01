import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette } from 'lucide-react';
import { Player } from '@remotion/player';
import { COMPONENT_REGISTRY } from '../../remotion/registry';

const STYLE_SYSTEM_EXAMPLES = [
  {
    id: 'card-padding-border',
    name: 'Card con Padding y Borde',
    icon: '🃏',
    spec: {
      type: 'group',
      layout: 'flex',
      direction: 'column',
      gap: 12,
      style: {
        padding: 24,
        borderWidth: 2,
        borderColor: '#334155',
        borderRadius: 12,
        boxShadow: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.3)' }
      },
      children: [
        { type: 'text', text: 'Título de la Card', fontSize: 24, fontWeight: 700 },
        { type: 'text', text: 'Descripción con padding interno', fontSize: 16 }
      ]
    }
  },
  {
    id: 'badge-asymmetric-padding',
    name: 'Badge con Padding Asimétrico',
    icon: '🏷️',
    spec: {
      type: 'text',
      text: 'NUEVO',
      style: {
        padding: [6, 12, 6, 12],
        borderRadius: 999,
        backgroundColor: '#00FFAB',
        color: '#0F172A',
        fontWeight: 700
      }
    }
  },
  {
    id: 'group-flex-padding',
    name: 'Grupo con Flex y Padding',
    icon: '📦',
    spec: {
      type: 'group',
      layout: 'flex',
      direction: 'row',
      justifyContent: 'space-between',
      gap: 16,
      style: {
        padding: [20, 32, 20, 32],
        margin: 40,
        backgroundColor: '#1E293B',
        borderRadius: 16
      },
      children: [
        { type: 'text', text: 'Item 1', fontSize: 18 },
        { type: 'text', text: 'Item 2', fontSize: 18 },
        { type: 'text', text: 'Item 3', fontSize: 18 }
      ]
    }
  },
  {
    id: 'image-filters',
    name: 'Imagen con Filtros',
    icon: '🖼️',
    spec: {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800',
      style: {
        borderRadius: 16,
        opacity: 0.8,
        blur: 2,
        saturate: 1.2,
        boxShadow: { x: 0, y: 8, blur: 24, spread: 0, color: 'rgba(0,0,0,0.4)' }
      }
    }
  },
  {
    id: 'text-shadow-decoration',
    name: 'Texto con Sombra y Decoración',
    icon: '✨',
    spec: {
      type: 'text',
      text: 'Texto Importante',
      style: {
        textShadow: { x: 2, y: 2, blur: 4, color: 'rgba(0,0,0,0.5)' },
        textDecoration: 'underline',
        lineHeight: 1.5
      }
    }
  },
  // --- Video Style System Components ---
  {
    id: 'style-button',
    name: 'StyleButton (CTA)',
    icon: '🔘',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#1a0a2e', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleButton',
          text: 'Suscríbete Ahora',
          variant: 'primary',
          size: 'lg',
          icon: 'mdi:arrow-right',
          iconPosition: 'right',
          x: 540,
          y: 960,
          entry: 'spring-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleButton',
          text: 'Ver Demo',
          variant: 'outline',
          size: 'md',
          x: 540,
          y: 1060,
          entry: 'spring-in',
          entryDelay: 1,
        },
      ],
    },
  },
  {
    id: 'style-card',
    name: 'StyleCard (Container)',
    icon: '📋',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleCard',
          title: 'Datos Increíbles',
          subtitle: 'El 73% de los usuarios prefieren video',
          variant: 'elevated',
          x: 540,
          y: 960,
          width: 400,
          entry: 'slide-up',
          entryDelay: 0.3,
          style: { padding: 32, borderRadius: 16, boxShadow: { x: 0, y: 8, blur: 32, spread: 0, color: 'rgba(0,0,0,0.4)' } },
        },
      ],
    },
  },
  {
    id: 'style-badge',
    name: 'StyleBadge (Label)',
    icon: '🏅',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#1a0a00', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'NUEVO',
          variant: 'success',
          size: 'lg',
          icon: 'mdi:sparkles',
          x: 540,
          y: 300,
          entry: 'spring-in',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: '73% OFF',
          variant: 'warning',
          size: 'md',
          x: 540,
          y: 400,
          entry: 'spring-in',
          entryDelay: 0.5,
        },
        {
          type: 'component',
          componentName: 'StyleBadge',
          text: 'LIMITADO',
          variant: 'error',
          size: 'sm',
          x: 540,
          y: 480,
          entry: 'spring-in',
          entryDelay: 0.8,
        },
      ],
    },
  },
  {
    id: 'style-avatar',
    name: 'StyleAvatar (Icon-based)',
    icon: '👤',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account',
          name: 'María García',
          subtitle: '⭐⭐⭐⭐⭐ 4.9',
          size: 'lg',
          variant: 'ring',
          showBadge: true,
          badgeText: 'Nuevo',
          x: 540,
          y: 500,
          entry: 'spring-in',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account-tie',
          name: 'Carlos López',
          subtitle: 'CEO @ TechCorp',
          size: 'md',
          variant: 'gradient',
          x: 300,
          y: 800,
          entry: 'spring-in',
          entryDelay: 0.6,
        },
        {
          type: 'component',
          componentName: 'StyleAvatar',
          icon: 'mdi:account-star',
          name: 'Ana Martínez',
          subtitle: 'Diseñadora UX',
          size: 'sm',
          variant: 'solid',
          x: 780,
          y: 800,
          entry: 'spring-in',
          entryDelay: 0.9,
        },
      ],
    },
  },
  {
    id: 'style-progress',
    name: 'StyleProgressBar',
    icon: '📊',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleProgressBar',
          value: 73,
          max: 100,
          variant: 'linear',
          color: '#00FFAB',
          showLabel: true,
          labelPosition: 'top',
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.3,
        },
        {
          type: 'component',
          componentName: 'StyleProgressBar',
          value: 85,
          max: 100,
          variant: 'circular',
          color: '#FF8C00',
          size: 100,
          strokeWidth: 8,
          showLabel: true,
          labelPosition: 'bottom',
          x: 540,
          y: 900,
          entry: 'fade-in',
          entryDelay: 0.6,
        },
      ],
    },
  },
  {
    id: 'style-divider',
    name: 'StyleDivider',
    icon: '➖',
    spec: {
      version: '1.0',
      background: { type: 'radial-gradient', colors: ['#0a1628', '#0f172a'], angle: 0 },
      layers: [
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'horizontal',
          style: 'solid',
          color: '#334155',
          thickness: 2,
          width: 400,
          x: 540,
          y: 400,
          entry: 'fade-in',
          entryDelay: 0.2,
        },
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'horizontal',
          style: 'dashed',
          color: '#00FFAB',
          thickness: 1,
          width: 400,
          x: 540,
          y: 600,
          entry: 'fade-in',
          entryDelay: 0.4,
        },
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'horizontal',
          style: 'gradient',
          color: '#FF8C00',
          thickness: 3,
          width: 400,
          x: 540,
          y: 800,
          entry: 'fade-in',
          entryDelay: 0.6,
        },
        {
          type: 'component',
          componentName: 'StyleDivider',
          orientation: 'vertical',
          style: 'solid',
          color: '#334155',
          thickness: 1,
          height: 200,
          x: 540,
          y: 1100,
          entry: 'fade-in',
          entryDelay: 0.8,
        },
      ],
    },
  }
];

export function AnimationPlayground() {
  const { componentName } = useParams();
  const navigate = useNavigate();

  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [showStyleExamples, setShowStyleExamples] = useState(false);

  const selectedExample = useMemo(
    () => STYLE_SYSTEM_EXAMPLES.find((e) => e.id === activeExample),
    [activeExample]
  );

  // Find the component dynamically
  const Component = componentName ? COMPONENT_REGISTRY[componentName] : null;

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

        {/* Style System Examples Toggle */}
        <div className="border-t border-border-tech pt-4">
          <button
            onClick={() => setShowStyleExamples(!showStyleExamples)}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-text-primary hover:text-mint-precision transition-colors"
          >
            <Palette size={16} />
            Sistema de Estilos
            <span className="ml-auto text-xs text-text-secondary">
              {showStyleExamples ? '▼' : '▶'}
            </span>
          </button>

          {showStyleExamples && (
            <div className="mt-3 space-y-2">
              {STYLE_SYSTEM_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  onClick={() => setActiveExample(example.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeExample === example.id
                      ? 'bg-mint-precision/10 border border-mint-precision/30 text-mint-precision'
                      : 'bg-surface-lowest border border-border-tech hover:border-mint-precision/30 text-text-primary'
                  }`}
                >
                  <span className="mr-2">{example.icon}</span>
                  {example.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Example Info */}
        {selectedExample && (
          <div className="border-t border-border-tech pt-4">
            <h3 className="text-xs font-medium text-text-secondary mb-2">Ejemplo Activo</h3>
            <div className="bg-surface-lowest border border-border-tech rounded-lg p-3">
              <p className="text-sm text-text-primary font-medium">{selectedExample.name}</p>
              <pre className="mt-2 text-xs text-text-secondary/70 overflow-x-auto font-mono">
                {JSON.stringify(selectedExample.spec, null, 2).substring(0, 300)}...
              </pre>
            </div>
          </div>
        )}

        {!showStyleExamples && !selectedExample && (
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
        )}
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
