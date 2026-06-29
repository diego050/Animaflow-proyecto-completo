# Plan — Export a After Effects EDITABLE (por capas) desde code‑gen

> Estado: **DISEÑO** (no construido). Decisión del usuario: documentar primero.
> Objetivo del usuario: que cada parte de la animación generada por la IA sea una **capa
> editable en AE**, con su **movimiento editable**; ~**85% de parecido** es aceptable, pero
> se prioriza la **editabilidad por capas**.

---

## 1. Objetivo y criterios de éxito

- **Cada elemento** (círculo, barra, texto, ícono) = una **capa** en AE.
- El **movimiento** de cada capa es **editable** (keyframes de posición/escala/rotación/opacidad),
  no un video "horneado".
- Apariencia: ~**85–90%** del original. No tiene que ser pixel‑perfect.
- **No depende de la IA** (determinista). La IA genera como quiera; nosotros traducimos.
- Entrega: un `.jsx` (ExtendScript) + assets, en un zip. El usuario lo corre en AE
  (Archivo > Scripts > Ejecutar) y obtiene la composición con capas.

### Fuera de alcance (por ahora)
- Reproducir efectos complejos como vectores nativos (gradientes animados, blurs, máscaras SVG raras).
  Esos van como **footage** (clip transparente) con transform editable.
- Traducir la matemática (spring/Math) a **expresiones AE**. Se descarta: frágil. Usamos **muestreo**.

---

## 2. El problema

La IA produce **código React/Remotion arbitrario**: `<div>`, `<svg>`, gradientes, `spring()`,
`Math.sin(frame/…)`, `random(seed)`, loops. AE piensa en **capas con keyframes**
(posición, escala, rotación, opacidad, color) y shape/text layers.

No hay mapeo directo código→AE. La solución NO es entender la matemática, sino **grabar el
resultado**: correr la animación y muestrear el estado de cada elemento en cada frame.

---

## 3. Arquitectura general (3 etapas)

```
Código TSX (custom_code)
   │
   ▼
[Etapa 1] ETIQUETAR elementos  ── parser/AST (ya tenemos groupDetector)
   │   añade data-ae-id + data-ae-type + nombre a cada elemento visual
   ▼
[Etapa 2] MUESTREAR por frame  ── render-server (Chrome headless)
   │   corre la animación; por cada frame lee de cada [data-ae-id]:
   │   position, scale, rotation, opacity, color, size  → tracks de keyframes
   │   + (apariencia) snapshot/footage transparente por elemento
   ▼
[Etapa 3] EMITIR .jsx (ExtendScript)
   │   crea comp + por elemento una capa (shape/text nativa o footage) + keyframes
   ▼
zip { proyecto.jsx, assets/ (pngs/footage), README } → usuario lo corre en AE
```

---

## 4. Etapa 1 — Etiquetado de elementos (AST)

Reusar/extender el parser (`frontend/src/remotion/groupDetector.ts` o un módulo nuevo
`aeTranslator`). Antes de renderizar, transformar el código para que **cada elemento visual**
lleve atributos estables:

- `data-ae-id="el-0"`, `el-1`, … (único y estable por render).
- `data-ae-type`: `shape` | `text` | `svg` | `image` | `group-item`.
- `data-ae-name`: nombre legible para la capa (ej. "Partícula 3", "Título", "Barra 5").

Reglas de etiquetado:
- Cada `<div>`/`<span>` con estilo visible → `shape` (o `text` si su hijo es texto).
- Cada `<svg>` → `svg` (se trata como footage o se intentan extraer paths simples).
- Elementos de un loop → cada iteración recibe un id derivado del índice (`el-grp0-3`).

Clasificación para decidir el **nivel de fidelidad** (ver §7):
- `shape` con `borderRadius:50%` → elipse nativa; rectangular → rect nativo.
- `text` → text layer nativa.
- `svg`/gradiente/blur/sombra compleja → footage transparente.

> Ya tenemos: detección de elementos, grupos, colores, tamaños (groupDetector). Es ~40% de
> esta etapa.

---

## 5. Etapa 2 — Muestreo por frame (el motor) — pieza técnica clave

Corre en el **render-server (Node + Chrome headless)**, que ya renderiza video.

