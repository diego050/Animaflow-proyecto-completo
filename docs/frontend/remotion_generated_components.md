# Frontend: Componentes Remotion Generados Dinámicamente

- **Fecha:** 2026-05-11
- **Directorio:** `frontend/src/remotion/generated/`
- **Relacionado:** ADR-004, backend/pipeline_narrative_animation.md

---

## Estructura de archivos generados

```
frontend/src/remotion/generated/
├── Scene_{job_id}_0.tsx     ← componente escena 1
├── Scene_{job_id}_1.tsx     ← componente escena 2
├── Scene_{job_id}_2.tsx     ← componente escena 3
└── index.ts                 ← re-exporta todos los módulos generados
```

### `index.ts` (generado automáticamente)
```typescript
import * as SceneMod_0 from './Scene_abc123_0';
import * as SceneMod_1 from './Scene_abc123_1';

export const generatedModules: Record<string, any> = {
  'Scene_abc123_0': SceneMod_0,
  'Scene_abc123_1': SceneMod_1,
};
```

---

## Anatomía de un componente generado

Cada `Scene_{job_id}_{i}.tsx` sigue esta estructura de 4 capas:

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import React from 'react';

export const SceneComponent = ({ text, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ── Animaciones calculadas ──────────────────────
    const scaleIn = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });
    const rotateIn = interpolate(spring({...}), [0,1], [-15, 0]);
    const glowOpacity = interpolate(frame, [0, 20], [0, 0.18], {...});
    const textOpacity = interpolate(frame, [25, 50], [0, 1], {...});
    const textY = interpolate(frame, [25, 50], [40, 0], {...});

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* CAPA 1: Fondo radial-gradient */}
            <div style={{ position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 40%, #1a0a00, #0a0a0a)' }} />

            {/* CAPA 2: Aura/Glow */}
            <div style={{ position: 'absolute', width: 400, height: 400,
                backgroundColor: '#f59e0b', opacity: glowOpacity,
                filter: 'blur(80px)', borderRadius: '50%' }} />

            {/* CAPA 3: Objeto SVG principal (250-400px, detallado) */}
            <svg width="320" height="200" viewBox="0 0 320 200"
                style={{ transform: `scale(${scaleIn}) rotate(${rotateIn}deg)`, zIndex: 5 }}>
                <defs>
                    <linearGradient id="chocGrad" ...>...</linearGradient>
                </defs>
                {/* 5-8 elementos SVG detallados */}
            </svg>

            {/* CAPA 4: Texto */}
            <div style={{ position: 'absolute', bottom: '12%', zIndex: 10,
                opacity: textOpacity, transform: `translateY(${textY}px)` }}>
                <h1 style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-2px',
                    textTransform: 'uppercase', textShadow: '0 0 40px rgba(245,158,11,0.5)' }}>
                    {text}
                </h1>
            </div>
        </div>
    );
};
```

---

## Integración con el Remotion Player

El player en `App.tsx` carga los módulos dinámicamente:

```typescript
// El spec.json retorna el campo "type": "Scene_jobId_0"
// El frontend busca el módulo en generatedModules y lo pasa al player
const componentModule = generatedModules[scene.type];
const Component = componentModule?.SceneComponent ?? FadeText;
```

**Importante:** Si `type` es `"FadeText"` (fallback), se usa el componente estático predefinido.

---

## Debugging de componentes generados

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en negro | El TSX tiene error de compilación | Revisar `Scene_{job_id}_{i}.tsx` en `/generated/` |
| Objeto muy pequeño | LLM ignoró tamaño mínimo | Aumentar énfasis en el prompt o regenerar la escena |
| Fondo negro puro | LLM no usó gradient | Verificar que el prompt_header contiene la restricción de fondo |
| Texto no aparece | frame de entrada demasiado alto | El LLM puso `interpolate(frame, [80, 100], ...)` — revisar el TSX |
| `SceneComponent is not exported` | `index.ts` desactualizado | El backend debe haber corrido `write_index_ts()` tras generar todos los TSX |

---

## Errores Comunes y Soluciones (Sesión 5 - 13 Mayo 2026)

### Errores Críticos Resueltos

| Error | Causa | Solución |
|-------|-------|----------|
| `easing is not a function` | Gemini genera `easing` en minúscula | Post-procesamiento corrige a `Easing` automáticamente |
| `inputRange/outputRange mismatch` | Diferente longitud de arrays | `fix_interpolate_mismatch()` corrige automáticamente |
| `r: A negative value is not valid` | `spring()` retorna negativos | `wrap_radius_with_math_max()` envuelve con `Math.max(0, ...)` |
| `Failed to resolve import` | `index.ts` referencia archivos eliminados | Limpiar `Scene_*.tsx` y regenerar job |

### Importancia de Limpiar Archivos Generados

Cuando se elimina un job o se regenera, es crucial:
1. Eliminar todos los `Scene_*.tsx` antiguos
2. Resetear `index.ts` a estado vacío
3. Generar un nuevo job (el backend reescribe todo)

**Comandos para limpiar:**
```bash
# Eliminar archivos TSX antiguos
rm frontend/src/remotion/generated/Scene_*.tsx

# Resetear index.ts
echo "export const generatedModules: Record<string, any> = {};" > frontend/src/remotion/generated/index.ts
```

**O en PowerShell (Windows):**
```powershell
Remove-Item frontend/src/remotion/generated/Scene_*.tsx -Force
Set-Content frontend/src/remotion/generated/index.ts "export const generatedModules: Record<string, any> = {};"
```

### Cómo el Post-Procesamiento Previene Errores

El backend aplica 6 reglas de validación automática antes de guardar el TSX:

1. **Corrección de Easing:** `easing.` → `Easing.` (regex)
2. **Import de Easing:** Asegura que `Easing` está en el import de remotion
3. **Import de React:** Asegura que `React` está importado
4. **Warning de Radio:** Detecta `r={}` sin `Math.max` y loguea warning
5. **Fix de Interpolate:** Corrige mismatches entre inputRange y outputRange
6. **Wrap de Radio:** Envuelve TODOS los `r={}` con `Math.max(0, ...)`

**Resultado:** 0 errores de runtime conocidos en TSX generado.

### Ejemplo de Corrección Automática

**Antes (generado por Gemini):**
```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

<circle r={100 * springScale} />
interpolate(frame, [0, 20], [0, 1, 0])  // ← MISMATCH: 2 inputs, 3 outputs
```

**Después (post-procesamiento):**
```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';

<circle r={Math.max(0, 100 * springScale)} />
interpolate(frame, [0, 10, 20], [0, 1, 0])  // ← CORREGIDO: 3 inputs, 3 outputs
```

### Documentación Relacionada
- **ADR-005:** `docs/adr/005-tsx-generation-fixes.md` (decisiones arquitectónicas)
- **Backend:** `docs/backend/estado_actual.md` (implementación de post-procesamiento)
