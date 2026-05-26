import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Spec, AnimaLayer } from '../../../types/spec';
import { PropertyField } from './PropertyField';

interface ManualPanelProps {
  scene: Spec;
  onApply: (changes: Array<{ field_path: string; value: unknown }>) => Promise<void>;
  disabled: boolean;
}

interface PendingChange {
  field_path: string;
  value: unknown;
}

export function ManualPanel({ scene, onApply, disabled }: ManualPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['timing', 'background']),
  );

  const composer = scene.anima_composer;

  const handleChange = useCallback((fieldPath: string, value: unknown) => {
    setPendingChanges((prev) => {
      const existing = prev.findIndex((c) => c.field_path === fieldPath);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { field_path: fieldPath, value };
        return updated;
      }
      return [...prev, { field_path: fieldPath, value }];
    });
  }, []);

  const handleApply = async () => {
    if (pendingChanges.length === 0) return;
    await onApply(pendingChanges);
    setPendingChanges([]);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  if (!composer) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-text-secondary/50">
          No hay composicion visual para esta escena.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Timing section */}
      <Section
        title="Timing"
        expanded={isExpanded('timing')}
        onToggle={() => toggleSection('timing')}
      >
        <PropertyField
          label="Duracion"
          type="number"
          value={scene.duration_seconds ?? 0}
          onChange={(v) => handleChange('duration_seconds', v)}
          suffix="s"
          step={0.5}
          min={1}
          max={60}
        />
      </Section>

      {/* Background section */}
      <Section
        title="Fondo"
        expanded={isExpanded('background')}
        onToggle={() => toggleSection('background')}
      >
        <PropertyField
          label="Tipo"
          type="select"
          value={composer.background?.type ?? 'solid'}
          options={[
            { value: 'solid', label: 'Solido' },
            { value: 'linear-gradient', label: 'Lineal' },
            { value: 'radial-gradient', label: 'Radial' },
          ]}
          onChange={(v) => handleChange('anima_composer.background.type', v)}
        />
        {composer.background?.colors?.map((color: string, i: number) => (
          <PropertyField
            key={i}
            label={`Color ${i + 1}`}
            type="color"
            value={color}
            onChange={(v) =>
              handleChange(`anima_composer.background.colors.${i}`, v)
            }
          />
        ))}
      </Section>

      {/* Layers section */}
      {composer.layers?.map((layer: AnimaLayer, idx: number) => (
        <Section
          key={idx}
          title={`Capa ${idx + 1} (${layer.type})`}
          expanded={isExpanded(`layer-${idx}`)}
          onToggle={() => toggleSection(`layer-${idx}`)}
        >
          {/* Transform */}
          <SubSection title="Transformacion">
            <PropertyField
              label="X"
              type="number"
              value={typeof layer.x === 'number' ? layer.x : 0}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.x`, v)
              }
              min={0}
              max={1920}
            />
            <PropertyField
              label="Y"
              type="number"
              value={typeof layer.y === 'number' ? layer.y : 0}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.y`, v)
              }
              min={0}
              max={1080}
            />
            <PropertyField
              label="Escala"
              type="range"
              value={typeof layer.scale === 'number' ? layer.scale : 1}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.scale`, v)
              }
              min={0.1}
              max={3}
              step={0.1}
            />
            <PropertyField
              label="Rotacion"
              type="range"
              value={typeof layer.rotation === 'number' ? layer.rotation : 0}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.rotation`, v)
              }
              min={0}
              max={360}
              step={1}
              suffix="deg"
            />
            <PropertyField
              label="Opacidad"
              type="range"
              value={typeof layer.opacity === 'number' ? layer.opacity : 1}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.opacity`, v)
              }
              min={0}
              max={1}
              step={0.05}
            />
          </SubSection>

          {/* Appearance */}
          {(layer.fill !== undefined || layer.type === 'text') && (
            <SubSection title="Apariencia">
              {layer.fill !== undefined && (
                <PropertyField
                  label="Color"
                  type="color"
                  value={layer.fill}
                  onChange={(v) =>
                    handleChange(`anima_composer.layers.${idx}.fill`, v)
                  }
                />
              )}
              {layer.type === 'text' && (
                <>
                  <PropertyField
                    label="Tamano de texto"
                    type="number"
                    value={layer.fontSize ?? 64}
                    onChange={(v) =>
                      handleChange(
                        `anima_composer.layers.${idx}.fontSize`,
                        v,
                      )
                    }
                    min={24}
                    max={120}
                  />
                  <PropertyField
                    label="Peso"
                    type="select"
                    value={layer.fontWeight ?? 900}
                    options={[
                      { value: 400, label: 'Normal' },
                      { value: 600, label: 'Semi-bold' },
                      { value: 700, label: 'Bold' },
                      { value: 900, label: 'Black' },
                    ]}
                    onChange={(v) =>
                      handleChange(
                        `anima_composer.layers.${idx}.fontWeight`,
                        v,
                      )
                    }
                  />
                </>
              )}
            </SubSection>
          )}

          {/* Animations */}
          <SubSection title="Animaciones">
            <PropertyField
              label="Entrada"
              type="select"
              value={layer.entry ?? 'fade-in'}
              options={[
                { value: 'fade-in', label: 'Fade In' },
                { value: 'slide-up', label: 'Slide Up' },
                { value: 'slide-down', label: 'Slide Down' },
                { value: 'slide-left', label: 'Slide Left' },
                { value: 'slide-right', label: 'Slide Right' },
                { value: 'scale-in', label: 'Scale In' },
                { value: 'spring-in', label: 'Spring In' },
                { value: 'bounce-in', label: 'Bounce In' },
              ]}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.entry`, v)
              }
            />
            <PropertyField
              label="Salida"
              type="select"
              value={layer.exit ?? ''}
              options={[
                { value: '', label: 'Ninguna' },
                { value: 'fade-out', label: 'Fade Out' },
                { value: 'slide-up-out', label: 'Slide Up Out' },
                { value: 'slide-down-out', label: 'Slide Down Out' },
                { value: 'slide-left-out', label: 'Slide Left Out' },
                { value: 'slide-right-out', label: 'Slide Right Out' },
                { value: 'scale-out', label: 'Scale Out' },
                { value: 'spring-out', label: 'Spring Out' },
                { value: 'bounce-out', label: 'Bounce Out' },
              ]}
              onChange={(v) =>
                handleChange(
                  `anima_composer.layers.${idx}.exit`,
                  v === '' ? null : v,
                )
              }
            />
            <PropertyField
              label="Delay entrada"
              type="number"
              value={layer.entryDelay ?? 0}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.entryDelay`, v)
              }
              min={0}
              max={10}
              step={0.5}
              suffix="s"
            />
            <PropertyField
              label="Delay salida"
              type="number"
              value={layer.exitDelay ?? 0}
              onChange={(v) =>
                handleChange(`anima_composer.layers.${idx}.exitDelay`, v)
              }
              min={0}
              max={10}
              step={0.5}
              suffix="s"
            />
            <PropertyField
              label="Duracion entrada"
              type="number"
              value={layer.entryDuration ?? 30}
              onChange={(v) =>
                handleChange(
                  `anima_composer.layers.${idx}.entryDuration`,
                  v,
                )
              }
              min={10}
              max={90}
              step={5}
              suffix="frames"
            />
            <PropertyField
              label="Duracion salida"
              type="number"
              value={layer.exitDuration ?? 30}
              onChange={(v) =>
                handleChange(
                  `anima_composer.layers.${idx}.exitDuration`,
                  v,
                )
              }
              min={10}
              max={90}
              step={5}
              suffix="frames"
            />
          </SubSection>
        </Section>
      ))}

      {/* Apply button */}
      {pendingChanges.length > 0 && (
        <div className="sticky bottom-0 pt-3 bg-surface-container border-t border-border-tech/50 -mx-4 px-4 pb-4">
          <button
            onClick={handleApply}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-mint-precision text-deep-slate hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar {pendingChanges.length} cambio
            {pendingChanges.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// Section component
function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border-tech/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-lowest hover:bg-surface-high transition-colors"
      >
        <span className="text-xs font-semibold text-text-primary">{title}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-text-secondary/50" />
        ) : (
          <ChevronRight size={14} className="text-text-secondary/50" />
        )}
      </button>
      {expanded && (
        <div className="p-3 space-y-2 bg-surface-container">{children}</div>
      )}
    </div>
  );
}

// SubSection component
function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
        {title}
      </p>
      {children}
    </div>
  );
}