Mecánica:
1. Transpilar el código (sucrase, ya existe) y montarlo en una página (Puppeteer/Remotion).
2. Para `frame = 0 … N`:
   - Posicionar la animación en ese frame (Remotion permite seek por frame).
   - `document.querySelectorAll('[data-ae-id]')` → por cada elemento leer:
     - **position**: `getBoundingClientRect()` (x, y) relativo al lienzo.
     - **size**: width, height.
     - **scale / rotation**: parsear `getComputedStyle().transform` (matriz → escala+rotación).
     - **opacity**: computed opacity (acumulada).
     - **color**: `background-color` / `color` / `fill`.
3. Construir, por elemento, **tracks**: `position[f]`, `scale[f]`, `rotation[f]`, `opacity[f]`, `color[f]`.

Salida: un JSON `aeScene = { fps, width, height, durationFrames, elements: [{ id, type, name, tracks, appearance }] }`.

**Apariencia por elemento** (para la capa):
- `shape`/`text` simples → no necesita imagen (se reconstruye nativo con color/tamaño/texto).
- `svg`/complejo → renderizar un **footage transparente** SOLO de ese elemento:
  ocultar todos los demás (`[data-ae-id]:not(#este){opacity:0}`) y renderizar a ProRes/PNG‑seq con alfa.

**Optimización de keyframes** (clave para no generar miles):
- No emitir un keyframe por frame si el valor no cambia (constante → 1 keyframe).
- Simplificar tracks lineales (RDP / tolerancia) → muchos menos keyframes, igual de fiel.

---

## 6. Etapa 3 — Emisor `.jsx` (ExtendScript de AE)

Generar un script `.jsx` que, al correr en AE, construye la comp. Base: ya existe
`backend/app/modules/ae_export/script_builder.py` (del modelo viejo) — se adapta el patrón.

Por cada elemento, según tipo:
- **shape nativo:** `comp.layers.addShape()` con un rect/ellipse + fill (color).
- **text nativo:** `comp.layers.addText("…")` con fuente/tamaño/color.
- **footage:** importar el clip/png‑seq del elemento y añadirlo como capa.

Luego, por cada propiedad con track:
```javascript
var pos = layer.property("Transform").property("Position");
pos.setValueAtTime(t0, [x0, y0]);
pos.setValueAtTime(t1, [x1, y1]);
// … (solo los keyframes simplificados)
```
Igual para Scale, Rotation, Opacity. Color → keyframes en el fill (si cambia) o estático.

Resultado: comp con N capas, cada una con su transform animado **editable**.

---

## 7. Niveles de fidelidad

| Nivel | Elemento es… | Editable en AE | Para qué elementos |
|---|---|---|---|
| **1** | clip/footage transparente | transform (posición/escala/rot/opacidad) keyframeado; recolor por efectos | svg/gradiente/blur/complejo |
| **2** | capa + keyframes | mover y **editar el movimiento** | cualquiera con transform muestreado |
| **3** | shape/text **nativo** | todo + **vector y color nativo** | div simple (rect/elipse), texto |

Meta realista: **Nivel 3 para formas y textos simples** (el caso típico: partículas, barras,
títulos), **Nivel 1/2 para lo complejo**. Eso da el ~85–90% editable que pediste.

### 7b. Manejo de grupos (DECIDIDO)

No queremos 200 capas por un grupo decorativo de 200 puntitos. Regla:

| Grupo | En AE |
|---|---|
| **Pocos y con significado** (ícono, texto, ≤ ~10-12: tarjetas, barras) | **una capa por elemento** (editable cada uno) |
| **Muchos / decorativos** (200 partículas, confeti) | **UNA sola capa de grupo** (clip/precomp del grupo entero) |

- El parser ya sabe la **cantidad** de cada grupo → decide solo según un **umbral configurable**
  (`maxLayersPerGroup`, default ~10-12).
- La **capa de grupo** se puede borrar/mover/recolorear/retimear como una sola unidad (ideal para
  "quitar toda la decoración" = borrar 1 capa).
- **Quitar SOLO algunos elementos** de un grupo (ej. 200→120) se hace en NUESTRO editor
  (control de cantidad / por-elemento) **antes de exportar**; el clip de grupo en AE sale con esa
  cantidad. Dentro del clip ya no se separan (por eso el ajuste fino va antes del export).
