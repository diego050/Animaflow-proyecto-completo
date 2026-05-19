# ADR-004: Motor de Animaciones Narrativas de Alta Fidelidad

- **Fecha:** 2026-05-11
- **Estado:** Aceptado
- **Área:** Backend (pipeline.py) · Agentes (system_prompt.md)

---

## Contexto

El pipeline original de AnimaFlow generaba componentes Remotion genéricos: texto centrado sobre un fondo oscuro con partículas. Aunque funcionalmente correcto, el resultado carecía de valor narrativo y diferenciación visual frente a herramientas de video genéricas.

El usuario identificó que para un guion sobre "El chocolate no es un capricho, es tu mejor inversión" se esperaba una barra de chocolate animada, no texto flotando sobre partículas.

## Decisión

### 1. Nuevo estándar de generación: Animaciones Semánticas

Cada escena generada por AnimaFlow DEBE contener un **objeto SVG principal** que ilustre visualmente el concepto del texto del guion. El texto acompaña el objeto, no lo reemplaza.

### 2. Arquitectura de 4 capas (obligatoria)

| Capa | zIndex | Descripción |
|---|---|---|
| FONDO | 0 | `radial-gradient` o `linear-gradient`. Nunca negro puro. |
| AURA/GLOW | 1 | Div grande con `filter: blur(80px)`, opacidad 0.12–0.2 |
| OBJETO PRINCIPAL | 5 | SVG detallado 250–400px con `spring()` damping 10, stiffness 150 |
| TEXTO | 10 | `fontSize` 60–72px, `fontWeight` 900, aparece en frame 25–50 |

### 3. Estándares de calidad mínimos

- SVG principal: **250–400px** (fallo si es más pequeño)
- Detalle SVG: **mínimo 5–8 elementos** (`rect`, `path`, `circle`, `line`, `defs`, `linearGradient`)
- Tipografía: `letterSpacing: -2px`, `textTransform: uppercase`, `fontWeight: 900`
- Glow de entrada: Rotación spring de -15° → 0°

### 4. Prompt de alta fidelidad con arquetipos

El prompt enviado a Gemini contiene:
- Las variables dinámicas del guion (`text`, `duration`, `media_query`, colores)
- Un catálogo de **10 arquetipos visuales** con especificaciones detalladas de SVG
- Instrucciones explícitas de tamaño, detalle y técnicas de animación Remotion

### 5. Separación de responsabilidades en el prompt

El prompt se construye en dos partes concatenadas en Python:
- `prompt_header`: f-string con las variables dinámicas
- `prompt_code`: string plano con la estructura base del componente TSX

Esta separación evita el `SyntaxError` causado por las llaves `{}` de JSX dentro de f-strings de Python.

### 6. Propuesta de campo `animation_spec` en spec.json

Se documenta `animation_spec` como campo futuro estructurado que amplía `media_query` con JSON detallado (archetype, object size, colors, background gradient, typography). Actualmente es inferido por el LLM del `media_query`; en la próxima iteración el paso de Batch Visuals lo generará como JSON directamente.

## Consecuencias

### Positivas
- Las animaciones generadas son narrativamente coherentes con el contenido del guion
- El LLM tiene instrucciones precisas de calidad: no puede devolver un ícono minimalista
- El catálogo de arquetipos es extensible sin cambiar la arquitectura del pipeline
- El campo `animation_spec` sienta la base para un control granular futuro

### Negativas / Trade-offs
- El prompt es más largo (~2KB vs ~500B anterior) → mayor consumo de tokens
- Mayor dependencia de la capacidad creativa del LLM para SVG detallado → puede generar código TSX más complejo con potencial de errores de compilación
- El campo `animation_spec` aún no se genera automáticamente (pendiente iteración futura)

## Alternativas consideradas

- **Asset library estática**: Mantener SVGs prediseñados por archetype y elegir en base a keywords → Mayor control pero menos flexibilidad para conceptos nuevos
- **Seguir con texto + partículas**: Rechazado por no aportar diferenciación visual

## Próximos pasos

1. Implementar generación automática de `animation_spec` en el paso `generate_batch_visuals_with_llm`
2. Crear validador que rechace componentes generados sin CAPA 3 (objeto SVG)
3. Considerar librería de SVG base reutilizables para los 10 arquetipos más comunes
