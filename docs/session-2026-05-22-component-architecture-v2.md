# 📋 Session Report: Component Architecture v2
**Fecha:** 2026-05-22  
**Autor:** AnimaFlow AI Orchestrator  
**Scope:** Fases 9-10 + Corrección Arquitectónica (Fases A-B)

---

## 1. Resumen Ejecutivo

En esta sesión se completaron **4 bloques de trabajo críticos**:
1. **Fase 9 — E-Commerce & Retail:** 4 componentes de conversión B2C
2. **Fase 10 — Interfaces Interactivas:** 4 componentes de storytelling dinámico
3. **Fase A — Corrección Arquitectónica:** 5 fallos graves detectados y corregidos
4. **Fase B — Colores Dinámicos AE:** El generador de After Effects ahora lee colores del parser

**Estado del sistema:** 33 componentes React (Remotion) + 1 archivo de tipos, con pipeline completo React → Parser → ExtendScript → After Effects.

---

## 2. Fase 9: E-Commerce & Retail (Completada)

### Componentes Creados

| Componente | Archivo | Técnica AE Destacada |
|---|---|---|
| `ProductCardReveal` | `frontend/src/remotion/components/ProductCardReveal.tsx` | Shape Layer con Bezier bounce en Position Y |
| `TestimonialReview` | `frontend/src/remotion/components/TestimonialReview.tsx` | 5 Polystars nativos (`ADBE Vector Shape - Star`) con color stagger |
| `ShoppingCartBadge` | `frontend/src/remotion/components/ShoppingCartBadge.tsx` | Elipse roja con Scale pop (150% → 90% → 100%) |
| `FeatureChecklist` | `frontend/src/remotion/components/FeatureChecklist.tsx` | Trim Paths (`ADBE Vector Filter - Trim`) en forma V de checkmark |

### Pipeline
- **Parser:** `backend/app/modules/parsers/tsx/components.py` — Regex para `<ProductCardReveal />`, `<TestimonialReview />`, etc.
- **AE Generator:** `backend/app/modules/ae_export/deterministic/components_generator.py` — Traducción a ExtendScript
- **LLM Prompt:** `backend/app/modules/remotion/component_generator.py` — Documentación para que la IA use los componentes

---

## 3. Fase 10: Interfaces Interactivas (Completada)

### Componentes Creados

| Componente | Archivo | Técnica AE Destacada |
|---|---|---|
| `TinderSwipeCard` | `frontend/src/remotion/components/TinderSwipeCard.tsx` | Position X + Rotation Z sincronizados matemáticamente |
| `CalendarDatePop` | `frontend/src/remotion/components/CalendarDatePop.tsx` | Doble bucle `for` en ExtendScript genera matriz 7×5 de Text Layers |
| `SplitScreenGrid` | `frontend/src/remotion/components/SplitScreenGrid.tsx` | 4 Shape Layers con Scale + Position Bezier a 4 esquinas |
| `MusicPlayerUI` | `frontend/src/remotion/components/MusicPlayerUI.tsx` | Barra de progreso con Scale X 0→100 vinculada a `comp.duration` |

---

## 4. Fase A: Corrección Arquitectónica (Completada)

### 5 Fallos Detectados y Corregidos

#### Fallo 1: Colores Hardcodeados
- **Problema:** `SubscribeButton` tenía `#FF0000` quemado en línea 24. Imposible cambiar a azul.
- **Solución:** Todos los componentes ahora aceptan `color`, `bgColor`, `textColor` como props dinámicas.
- **Archivo:** Todos los `.tsx` en `frontend/src/remotion/components/`

#### Fallo 2: Cadena `elif` Exclusiva
- **Problema:** En `components_generator.py`, la cadena `if/elif` significaba que si una escena tenía múltiples componentes, solo se renderizaba el primero en After Effects.
- **Solución:** 31 ocurrencias de `elif` cambiadas a `if`, permitiendo composición de múltiples componentes por escena.
- **Archivo:** `backend/app/modules/ae_export/deterministic/components_generator.py`

#### Fallo 3: Props Insuficientes
- **Problema:** 90% de componentes no aceptaban `color`, `fontSize`, `delay`.
- **Solución:** Interfaz `UniversalProps` en TypeScript + defaults en el parser Python.
- **Archivo:** `frontend/src/remotion/components/types.ts`

#### Fallo 4: Parser Limitado
- **Problema:** Si el LLM generaba `<SubscribeButton color="#3b82f6" />`, el parser ignoraba el `color`.
- **Solución:** `_extract_universal_props()` captura CUALQUIER prop (string/numérico) automáticamente con regex universal.
- **Archivo:** `backend/app/modules/parsers/tsx/components.py`

#### Fallo 5: Sin Composición
- **Problema:** No se podían combinar múltiples componentes en una escena AE.
- **Solución:** Consecuencia directa de corregir Fallo 2 (`elif` → `if`).

