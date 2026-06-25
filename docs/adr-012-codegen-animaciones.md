# ADR-012 — Generación de animaciones por código (code-gen) en vez de orquestar componentes

**Estado:** En curso (prototipo + Fase 2 + Fase 3 construidos, detrás de flag) · **Fecha:** jun 2026
**Reemplaza progresivamente:** la orquestación del catálogo (ADR-010/011) para la generación visual de escenas.

---

## 1. Contexto y problema

El pipeline de video generaba las escenas **orquestando** un catálogo de ~163 componentes
Remotion pre-hechos: la IA elegía componentes de un DSL y rellenaba sus props (ver ADR-010/011,
`pipeline-componentes-y-reembed`). Problemas persistentes:

- **El centro de las escenas salía "texto plano".** Aun con modelos buenos, la IA caía a
  texto + un efecto de fondo tenue. El catálogo era una **jaula** que ahogaba al modelo.
- **El DSL de props es un dialecto raro** que la IA aprende mal → props basura, valores
  inválidos, componentes en el campo equivocado (Gemma metía componentes en `background`).
- **Caro:** el prompt con 70 componentes + props = **~37,000 tokens de entrada por escena**.

### El hallazgo que cambió el rumbo
Probando que la IA **escriba el componente Remotion con CÓDIGO** (React/TSX) en vez de orquestar:

- **Calidad muy superior** (visual protagonista real: nota musical SVG + ecualizador animado,
  tarjetas con springs/gradientes, anillos de progreso) — incluso con **gemini-3.1-flash-lite**.
- **~17× más barato:** ~2,000 tokens por animación (no se manda el catálogo de 37k).
- **La IA dibuja sus propios íconos** (SVG) — no necesitó iconify para una nota musical.

Conclusión: *"No era el modelo, era cómo lo pedíamos."* React es el idioma nativo del modelo;
el DSL de componentes lo limitaba.

---

## 2. Decisión

**Reemplazar la etapa de generación visual de escenas: de orquestación → code-gen.** La IA
escribe un componente Remotion autocontenido por escena. **Híbrido y gradual**, no un borrón:

- El catálogo se mantiene como **base segura / fallback**, detrás de un flag. Se **desactiva**,
  no se borra. Los 163 componentes y los iconos solo se jubilan cuando el code-gen esté probado
  en producción (los triviales primero).
- Se reemplaza **una etapa** del pipeline (la "estrategia de componentes"), no todo: TTS/Piper,
  timeline, audio, job, render — **se mantienen igual**.

### Principio que cambia respecto a ADR-010
ADR-010 prohibía que la IA "dibujara" (geometría basura con modelos débiles). **Con modelos
actuales + guardrails, generar código React es viable** y de hecho da mejor calidad. La regla
"la IA orquesta, no dibuja" evoluciona a: *"la IA genera código, con guardrails de determinismo
y seguridad, y revisión humana en el preview."*

---

## 3. Arquitectura

```
prompt/escena → [Generador LLM] → código TSX (string)
                      │
                      ▼
              [Validador estático]  (determinismo + seguridad)
                      │ válido
                      ▼
   ┌──────────────────┴───────────────────┐
   ▼                                       ▼
[Preview navegador]                  [Render mp4 servidor]
 sucrase + new Function               composición Remotion "CustomCode"
 → <Player> (Remotion)                → render-server (headless Chromium)
```

### Componentes
- **Generador** (`backend/app/modules/llm/animation_generator.py`): prompt estricto (reglas de
  determinismo + estilo + few-shot determinista) + 1 retry con feedback. **Modelo configurable**
  (sale de `resolve_llm_credentials` o override; NO hardcodeado). Sin `response_schema` (es
  código). Dos entradas: `generate_animation` (standalone, prototipo admin) y
  `generate_scene_animation` (consciente de escena: texto + duración + wordTimestamps).
- **Validador** (`animation_validator.py`): regex que **prohíbe** `Math.random`, `Date.now`,
  `new Date`, `setTimeout/setInterval`, `fetch`, `eval`, `require`, `process`, `while(true)`,
  imports que no sean de `react`/`remotion`. Exige un `export` de componente.
- **Compilador** (`frontend/src/remotion/compileAnimation.ts`): transpila el TSX con **sucrase**
  (`typescript`+`jsx`+`imports`) y lo evalúa con `new Function` inyectando un `require` shim que
  solo da `react` y `remotion`. **Mismo código** en preview y render → mismo resultado.
- **Composición de render** (`frontend/src/remotion/CustomCode.tsx`): recibe `code` como prop,
  lo compila y lo renderiza. Carga **Inter** (`@remotion/google-fonts`) para que la fuente sea
  idéntica en preview y mp4. Registrada en `Root.tsx` (tamaño/duración por `calculateMetadata`).

