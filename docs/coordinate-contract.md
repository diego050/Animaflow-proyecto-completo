# Contrato de coordenadas de AnimaComposer (LEER antes de crear un componente)

**Estado:** vigente desde v7 (ver ADR-010)

Este documento define **cómo se posicionan los elementos** en el render de video
(Remotion). Si creas o modificas un componente del registry o una primitiva,
**debes** seguir este contrato o el elemento saldrá descolocado/recortado.

---

## La regla en una frase

> El `spec.json` guarda `x/y` como **offset desde el centro del lienzo**.
> El `layoutSolver` los convierte al **centro absoluto** del elemento.
> Cada componente se posiciona con `left:x; top:y; transform: translate(-50%,-50%)`.

`x: 0, y: 0` = centro de la pantalla. `y` negativo = arriba. `x` negativo = izquierda.

---

## Los tres eslabones (deben estar alineados)

1. **Spec (lo que genera el LLM):** `x/y` = offset desde el centro.
   - `{"x": 0, "y": -200}` → 200px por encima del centro.

2. **`layoutSolver.ts` (frontend):** `applyDefault` calcula
   `x = parentCenterX + offsetX` (centro absoluto). **NO** resta `width/2`.
   - El cálculo usa las dimensiones REALES del lienzo → funciona en 9:16, 16:9,
     1:1, 4:5, etc. sin cambios.

3. **El componente / primitiva:** se centra sobre ese punto:
   ```tsx
   <div style={{
     position: 'absolute',
     left: `${x}px`,
     top: `${y}px`,
     transform: 'translate(-50%, -50%)',  // ← OBLIGATORIO
   }}>
   ```
   El `translate(-50%,-50%)` es lo que hace que el elemento se centre sobre `(x,y)`
   sin necesitar conocer su ancho/alto (robusto a contenido variable: texto, botones).

---

## Qué NO hacer (errores que rompen el contrato)

- ❌ `left: calc(50% + ${x}px)` — esto era el contrato viejo (offset desde 50%).
  Hoy el solver ya entrega el centro absoluto, así que sumar 50% lo manda fuera de
  pantalla. (Se eliminó de todas las primitivas en v7.)
- ❌ `left: ${x}px` **sin** `translate(-50%,-50%)` — trata `x` como esquina
  superior-izquierda → el elemento queda desplazado media dimensión.
- ❌ Restar `width/2` en el solver o en el componente — doble resta, el elemento
  se va a la izquierda/arriba (era el bug del botón recortado).

## Variantes válidas del translate
Anclar a un borde es válido siempre que el eje centrado use `-50%`:
- `translate(-50%, -100%)` → centrado en X, anclado por abajo (barras que crecen).
- `translate(-50%, calc(-50% + ${offset}px))` → centrado + animación en Y.

## Excepciones conocidas (no centradas por diseño)
- **Backgrounds / VFX** (KineticBackground, ParticleField, etc.): llenan el lienzo,
  ignoran `x/y`. No necesitan translate.
- **LowerThird, StyleTicker**: anclados por diseño (esquina/full-width). No siguen
  el contrato de centro; son casos intencionales y poco usados.

## Grupos flex/grid
Los hijos se renderizan **anidados** dentro del `<div>` contenedor (que es
`position:absolute`). El solver entrega sus coordenadas como **centro RELATIVO**
al contenedor (no absoluto). El contenedor aporta el offset vía CSS.
> Nota: los grupos flex/grid anidados profundos aún son imperfectos (Fase C:
> delegar el layout al CSS real del navegador).

---

## After Effects (ruta separada — no aplica este contrato)
El export a `.jsx` usa `backend/app/services/layout_solver.py` (Python) +
`ae_transformer.py`, que tiene su propia conversión a coordenadas absolutas de AE.
**No** comparte código con `layoutSolver.ts`. Cambiar el contrato del frontend NO
afecta a AE (el spec sigue guardando `x/y` como offset desde el centro).

---

## Checklist para un componente nuevo
- [ ] ¿Usa `left:x; top:y; translate(-50%,-50%)`? (salvo background/anclado intencional)
- [ ] ¿Lee `fontSize`/`color` como props top-level (no solo `style.*`)?
- [ ] ¿Tamaños a escala de **video vertical** (no UI web: heading ≥ 80px, badge lg ≥ 48px)?
- [ ] ¿Es **determinista**? (sin `Math.random()`/`Date.now()`; usa `frame`/índice)
- [ ] ¿Está en `registry.ts` **y** en `AVAILABLE_COMPONENTS` del backend?
      (el test `test_component_registry_sync.py` lo verifica en CI)
- [ ] Si revela texto: ¿usa `wordTimestamps` para sincronizar al audio (karaoke)?
