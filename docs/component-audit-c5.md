# C5 — Auditoría de componentes (109)

**Fecha:** 2026-06-03
**Objetivo:** revisar todos los componentes por bugs y por si están **diseñados
para que la IA los edite** (defaults a escala de video, leen props top-level,
deterministas, respetan el contrato de coordenadas). Refactorizar donde fallen.

Criterios de "editable por la IA / apto para video":
- Tamaños a escala de **video vertical 1080px** (no UI web).
- Lee `fontSize`/`color` como props top-level cuando aplica (no solo `style.*`).
- **Determinista** (sin `Math.random()`/`Date.now()`; usa `frame`/índice).
- Respeta el **contrato de coordenadas** (`left:x; top:y; translate(-50%,-50%)`).

---

## Resultados por categoría

### A) Determinismo — ✅ LIMPIO
- Único caso era `StyleScrambleText` (`Math.random` en el scramble) → **ya arreglado en v7.3**
  (función determinista de `frame`+índice). El grep solo matchea ahora el comentario.

### B) Contrato de coordenadas — ✅ LIMPIO
- `FloatingBlobs` y `GitCommitGraph` usan `calc(50%+...)` **internamente** (posicionan
  blobs/nodos relativos a su propio centro), no para el `x/y` de la capa. La capa sí usa
  `left:x; top:y; translate(-50%,-50%)`. No son violaciones.

### C) Tamaños de fuente web (ilegibles en video) — el hallazgo principal

**✅ Arreglados (UI con texto protagonista, fix holístico fontSize+padding):**
| Componente | Antes (lg) | Ahora (lg) |
|---|---|---|
| StyleBadge | 16 | 48 (v7.3) |
| StyleButton | 18 | 52 (v7.4) |
| StyleChip | 16 | 36 (v7.4) |

**⚠️ Pendientes de revisión (texto protagonista probablemente chico; requieren
juicio visual / escalado holístico):**
- `FloatingBadge` (fontSize 32)
- `NotificationToast` (20)
- `BreakingNewsTicker` (32)
- `FeatureChecklist` (32)
- `ProgressPill` (24)
- `StyleAvatar` (nombre 14-18 + avatar 48-80; escalar el conjunto, no solo la fuente)

**🟡 Probablemente OK (texto INTERNO de tarjetas/mockups que escalan como unidad):**
`APIRequestFlow`, `CodeBlockHighlight`, `InstagramPost`, `MessageBubble`,
`PodcastGuestCard`, `ProductCardReveal`, `StyleCard`, `StyleFakeScroll`, y las
etiquetas internas de los charts (`StyleBarChart`, `StyleBarRace`, `StyleFunnelChart`,
`StyleLineChart`, `StylePieChart`). En estos, la fuente chica es parte del look realista
de la tarjeta; se revisan solo si en render se ven mal.

### D) Props top-level ignoradas — ✅ mayormente cubierto
- `StyleTextBlock` y `StyleScrambleText` ya leen `fontSize`/`color` top-level (v7).
- El resto de `Style*` usa `size` semántico (sm/md/lg) vía sizeMap, no `fontSize` directo
  → la IA los edita con `size`, lo cual es correcto.

---

## Pendiente (siguiente pasada de C5, idealmente en bucle de deploy-prueba)
1. Revisar visualmente los **⚠️ pendientes** y escalarlos holísticamente.
2. Confirmar a ojo los **🟡 probablemente OK** en un render real.
3. Añadir soporte de `wordTimestamps` (karaoke) a más componentes de texto si se desea.
4. Ampliar la biblioteca con componentes/arquetipos nuevos según necesidad.

## Notas
- Los cambios de tamaños no se pueden validar 100% sin render; se aplicaron solo los
  **3 casos de alta confianza** (UI con texto protagonista, patrón ya validado en
  StyleBadge). El resto queda documentado para la pasada visual.
- Todos los cambios pasan `tsc --noEmit` (exit 0).