### Guardrails (no confiar en el modelo)
- **Determinismo:** prohibido `Math.random` etc.; para azar → `random("seed")` de Remotion
  (mismo seed = mismo valor en preview y render). Todo animado por `useCurrentFrame()`.
  *(Razón: si no, el mp4 sale distinto al preview que el humano aprobó.)*
- **Seguridad:** imports limitados a react/remotion. El **preview** es eval en el navegador del
  admin (riesgo bajo). El **render** corre en Chromium headless (contexto browser, sin Node
  fs/red por defecto). Un sandbox endurecido del render = pendiente (ver roadmap).
- **Revisión humana:** el flujo es preview → el humano ve → "no me gustó, cambia X" (edición
  quirúrgica) → renderizar. La red humana atrapa lo feo/roto antes de publicar.

---

## 4. Lo construido (estado actual)

### Fase 0 — Prototipo admin "Crear Animación" ✅
Página solo-admin (`/admin/animations/create`): prompt → genera → **preview en vivo** (`<Player>`
9:16) → caja de edición ("¿qué cambiar?" → edición quirúrgica). Sin audio, sin pipeline.
- Backend: `animation_generator.py`, `animation_validator.py`, `POST /api/admin/animations/generate`
  (`app/api/admin_animations.py`, `require_admin`), registrado en `main.py`.
- Frontend: `pages/admin/AnimationCreator.tsx`, ruta + nav "Crear Animación".

### Fase 2 — Render a mp4 ✅
- Composición `CustomCode` + `render-server.mjs` acepta `inputProps` del body.
- `POST /api/admin/animations/render` (re-valida + llama al render-server con
  `compositionId=CustomCode`) y `GET /api/admin/animations/video/{id}` (sirve el mp4 del volumen
  compartido).
- Fuente consistente preview↔render vía Inter (`@remotion/google-fonts`).

### Fase 3 — Code-gen consciente de escena en el pipeline (detrás de flag) ✅
- `config.SCENE_ENGINE` (env: `orchestration` | `codegen`, default `orchestration`).
- `generate_scene_animation(text, duration_seconds, word_timestamps, bg_hint, ...)`.
- `orchestrator.py` ramifica: si `codegen`, genera por escena y guarda `scene.custom_code`
  (type `custom_code`); si no, la orquestación de siempre.
- `schemas/spec.py`: campo `custom_code` en `Spec` (si no, Pydantic lo borraba).
- `MainComposition.tsx`: renderiza `<CustomCode>` si la escena trae `custom_code`. El render del
  **video completo** usa el mismo path (composición `AnimaFlow-Main`), sin endpoint nuevo.

---

## 5. Economía de tokens

| | Orquestación | Code-gen |
|---|---|---|
| Entrada por escena | ~37,000 (catálogo de 70 comps + props) | ~2,000–5,000 (API Remotion + few-shot) |
| Salida | ~500–800 (JSON) | ~2,000–3,000 (código) |
| **Neto** | ~38k/escena | ~6–8k/escena (**~5× menos**) |
| Calidad | texto plano frecuente | visual protagonista |

---

## 6. Consecuencias / tradeoffs

**A favor:** mejor calidad, más barato, libertad total (la IA pide lo que quiera), no depende del
catálogo, y la IA dibuja sus propios íconos.

**En contra / a vigilar:**
- **Varianza:** a veces el código sale roto/feo (vimos `Math.random`, `<circle>` como div). Mitiga:
  validador + retry + revisión humana en preview + fallback al catálogo.
- **Sin export AE nativo** para escenas code-gen (los bloques AE eran por-componente). Solución:
  footage universal (ProRes/PNG) o un traductor "Opción 2" al 80% editable (ver roadmap).
- **Render server-side** ejecuta código generado → necesita sandbox endurecido a escala.
- **Migración:** el catálogo hace MÁS que visuales (timing, audio, transiciones). Por eso se
  reemplaza UNA etapa y se mantiene el esqueleto; el catálogo queda como fallback.

**Modelo de migración (strangler fig):** lo nuevo crece al lado de lo viejo, detrás de un flag;
se migra gradual; lo viejo se jubila solo cuando el code-gen está probado en producción.

---

## 7. Archivos tocados (resumen)

Backend: `modules/llm/animation_generator.py`, `modules/llm/animation_validator.py`,
`api/admin_animations.py`, `main.py`, `core/config.py` (SCENE_ENGINE),
`modules/pipeline/orchestrator.py` (branch), `schemas/spec.py` (custom_code).

Frontend: `pages/admin/AnimationCreator.tsx`, `remotion/compileAnimation.ts`,
`remotion/CustomCode.tsx`, `remotion/Root.tsx`, `remotion/MainComposition.tsx`,
deps `sucrase` + `@remotion/google-fonts`.

Render: `servers/render-server.mjs` (acepta `inputProps`).

> **Lo que falta / qué sigue:** ver `docs/codegen-pendiente.md`.
