# Fase C — Motion graphics dinámicos (plan detallado)

**Fecha:** 2026-06-03
**Estado:** En progreso. C1/C2/C4 ✅, C5 parcial 🔄, C3 pendiente 🔴.
**Relacionado:** ADR-010, coordinate-contract.md

## Estado / progreso
| Ítem | Estado | Entregado |
|---|---|---|
| C1 reactivo a palabra | ✅ | `WordHighlight` (karaoke) + `KeywordPop` (ícono en palabra clave) |
| C2 transiciones | ✅ | overlay `GradientOverlay` centrado en cada corte (sin tocar audio) |
| C4 prompt anti-texto | ✅ | regla 4.1 "jerarquía visual" en el prompt |
| C5 auditoría componentes | 🔄 | StyleButton/StyleChip/StyleBadge a escala video; resto en `component-audit-c5.md` |
| C3 flex/grid CSS real | 🔄 paso 1 hecho | fix de grupos ANIDADOS (ya no se apilan en el origen); detalle abajo |
| C6 keyframes | opcional | no iniciado |

> **Aclaración clave:** el posicionamiento individual (x/y) NO está roto. Cualquier
> capa puede ir en cualquier posición (`x:-400`, `x:0`, `x:400`, `y:-300`, etc.) y
> funciona en TODOS los formatos (9:16, 16:9, 1:1, reel), porque el centro se calcula
> con las dimensiones reales del lienzo. C3 NO trata de eso (ver abajo).

---

## Principio rector (DECISIÓN CANÓNICA)

> **La IA es ORQUESTADORA, no dibujante.** Elige, coloca, configura y anima
> **piezas pre-hechas** (los 109 componentes + los ~43k íconos vectoriales de
> Iconify). **NUNCA** genera geometría (paths/formas desde cero).

**Por qué:** los LLM son pésimos generando coordenadas vectoriales. En pruebas,
pedirle a la IA que dibujara un corazón producía algo como el borde de un
boomerang. No se arregla con prompt — es una limitación fundamental del modelo.

**Consecuencias:**
- El tipo `path` (y `rect`/`circle` libres) sigue **PROHIBIDO** para el LLM.
- El vocabulario de formas = **íconos pre-hechos** (un corazón = `mdi:heart`, un
  SVG profesional) + componentes. Por eso el re-embeddeo de íconos es crítico:
  es lo que permite a la IA *encontrar* la pieza correcta.
- Esto **rechaza explícitamente** la recomendación del
  `analisis_raiz_arquitectura.md` original ("abolir la restricción de primitivas,
  que la IA dibuje"). Confirmado inviable.

La Fase C NO da más poder de dibujo a la IA. Hace la **orquestación más rica** y
las **piezas más vivas**.

---

## Lo que falla / está limitado hoy

1. **Transiciones planas.** Solo crossfade de fondo (15 frames) + fade por capa.
   Existen `TransitionWrapper` + 5 componentes de transición, pero `MainComposition`
   no los monta (código muerto).
2. **Flex/grid anidado roto.** El solver pre-calcula posiciones de hijos y los
   renderiza `position:absolute` → grupos anidados se descuadran. La IA termina
   cayendo en escenas planas de un solo elemento → sensación de "puro texto".
3. **Animaciones globales por capa.** Nada reacciona a una palabra concreta del
   audio (el plumbing de `wordTimestamps` ya existe, pero ningún componente lo usa).
4. **Video "puro texto".** Combinación de #2 + selección de íconos rota (se arregla
   con el re-embed) + prompt que volcaba la frase entera (mitigado en C4).

---

## Ítems

### C1 — Componentes reactivos a la palabra 🟢 (alto impacto, bajo riesgo)
- **Soluciona:** #3. Que un componente se "encienda"/anime en una palabra concreta.
- **Cómo:** ya tienes `wordTimestamps` en todos los componentes. Construir 1-2:
  - `WordHighlight`: resalta la palabra que se está pronunciando.
  - Ícono con `triggerWord`: aparece/rebota cuando esa palabra suena.
