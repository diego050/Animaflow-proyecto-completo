---
name: PromptVideo Design System
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0d0e10'
  surface-container-low: '#1b1c1d'
  surface-container: '#1f2021'
  surface-container-high: '#292a2b'
  surface-container-highest: '#343536'
  on-surface: '#e4e2e3'
  on-surface-variant: '#c4c6cd'
  inverse-surface: '#e4e2e3'
  inverse-on-surface: '#303032'
  outline: '#8e9197'
  outline-variant: '#43474c'
  surface-tint: '#b5c8df'
  primary: '#b5c8df'
  on-primary: '#203243'
  primary-container: '#2c3e50'
  on-primary-container: '#96a9be'
  inverse-primary: '#4e6073'
  secondary: '#ffb77d'
  on-secondary: '#4d2600'
  secondary-container: '#fd8b00'
  on-secondary-container: '#603100'
  tertiary: '#e3c19b'
  on-tertiary: '#412c11'
  tertiary-container: '#4e381c'
  on-tertiary-container: '#c1a17d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d1e4fb'
  primary-fixed-dim: '#b5c8df'
  on-primary-fixed: '#091d2e'
  on-primary-fixed-variant: '#36485b'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffddb7'
  tertiary-fixed-dim: '#e3c19b'
  on-tertiary-fixed: '#291802'
  on-tertiary-fixed-variant: '#5a4225'
  background: '#131315'
  on-background: '#e4e2e3'
  surface-variant: '#343536'
  mint-precision: '#00FFAB'
  deep-slate: '#0F172A'
  surface-panel: '#1E293B'
  border-technical: '#334155'
  grid-dot: '#334155'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  mono-ui:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  timestamp:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  grid-dot-interval: 20px
---

# PromptVideo: Estrategia de Identidad Visual y Diseño de Sistema

## 1. Misión Visual
Establecer a PromptVideo como la infraestructura técnica líder para la producción de video SaaS, priorizando la precisión determinista, el control humano y la integración profesional con After Effects.

---

## 2. Paleta de Colores: "The Blueprint Palette"
Evitamos el "AI purple" genérico en favor de tonos que evocan ingeniería y interfaces de edición técnica.

*   **Primario: Steel Blue (#2C3E50)** - Comunica estabilidad, profesionalismo técnico y profundidad. Es la base de nuestra confianza.
*   **Secundario: Cadmium Orange (#FF8C00)** - Utilizado exclusivamente para indicadores de precisión, puntos de anclaje y alertas técnicas. Rompe la frialdad sin ser agresivo.
*   **Acento/CTA: Mint Precision (#00FFAB)** - Para acciones positivas y estados de "Sync Ready". Es un color que destaca por su claridad tecnológica.
*   **Fondos/Superficies:**
    *   **Dark Mode (Deep Slate #0F172A):** Fondo principal para reducir la fatiga visual durante la edición.
    *   **Surfaces (#1E293B):** Paneles laterales y controles, con bordes definidos de 1px (#334155).
*   **Justificación:** Esta paleta refuerza la idea de "herramienta de precisión" (como AutoCAD o Resolve) en lugar de un juguete generativo.

---

## 3. Tipografía: "Precision & Clarity"
*   **Display:** *Inter Tight* (Bold/SemiBold). Moderna, geométrica, optimizada para legibilidad en títulos técnicos.
*   **Body/UI:** *Inter* (Regular/Medium). El estándar de oro para interfaces SaaS por su claridad en tamaños pequeños.
*   **Mono:** *JetBrains Mono*. Imprescindible para timestamps, variables de JSON y specs de exportación. Transmite que hay código y estructura real bajo el capó.
*   **Justificación:** Equilibra la estética de diseño moderno con la rigurosidad de un entorno de desarrollo.

---

## 4. Principios de Motion & UI
*   **Ritmo Deliberado:** Nada de rebotes "juguetones". Las transiciones son rápidas (150ms-250ms) con easing `cubic-bezier(0.4, 0, 0.2, 1)`.
*   **Microinteracciones:** Hover en botones con sutil expansión de borde (1px a 2px). Feedback de exportación mediante barras de progreso segmentadas (no continuas) para mostrar pasos técnicos reales.
*   **Manejo de Estado:** Uso de "Skeletons" técnicos que muestran la estructura de la capa antes de cargar el contenido visual.

---

## 5. Metáforas Visuales
### ✅ Permitidas
1.  **Nodos y Conectores:** Líneas de 1px que unen el guion con la voz y el visual.
2.  **Layers Separadas:** Visualización de profundidad (z-index) para enfatizar la editabilidad en AE.
3.  **Grids de Referencia:** Fondos con puntos sutiles cada 20px.
4.  **Wireframes:** Elementos que muestran su "esqueleto" durante el procesamiento.
5.  **Marcadores de Frame:** Timestamps exactos (00:00:00:00).

### ❌ Prohibidas
1.  **Cerebros/Neuronas:** Cliché de IA que oculta el proceso.
2.  **Polvo de Estrellas/Magia:** Sugiere resultados aleatorios, no controlados.
3.  **Humanoides/Robots:** Aleja el producto de la herramienta técnica.
4.  **Gradientes Iridescent:** Demasiado "startup genérica".
5.  **Sombras Difusas Extrems:** Buscamos bordes definidos y precisión.

---

## 6. Conceptos de Logo (Preview)
1.  **Sync Frame:** Dos corchetes técnicos envolviendo un punto de anclaje central.
2.  **Layer Bridge:** Tres líneas horizontales escalonadas que forman una flecha de flujo.
3.  **The Spec Grid:** Una "P" formada por puntos de grid conectados por líneas finas.

---

## 7. Check de Coherencia
*   **Control Humano:** Sí. Todo el sistema visual enfatiza capas, tiempos y ajustes manuales.
*   **Privacidad:** Sí. El uso de colores sobrios y interfaces "locales" transmite seguridad de grado industrial.
*   **Diferenciación:** Sí. Mientras otros venden "un botón para hacer video", nosotros vendemos un "pipeline de producción profesional".
