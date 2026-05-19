# Tipos de Animación SVG en AnimaFlow

## Descripción General

AnimaFlow genera **animaciones SVG 2D contextuales y complejas** basadas en el contenido del guion. Cada escena puede tener un tipo de animación único que refleja el mensaje del texto.

## Filosofía de Diseño

1. **Contextual:** La animación debe reflejar el significado del texto
2. **Compleja:** Múltiples elementos, easing curves, transiciones
3. **2D Puro:** Sin elementos 3D, profundidad simulada con capas y sombras
4. **Narrativa:** Cuenta una historia visual en 6-10 segundos

---

## Tipos de Animación Disponibles

### 1. Colisión (collision)

**Descripción:** Dos o más formas se mueven y chocan, generando efectos.

**Elementos típicos:**
- 2-3 formas geométricas (rectángulos, círculos)
- Destello/flash en el punto de colisión
- Partículas que se dispersan

**Easing:**
- `Easing.out(Easing.back(2))` para rebote
- `Easing.inOut(Easing.cubic)` para movimiento suave

**Ejemplo de código Remotion:**
```tsx
const block1X = interpolate(frame, [0, 40], [-200, 0], {
  easing: Easing.out(Easing.back(2))
});
const block2X = interpolate(frame, [0, 40], [200, 0], {
  easing: Easing.out(Easing.back(2))
});
const flashOpacity = interpolate(frame, [40, 45, 50], [0, 1, 0]);
```

**Caso de uso:** "Dos competidores chocan", "Impacto en el mercado"

---

### 2. Morphing (morphing)

**Descripción:** Una forma se transforma en otra progresivamente.

**Elementos típicos:**
- Path SVG inicial
- Path SVG final
- Interpolación de puntos

**Easing:**
- `Easing.inOut(Easing.cubic)` para transición suave

**Ejemplo:**
```tsx
const morphProgress = interpolate(frame, [20, 60], [0, 1], {
  easing: Easing.inOut(Easing.cubic)
});
const d = interpolatePath(initialPath, finalPath, morphProgress);
```

**Caso de uso:** "Transformación digital", "Evolución de producto"

---

### 3. Partículas (particles)

**Descripción:** Múltiples elementos pequeños que se agrupan o dispersan.

**Elementos típicos:**
- 8-20 partículas (círculos pequeños)
- Trayectorias con delays escalonados
- Opacidad variable

**Easing:**
- `Easing.out(Easing.quad)` para desaceleración
- Delays por índice: `i * 5 frames`

**Ejemplo:**
```tsx
const particles = Array.from({ length: 12 }).map((_, i) => ({
  x: interpolate(frame, [i * 5, i * 5 + 30], [-100, 0], {
    easing: Easing.out(Easing.quad)
  }),
  opacity: interpolate(frame, [i * 5, i * 5 + 20, i * 5 + 40], [0, 1, 0])
}));
```

**Caso de uso:** "Comunidad", "Red de conexiones", "Datos distribuidos"

---

### 4. Conexión (connection)

**Descripción:** Nodos que se conectan progresivamente con líneas.

**Elementos típicos:**
- 5-7 nodos circulares
- Líneas que aparecen en secuencia
- Glow en los puntos de conexión

**Easing:**
- `spring()` para aparición de nodos
- `Easing.inOut(Easing.cubic)` para líneas

**Ejemplo:**
```tsx
const nodes = Array.from({ length: 6 }).map((_, i) => {
  const nodeOpacity = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
    delay: i * 8
  });
  return <circle key={i} opacity={nodeOpacity} ... />;
});
```

**Caso de uso:** "Red profesional", "Integración de sistemas"

---

### 5. Revelación (reveal)

**Descripción:** Capas que se deslizan para revelar contenido.

**Elementos típicos:**
- 2-3 capas rectangulares
- Animación de translate Y o X
- Contenido que aparece gradualmente

**Easing:**
- `Easing.out(Easing.back(1.5))` para deslizamiento con rebote

**Ejemplo:**
```tsx
const layer1Y = interpolate(frame, [0, 30], [0, -200], {
  easing: Easing.out(Easing.back(1.5))
});
const layer2Y = interpolate(frame, [10, 40], [0, -200], {
  easing: Easing.out(Easing.back(1.5))
});
```

**Caso de uso:** "Descubre más", "Detrás de escena"

---

### 6. Construcción (construction)

**Descripción:** Elementos que se ensamblan pieza por pieza.

**Elementos típicos:**
- 4-8 piezas individuales
- Animación escalonada de entrada
- Ensamblaje en posición final

**Easing:**
- `spring({ stiffness: 150, damping: 10 })` para encaje