- **Riesgo:** bajo. No toca el core.

### C2 — Transiciones de escena dedicadas 🟡 — ✅ HECHO (v7.5)
- **Soluciona:** #1. `TransitionWrapper` cableado en `MainComposition` como **overlay
  centrado en cada corte** entre escenas.
- **Cómo (implementado):** se monta un `<Sequence>` de overlay en cada borde,
  centrado en el frame de corte, con `GradientOverlay` por defecto (es el único
  efecto **simétrico** — opacidad `sin(progress·π)`: claro→pico→claro — así no deja
  la pantalla en negro). Constantes `SCENE_TRANSITION_TYPE` / `SCENE_TRANSITION_FRAMES`.
- **Por qué este enfoque:** `@remotion/transitions` NO está instalado y los overlays
  ya estaban diseñados para recibir `progress`. Es **aditivo**: NO toca el audio ni
  el secuenciado (cero riesgo de desync). Coexiste con el crossfade de fondo.
- **Pendiente (validación visual tuya):** confirmar que GradientOverlay + el crossfade
  de fondo no se sienta recargado; si sí, se desactiva uno. WipeTransition/ZoomBlur
  terminan en negro → si se quieren, requieren placement sobre la cola de la escena
  saliente (no centrado).

### C3 — Layout flex/grid por CSS real 🔴 (mayor impacto, mayor lift)

**Qué NO es C3 (aclaración):** NO es "permitir posicionar en otras posiciones".
Eso YA funciona: cualquier capa con su propio `x/y` va donde sea, en cualquier
formato. Layouts como "texto a la izquierda + componente a la derecha", "texto
arriba + componente abajo", o una rejilla 2×2 — se pueden hacer HOY poniendo cada
elemento con su `x/y` (capas planas).

**Qué SÍ es / qué falla:** el único caso roto/frágil es la **auto-distribución por
contenedor** (grupos `layout: "flex"` / `"grid"`), sobre todo **componentes DENTRO
de otro componente** (anidación). Hoy:
1. El `layoutSolver` (no el navegador) calcula a mano las posiciones de los hijos.
2. `AnimaComposer` renderiza el grupo como `<div display:flex>`, pero cada hijo se
   pinta `position:absolute` → **escapa del flujo flex**; el CSS flex no acomoda nada,
   lo hace el solver.
3. En grupos **anidados** (un grupo dentro de otro) los offsets se compi­lan mal →
   los hijos se descuadran (el "flexbox roto"). Por eso, cuando la IA intenta una
   composición agrupada, suele descuadrarse o colapsar, y termina cayendo en escenas
   planas de un elemento.

**Consecuencia práctica:** la IA PUEDE hacer las composiciones poniendo cada cosa
con `x/y` manual, pero es **poco fiable** (calcula mal el espaciado → solapamientos).
C3 le da **auto-layout fiable**: "pon estos 3 en columna centrada y repártelos" sin
que calcule cada `y`.

**Cómo se arregla:**
1. En `layoutSolver.ts`: dejar de pre-calcular posiciones de hijos de grupos
   flex/grid (quitar `distributeRow/Column/applyGrid` + `_flex_positioned`).
2. En `AnimaComposer.tsx`: renderizar los hijos de un grupo flex/grid **en flujo
   normal del DOM** (sin `position:absolute`), para que el motor CSS del navegador
   los acomode de verdad (gap, justify, align, wrap).
3. **El punto delicado:** hoy TODOS los componentes/primitivas se pintan
   `position:absolute; translate(-50%,-50%)`. Dentro de un flex eso los saca del
   flujo. Hay que darles un **modo "en-flujo"** cuando son hijos de un grupo flex/grid
   (un wrapper que NO los posicione absoluto) → es un cambio al contrato de render.
4. El grupo contenedor sigue posicionándose absoluto en el canvas (con su `x/y`);
   solo sus hijos pasan a flujo.

