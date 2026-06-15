# Contrato de Responsividad de componentes (Fase 2) — LEER antes de dimensionar un componente

**Estado:** vigente desde Fase 2 (ver `PLAN-MEJORA-CALIDAD.md` §5, ADR-011).
**Complementa** (no reemplaza) al `coordinate-contract.md`: ese define **dónde** va
un elemento (x/y + `translate(-50%,-50%)`); este define **qué tamaño** tiene.

## El problema
Los componentes hardcodeaban px (`width: 300px`, `fontSize: 24`), así que se veían
diminutos o desbordados según el formato (9:16, 1:1, 16:9, 4:5). El render corre en
canvas de 1080–1920px, no en una pantalla web.

## La regla en una frase
> Ningún tamaño estructural en px absolutos. Todo se deriva del lienzo con
> `useCanvas()`, y el layout direccional se elige por orientación.

## Cómo (el patrón)
1. **Obtén métricas del lienzo:**
   ```tsx
   import { useCanvas } from '../utils/canvas';
   const c = useCanvas();
   ```
2. **Deriva tamaños del lienzo** (en vez de px fijos):
   - `c.vmin(pct)` → % de la dimensión MENOR. **Default para `fontSize`, iconos** y
     todo lo que deba tener el mismo tamaño físico en vertical y horizontal.
   - `c.vw(pct)` / `c.vh(pct)` → % del ancho / alto. Para anchos de cajas, alturas.
   - `c.vmax(pct)` → % de la dimensión mayor (poco común).
   - Equivalencias útiles en 1080 de lado menor: `vmin(2.4)` ≈ 26px, `vmin(8)` ≈ 86px,
     `vw(82)` ≈ 886px.
3. **Layout adaptativo por orientación:**
   ```tsx
   flexDirection: c.isLandscape ? 'row' : 'column'   // vertical/cuadrado → columna
   ```
   Y ajusta proporciones: las cajas ocupan más ancho en vertical
   (`c.isLandscape ? c.vw(28) : c.vw(82)`).

## Qué NO hacer
- ❌ `width: '300px'`, `fontSize: 24`, `gap: '30px'`, `padding: 20`, `borderRadius: 16`
  (cualquier px estructural fijo).
- ❌ Asumir orientación horizontal (filas) — rompe el 9:16, que es el formato dominante.
- ❌ Romper el contrato de coordenadas: el contenedor raíz sigue usando
  `left:x; top:y; transform: translate(-50%,-50%)`.
- ❌ Introducir `Math.random()`/`Date.now()` (determinismo obligatorio).

## Excepciones (px absolutos permitidos)
- Detalles "hairline" no estructurales (ej. un borde de 1px) pueden quedar fijos.
- Backgrounds/VFX que llenan el lienzo (usan `100%`), no necesitan esta convención.

## Componente de REFERENCIA
`frontend/src/remotion/components/APIRequestFlow.tsx` está convertido siguiendo
exactamente este patrón (fila en horizontal, columna en vertical; fontSize/cajas/
flecha derivados del lienzo). Úsalo como plantilla.

## Checklist al hacer responsivo un componente
- [ ] `const c = useCanvas();` al inicio.
- [ ] Cero px estructurales: anchos/altos/fontSize/gap/padding/radius vía `c.vmin/vw/vh`.
- [ ] `fontSize` e iconos con `c.vmin(...)` (mismo tamaño físico en todo formato).
- [ ] Layout direccional con `c.isLandscape` (fila) vs columna.
- [ ] Sigue el contrato de coordenadas (raíz con `translate(-50%,-50%)`).
- [ ] Determinista (sin `Math.random`/`Date.now`).
- [ ] Verificado con render en al menos 9:16 y 16:9.