- Implementación de la capa de grupo: render del grupo aislado a **footage transparente** (ocultar
  el resto) → 1 capa. (Reusa el mismo render del Nivel 1.)

---

## 8. Archivos a crear / modificar

**Frontend / parser**
- `src/remotion/aeTranslator.ts` (nuevo): etiquetado AST (reusa groupDetector) → inserta
  `data-ae-id/type/name`. (También útil para la UI de preview del export.)

**Render-server (Node)** — el motor
- `servers/render-server.mjs`: nuevo endpoint `POST /ae-sample` → recibe code + dims + fps +
  duración; corre el muestreo por frame (Puppeteer) → devuelve `aeScene` JSON.
- (opcional) `POST /ae-element-footage` → footage transparente por elemento.

**Backend (Python)**
- `app/modules/ae_export/ae_translator.py` (nuevo): orquesta — pide etiquetado, llama al
  render-server (`/ae-sample`), simplifica keyframes, arma el `.jsx`, empaqueta el zip.
- `app/modules/ae_export/jsx_builder.py` (nuevo o adaptar `script_builder.py`): genera el
  ExtendScript desde `aeScene`.
- `app/api/exports.py`: endpoint `POST /export/after-effects-editable` (separado del footage
  actual, para no romperlo) → dispara el translator en background → zip descargable.

**Frontend (UI)**
- En el lab y/o ExportPanel: botón **"Exportar AE editable (beta)"** + estado/descarga.

---

## 9. Fases de entrega

- **Fase A — Proof (formas simples → nativo):**
  etiquetado + muestreo de transform + emisor `.jsx` con shape/text nativos y keyframes.
  Probar con animación de partículas/barras/título. En el **lab aislado**.
  Entregable: abrir el `.jsx` en AE y ver capas reales con movimiento editable.

- **Fase B — Footage para lo complejo:**
  para svg/gradiente/blur → footage transparente por elemento + transform keyframeado.

- **Fase C — Pulido:**
  color animado, easing en keyframes, agrupar (precomps por grupo), nombres de capa,
  simplificación fina de keyframes, integrar al ExportPanel del proyecto (graduar fuera del lab).

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Muestreo lento (muchos frames × elementos) | muestrear a 30fps real, paralelizar, cachear; simplificar tracks |
| Demasiados keyframes → comp pesada | simplificación (RDP/tolerancia); valores constantes = 1 keyframe |
| Elementos complejos no quedan nativos | footage transparente (Nivel 1) — sigue siendo capa editable |
| `transform` con matrices raras (skew, 3D) | soportar translate/scale/rotate; skew/3D → aproximar o footage |
| Romper el export footage actual | endpoint NUEVO separado; el `.mov` actual queda intacto |
| Fuentes/colores no calzan 100% | aceptable (85%); fuente Inter ya es estándar |

---

## 11. Lo que YA tenemos (head start)

- **Parser/AST** (`groupDetector`) → identificación de elementos/grupos/colores/tamaños (~40% de Etapa 1).
- **Render-server con Chrome** + transpilado sucrase → base para el muestreo (Etapa 2).
- **`script_builder.py`** (ExtendScript del modelo viejo) → patrón para el emisor `.jsx` (Etapa 3).
- **Smoke-test / compileAnimation** → validar el código antes de muestrear.

---

## 12. Decisiones pendientes (para cuando arranquemos)

1. ¿Empezamos por **Fase A** (formas simples nativas) o por el **motor de muestreo** solo?
2. ¿Footage por elemento como **ProRes** o **PNG sequence** (alfa)? (PNG‑seq = más simple/portable.)
3. ¿El export editable vive primero en el **lab** y luego se gradúa al ExportPanel del proyecto?
4. Tolerancia de simplificación de keyframes (parecido vs. peso de la comp).

---

## 13. Resumen en una línea

Un **traductor Remotion→AE** que **etiqueta** cada elemento, **graba su estado por frame**
(en Chrome) y emite un **`.jsx`** que recrea cada uno como **capa editable** (nativa si es
simple, footage si es complejo) — determinista, ~85–90% de parecido, editable por capas.