**Riesgo:** medio-alto — toca el corazón del render y el contrato de coordenadas.
Las capas planas (la mayoría de escenas hoy) deben seguir intactas. Requiere
validación visual cuidadosa, idealmente comparando antes/después.

**Progreso v7.6 — Paso 1 (hecho): fix de grupos ANIDADOS.**
- `applyFlex`/`applyGrid` ya NO sobrescriben la posición de un contenedor que el
  grupo PADRE ya distribuyó (se respeta vía `_flex_positioned`). Antes los grupos
  anidados se apilaban en el origen. Ahora un "componente grande con chicos dentro"
  o un grupo dentro de otro se posiciona donde el padre lo colocó.
- **Blast radius:** solo afecta grupos anidados (que ya estaban rotos). Capas planas
  y grupos de un solo nivel quedan idénticos (cero regresión esperada).
- **Pendiente (paso 2, opcional/mayor):** "CSS flex real" puro requiere que los 109
  componentes soporten render EN-FLUJO (hoy todos son `position:absolute`). Es un
  cambio grande; se evalúa solo si el layout por solver no alcanza. Por ahora el
  layout lo sigue calculando el solver (que ya distribuye bien single-level y, con
  este fix, anidados).

### C4 — Guía de prompt: menos muro de texto 🟢 (HECHO)
- **Soluciona:** parte de #4. Regla en el prompt (`component_strategy.py`): toda
  escena debe acompañar el texto con al menos un ícono relevante y/o fondo con
  movimiento; tamaño de texto moderado; CTA con su botón/badge.
- **Estado:** ✅ implementado (regla 4.1 en `_build_strategy_prompt`). Cero infra.

### C5 — Biblioteca de piezas + AUDITORÍA Y REFACTOR de componentes (continuo)
- **Soluciona:** #4 de raíz (variedad = tamaño de biblioteca, ya que la IA no dibuja).
- **Dos frentes:**
  1. **Ampliar** la biblioteca con componentes nuevos bien diseñados (más fondos,
     "arquetipos de escena", tarjetas, etc.).
  2. **Auditar y refactorizar TODOS los componentes existentes** (los 109):
     - ¿Tienen bugs (props ignoradas, determinismo roto tipo `Math.random`,
       tamaños de UI web en vez de video)?
     - ¿Están **diseñados para editarse** por la IA? (props claras, defaults
       sensatos a escala de video, leen `fontSize`/`color` top-level, respetan el
       contrato de coordenadas, aceptan `wordTimestamps` si muestran texto).
     - Donde fallen → **refactoring** para que sean orquestables de forma fiable.
       Ya encontramos varios casos (StyleTextBlock/StyleScrambleText con fontSize
       web, scramble no determinista, StyleBadge minúsculo); el audit busca el resto.
- **Riesgo:** bajo por pieza; es goteo continuo, no un sprint.

### C6 — Keyframes en el spec (opcional)
- **NO para dibujar** (sigue prohibido). Solo para control fino de animación de
  componentes existentes (curvas de opacidad/escala). Pulido; con presets + C1
  probablemente no urge.

---

## Lo que Fase C NO hará
- ❌ Generación de paths/formas por la IA.
- ❌ Abrir primitivas `rect/circle/path` al LLM.

## Nota After Effects
Nada de Fase C ayuda al export AE todavía (AE no renderiza `type:"component"`).
Cerrar ese gap (manejar componentes en `ae_transformer` o un pase de
`getBoundingClientRect()` post-render) es su propio sub-proyecto.

---

## Orden recomendado
1. **Re-embeddeo de íconos (B4)** — desbloquea que la IA elija buenas piezas.
2. **C4** (prompt anti-texto) — ✅ hecho.
3. **C1** (reactivo a palabra) — usa el plumbing existente, alto impacto.
4. **C2** (transiciones).
5. **C3** (flex CSS real) — el gran salto, con calma y pruebas visuales.
6. **C5** (auditoría/refactor + más componentes) — continuo.