### Nuevas Funciones Creadas

```python
# components.py
def _extract_universal_props(props_str: str) -> dict:
    """Captura CUALQUIER prop (string o numérico) de atributos JSX."""

def _detect_and_parse(tsx_code: str, component_name: str, defaults: dict) -> dict | None:
    """Detecta componente + extrae props + aplica defaults + coerce tipos."""
```

---

## 5. Fase B: AE Generator Dinámico (Completada)

### Cambios en `components_generator.py`

| Componente | Antes (hardcoded) | Ahora (dinámico) |
|---|---|---|
| `SubscribeButton` | `[1, 0, 0]` (rojo fijo) | `hex_to_rgb_array(btn_color)` |
| `ProductCardReveal` | `[1,1,1]` (blanco fijo) | `hex_to_rgb_array(card_bg)` |
| `ProductCardReveal` (texto) | `[0.05, 0.09, 0.16]` fijo | `hex_to_rgb_array(card_text_color)` |
| `ProductCardReveal` (precio) | `[0.06, 0.72, 0.50]` fijo | `hex_to_rgb_array(price_color)` |
| `TestimonialReview` (estrellas) | `[0.98, 0.75, 0.14]` fijo | `hex_to_rgb_array(star_color)` |
| `ShoppingCartBadge` | `[0.93, 0.26, 0.26]` fijo | `hex_to_rgb_array(badge_color)` |
| `FeatureChecklist` (texto) | `[0.1, 0.1, 0.2]` fijo | `hex_to_rgb_array(check_text_color)` |
| `FeatureChecklist` (check) | `[0.06, 0.72, 0.50]` fijo | `hex_to_rgb_array(check_color)` |
| `TinderSwipeCard` (fondo) | `[1,1,1]` fijo | `hex_to_rgb_array(tinder_bg)` |
| `TinderSwipeCard` (sello) | `[0.13, 0.77, 0.36]` + `"MATCH!"` | `hex_to_rgb_array(stamp_color)` + `stamp_text` |
| `CalendarDatePop` (círculo) | `[0.93, 0.26, 0.26]` fijo | `hex_to_rgb_array(circle_color)` |
| `CalendarDatePop` (texto) | `[0.2, 0.25, 0.33]` fijo | `hex_to_rgb_array(cal_text_color)` |
| `MusicPlayerUI` (fondo) | `[0.1, 0.1, 0.1]` fijo | `hex_to_rgb_array(music_bg)` |
| `MusicPlayerUI` (progreso) | `[0.11, 0.72, 0.33]` fijo | `hex_to_rgb_array(progress_color)` |

---

## 6. Inventario Actual de Componentes (33 total)

### Tipografía (4)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 1 | `TextReveal` | `color`, `animation`, `x`, `y`, `fontSize`, `delay` |
| 2 | `Typewriter` | `text`, `color`, `cursorColor`, `x`, `y`, `fontSize`, `delay` |
| 3 | `GlitchTitle` | `color`, `x`, `y`, `fontSize`, `delay` |
| 4 | `HighlightText` | `color`, `highlightColor`, `textColor`, `x`, `y`, `fontSize`, `delay` |

### Fondos (6)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 5 | `KineticBackground` | `color1`, `color2`, `theme`, `speed` |
| 6 | `ParticleField` | `color1`, `color2`, `density`, `color`, `count`, `speed`, `size` |
| 7 | `RaysOfLight` | `color1`, `color2`, `numRays`, `color`, `opacity`, `speed` |
| 8 | `GridPerspective` | `color1`, `color2`, `speed` |
| 9 | `FloatingBlobs` | `color1`, `color2`, `blur` |
| 10 | `AbstractWave` | `color`, `amplitude`, `frequency` |

### UI Mockups (4)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 11 | `BrowserWindow` | `text`, `url`, `bgColor`, `width`, `height`, `x`, `y` |
| 12 | `SearchEngineTyping` | `text`, `query`, `bgColor`, `textColor`, `width`, `delay` |
| 13 | `CursorClick` | `startX`, `startY`, `color`, `x`, `y`, `clickFrame` |
| 14 | `PhoneMockup` | `text`, `bgColor`, `screenColor`, `x`, `y` |

### Data Viz (3)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 15 | `BarChartReveal` | `color1`, `color2`, `color`, `bgColor`, `delay` |
| 16 | `TrendLine` | `color`, `lineWidth`, `delay` |
| 17 | `PercentageRing` | `color`, `bgColor`, `textColor`, `targetPercentage`, `label`, `delay` |

### Formas (2)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 18 | `NetworkNodes` | `nodeColor`, `lineColor`, `color`, `nodeCount`, `delay` |
| 19 | `AbstractWave` | `color`, `amplitude`, `frequency` |