**Ejemplo:**
```tsx
const pieces = [1, 2, 3, 4].map((i) => ({
  x: spring({ frame, fps, delay: i * 10, config: { stiffness: 150 } }),
  y: spring({ frame, fps, delay: i * 10, config: { stiffness: 150 } })
}));
```

**Caso de uso:** "Construye tu futuro", "Arma tu estrategia"

---

### 7. Destello (flash)

**Descripción:** Explosión de luz que aparece y desaparece rápidamente.

**Elementos típicos:**
- Círculo o forma irregular con blur
- Opacidad: 0 → 100 → 0 en 10-15 frames
- Scale: 0 → 300% simultáneamente

**Easing:**
- `Easing.out(Easing.quad)` para expansión

**Ejemplo:**
```tsx
const flashOpacity = interpolate(frame, [40, 45, 50], [0, 1, 0]);
const flashScale = interpolate(frame, [40, 45], [0, 3], {
  easing: Easing.out(Easing.quad)
});
```

**Caso de uso:** "Idea brillante", "Momento eureka", "Impacto"

---

### 8. Bounce In (bounce_in)

**Descripción:** Objeto que cae desde arriba y rebota.

**Elementos típicos:**
- Objeto principal (calendario, ícono, etc.)
- Trayectoria vertical con overshoot
- Sombra que se agranda al acercarse al suelo

**Easing:**
- `Easing.out(Easing.back(3))` para rebote pronunciado

**Ejemplo:**
```tsx
const bounceY = interpolate(frame, [0, 30], [-300, 0], {
  easing: Easing.out(Easing.back(3))
});
const shadowScale = interpolate(frame, [0, 30], [0.5, 1], {
  easing: Easing.out(Easing.quad)
});
```

**Caso de uso:** "Llegó el momento", "Nuevo lanzamiento"

---

### 9. Fade In (fade_in)

**Descripción:** Aparición suave de elementos.

**Elementos típicos:**
- Opacidad: 0 → 1 en 15-30 frames
- Opcional: translate Y leve para movimiento

**Easing:**
- `Easing.inOut(Easing.cubic)` para suavidad

**Ejemplo:**
```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.inOut(Easing.cubic)
});
```

**Caso de uso:** Texto introductorio, transiciones suaves

---

### 10. Scale Emerge (scale_emerge)

**Descripción:** Objeto que emerge desde escala 0.

**Elementos típicos:**
- Scale: 0 → 100%
- Opacidad sincronizada con scale
- Opcional: rotación inicial

**Easing:**
- `spring({ stiffness: 200, damping: 15 })` para elasticidad

**Ejemplo:**
```tsx
const scale = spring({
  frame,
  fps,
  config: { stiffness: 200, damping: 15 }
});
```

**Caso de uso:** "Crece tu negocio", "Expansión"

---

## Easing Curves Disponibles

### Remotion

```tsx
import { interpolate, spring, Easing } from 'remotion';

// Easing estándar
Easing.out(Easing.back(2))      // Rebote al final
Easing.inOut(Easing.cubic)      // Suave entrada y salida
Easing.out(Easing.quad)         // Desaceleración
Easing.bezier([0.68, -0.55, 0.265, 1.55])  // Custom

// Springs
spring({ config: { damping: 10, stiffness: 150 } })  // Rebote
spring({ config: { damping: 20, stiffness: 100 } })  // Suave
```

### After Effects

```jsx
// Easing en keyframes
posProp.setTemporalEaseAtKey(
  1,  // índice del keyframe
  [KeyframeEase(30, true)],   // entrada
  [KeyframeEase(30, false)]   // salida
);

// Valores de easing
KeyframeEase(30, true)   // ease_out
KeyFrameEase(70, false)  // ease_in
```

---

## Mejores Prácticas

### 1. Múltiples Elementos
**✅ Correcto:** 5-8 elementos SVG (rect, circle, path, line)
**❌ Incorrecto:** 1-2 elementos simples

### 2. Easing Contextual
**✅ Correcto:** `Easing.out(Easing.back(2))` para rebote
**❌ Incorrecto:** Linear para todo

### 3. Capas y Profundidad
**✅ Correcto:** Drop-shadow, blur, opacidad para profundidad
**❌ Incorrecto:** Elementos planos sin profundidad

### 4. Timing Escalonado
**✅ Correcto:** Delays por índice: `i * 5 frames`
**❌ Incorrecto:** Todo aparece al mismo tiempo

### 5. Salida/Transición
**✅ Correcto:** Últimos 30 frames para salida o loop
**❌ Incorrecto:** Corte abrupto al final

---

## Referencias

- **Remotion Easing:** https://www.remotion.dev/docs/interpolate
- **After Effects Expressions:** https://helpx.adobe.com/after-effects/using/expression-language-reference.html
- **Easing Visualizer:** https://easings.net/