### Transiciones (4)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 20 | `ZoomBlurTransition` | `intensity`, `delay` |
| 21 | `GlitchTransition` | `intensity`, `color`, `delay` |
| 22 | `WipeTransition` | `color`, `angle`, `speed` |
| 23 | `LightLeakTransition` | `color`, `intensity`, `delay` |

### VFX y Social (3)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 24 | `GlobalVFX` | `grainIntensity`, `chromaticAmount`, `vignetteIntensity` |
| 25 | `SocialProgressBar` | `color`, `height` |
| 26 | `SubscribeButton` | `color`, `textColor`, `clickedColor`, `text`, `clickedText`, `clickFrame`, `fontSize`, `delay` |

### E-Commerce (4)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 27 | `ProductCardReveal` | `title`, `price`, `bgColor`, `priceColor`, `textColor`, `fontSize`, `delay`, `x`, `y` |
| 28 | `TestimonialReview` | `author`, `review`, `rating`, `starColor`, `bgColor`, `textColor`, `fontSize`, `x`, `y`, `delay` |
| 29 | `ShoppingCartBadge` | `triggerFrame`, `badgeColor`, `iconColor`, `delay`, `x`, `y` |
| 30 | `FeatureChecklist` | `itemsStr`, `checkColor`, `textColor`, `bgColor`, `fontSize`, `delay`, `x`, `y` |

### Interfaces Interactivas (4)
| # | Componente | Props Dinámicas v2 |
|---|---|---|
| 31 | `TinderSwipeCard` | `name`, `subtitle`, `swipeFrame`, `bgColor`, `stampColor`, `stampText`, `x`, `y`, `delay` |
| 32 | `CalendarDatePop` | `targetDate`, `month`, `circleColor`, `bgColor`, `textColor`, `x`, `y`, `delay` |
| 33 | `SplitScreenGrid` | `splitFrame` |
| 34 | `MusicPlayerUI` | `songTitle`, `artist`, `progressColor`, `bgColor`, `albumColor`, `x`, `y`, `delay` |

---

## 7. Archivos Modificados

| Archivo | Acción | Líneas |
|---|---|---|
| `frontend/src/remotion/components/types.ts` | NUEVO | 21 |
| `frontend/src/remotion/components/ProductCardReveal.tsx` | REESCRITO | 74 |
| `frontend/src/remotion/components/TestimonialReview.tsx` | REESCRITO | 66 |
| `frontend/src/remotion/components/ShoppingCartBadge.tsx` | REESCRITO | 49 |
| `frontend/src/remotion/components/FeatureChecklist.tsx` | REESCRITO | 56 |
| `frontend/src/remotion/components/SubscribeButton.tsx` | REESCRITO | 75 |
| `frontend/src/remotion/components/TinderSwipeCard.tsx` | REESCRITO | 61 |
| `frontend/src/remotion/components/CalendarDatePop.tsx` | REESCRITO | 63 |
| `frontend/src/remotion/components/MusicPlayerUI.tsx` | REESCRITO | 61 |
| `frontend/src/remotion/components/SplitScreenGrid.tsx` | NUEVO | 86 |
| `backend/app/modules/parsers/tsx/components.py` | REESCRITO | ~250 |
| `backend/app/modules/ae_export/deterministic/components_generator.py` | EDITADO (31 elif→if + 14 colores dinámicos) | ~1235 |
| `backend/app/modules/remotion/component_generator.py` | EDITADO (LLM prompt ampliado) | ~370 |

---

## 8. Decisiones Técnicas (ADR)

### ADR-001: `elif` → `if` para composición
- **Contexto:** El generador de AE usaba `elif`, impidiendo múltiples componentes por escena.
- **Decisión:** Cambiar a `if` independientes. Las colisiones de variables en ExtendScript no son problema porque `var` en JS se redeclara sin error.
- **Consecuencia:** Ahora una escena puede tener `KineticBackground` + `TextReveal` + `SubscribeButton` + `SocialProgressBar` simultáneamente.

### ADR-002: Parser universal vs. regex por componente
- **Contexto:** Añadir un nuevo prop requería editar manualmente el regex del componente.
- **Decisión:** `_extract_universal_props()` captura todo automáticamente. `_detect_and_parse()` aplica defaults.
- **Consecuencia:** Cualquier prop nuevo que se añada a un `.tsx` se captura automáticamente sin tocar el parser.

### ADR-003: `UniversalProps` como interfaz base
- **Contexto:** No existía un contrato común entre componentes.
- **Decisión:** Interfaz TypeScript con `x`, `y`, `color`, `bgColor`, `textColor`, `fontSize`, `delay`.
- **Consecuencia:** Consistencia garantizada. El LLM sabe que puede usar estos props en cualquier componente.
