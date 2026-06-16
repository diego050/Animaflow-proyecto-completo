"""
Estrategia de generacion de componentes: genera un JSON AnimaComposer.

El LLM evalúa cada escena y decide cómo animarla usando exclusivamente
componentes de la Standard Library.
Todo se retorna como un AnimaComposerSpec válido.
"""
import json
import math
import re
from typing import Any, Optional
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.schemas.spec import AnimaComposerSpec, AnimaBackground, AnimaLayer
from app.services.iconify_search import find_best_icons
from app.modules.llm.spec_validator import validate_and_fix

logger = get_logger("llm.strategy")


def _sanitize_llm_json(raw: str) -> str:
    """Truncate numbers with excessive decimal places from LLM output."""
    return re.sub(r'(\d+\.\d{6})\d+', r'\1', raw)


# ── Numeric coercion helper ──────────────────────────────────────────────────

def _coerce_number(value: Any) -> Any:
    """Convert string numbers to int/float, return unchanged if not convertible.

    Handles edge cases:
    - Leading non-numeric chars (commas, quotes): `",180"` → 180
    - CSS units: `"160px"` → 160, `"2.5rem"` → 2.5
    - Thousands separators: `"1,200"` → 1200
    """
    if isinstance(value, str):
        cleaned = value.strip()
        # Strip leading non-numeric prefix (commas, quotes, spaces, etc.)
        cleaned = re.sub(r'^[^0-9.\-]+', '', cleaned)
        # Strip trailing CSS units (px, rem, em, %, vh, vw, etc.)
        cleaned = re.sub(r'(px|rem|em|vh|vw|%|pt|cm|mm|in)$', '', cleaned, flags=re.IGNORECASE)
        # Remove thousands separators (commas between digits)
        cleaned = re.sub(r'(\d),(\d)', r'\1\2', cleaned)
        try:
            if "." in cleaned:
                return float(cleaned)
            return int(cleaned)
        except (ValueError, TypeError):
            return value
    return value


# ── Canvas dimensions helper ─────────────────────────────────────────────────

def _get_canvas_dimensions(aspect_ratio: str) -> tuple[int, int]:
    """Get canvas dimensions for a given aspect ratio or custom size."""
    # Standard presets
    presets = {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
        "4:5": (1080, 1350),
        "4:3": (1440, 1080),
        "3:4": (1080, 1440),
    }

    # Check if it's a standard preset
    if aspect_ratio in presets:
        return presets[aspect_ratio]

    # Check if it's a custom size in format "WxH" (e.g., "500x800")
    if "x" in aspect_ratio.lower():
        try:
            parts = aspect_ratio.lower().split("x")
            w, h = int(parts[0]), int(parts[1])
            if 100 <= w <= 4096 and 100 <= h <= 4096:
                return (w, h)
        except (ValueError, IndexError):
            pass

    # Fallback
    return (1080, 1920)


# ── Path Normalizer ──────────────────────────────────────────────────────────

def _normalize_paths(spec: dict, width: int, height: int) -> dict:
    """
    Normalize absolute SVG path coordinates to be centered around (0, 0).

    If pathData contains numbers that look absolute (> 100 heuristic),
    subtract width/2 from X coordinates and height/2 from Y coordinates.
    Skips paths containing 'A' (arc) commands to avoid breaking complex curves.
    """
    half_w = width / 2
    half_h = height / 2

    for layer in spec.get("layers", []):
        path_data = layer.get("pathData")
        if not path_data or not isinstance(path_data, str):
            continue

        # Skip arc commands — too complex to normalize safely
        if "A" in path_data or "a" in path_data:
            continue

        # Find all numbers in the path
        numbers = re.findall(r'(-?\d+\.?\d*)', path_data)

        if not numbers:
            continue

        # Heuristic: only normalize if the first number looks absolute
        try:
            first_num = float(numbers[0])
            if first_num <= 100:
                continue
        except ValueError:
            continue

        # Replace numbers: even index = X (subtract half_w), odd index = Y (subtract half_h)
        counter = 0

        def replace_number(match: re.Match) -> str:
            nonlocal counter
            original = match.group(0)
            try:
                value = float(original)
                if counter % 2 == 0:
                    value -= half_w
                else:
                    value -= half_h
                # Format: keep as int if whole number, otherwise 2 decimal places
                formatted = f"{value:.0f}" if value == int(value) else f"{value:.2f}"
            except ValueError:
                formatted = original
            counter += 1
            return formatted

        layer["pathData"] = re.sub(r'-?\d+\.?\d*', replace_number, path_data)

    return spec


# ── Smart Layout Engine ──────────────────────────────────────────────────────

def _apply_smart_layout(spec: dict) -> dict:
    """
    Assign default x/y positions to layers that are missing them,
    distributing elements vertically to avoid overlap.

    - background: x=0, y=0
    - text: start at y=150, increment by 80 per text layer
    - path, circle, component, rect, image: start at y=-150, increment by 150 per layer
    - x defaults to 0 if missing
    """
    text_y = 150
    visual_y = -150

    for layer in spec.get("layers", []):
        layer_type = layer.get("type", "")

        # Default x to 0 if missing
        if "x" not in layer or layer["x"] is None:
            layer["x"] = 0

        # Default y based on type if missing
        if "y" not in layer or layer["y"] is None:
            if layer_type == "background":
                layer["y"] = 0
            elif layer_type == "text":
                layer["y"] = text_y
                text_y += 80
            elif layer_type in ("path", "circle", "component", "rect", "image"):
                layer["y"] = visual_y
                visual_y += 150
            else:
                # Fallback: treat as visual
                layer["y"] = visual_y
                visual_y += 150

    return spec


# ── Coordinate Clamping ──────────────────────────────────────────────────────

def _clamp_coordinates(spec: dict, width: int, height: int) -> dict:
    """
    Clamp layer x/y coordinates to keep elements within safe screen margins.

    Calculates a 10% margin on each axis and ensures no layer position
    exceeds the safe range, preventing elements from rendering off-screen.
    """
    margin_x = width * 0.1
    margin_y = height * 0.1

    min_x = -(width / 2 - margin_x)
    max_x = width / 2 - margin_x
    min_y = -(height / 2 - margin_y)
    max_y = height / 2 - margin_y

    for layer in spec.get("layers", []):
        if "x" in layer and layer["x"] is not None:
            layer["x"] = max(min_x, min(max_x, layer["x"]))
        if "y" in layer and layer["y"] is not None:
            layer["y"] = max(min_y, min(max_y, layer["y"]))

    return spec


# ── Fase 3: detección y resolución de colisiones por bounding box ─────────────
# El solver es ciego al TAMAÑO real de los elementos (un texto de 3 líneas en y=0
# pisa un icono en y=-250). Aquí estimamos la caja de cada capa de CONTENIDO y
# las separamos verticalmente. Los fondos/decorativos que llenan o centran el
# lienzo NO se reposicionan (son backdrop).

# Componentes que llenan/centran el lienzo como fondo/efecto → no se reposicionan
# y NO cuentan como "visual real" (son backdrop/efecto, no el sujeto de la escena).
_FILL_COMPONENTS = {
    "KineticBackground", "ParticleField", "FloatingBlobs", "RaysOfLight",
    "AbstractWave", "GlobalVFX", "NetworkNodes", "GradientOverlay",
    "GridPerspective", "SoundWaveCircle",
    # v8 (Fase 5): efectos cinematográficos full-screen.
    "CinematicBars", "Spotlight", "CameraShake",
}
_TEXT_COMPONENTS_BB = {
    "Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText",
    "WordHighlight", "SplitText", "TextSwap", "HighlightText",
    "StrikethroughText", "UnderlineReveal", "GlitchTitle", "QuoteBlock",
    "GradientText",
}


# Tamaño de fuente aproximado por keyword `size` en badges/botones (escala video).
_SIZE_FONT = {"sm": 32, "md": 42, "lg": 54}


def _estimate_layer_height(layer: dict, canvas_w: int, canvas_h: int) -> float:
    """Estimación (px) CONSERVADORA del alto de una capa para detectar solapes.

    Mejor sobreestimar que subestimar: si nos quedamos cortos, dos capas se
    pisan (peor); si sobramos, quedan algo más separadas (aceptable).
    """
    comp = layer.get("componentName", "")
    ltype = layer.get("type", "")

    def _num(v, default):
        try:
            return float(v)
        except (TypeError, ValueError):
            return float(default)

    if ltype == "text" or comp in _TEXT_COMPONENTS_BB:
        # Default 84 (los componentes de texto rondan 84-88); ratio 0.6 y
        # lineHeight 1.4 para no subestimar nº de líneas ni alto de línea.
        fs = _num(layer.get("fontSize"), 84)
        width = _num(layer.get("width"), canvas_w * 0.85)
        text = str(layer.get("text", "") or "")
        chars_per_line = max(1, int(width / (fs * 0.6)))
        lines = max(1, math.ceil(len(text) / chars_per_line))
        max_lines = layer.get("maxLines")
        if isinstance(max_lines, int) and max_lines > 0:
            lines = min(lines, max_lines)
        return lines * fs * 1.4 + fs * 0.3
    if comp in ("IconifyIcon", "AnimatedIcon"):
        return _num(layer.get("size"), 120) * 1.1
    if comp == "StyleCard":
        h = layer.get("height")
        return _num(h, canvas_h * 0.25) if h else canvas_h * 0.25
    if comp in ("StyleBadge", "StyleButton", "StyleChip", "SubscribeButton", "FloatingBadge", "StyleCallout"):
        fs = layer.get("fontSize")
        fs = _num(fs, 42) if fs is not None else _SIZE_FONT.get(str(layer.get("size", "md")), 42)
        return fs * 2.8  # incluye padding vertical generoso
    return 160.0


def _resolve_vertical_overlaps(spec: dict, canvas_w: int, canvas_h: int) -> dict:
    """Separa verticalmente las capas de contenido que se solapan (Fase 3)."""
    layers = spec.get("layers", [])
    content = [
        l for l in layers
        if l.get("type") != "background"
        and not (l.get("type") == "component" and l.get("componentName") in _FILL_COMPONENTS)
    ]
    if len(content) < 2:
        return spec

    items = []  # [layer, y_center, height]
    for l in content:
        y = l.get("y", 0)
        try:
            y = float(y)
        except (TypeError, ValueError):
            y = 0.0
        items.append([l, y, _estimate_layer_height(l, canvas_w, canvas_h)])

    items.sort(key=lambda it: it[1])
    min_gap = max(40.0, canvas_h * 0.03)

    # Empujar hacia abajo cada capa que invada la anterior.
    for i in range(1, len(items)):
        prev_bottom = items[i - 1][1] + items[i - 1][2] / 2
        cur_top = items[i][1] - items[i][2] / 2
        if cur_top < prev_bottom + min_gap:
            items[i][1] += (prev_bottom + min_gap) - cur_top

    # Mantener la pila dentro de la zona segura sin perder el orden/intención.
    safe_top = -canvas_h * 0.43
    safe_bottom = canvas_h * 0.43
    top = items[0][1] - items[0][2] / 2
    bottom = items[-1][1] + items[-1][2] / 2
    shift = 0.0
    if bottom > safe_bottom:
        shift = safe_bottom - bottom
    if top + shift < safe_top:
        shift = safe_top - top  # priorizar que el tope entre en pantalla

    moved = 0
    for layer, y, _h in items:
        new_y = int(round(y + shift))
        if new_y != layer.get("y"):
            moved += 1
        layer["y"] = new_y

    if moved:
        logger.info("Fase 3: de-solapadas %d capas de contenido (gap=%.0f)", moved, min_gap)
    return spec


# ── Fase 4: atenuar decorativos ruidosos detrás del contenido ────────────────
# Decorativos de formas/líneas sólidas que, a opacidad alta detrás del texto,
# generan clutter (ej. FloatingBlobs rojos/cyan grandes en la escena 3).
_BUSY_DECORATIVE = {
    "FloatingBlobs", "NetworkNodes", "SoundWaveCircle", "GridPerspective",
    "AbstractWave", "RaysOfLight",
}
_DECORATIVE_OPACITY_CAP = 0.30


def _tame_decorative_backgrounds(spec: dict) -> dict:
    """Baja la opacidad de decorativos ruidosos cuando hay contenido encima."""
    layers = spec.get("layers", [])
    has_content = any(
        l.get("type") == "text"
        or (l.get("type") == "component" and l.get("componentName") not in _FILL_COMPONENTS)
        for l in layers
    )
    if not has_content:
        return spec
    for l in layers:
        if l.get("type") == "component" and l.get("componentName") in _BUSY_DECORATIVE:
            cur = l.get("opacity")
            try:
                cur = float(cur)
            except (TypeError, ValueError):
                cur = 1.0
            new = round(min(cur, _DECORATIVE_OPACITY_CAP), 2)
            if new != l.get("opacity"):
                l["opacity"] = new
                logger.info("Fase 4: atenuado decorativo %s a opacity=%.2f", l.get("componentName"), new)
    return spec


# ── Fase 3/4: dedup de CTA (botón/badge que repite lo ya narrado) ────────────
_CTA_COMPONENTS = {"StyleButton", "StyleBadge", "SubscribeButton", "StyleChip", "FloatingBadge"}


def _norm_text(s: object) -> str:
    return re.sub(r"[^\w\s]", "", str(s or ""), flags=re.UNICODE).lower().strip()


def _dedup_cta_components(spec: dict) -> dict:
    """Elimina un CTA (botón/badge) cuyo texto YA está en el texto narrado.

    La regla de prompt no basta (es blanda). Si el botón dice "Sígueme" y el texto
    hablado dice "...y sígueme!", el botón es redundante Y suele solaparse → se quita
    (la narración/karaoke ya transmite el CTA). Conservador: solo substring claro.
    """
    layers = spec.get("layers", [])
    narrated = [
        _norm_text(l.get("text"))
        for l in layers
        if l.get("type") == "text"
        or (l.get("type") == "component" and l.get("componentName") in _TEXT_COMPONENTS_BB)
    ]
    narrated = [t for t in narrated if t]
    if not narrated:
        return spec

    kept = []
    for l in layers:
        if l.get("type") == "component" and l.get("componentName") in _CTA_COMPONENTS:
            ct = _norm_text(l.get("text"))
            if len(ct) >= 4 and any(ct in tb for tb in narrated):
                logger.info(
                    "Fase 3: CTA duplicado eliminado (%s '%s' ya está en el texto narrado)",
                    l.get("componentName"), l.get("text"),
                )
                continue
        kept.append(l)
    spec["layers"] = kept
    return spec


# ── Fase 5: refuerzo determinista de "texto opcional por escena" ─────────────
# El prompt pide que NO toda escena tenga texto (el audio ya narra), pero es una
# regla blanda y el LLM tiende a poner texto en TODAS. Aquí lo forzamos de forma
# determinista: una proporción de las escenas DEL MEDIO se vuelve "visual pura"
# (sin texto en pantalla), escalando con el nº de escenas. Nunca la primera
# (gancho) ni la última (CTA/cierre), y solo si queda un visual real que sostenga
# la escena (un texto sin nada detrás dejaría la pantalla vacía).

_ICON_COMPONENTS_VP = {"IconifyIcon", "AnimatedIcon"}


def _visual_pure_indices(total_scenes: int) -> set[int]:
    """Índices de escena (determinista) que deben ir SIN texto en pantalla.

    - < 3 escenas: ninguna (videos cortos necesitan su texto).
    - Nunca la primera ni la última.
    - ~1 de cada 3 escenas del medio, repartidas uniformemente, mínimo 1.
    """
    if total_scenes < 3:
        return set()
    middle = list(range(1, total_scenes - 1))  # excluye gancho y cierre
    if not middle:
        return set()
    k = max(1, len(middle) // 3)
    if k == 1:
        return {middle[len(middle) // 2]}
    chosen: set[int] = set()
    for j in range(k):
        pos = round(j * (len(middle) - 1) / (k - 1))
        chosen.add(middle[pos])
    return chosen


def _is_text_layer(layer: dict) -> bool:
    return (
        layer.get("type") == "text"
        or (layer.get("type") == "component" and layer.get("componentName") in _TEXT_COMPONENTS_BB)
    )


def _layer_has_icon(layer: dict) -> bool:
    """¿La capa es un ícono o un grupo que contiene un ícono?"""
    if layer.get("type") == "component" and layer.get("componentName") in _ICON_COMPONENTS_VP:
        return True
    if layer.get("icon"):
        return True
    for child in layer.get("children", []) or []:
        if _layer_has_icon(child):
            return True
    return False


def _strip_text_for_visual_scene(spec: dict, canvas_w: int, canvas_h: int) -> tuple[dict, bool]:
    """Quita las capas de texto para dejar la escena VISUAL PURA.

    Solo procede si, tras quitar el texto, queda al menos un visual real
    (ícono/imagen/componente no-texto que no sea solo fondo). Si lo único no-fondo
    es texto, NO se toca (mejor texto que pantalla vacía). Si el héroe que queda es
    un único ícono, se centra y se agranda para que la escena se vea intencional.
    """
    layers = spec.get("layers", [])

    def _is_real_visual(l: dict) -> bool:
        if _is_text_layer(l):
            return False
        if l.get("type") == "background":
            return False
        if l.get("type") == "component" and l.get("componentName") in _FILL_COMPONENTS:
            return False
        # grupo cuyo único contenido era texto no cuenta
        if l.get("type") == "group":
            return any(_is_real_visual(c) or _layer_has_icon(c) for c in l.get("children", []) or [])
        return True

    has_text = any(_is_text_layer(l) for l in layers)
    remaining_visuals = [l for l in layers if _is_real_visual(l)]
    if not has_text or not remaining_visuals:
        return spec, False

    kept = [l for l in layers if not _is_text_layer(l)]
    spec["layers"] = kept

    # Si queda un único visual y es un ícono, hacerlo el héroe: centrado y grande.
    icon_visuals = [l for l in kept if _layer_has_icon(l) and l.get("type") != "background"]
    if len(icon_visuals) == 1:
        hero = icon_visuals[0]
        hero["x"] = 0
        hero["y"] = 0
        hero_size = round(min(canvas_w, canvas_h) * 0.32)  # ~346px en 1080
        if hero.get("type") == "component" and hero.get("componentName") in _ICON_COMPONENTS_VP:
            hero["size"] = hero_size
            hero["width"] = hero_size

    return spec, True


def apply_visual_pure_strip(
    composer_dict: dict,
    scene_index: int,
    total_scenes: int,
    aspect_ratio: str = "9:16",
) -> tuple[dict, bool]:
    """Si esta escena toca ser visual-pura (determinista), le quita el texto.

    Devuelve (spec, did_strip). No-op si el índice no fue elegido o si quitar el
    texto dejaría la escena sin contenido visual.
    """
    if scene_index not in _visual_pure_indices(total_scenes):
        return composer_dict, False
    cw, ch = _get_canvas_dimensions(aspect_ratio)
    return _strip_text_for_visual_scene(composer_dict, cw, ch)


# ── Catálogo de componentes disponibles ──────────────────────────────────────
# FUENTE DE VERDAD: component_manifest.json (derivado del frontend manifest.ts).
# Esta lista se genera automáticamente desde el manifest. Si divergen, el
# manifest manda. Los componentes que falten aquí se BORRAN del spec en la
# Fase 4.1 (validación de componentes) aunque existan en el frontend.
from app.services.manifest import get_component_names

AVAILABLE_COMPONENTS: list[str] = get_component_names()


# ── Prompt base ──────────────────────────────────────────────────────────────

def _build_strategy_prompt(
    text: str,
    media_query: str,
    available_components: list[dict],
    aspect_ratio: str = "9:16",
    icon_candidates: list[dict] | None = None,
    duration_seconds: float = 0.0,
    suggested_bg_color: Optional[str] = None,
    suggested_text_color: Optional[str] = None,
) -> str:
    # Group components by role
    by_role = {}
    for comp in available_components:
        role = comp.get("role", "general")
        if role not in by_role:
            by_role[role] = []
        by_role[role].append(comp)

    # Format as structured list
    role_emojis = {
        "background": "🎨",
        "text": "📝",
        "transition": "🔄",
        "ui": "🖥️",
        "dataviz": "📊",
        "decorative": "✨",
        "social": "📱",
        "general": "📦",
    }

    components_list_parts = []
    for role, comps in by_role.items():
        emoji = role_emojis.get(role, "📦")
        role_title = role.upper()
        for c in comps:
            props_str = c.get("props", "none required")
            components_list_parts.append(
                f"{emoji} {role_title}: **{c['name']}** — {c['description']}\n"
                f"   Props: {props_str}\n"
                f"   Posición: x=0 y=0 es centro del canvas"
            )

    components_list = "\n".join(components_list_parts)

    # Build compact reference for ONLY the components selected by vector search
    # This replaces the hardcoded 108-component library to save ~2,500 tokens per call
    selected_component_ref = "\n".join(
        f"- **{c['name']}** ({c.get('role', 'general')}): {c.get('description', '')}\n  Props: {c.get('props', 'none required')}"
        for c in available_components
    )

    # Also check which Style* components are in the selected list
    style_components_in_list = [c for c in available_components if c['name'].startswith('Style')]
    style_component_ref = ""
    if style_components_in_list:
        style_component_ref = "\n\n## Style* Components Available (support LayerStyle overrides):\n" + "\n".join(
            f"- **{c['name']}**: {c.get('description', '')}\n  Props: {c.get('props', 'none required')}"
            for c in style_components_in_list
        )

    # Build icon suggestions section if candidates are available
    icon_section = ""
    if icon_candidates:
        # Build detailed icon list with tags for LLM context
        icon_lines = []
        for c in icon_candidates:
            tags = c.get("tags", [])
            tags_str = ", ".join(tags[:5]) if tags else "no tags"
            icon_lines.append(f'  - {c["full_id"]} (score: {c.get("score", 0):.2f}) — representa: {tags_str}')

        icon_list = "\n".join(icon_lines)
        icon_section = f"""

ÍCONOS SUGERIDOS (PISTAS OPCIONALES, búsqueda automática — pueden estar equivocadas):
{icon_list}

REGLA CRÍTICA DE ÍCONOS:
- Las sugerencias de arriba son SOLO PISTAS. Si NINGUNA representa bien el concepto,
  IGNÓRALAS y elige TÚ un ícono conocido y correcto de un set popular
  (mdi:, lucide:, tabler:, material-symbols:). Tu criterio manda sobre la lista.
- El ícono debe representar el CONCEPTO del texto, NUNCA una coincidencia literal de
  caracteres. Ej: "diez minutos" → un reloj (mdi:clock), NO "10mp" (cámara de 10
  megapíxeles). "cinco estrellas" → mdi:star, NO un ícono que contenga "5".
- Prefiere íconos simples y reconocibles (objetos/conceptos claros). NO uses íconos
  oscuros, técnicos o de marcas raras.
- Si ningún ícono aporta a la escena, NO incluyas ninguno.
- `size` SIEMPRE es un NÚMERO en píxeles (ej: 120). NUNCA un nombre de color ni texto.
- Usa type: "component", componentName: "IconifyIcon", icon: "set:nombre-exacto"

Ejemplo correcto (texto "diez minutos al día"): {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:clock-outline", "size": 120, "color": "#ffffff", "x": 0, "y": -200}}
Ejemplo INCORRECTO: {{"icon": "material-symbols:10mp-outline"}} ← coincidencia literal "10", no representa el concepto
"""

    width, height = _get_canvas_dimensions(aspect_ratio)
    half_w = width // 2
    half_h = height // 2

    # Calculate safe zones dynamically
    safe_margin_x = int(width * 0.1)  # 10% margin from edges
    safe_margin_y = int(height * 0.1)
    max_font_size = int(min(width, height) * 0.12)  # 12% of smallest dimension (~130px for 1080p)
    
    text_safe_zone = f"""- **TEXTO:** El texto debe estar dentro del "Safe Zone" para no cortarse en los bordes.
  - Rango seguro X: entre -{half_w - safe_margin_x} y {half_w - safe_margin_x}.
  - Rango seguro Y: entre -{half_h - safe_margin_y} y {half_h - safe_margin_y}.
  - Si usas `textAlign: "center"`, `x: 0` es el centro perfecto.
  - Si quieres texto a la izquierda: usa `x: -{int(half_w * 0.7)}` a `-{int(half_w * 0.5)}`.
  - Si quieres texto a la derecha: usa `x: {int(half_w * 0.5)}` a `{int(half_w * 0.7)}`.
  - fontSize máximo: {max_font_size} (valores mayores se salen del canvas)."""

    layout_section = """
SISTEMA DE LAYOUT (FLEXBOX):
En lugar de usar coordenadas absolutas (x, y) para cada elemento, usa estructuras de layout para organizar elementos de forma flexible y responsive.

Ejemplo 1: Fila horizontal con espacio entre elementos
{
  "type": "group",
  "layout": "flex",
  "direction": "row",
  "justifyContent": "space-between",
  "alignItems": "center",
  "gap": 40,
  "children": [
    { "type": "component", "componentName": "IconifyIcon", "icon": "mdi:cat", "flex": 1 },
    { "type": "text", "text": "Los gatos son increíbles", "flex": 2 }
  ]
}

Ejemplo 2: Columna vertical centrada
{
  "type": "group",
  "layout": "flex",
  "direction": "column",
  "justifyContent": "center",
  "alignItems": "center",
  "gap": 20,
  "children": [
    { "type": "component", "componentName": "PercentageRing", "value": 73 },
    { "type": "text", "text": "73% de los usuarios" }
  ]
}

Ejemplo 3: Overlay (botón encima de fondo)
{
  "layers": [
    { "type": "component", "componentName": "KineticBackground", "zIndex": 0 },
    { "type": "group", "layout": "flex", "direction": "column", "alignItems": "center", "zIndex": 10, "children": [
      { "type": "text", "text": "Texto encima" },
      { "type": "component", "componentName": "SubscribeButton" }
    ]}
  ]
}

Ejemplo 4: Elemento con posición absoluta (overlay específico)
{
  "type": "component",
  "componentName": "NotificationToast",
  "position": "absolute",
  "top": 20,
  "right": 20
}

PROPIEDADES DE LAYOUT DISPONIBLES:
- layout: "flex" | "grid" | "absolute"
- direction: "row" | "column"
- justifyContent: "flex-start" | "center" | "space-between" | "space-around"
- alignItems: "flex-start" | "center" | "stretch"
- gap: número (espaciado entre hijos en píxeles)
- flex: número (factor de crecimiento relativo)
- zIndex: número (orden de apilamiento, mayor = encima)
- position: "relative" | "absolute"
- top, right, bottom, left: números (para posición absoluta)
- stagger: número (retraso entre animaciones de hijos en segundos)

REGLAS DE LAYOUT:
1. Usa "group" con "layout: flex" para organizar múltiples elementos.
2. Usa "zIndex" para controlar qué va encima de qué.
3. Usa "gap" para espaciado consistente entre elementos.
4. NO uses coordenadas x/y dentro de un grupo flex — el layout las calcula automáticamente.
5. El texto y los iconos son OPCIONALES. Usa solo lo que la escena necesite.
6. Puedes anidar grupos flex dentro de otros grupos para layouts complejos.
"""

    positioning_rules = f"""REGLAS DE POSICIONAMIENTO (CANVAS {width}x{height}, formato {aspect_ratio}):
- El centro del canvas es (0, 0). Los bordes son aproximadamente x: ±{half_w}, y: ±{half_h}.
- Para centrar un elemento: usa x: 0, y: 0.
- Para texto principal: usa y: {int(-half_h * 0.2)} a y: {int(half_h * 0.2)} (zona central, legible).
- Para elementos decorativos: distribúyelos en y: {int(-half_h * 0.6)} a y: {int(half_h * 0.6)}, x: {int(-half_w * 0.5)} a x: {int(half_w * 0.5)}.
- Usa transform: "translate(x, y)" o las propiedades x/y del layer para posicionar.
{text_safe_zone}
"""

    # Timing context
    timing_context = ""
    if duration_seconds > 0:
        fps = 30
        duration_in_frames = int(duration_seconds * fps)
        words = len(text.split())
        wps = words / duration_seconds if duration_seconds > 0 else 0
        rhythm = "rápido" if wps > 4 else ("medio" if wps > 2.5 else "lento")
        max_entry_delay = round(duration_seconds * 0.2, 1)

        timing_context = f"""
DURACIÓN DE LA ESCENA: {duration_seconds} segundos ({duration_in_frames} frames a 30fps)
PALABRAS: {words}
RITMO DEL AUDIO: {rhythm} ({wps:.1f} palabras/segundo)

TIMING RECOMENDADO:
- Entrada de elementos: frames 0 a {int(duration_in_frames * 0.25)}
- Elementos visibles: frames {int(duration_in_frames * 0.25)} a {int(duration_in_frames * 0.7)}
- Salida de elementos (exit): frames {int(duration_in_frames * 0.7)} a {duration_in_frames}
- entryDelay máximo: {max_entry_delay} segundos (no más del 20% de la duración)
- Si la escena dura menos de 3 segundos, usa entryDelay de 0 o muy pequeño.
"""

    # Exit animation instructions
    exit_start_frame = "los últimos frames"
    if duration_seconds > 0:
        exit_start_frame = str(int(duration_seconds * 30 * 0.75))

    exit_instructions = f"""
ANIMACIONES DE SALIDA (exit) — OBLIGATORIO:
CADA layer (excepto background) DEBE tener una animación de salida. Sin excepción.
Valores válidos: "fade-out", "slide-up-out", "slide-down-out", "slide-left-out", "slide-right-out", "scale-out", "spring-out", "bounce-out"
Agrega `exitDelay` (segundos antes de que empiece la salida) y `exitDuration` (duración en segundos).

Ejemplo de layer CON exit:
  {{"type": "text", "text": "Hola", "x": 0, "y": -100, "exit": "slide-up-out", "exitDelay": 0.3, "exitDuration": 0.5}}
  {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:heart", "x": 0, "y": -200, "exit": "fade-out", "exitDelay": 0.2, "exitDuration": 0.4}}

El background NO necesita exit.
Las animaciones de salida deben empezar en el frame {exit_start_frame} (último 25% de la escena).
"""

    # Color coherence section
    color_section = ""
    if suggested_bg_color or suggested_text_color:
        color_section = f"""
COLORES SUGERIDOS (del análisis visual de la escena):
- Color de fondo sugerido: {suggested_bg_color or 'No especificado'}
- Color de texto sugerido: {suggested_text_color or 'No especificado'}
Usa estos colores como BASE para mantener coherencia visual con la dirección artística.
Puedes variarlos ligeramente (±10% luminosidad) pero NO los ignores.
"""

    return f"""Eres el director de escena de AnimaFlow. Tu trabajo es diseñar la composición de UNA escena de video devolviendo un JSON AnimaComposerSpec.

TEXTO DE LA ESCENA: "{text}"
DESCRIPCION VISUAL: "{media_query}"
{color_section}
DIRECCIÓN ARTÍSTICA DEL USUARIO (ALTA PRIORIDAD):
"{media_query}"
Todos los componentes, colores y estilos deben ser coherentes con esta dirección.
Si la dirección sugiere un tono (cálido, tech, minimalista, etc.), refléjalo en:
- Paleta de colores del background
- Variantes de componentes
- Tipografía y tamaños
{timing_context}
PASO 1 - IDENTIFICA EL SUJETO: Lee el texto y la descripción visual. ¿Cuál es el objeto/sujeto/tema principal de esta escena? (ej: un perro, una manzana, el dinero, un corazón, un planeta, etc.)

PASO 2 - COMPOSICIÓN LIBRE: Selecciona TODOS los componentes necesarios para representar visualmente el sujeto y el mensaje de la escena. NO hay límite de componentes. Puedes usar 1 componente o 15 — lo que la escena necesite.

Ejemplos de composiciones válidas:
- Simple: 1 background + 1 texto (escena minimalista)
- Media: 1 background + 2 botones + 1 texto arriba + 1 badge (CTA con contexto)
- Compleja: 1 background + 3 cards en grid + 2 badges + 1 texto título + 1 ícono decorativo (comparativa)
- Rica: 1 background + 1 gráfico + 2 textos + 1 progress bar + 2 íconos + 1 watermark (data-driven)

REGLA: Usa grupos flex/grid para organizar múltiples elementos. Cada componente debe tener un propósito claro en la escena.

REGLA CRÍTICA: SOLO usa type: "component" para elementos visuales y type: "text" para el texto hablado. NO uses type: "path", "rect", "circle". Esos tipos están PROHIBIDOS.

Tienes acceso a componentes de nuestra Standard Library.
COMPONENTES DISPONIBLES PARA ESTA ESCENA (organizados por rol):
{components_list}
{icon_section}
INSTRUCCIONES:
Debes generar un JSON válido que describa el 'background' y una lista de 'layers'.
Usa componentes de la lista anterior con type: "component" y componentName: "NOMBRE_EXACTO".

REGLAS DE ORO PARA EL DISEÑO:
1. **USA SOLO COMPONENTES DE LA STANDARD LIBRARY:** No crees formas desde cero con primitivas. Selecciona y combina componentes de la lista proporcionada. Si necesitas un elemento visual específico, busca el componente más cercano en la lista y adáptalo con sus props.
2. **COHERENCIA TEMÁTICA ESTRICTA:** Solo elige componentes de la Standard Library si tienen una relación DIRECTA y LÓGICA con el guion. Si el video es un documental sobre peces, NO uses un "SubscribeButton" o "TinderSwipeCard". Usa tu juicio semántico: si no encaja perfecto con la vibra de la escena, no lo uses.
2.1. **NO METAS COMPONENTES DE DATOS SIN DATOS:** barras de progreso (StyleProgressBar, ProgressPill, SocialProgressBar), charts, contadores, rings, etc. SOLO si la escena presenta un dato/porcentaje/cifra REAL y relevante del guion. NUNCA los uses como relleno decorativo — una barra "Progress 18%" sin contexto no aporta y confunde. Si dudas, no lo pongas.
3. **NO APILES ELEMENTOS UNO ENCIMA DEL OTRO EN EL CENTRO**. Usa la propiedad `y` (ejemplo: `y: -300` para arriba, `y: 0` para el centro, `y: 300` para abajo) o la propiedad `x` para distribuir las capas y evitar superposiciones.
4. **EL TEXTO EN PANTALLA ES OPCIONAL — decídelo por escena (MUY IMPORTANTE):**
   El audio YA narra todo el guion, así que NO hace falta repetir el texto en CADA
   escena. Un video que es puro texto en todas las escenas es aburrido. Decide por escena:
   - **MUESTRA el texto** (con `"text": "{{text}}"`) cuando la frase es un GANCHO, una
     CIFRA/dato clave, un CTA, o una frase de IMPACTO que gana fuerza leída — idealmente
     resaltando 1-2 palabras (WordHighlight).
   - **NO muestres texto** (escena VISUAL pura) cuando la frase es descriptiva o de
     conexión: representa el concepto con un VISUAL fuerte (1 ícono grande relacionado +
     fondo con movimiento). El audio lleva las palabras.
   - Regla práctica (video de ~3-5 escenas): la 1ª (gancho) y la del CTA casi siempre
     llevan texto; **al menos una escena del medio debe ser VISUAL pura o con muy poco
     texto**. VARÍA — no pongas el texto completo en todas.
4.1. **JERARQUÍA VISUAL (cuando SÍ hay texto):** una escena con texto NO debe ser solo
   un bloque de texto. Acompáñalo con AL MENOS un elemento visual relevante:
   - Un **ícono** que represente literalmente el concepto/sujeto de la escena (usa los íconos sugeridos abajo).
   - Y/o un **fondo con movimiento** (ej: KineticBackground, ParticleField, RaysOfLight, FloatingBlobs) acorde a la dirección artística.
   - Composición ideal de una escena hablada: 1 fondo + el texto (tamaño moderado, NO gigante que llene la pantalla) + 1 ícono o acento visual relacionado con una palabra clave del texto.
   - NO uses fontSize enorme para "rellenar"; deja aire. El texto debe convivir con el visual, no taparlo.
   - Si la escena es un CTA ("sígueme", "comenta"), añade el botón/badge correspondiente además del texto.
   - **CONTRASTE SOBRE FONDOS DE COLOR:** si usas un componente de fondo con
     color/movimiento (KineticBackground, GridPerspective, FloatingBlobs,
     ParticleField, etc.), el color del texto debe ser **BLANCO o casi blanco**
     (`#ffffff`/`#f8fafc`) para separarse del fondo. NUNCA uses un color saturado
     del MISMO tono que el fondo (ej. texto azul `#38bdf8` sobre una rejilla azul
     se vuelve ilegible).
   - **NO DUPLIQUES EL CTA:** si la frase del CTA YA está en el texto hablado
     (ej. el texto dice "¡Descubre el secreto ahora!"), NO añadas además un botón
     que repita esa misma frase. O lo dices en el texto, o lo pones en el botón —
     no ambos. El botón/badge debe aportar algo distinto o más corto (ej.
     "Sígueme", "Link en bio"), nunca repetir literalmente lo narrado.
5. **POSICIONAMIENTO OBLIGATORIO:** ABSOLUTAMENTE TODOS los layers DEBEN tener `x` e `y`. Si los omites, el JSON será inválido.
    - `"x": 0, "y": 0` = centro del canvas
    - `"x": 0, "y": -200` = arriba del centro
    - `"x": 0, "y": 200` = abajo del centro
    - `"x": -200, "y": 0` = izquierda del centro
    - `"x": 200, "y": 0` = derecha del centro
    - EJEMPLO CORRECTO: {{"type": "text", "text": "Hola", "x": 0, "y": 0}}
    - EJEMPLO INCORRECTO: {{"type": "text", "text": "Hola"}} ← FALTA x/y, INVÁLIDO
6. **FORMATO NUMÉRICO ESTRICTO:** Para `lineWidth`, usa SOLO números ENTEROS (0, 1, 2, 3... 20). NUNCA uses decimales. Ejemplos válidos: `0`, `4`, `10`. Ejemplos INVÁLIDOS: `0.5`, `4.5`, `10.25`.
7. **MÚLTIPLES ICONOS PERMITIDOS CON POSICIONAMIENTO:** Puedes usar varios iconos en la escena si tienen sentido visual (ej: iconos de fuego alrededor de un texto central, iconos de fiesta decorando una palabra). REGLAS:
   - Cada icono DEBE tener x/y diferentes — NUNCA superpongas iconos en la misma posición.
   - Distribúyelos alrededor del elemento central (ej: en círculo, en fila, en esquinas).
   - Si usas el mismo icon múltiples veces, varía el `scale` (ej: 0.8, 1.0, 1.2) para crear profundidad.
   - Máximo 5-6 iconos decorativos por escena para no saturar.

{layout_section}

GUÍA DE TAMAÑOS DE TEXTO PARA VIDEO VERTICAL (1080x1920):
┌─────────────────────────────────────────────────────┐
│ Rol del texto              │ fontSize recomendado   │
├─────────────────────────────────────────────────────┤
│ Texto hablado / principal  │ 72-96                  │
│ Título de sección          │ 64-88                  │
│ Subtítulo / soporte        │ 40-56                  │
│ Caption / etiqueta         │ 28-36                  │
│ Texto pequeño / crédito    │ 20-24                  │
└─────────────────────────────────────────────────────┘

IMPORTANTE — Jerarquía visual:
- Si la escena tiene un elemento visual protagonista (gráfico, mockup, componente animado), el texto debe ser SUBTÍTULO (40-56px) para no competir.
- Si la escena es SOLO texto sobre fondo limpio (frase de impacto), usa texto principal (72-96px).
- El texto NUNCA debe ocupar más del 30% de la altura del canvas cuando hay un visual presente.
- Deja siempre aire visual entre el texto y los demás elementos.

NOTA sobre lineWidth: SOLO úsalo para componentes de tipo shape/path (líneas, bordes).
NUNCA lo uses en componentes de texto, charts, cards o contadores.

## Video Style System

Every layer supports a `style` object with these properties:

### Spacing
- `padding`: number or [top, right, bottom, left] — Internal spacing
- `margin`: number or [top, right, bottom, left] — External spacing

### Borders
- `borderWidth`: number — Border thickness
- `borderColor`: string — Border color (hex or rgba)
- `borderStyle`: "solid" | "dashed" | "dotted"
- `borderRadius`: number — Corner radius (use 999 for pill shape)

### Effects
- `boxShadow`: {{x, y, blur, spread, color}} — Drop shadow
- `opacity`: 0-1 — Transparency
- `blur`: number — Blur amount
- `backdropBlur`: number — Glassmorphism blur

### Filters
- `brightness`: 0-3 — Brightness multiplier
- `contrast`: 0-3 — Contrast multiplier
- `saturate`: 0-3 — Saturation multiplier
- `grayscale`: boolean — Convert to grayscale
- `hueRotate`: 0-360 — Hue rotation in degrees
- `invert`: boolean — Invert colors

### Transforms
- `rotate`: -360 to 360 — Rotation in degrees
- `scale`: number or [x, y] — Scale multiplier
- `transformOrigin`: string — Transform origin point

### Typography
- `lineHeight`: number — Line height multiplier
- `textShadow`: {{x, y, blur, color}} — Text shadow
- `textDecoration`: "underline" | "line-through" | "none"

### Background
- `backgroundImage`: string — URL or gradient
- `backgroundSize`: "cover" | "contain" | "auto"
- `backgroundPosition`: string — Position (center, top, etc.)
- `backgroundOpacity`: 0-1 — Background opacity

### Layout
- `overflow`: "hidden" | "visible" | "scroll"
- `aspectRatio`: string — Aspect ratio (e.g., "16/9")
- `objectFit`: "cover" | "contain" | "fill"
- `flexWrap`: "wrap" | "nowrap"
- `flexGrow`: number — Flex grow factor
- `flexShrink`: number — Flex shrink factor
- `order`: number — Visual order

## Video Style System (Style* Components)
Estos componentes soportan overrides completos de LayerStyle. Solo se incluyen los relevantes para esta escena.

## New Components

### StyleButton
A premium CTA button for video.
- `componentName`: "StyleButton"
- `text`: Button text
- `variant`: "primary" | "secondary" | "ghost" | "outline"
- `size`: "sm" | "md" | "lg"
- `icon`: Iconify icon name (optional)
- `iconPosition`: "left" | "right"
- Use for: CTAs, "Subscribe", "Link in bio", "Learn More"

### StyleCard
A container for grouping content with visual hierarchy.
- `componentName`: "StyleCard"
- `title`: Card title
- `subtitle`: Card subtitle
- `variant`: "elevated" | "filled" | "outlined" | "glass"
- `width`: Card width in pixels
- Use for: Info cards, data containers, grouped content

### StyleBadge
A pill-shaped label for categories, prices, tags.
- `componentName`: "StyleBadge"
- `text`: Badge text
- `variant`: "success" | "warning" | "error" | "info" | "neutral"
- `size`: "sm" | "md" | "lg"
- `icon`: Iconify icon name (optional)
- Use for: "NEW", "73% OFF", "LIMITED", categories, tags

### StyleAvatar
An icon-based avatar with animated ring and optional badge.
- `componentName`: "StyleAvatar"
- `icon`: Iconify icon name (e.g., "mdi:account")
- `name`: Display name below avatar
- `subtitle`: Optional subtitle (e.g., rating, title)
- `size`: "sm" | "md" | "lg"
- `variant`: "solid" | "ring" | "gradient"
- `showBadge`: boolean — Show notification badge
- `badgeText`: Badge text (e.g., "NEW", "•")
- Use for: Testimonials, team members, social profiles, user mentions

### StyleProgressBar
A progress indicator with linear and circular variants.
- `componentName`: "StyleProgressBar"
- `value`: Current value (0-100)
- `max`: Maximum value
- `variant`: "linear" | "circular"
- `color`: Progress bar color
- `showLabel`: boolean — Show percentage label
- `labelPosition`: "top" | "bottom" | "inside"
- `size`: Size for circular variant (default 120)
- `strokeWidth`: Stroke width for circular variant
- Use for: Survey results, completion status, statistics, comparisons

### StyleDivider
A visual separator with multiple styles.
- `componentName`: "StyleDivider"
- `orientation`: "horizontal" | "vertical"
- `style`: "solid" | "dashed" | "dotted" | "gradient"
- `color`: Divider color
- `thickness`: Line thickness
- `width`: Width for horizontal dividers
- `height`: Height for vertical dividers
- Use for: Section separators, visual breaks, content grouping

### StyleChip
A tag/chip for filters, categories, and tech stacks.
- `componentName`: "StyleChip"
- `text`: Chip text
- `icon`: Iconify icon name (optional)
- `deletable`: boolean — Show delete X icon
- `variant`: "filled" | "outlined" | "soft"
- `size`: "sm" | "md" | "lg"
- Use for: Tech stacks, filter tags, category labels, skill badges

### StyleTextBlock
A text block for longer content with variants and line clamping.
- `componentName`: "StyleTextBlock"
- `text`: Text content
- `variant`: "heading" | "body" | "caption" | "quote"
- `align`: "left" | "center" | "right"
- `maxLines`: number — Limit visible lines (optional)
- `width`: Width in pixels
- Use for: Titles, descriptions, quotes, captions, body text

### StyleCallout
An annotation with arrow pointing to a target area.
- `componentName`: "StyleCallout"
- `text`: Annotation text
- `direction`: "left" | "right" | "top" | "bottom"
- `variant`: "arrow" | "circle" | "highlight"
- Use for: Pointing to features, highlighting areas, tutorial annotations

### StyleWatermark
A brand logo overlay with controlled opacity.
- `componentName`: "StyleWatermark"
- `src`: Image URL (optional)
- `icon`: Iconify icon name (fallback)
- `position`: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
- `opacity`: 0-1 (default 0.3)
- `size`: Size in pixels (default 60)
- Use for: Branding, logos, watermarks

### StyleVideoPlayer
A video embed for picture-in-picture and media.
- `componentName`: "StyleVideoPlayer"
- `src`: Video URL
- `variant`: "pip" | "fullscreen" | "inline"
- `size`: "sm" | "md" | "lg"
- `autoplay`: boolean (default true)
- `loop`: boolean (default true)
- `muted`: boolean (default true)
- Use for: B-roll, screen recordings, PiP content

### StyleBarChart
An animated bar chart for data visualization.
- `componentName`: "StyleBarChart"
- `data`: (array of objects with: label, value, color)
- `variant`: "vertical" | "horizontal"
- `showLabels`: boolean
- `showValues`: boolean
- Use for: Comparisons, monthly data, rankings

### StyleLineChart
An animated line chart with dots and grid.
- `componentName`: "StyleLineChart"
- `data`: (array of objects with: x, y)
- `showDots`: boolean
- `showGrid`: boolean
- `showLabels`: boolean
- `lineColor`: string
- `fillArea`: boolean
- Use for: Trends, growth, time series

### StylePieChart
An animated pie/donut chart.
- `componentName`: "StylePieChart"
- `data`: (array of objects with: label, value, color)
- `variant`: "pie" | "donut"
- `showLabels`: boolean
- `showValues`: boolean
- `explodeSlice`: index of slice to explode (optional)
- Use for: Percentages, distribution, market share

### StyleAnimateNumber
An animated counter that counts from 0 to a target value.
- `componentName`: "StyleAnimateNumber"
- `value`: Target number
- `from`: Starting number (default 0)
- `prefix`: Text before number (e.g., "$", "+")
- `suffix`: Text after number (e.g., "%", "K")
- `format`: "number" | "currency" | "percentage" | "compact"
- `decimals`: Number of decimal places
- `duration`: Animation duration in frames
- Use for: Statistics, metrics, revenue, growth numbers

### StyleScrambleText
Text that decodes from random characters to the final message.
- `componentName`: "StyleScrambleText"
- `text`: Final text to reveal
- `speed`: Characters revealed per frame
- `characters`: Random character set (default: "#$%&@!?*+=^~01")
- `loop`: boolean — Re-scramble after reveal
- Use for: Tech intros, cybersecurity, suspense reveals, hacker-style effects

⚠️ RESTRICCIÓN: NO uses StyleScrambleText para contenido emocional, orgánico, tierno,
natural o narrativo general. SOLO para moods tech, glitch, ciberseguridad, suspense,
o estética hacker. Para texto hablado normal usa StyleTextBlock, Typewriter o TextReveal.

### StyleTicker
Horizontally scrolling text (news/crypto style).
- `componentName`: "StyleTicker"
- `text`: Ticker content (use " • " as separator)
- `speed`: Pixels per frame
- `separator`: Text separator between repeats
- Use for: Breaking news, crypto prices, stock tickers, live updates

### StyleSimulatedHover
Simulates a hover state at a specific frame.
- `componentName`: "StyleSimulatedHover"
- `text`: Button/card text
- `icon`: Iconify icon name (optional)
- `hoverFrame`: Frame when hover starts
- `hoverDuration`: Duration of hover effect in frames
- `variant`: "button" | "card" | "link"
- Use for: Product demos, UI tutorials, interactive-looking buttons

### StyleFakeScroll
Simulates scrolling through a list of items.
- `componentName`: "StyleFakeScroll"
- `items`: (array of objects with: content, subtitle, icon)
- `speed`: Pixels per frame
- `itemHeight`: Height of each item
- `visibleItems`: Number of visible items
- `showScrollbar`: boolean
- Use for: Social media feeds, testimonials, product lists, comments

### StyleCursor
Animated cursor that moves between points and simulates clicks.
- `componentName`: "StyleCursor"
- `points`: (array of objects with: x, y, click (boolean), holdFrames (number))
- `speed`: Movement speed
- `showRipple`: boolean — Show click ripple effect
- Use for: Tutorials, demos, showing user interactions

### StyleBarRace
Horizontal bar race chart where items compete and reorder.
- `componentName`: "StyleBarRace"
- `data`: (array of objects with: label, value, color)
- `barHeight`: Height of each bar
- `gap`: Gap between bars
- `showLabels`: boolean
- `showValues`: boolean
- `duration`: Animation duration in frames
- Use for: Rankings, competitions, "top 10" videos, comparisons

### StyleFunnelChart
A conversion funnel chart with animated stages.
- `componentName`: "StyleFunnelChart"
- `data`: (array of objects with: label, value, color)
- `showLabels`: boolean
- `showValues`: boolean
- `showPercentages`: boolean — Shows conversion rate between stages
- Use for: Conversion funnels, sales pipelines, user journey, drop-off analysis

### StyleRadarChart
A radar/spider chart for multi-dimensional data visualization.
- `componentName`: "StyleRadarChart"
- `data`: (array of objects with: label, value)
- `maxValue`: Maximum value (default 100)
- `showLabels`: boolean
- `showGrid`: boolean — Show concentric grid circles
- `showValues`: boolean — Show values next to labels
- `fillColor`: Fill color with alpha (default "rgba(0, 255, 171, 0.15)")
- `lineColor`: Line color (default "#00FFAB")
- `size`: Chart size in pixels (default 240)
- Use for: Skill comparisons, performance metrics, multi-axis analysis

### WordHighlight (subtítulo "karaoke" sincronizado al audio)
Muestra el texto hablado y resalta la palabra que se pronuncia en cada momento
(estilo subtítulos de TikTok/Reels). Se sincroniza solo con el audio.
- `componentName`: "WordHighlight"
- `text`: el texto hablado (usa "{{text}}")
- `color`: color base de las palabras (default blanco)
- `highlightColor`: color de la palabra activa (default dorado)
- Úsalo para: el texto hablado principal cuando quieras un look dinámico de
  subtítulos. Es una excelente alternativa a StyleTextBlock/Typewriter para el
  texto narrado. NO necesitas pasarle timestamps; se inyectan automáticamente.

### KeywordPop (ícono que aparece en una palabra clave)
Un ícono que permanece OCULTO y aparece con un "pop" justo cuando se pronuncia
una palabra concreta del guion.
- `componentName`: "KeywordPop"
- `icon`: ícono Iconify (ej: "mdi:fire")
- `triggerWord`: la palabra EXACTA del texto en la que debe aparecer (ej: "energía")
- `size`: tamaño en píxeles (default 160)
- `color`: color del ícono
- Úsalo para: enfatizar visualmente un concepto justo cuando se nombra (ej: aparece
  una batería cuando se dice "energía"). Colócalo en una zona libre (x/y) que no
  tape el texto.

### Grid Layout
Use `layout: "grid"` for 2D layouts instead of flex.
- `layout`: "grid"
- `gridCols`: number of columns
- `gridRows`: number of rows (auto-calculated if omitted)
- `gap`: spacing between cells
- `justifyContent`: "flex-start" | "center" | "flex-end" — horizontal alignment within cells
- `alignItems`: "flex-start" | "center" | "stretch" — vertical alignment within cells
- Use for: Feature grids, team layouts, comparison tables, card grids

## Componentes Seleccionados para Esta Escena (vector search)
Estos son los componentes más relevantes para el texto y contexto de esta escena:
{selected_component_ref}
{style_component_ref}

## Reglas de Selección de Componentes
1. **NO HAY LÍMITE DE COMPONENTES** — Usa tantos como la escena necesite. Una escena puede tener 1 elemento o 20+.
2. **Los componentes listados arriba** son los más relevantes para esta escena. Úsalos como base.
3. **Si necesitas un componente que no está en la lista**, puedes usar cualquier componente de la Standard Library, pero prioriza los seleccionados.
4. **Íconos libres** — Usa IconifyIcon para representar conceptos visuales. Múltiples íconos por escena están permitidos.
5. **Jerarquía visual** — Usa zIndex, tamaños y posición para crear jerarquía. El elemento más importante debe ser el más prominente.
6. **No sobre-cargar** — Aunque no hay límite, cada componente debe tener un propósito. Evita elementos decorativos sin función.
7. **Combina componentes** usando layout groups (flex/grid) para escenas complejas.

## Ejemplos de Referencia: Composiciones Complejas
Estos ejemplos muestran cómo combinar múltiples componentes usando layout groups:

Ejemplo A - Escena con múltiples botones y texto:
{{
    "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
    "layers": [
      {{
        "type": "group",
        "layout": "flex",
        "direction": "column",
        "alignItems": "center",
        "gap": 30,
        "children": [
          {{"type": "text", "text": "Elige tu plan", "fontSize": 96, "fontWeight": 900}},
          {{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "gap": 20,
            "children": [
              {{"type": "component", "componentName": "StyleButton", "text": "Básico", "variant": "outline"}},
              {{"type": "component", "componentName": "StyleButton", "text": "Pro", "variant": "primary"}},
              {{"type": "component", "componentName": "StyleButton", "text": "Enterprise", "variant": "outline"}}
            ]
          }},
          {{"type": "component", "componentName": "StyleBadge", "text": "Ahorra 50%", "variant": "success"}}
        ]
      }}
    ]
}}

Ejemplo B - Escena con cards, badges e íconos:
{{
  "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
  "layers": [
    {{
      "type": "group",
      "layout": "grid",
      "gridCols": 2,
      "gap": 24,
      "children": [
        {{
          "type": "group",
          "layout": "flex",
          "direction": "column",
          "gap": 12,
          "children": [
            {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:rocket-launch", "size": 48}},
            {{"type": "component", "componentName": "StyleCard", "title": "Rápido", "subtitle": "Deploy en segundos"}},
            {{"type": "component", "componentName": "StyleBadge", "text": "NEW", "variant": "info"}}
          ]
        }},
        {{
          "type": "group",
          "layout": "flex",
          "direction": "column",
          "gap": 12,
          "children": [
            {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:shield-check", "size": 48}},
            {{"type": "component", "componentName": "StyleCard", "title": "Seguro", "subtitle": "SSL incluido"}},
            {{"type": "component", "componentName": "StyleBadge", "text": "POPULAR", "variant": "warning"}}
          ]
        }}
      ]
    }}
  ]
}}

Ejemplo C - Escena data-driven con múltiples elementos:
{{
  "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
  "layers": [
    {{
      "type": "group",
      "layout": "flex",
      "direction": "column",
      "alignItems": "center",
      "gap": 20,
      "children": [
        {{"type": "text", "text": "Resultados del trimestre", "fontSize": 84, "fontWeight": 900}},
        {{"type": "component", "componentName": "StyleBarChart", "data": [{{"label": "Q1", "value": 65}}, {{"label": "Q2", "value": 80}}, {{"label": "Q3", "value": 95}}]}},
        {{
          "type": "group",
          "layout": "flex",
          "direction": "row",
          "gap": 16,
          "children": [
            {{"type": "component", "componentName": "StyleAnimateNumber", "value": 95, "suffix": "%", "prefix": "+"}},
            {{"type": "component", "componentName": "StyleAnimateNumber", "value": 2400, "prefix": "$", "format": "compact"}},
            {{"type": "component", "componentName": "StyleProgressBar", "value": 73, "showLabel": true}}
          ]
        }}
      ]
    }}
  ]
}}

EJEMPLO DE POSICIONAMIENTO SIN GRUPOS (coordenadas absolutas):
Si NO usas grupos flex/grid, CADA layer debe tener x/y diferentes para evitar superposición:
{{
  "layers": [
    {{"type": "component", "componentName": "KineticBackground", "x": 0, "y": 0}},
    {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:heart", "x": 0, "y": -200}},
    {{"type": "text", "text": "Tu mensaje aquí", "x": 0, "y": 100, "fontSize": 96}},
    {{"type": "component", "componentName": "StyleBadge", "text": "CTA", "x": 0, "y": 300}}
  ]
}}
REGLA: NUNCA pongas todos los layers en x:0, y:0. Distribúyelos verticalmente usando y negativo (arriba), y=0 (centro), y positivo (abajo).

## Improved Spring Physics

All entrance/exit animations now use improved spring physics based on Framer Motion's formula:
- `F = -kx - cv` (Hooke's Law + Damping)
- More natural, organic movement compared to basic springs
- 6 presets available: `gentle`, `default`, `snappy`, `bouncy`, `stiff`, `slow`

### Spring Presets
| Preset | Stiffness | Damping | Mass | Feel |
|---|---|---|---|---|
| gentle | 80 | 12 | 1.2 | Soft, smooth |
| default | 100 | 10 | 1.0 | Balanced |
| snappy | 180 | 12 | 0.8 | Quick, responsive |
| bouncy | 120 | 6 | 0.6 | Playful bounce |
| stiff | 260 | 20 | 0.9 | Firm, precise |
| slow | 60 | 15 | 1.5 | Relaxed, heavy |

## Layout Transitions

When elements change position between scenes, smooth transitions are automatically generated:
- `transitionDuration`: Duration in frames (default: 15)
- `transitionEasing`: "ease-out" | "ease-in-out" | "spring"
- `transitionSpring`: Spring preset name (when easing is "spring")

Transitions are detected automatically when:
- An element's position changes by more than 2px between scenes
- The element has a consistent `id` across scenes

### Example
```json
{{
  "type": "component",
  "componentName": "StyleBadge",
  "id": "badge-1",
  "text": "NEW",
  "x": 540,
  "y": 300,
  "transitionDuration": 20,
  "transitionEasing": "spring",
  "transitionSpring": "bouncy"
}}
```

{positioning_rules}

Ejemplo de estructura JSON esperada:
{{
  "background": {{
    "type": "linear-gradient",
    "colors": ["#0f172a", "#1e293b"]
  }},
  "layers": [
    {{
      "type": "component",
      "componentName": "FloatingBlobs",
      "color": "#3b82f6",
      "count": 8,
      "x": 0,
      "y": 0
    }},
    {{
      "type": "component",
      "componentName": "TextReveal",
      "text": "{{text}}",
      "fontSize": 48,
      "color": "#ffffff",
      "animation": "slide_up",
      "x": 0,
      "y": 100
    }}
  ]
}}

ANIMACIONES DE ENTRADA (entry):
Usa la propiedad `entry` para animaciones de entrada simples. Valores válidos:
- "fade-in": aparece gradualmente
- "slide-up": entra desde abajo hacia arriba
- "slide-down": entra desde arriba hacia abajo
- "slide-left": entra desde la derecha hacia la izquierda
- "slide-right": entra desde la izquierda hacia la derecha
- "scale-in": aparece con efecto de escala
- "spring-in": aparece con efecto de resorte
- "bounce-in": aparece con efecto de rebote
Opcionalmente agrega `entryDelay` (en segundos) para retrasar la animación.
Ejemplo: `"entry": "slide-up", "entryDelay": 0.5`
{exit_instructions}
IMPORTANTE:
- Si un componente necesita propiedades adicionales (como speed, color, textColor, url, x, y), pásalas directamente como propiedades de la capa, en el mismo nivel que "type" y "componentName". La propiedad "props" NO existe.
DEVUELVE SOLO JSON VALIDO, SIN MARKDOWN."""


# ── Función principal ────────────────────────────────────────────────────────

def generate_scene_composer(
    text: str,
    media_query: str,
    available_components: list[dict] | None = None,
    api_key: str = "",
    model: str = "gemini-2.0-flash",
    db: Optional[Session] = None,
    aspect_ratio: str = "9:16",
    composition_version: str = "v2",
    duration_seconds: float = 0.0,
    suggested_bg_color: Optional[str] = None,
    suggested_text_color: Optional[str] = None,
) -> AnimaComposerSpec:
    """
    Pregunta al LLM por la composición AnimaComposer (JSON) de la escena.

    composition_version: "v1" = legacy (primitivas permitidas),
                         "v2" = component-only (default)
    """
    if db is not None:
        # Use intelligent vector search with diversity quotas
        from app.services.embedding import get_relevant_components
        relevant = get_relevant_components(db, text, media_query, top_k=15, api_key=api_key)
        components = relevant  # Already list[dict] from _format_component
        component_names = [c["name"] for c in relevant]
        logger.info("Vector search returned %d relevant components: %s", len(component_names), component_names[:5])
    else:
        # Fallback to hardcoded list (for tests/backward compat)
        fallback = available_components or [{"name": n, "role": "general", "category": "general", "description": ""} for n in AVAILABLE_COMPONENTS]
        components = fallback

    # Buscar iconos relevantes para la escena
    icon_candidates = []
    try:
        icon_candidates = find_best_icons(db, text, limit=5, api_key=api_key)
        logger.info("Found %d relevant icons for scene", len(icon_candidates))
    except Exception as e:
        logger.warning("Icon search failed, continuing without icons: %s", e)

    prompt = _build_strategy_prompt(text, media_query, components, aspect_ratio, icon_candidates, duration_seconds,
        suggested_bg_color=suggested_bg_color,
        suggested_text_color=suggested_text_color,
    )

    # Fallback default si hay error
    default_fallback = AnimaComposerSpec(
        background=AnimaBackground(type="radial-gradient", colors=["#1a1a2e", "#16213e"]),
        layers=[
            AnimaLayer(
                type="rect",
                width=300,
                height=4,
                fill="#e94560",
                x=0,
                y=-60,
                entry="slide-right",
                entryDelay=0.2
            ),
            AnimaLayer(
                type="text",
                text="{{text}}",
                fontSize=48,
                color="#ffffff",
                x=0,
                y=60,
                textAlign="center",
                entry="slide-up",
                entryDelay=0.5
            )
        ]
    )

    if not api_key:
        logger.warning("No API key provided. Defaulting to fallback.")
        return default_fallback

    # Retry up to 2 times if response is corrupted
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            from app.modules.llm.client import _call_llm_sync
            client = genai.Client(api_key=api_key)

            gemini_schema = {
                "type": "OBJECT",
                "properties": {
                    "version": {"type": "STRING"},
                    "background": {
                        "type": "OBJECT",
                        "properties": {
                            "type": {"type": "STRING"},
                            "colors": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "angle": {"type": "NUMBER"},
                            "center": {"type": "ARRAY", "items": {"type": "NUMBER"}}
                        },
                        "required": ["type", "colors"]
                    },
                    "layers": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "id": {"type": "STRING"},
                                "type": {"type": "STRING"},
                                "componentName": {"type": "STRING"},
                                "x": {"type": "NUMBER", "minimum": -1000, "maximum": 1000},
                                "y": {"type": "NUMBER", "minimum": -1000, "maximum": 1000},
                                "scale": {"type": "NUMBER", "minimum": 0.1, "maximum": 10},
                                "rotation": {"type": "NUMBER", "minimum": -360, "maximum": 360},
                                "opacity": {"type": "NUMBER", "minimum": 0, "maximum": 1},
                                "width": {"type": "NUMBER", "minimum": 10, "maximum": 1920},
                                "height": {"type": "NUMBER", "minimum": 10, "maximum": 1920},
                                "borderRadius": {"type": "NUMBER", "minimum": 0, "maximum": 500},
                                "fill": {"type": "STRING"},
                                "stroke": {"type": "STRING"},
                                "strokeWidth": {"type": "NUMBER", "minimum": 0, "maximum": 20},
                                "r": {"type": "NUMBER", "minimum": 5, "maximum": 500},
                                "pathData": {"type": "STRING"},
                                "text": {"type": "STRING"},
                                "fontSize": {"type": "NUMBER", "minimum": 12, "maximum": 250},
                                "fontWeight": {"type": "NUMBER", "minimum": 100, "maximum": 900},
                                "letterSpacing": {"type": "NUMBER", "minimum": -10, "maximum": 20},
                                "textAlign": {"type": "STRING"},
                                "src": {"type": "STRING"},
                                "fit": {"type": "STRING"},
                                "count": {"type": "INTEGER", "minimum": 1, "maximum": 200},
                                "shape": {"type": "STRING"},
                                "spread": {"type": "NUMBER", "minimum": 0, "maximum": 500},
                                "colors": {"type": "ARRAY", "items": {"type": "STRING"}},
                                "entry": {"type": "STRING"},
                                "entryDelay": {"type": "NUMBER", "minimum": 0, "maximum": 10},
                                "filter": {"type": "STRING"},
                                "color": {"type": "STRING"},
                                "color1": {"type": "STRING"},
                                "color2": {"type": "STRING"},
                                "bgColor": {"type": "STRING"},
                                "textColor": {"type": "STRING"},
                                "speed": {"type": "NUMBER", "minimum": 0.01, "maximum": 10},
                                "delay": {"type": "NUMBER", "minimum": 0, "maximum": 10},
                                "intensity": {"type": "NUMBER", "minimum": 0, "maximum": 1},
                                "theme": {"type": "STRING"},
                                "url": {"type": "STRING"},
                                "query": {"type": "STRING"},
                                "animation": {"type": "STRING"},
                                "lineWidth": {"type": "INTEGER", "minimum": 0, "maximum": 20},
                                "icon": {"type": "STRING"},
                                "triggerWord": {"type": "STRING"},
                                "highlightColor": {"type": "STRING"},
                                "variant": {"type": "STRING"},
                                "title": {"type": "STRING"},
                                "subtitle": {"type": "STRING"},
                                "data": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "NUMBER"},
                                            "color": {"type": "STRING"}
                                        }
                                    }
                                },
                                "value": {"type": "NUMBER"},
                                "max": {"type": "NUMBER"},
                                "size": {"type": "STRING"},
                                "prefix": {"type": "STRING"},
                                "suffix": {"type": "STRING"},
                                "format": {"type": "STRING"},
                                "items": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "STRING"},
                                            "icon": {"type": "STRING"}
                                        }
                                    }
                                },
                                "points": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "NUMBER"}
                                        }
                                    }
                                },
                                "maxLines": {"type": "INTEGER", "minimum": 1, "maximum": 10},
                                "showLabel": {"type": "BOOLEAN"},
                                "showLabels": {"type": "BOOLEAN"},
                                "showValues": {"type": "BOOLEAN"},
                                "showGrid": {"type": "BOOLEAN"},
                                "showDots": {"type": "BOOLEAN"},
                                "lineColor": {"type": "STRING"},
                                "fillArea": {"type": "BOOLEAN"},
                                "decimals": {"type": "INTEGER", "minimum": 0, "maximum": 4},
                                "characters": {"type": "STRING"},
                                "loop": {"type": "BOOLEAN"},
                                "separator": {"type": "STRING"},
                                "barHeight": {"type": "NUMBER"},
                                "gap": {"type": "NUMBER"},
                                "visibleItems": {"type": "INTEGER", "minimum": 1, "maximum": 20},
                                "showScrollbar": {"type": "BOOLEAN"},
                                "showRipple": {"type": "BOOLEAN"},
                                "showPercentages": {"type": "BOOLEAN"},
                                "maxValue": {"type": "NUMBER"},
                                "explodeSlice": {"type": "INTEGER"},
                                "autoplay": {"type": "BOOLEAN"},
                                "muted": {"type": "BOOLEAN"},
                                "name": {"type": "STRING"},
                                "orientation": {"type": "STRING"},
                                "thickness": {"type": "NUMBER"},
                                "deletable": {"type": "BOOLEAN"},
                                "labelPosition": {"type": "STRING"},
                                "iconPosition": {"type": "STRING"},
                                "showBadge": {"type": "BOOLEAN"},
                                "badgeText": {"type": "STRING"},
                                "from": {"type": "NUMBER"},
                                "duration": {"type": "NUMBER"},
                            },
                            "required": ["type", "x", "y"]
                        }
                    },
                    # v7: out_transition eliminado — el frontend nunca lo renderiza
                    # (MainComposition no lo lee). La única transición es el
                    # crossfade de fondo de 15 frames en AnimaComposer.
                },
                "required": ["background", "layers"]
            }

            # B5 (v7.4): desactivar el "thinking" del modelo en la llamada de
            # composición. Con thinking activo, los tokens de pensamiento compiten
            # con max_output_tokens y truncan/corrompen el JSON (causa de los
            # warnings 'thought_signature' y de valores partidos como size:"color1").
            # La composición no necesita razonamiento extenso → thinking_budget=0.
            _config_kwargs = dict(
                response_mime_type="application/json",
                response_schema=gemini_schema,
                temperature=0.3,
                max_output_tokens=6000,
            )
            try:
                gen_config = types.GenerateContentConfig(
                    **_config_kwargs,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                )
            except (AttributeError, TypeError, ValueError):
                # SDK sin soporte de thinking_config → comportamiento original.
                gen_config = types.GenerateContentConfig(**_config_kwargs)

            response = _call_llm_sync(
                client=client,
                model=model,
                contents=prompt,
                config=gen_config,
                label="LLM Component Strategy"
            )

            raw_text = response.text if response.text else "(empty)"

            # Strip thought_signature / thinking artifacts that some Gemini 3.x
            # variants still emit even with thinking_budget=0.
            if "thought_signature" in raw_text:
                logger.warning("thought_signature detected in response text, stripping")
                # Remove any <thought>...</thought> or similar thinking blocks
                raw_text = re.sub(r'<thought>.*?</thought>', '', raw_text, flags=re.DOTALL)
                raw_text = re.sub(r'thought_signature\s*[:=]\s*["\'].*?["\']', '', raw_text, flags=re.DOTALL)

            logger.info(
                "RAW Gemini response for scene composer (%d chars): %s",
                len(raw_text),
                raw_text[:1500],
            )

            # Reject corrupted responses that are way too long
            if len(raw_text) > 10000:
                logger.warning("Response too long (%d chars), likely corrupted. Attempt %d/%d.", len(raw_text), attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    continue  # Retry
                return default_fallback

            result = response.parsed

            if result is not None:
                result_str = str(result)
                logger.info(
                    "Parsed result type: %s, length: %d, preview: %s",
                    type(result).__name__,
                    len(result_str),
                    result_str[:1500],
                )
            else:
                # response.parsed is None — try to extract valid JSON from raw_text
                # before giving up and retrying. Gemini sometimes returns text parts
                # that concatenate thinking + JSON, breaking the auto-parser.
                logger.warning("response.parsed is None. Attempting JSON extraction from raw_text. Attempt %d/%d.", attempt + 1, max_retries + 1)

                # Find the first '{' and last '}' to extract the JSON portion
                first_brace = raw_text.find('{')
                last_brace = raw_text.rfind('}')
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    json_candidate = raw_text[first_brace:last_brace + 1]
                    logger.info("Extracted JSON candidate (%d chars) from raw_text", len(json_candidate))
                    try:
                        result = json.loads(_sanitize_llm_json(json_candidate))
                        logger.info("Successfully parsed extracted JSON")
                    except json.JSONDecodeError as e:
                        logger.warning("Extracted JSON still invalid: %s", e)
                        if attempt < max_retries:
                            continue  # Retry
                        logger.warning("All retries failed. Defaulting to fallback.")
                        return default_fallback
                else:
                    if attempt < max_retries:
                        continue  # Retry
                    logger.warning("No JSON braces found in response. Defaulting to fallback.")
                    return default_fallback

            logger.info("Generated AnimaComposerSpec for scene.")
            try:
                if isinstance(result, str):
                    result = _sanitize_llm_json(result)
                    result = json.loads(result)
                if isinstance(result, dict):
                    # Post-processing: Sanitize invalid icon values
                    _SEMANTIC_SIZES = {"xs", "sm", "md", "lg", "xl", "2xl", "3xl"}
                    for layer in result.get("layers", []):
                        icon = layer.get("icon")
                        if icon and isinstance(icon, str) and icon.lower().strip() in ("none", "null", "undefined", "", "n/a"):
                            del layer["icon"]
                            logger.info("Removed invalid icon value: '%s'", icon)

                        # v7.1: sanear 'size' malformado (p.ej. "color1" por JSON
                        # partido de Gemini). Si no es número ni tamaño semántico,
                        # eliminarlo para que el componente use su default.
                        size_val = layer.get("size")
                        if isinstance(size_val, str):
                            s = size_val.strip()
                            if s.lower() not in _SEMANTIC_SIZES:
                                try:
                                    layer["size"] = int(s) if "." not in s else float(s)
                                except (ValueError, TypeError):
                                    del layer["size"]
                                    logger.info("Removed invalid size value: '%s'", size_val)

                    # v7.2: componentes de ÉNFASIS (resaltan 1-4 palabras) usados
                    # con texto largo → convertir a StyleTextBlock. Evita la "caja
                    # amarilla" rota de HighlightText sobre un párrafo. Tras el
                    # swap, el auto-fit (que sí cubre StyleTextBlock) ajusta el tamaño.
                    _SHORT_EMPHASIS = {"HighlightText", "StrikethroughText", "UnderlineReveal"}
                    _EMPHASIS_MAX_CHARS = 40

                    def _swap_long_emphasis(layers_list: list) -> None:
                        for lyr in layers_list:
                            comp_n = lyr.get("componentName", "")
                            txt = lyr.get("text", "")
                            if comp_n in _SHORT_EMPHASIS and isinstance(txt, str) and len(txt) > _EMPHASIS_MAX_CHARS:
                                lyr["componentName"] = "StyleTextBlock"
                                lyr.setdefault("variant", "heading")
                                logger.info(
                                    "Swapped %s -> StyleTextBlock (text %d chars > %d)",
                                    comp_n, len(txt), _EMPHASIS_MAX_CHARS,
                                )
                            kids = lyr.get("children")
                            if isinstance(kids, list):
                                _swap_long_emphasis(kids)

                    _swap_long_emphasis(result.get("layers", []))

                    # ── Fase 1.2b: Replace StyleScrambleText when mood is non-tech ──
                    _TECH_KEYWORDS = {"tech", "cyber", "hacker", "glitch", "digital", "code", "matrix",
                                       "security", "computer", "robot", "ai", "data", "neon", "circuit"}

                    def _fix_inappropriate_scramble(layers_list: list, mq: str) -> None:
                        mq_lower = mq.lower()
                        is_tech_mood = any(kw in mq_lower for kw in _TECH_KEYWORDS)
                        for lyr in layers_list:
                            if lyr.get("componentName") == "StyleScrambleText" and not is_tech_mood:
                                lyr["componentName"] = "StyleTextBlock"
                                lyr.setdefault("variant", "heading")
                                logger.info(
                                    "Replaced StyleScrambleText with StyleTextBlock (non-tech mood: %s)",
                                    mq[:80],
                                )
                            kids = lyr.get("children")
                            if isinstance(kids, list):
                                _fix_inappropriate_scramble(kids, mq)

                    _fix_inappropriate_scramble(result.get("layers", []), media_query)

                    # ── Fase 1.1: Fix 'items' → 'children' in groups ──
                    LAYOUT_HINT_VALUES = {"center", "left", "right", "top", "bottom", "start", "end", "stretch", "flex-start", "flex-end", "space-between", "space-around"}
                    scene_text = text  # Available from function parameter scope

                    for layer in result.get("layers", []):
                        if layer.get("type") == "group" and "items" in layer and "children" not in layer:
                            items = layer.pop("items")
                            if isinstance(items, list):
                                children = []
                                for item in items:
                                    if isinstance(item, dict):
                                        # Icon items
                                        if "icon" in item:
                                            children.append({
                                                "type": "component",
                                                "componentName": "IconifyIcon",
                                                "icon": item["icon"],
                                                "x": 0, "y": 0,
                                                "size": item.get("size", 64),
                                            })
                                        # Text items — but filter out layout hints and duplicates
                                        elif "text" in item:
                                            text_val = item["text"]
                                            if text_val and len(text_val) > 5:
                                                children.append({
                                                    "type": "text",
                                                    "text": text_val,
                                                    "x": 0, "y": 0,
                                                    "fontSize": item.get("fontSize", 48),
                                                })
                                        elif "label" in item or "value" in item:
                                            value = item.get("value", item.get("label", ""))
                                            # Skip layout hints
                                            if isinstance(value, str) and value.strip().lower() in LAYOUT_HINT_VALUES:
                                                # Apply as alignment hint to the group
                                                if "alignItems" not in layer:
                                                    layer["alignItems"] = value.strip().lower()
                                                continue
                                            # Skip if value matches scene text (duplicate)
                                            if value and scene_text and value.strip() == scene_text.strip():
                                                continue
                                            # Only add as text child if it's meaningful content
                                            if value and len(value) > 5:
                                                children.append({
                                                    "type": "text",
                                                    "text": value,
                                                    "x": 0, "y": 0,
                                                    "fontSize": 48,
                                                })
                                layer["children"] = children if children else []
                                if "orientation" not in layer and "layout" not in layer:
                                    layer["layout"] = "flex"
                                    layer["direction"] = "column"
                                    layer["alignItems"] = layer.get("alignItems", "center")
                                if "gap" not in layer:
                                    layer["gap"] = 20
                            logger.info(
                                "Sanitized group: converted 'items' (%d) to 'children' (%d)",
                                len(items) if isinstance(items, list) else 0,
                                len(layer.get("children", [])),
                            )

                    # ── Fase 1.2: Fix type: "text" with componentName → type: "component" ──
                    for layer in result.get("layers", []):
                        if layer.get("type") == "text" and layer.get("componentName"):
                            original_type = layer["type"]
                            layer["type"] = "component"
                            logger.info(
                                "Fixed type conflict: '%s' → 'component' for componentName: %s",
                                original_type,
                                layer.get("componentName"),
                            )

                    # ── Fase 1.3: Deduplicate text across layers ──
                    seen_texts: set[str] = set()
                    layers_to_remove: list[int] = []
                    for i, layer in enumerate(result.get("layers", [])):
                        text = layer.get("text", "")
                        if text and len(text) > 10:
                            text_normalized = text.strip().lower()
                            if text_normalized in seen_texts:
                                layers_to_remove.append(i)
                                logger.info(
                                    "Removing duplicate text layer [%d]: '%s...'",
                                    i,
                                    text[:50],
                                )
                            else:
                                seen_texts.add(text_normalized)

                    for layer in result.get("layers", []):
                        if layer.get("type") == "group" and layer.get("children"):
                            group_seen: set[str] = set()
                            group_children = layer["children"]
                            children_to_remove: list[int] = []
                            for j, child in enumerate(group_children):
                                child_text = child.get("text", "")
                                if child_text and len(child_text) > 10:
                                    child_norm = child_text.strip().lower()
                                    if child_norm in seen_texts or child_norm in group_seen:
                                        children_to_remove.append(j)
                                    else:
                                        group_seen.add(child_norm)
                                        seen_texts.add(child_norm)
                            for j in reversed(children_to_remove):
                                group_children.pop(j)

                    for i in reversed(layers_to_remove):
                        result["layers"].pop(i)

                    # ── Fase 1.4: Normalize string numbers to actual numbers ──
                    NUMERIC_KEYS = {"width", "height", "fontSize", "strokeWidth", "gap",
                                    "speed", "delay", "borderRadius", "letterSpacing",
                                    "glowIntensity", "size", "count", "spread", "r",
                                    "entryDelay", "entryDuration", "exitDelay", "exitDuration",
                                    "rotation", "opacity", "value", "max", "maxValue",
                                    "decimals", "barHeight", "itemHeight", "thickness",
                                    "hoverFrame", "hoverDuration", "lineWidth", "stagger",
                                    "gridCols", "gridRows", "transitionDuration"}

                    for layer in result.get("layers", []):
                        for key in NUMERIC_KEYS:
                            if key in layer:
                                original = layer[key]
                                layer[key] = _coerce_number(original)
                                if original != layer[key]:
                                    logger.info(
                                        "Normalized %s: '%s' (str) → %s (%s)",
                                        key, original, layer[key], type(layer[key]).__name__,
                                    )
                        for child in layer.get("children", []):
                            for key in NUMERIC_KEYS:
                                if key in child:
                                    child[key] = _coerce_number(child[key])
                        # Coerce numbers inside data arrays (chart components)
                        for data_key in ("data", "points", "items"):
                            data_arr = layer.get(data_key)
                            if isinstance(data_arr, list):
                                for item in data_arr:
                                    if isinstance(item, dict):
                                        for k in ("value", "x", "y", "label"):
                                            if k in item and k != "label":
                                                item[k] = _coerce_number(item[k])

                    # ── Fase 1.5: Remove garbage props from TEXT components only ──
                    # IMPORTANTE: NO usar un blacklist global. Props como `data`,
                    # `value`, `maxValue`, `points`, `gap`, `decimals`, `prefix`,
                    # `suffix`, `fillArea`, etc. SON legítimas en charts, contadores,
                    # grupos flex y dividers — borrarlas de todos los componentes
                    # rompía esos componentes. Solución correcta = whitelist por
                    # componente (manifest, Fase 1). Interino seguro: limpiar solo
                    # las props chart/media/ui que el LLM vuelca sobre componentes
                    # de TEXTO (donde sí son basura). En componentes no-texto, una
                    # prop desconocida es inofensiva (React la ignora) y el
                    # `sanitizeProps.ts` del frontend ya filtra los que conoce.
                    TEXT_COMPONENTS = {
                        "Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText",
                        "WordHighlight", "SplitText", "TextSwap", "HighlightText",
                        "StrikethroughText", "UnderlineReveal", "GlitchTitle", "QuoteBlock",
                    }
                    # Props que son basura SOBRE UN COMPONENTE DE TEXTO. Se excluyen a
                    # propósito las que sí son válidas en algún componente de texto:
                    # maxLines (StyleTextBlock), loop/characters/speed (StyleScrambleText/
                    # Typewriter), highlightColor/activeScale/dimUpcoming (WordHighlight),
                    # animation/glowIntensity (TextReveal).
                    TEXT_GARBAGE_PROPS = {
                        "showScrollbar", "showRipple", "showPercentages", "showGrid",
                        "showDots", "fillArea", "explodeSlice", "maxValue",
                        "barHeight", "visibleItems", "showLabel", "showLabels",
                        "showValues", "labelPosition", "autoplay", "muted",
                        "deletable", "showBadge", "badgeText", "iconPosition",
                        "from", "duration", "orientation", "thickness", "lineColor",
                        "separator", "points", "data", "value", "max", "items",
                        "name", "prefix", "suffix", "decimals", "gap", "format",
                        "hoverFrame", "hoverDuration", "itemHeight",
                    }

                    def _strip_text_garbage(node: dict) -> None:
                        comp = node.get("componentName", "")
                        if comp not in TEXT_COMPONENTS:
                            return
                        removed = [p for p in TEXT_GARBAGE_PROPS if p in node]
                        for p in removed:
                            del node[p]
                        if removed:
                            logger.info(
                                "Removed %d garbage props from text component %s: %s",
                                len(removed), comp, removed,
                            )

                    for layer in result.get("layers", []):
                        _strip_text_garbage(layer)
                        for child in layer.get("children", []):
                            _strip_text_garbage(child)

                    # ── Fase 4.1: Validate component names against registry ──
                    VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)
                    FALLBACK_COMPONENTS = {
                        "RippleEffect": "ParticleField",
                        "GlowOrb": "FloatingBlobs",
                        "NeonText": "TextReveal",
                        "GradientMesh": "AbstractWave",
                    }

                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        if comp and comp not in VALID_COMPONENTS:
                            fallback = FALLBACK_COMPONENTS.get(comp)
                            if fallback:
                                logger.info("Replaced unknown component '%s' → '%s'", comp, fallback)
                                layer["componentName"] = fallback
                            else:
                                logger.warning("Unknown component '%s' — marking for removal", comp)
                                layer["_remove"] = True

                    result["layers"] = [l for l in result.get("layers", []) if not l.get("_remove")]

                    # Also validate children in groups
                    for layer in result.get("layers", []):
                        for child in layer.get("children", []):
                            comp = child.get("componentName", "")
                            if comp and comp not in VALID_COMPONENTS:
                                fallback = FALLBACK_COMPONENTS.get(comp)
                                if fallback:
                                    logger.info("Replaced unknown child component '%s' → '%s'", comp, fallback)
                                    child["componentName"] = fallback
                                else:
                                    child["_remove"] = True
                        layer["children"] = [c for c in layer.get("children", []) if not c.get("_remove")]

                    # ── Fase 2.4: Auto-fit text fontSize based on text length and canvas width ──
                    canvas_w, canvas_h = _get_canvas_dimensions(aspect_ratio)
                    max_text_width = canvas_w * 0.85

                    TEXT_LAYER_TYPES = {"text", "component"}
                    TEXT_COMPONENT_NAMES = {"Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText", "WordHighlight", "GradientText"}

                    def _auto_fit_layer_text(layer: dict, max_width: float, canvas_height: float) -> None:
                        """Scale down fontSize if text is estimated to overflow, accounting for line wrapping."""
                        text = layer.get("text", "")
                        font_size = layer.get("fontSize")
                        if not text or not font_size or not isinstance(font_size, (int, float)):
                            return

                        # Multi-line estimation (matching frontend fitText.ts)
                        min_font_size = 64  # v7: mínimo legible para texto hablado en video vertical
                        max_font_size = font_size
                        best_font_size = min_font_size
                        char_width_ratio = 0.6  # Bold font
                        line_height = 1.3
                        # v7.2: bajado de 0.6 a 0.5 — el texto hablado no debe
                        # llenar toda la pantalla; deja aire para respiración visual.
                        max_text_height = canvas_height * 0.5

                        low = min_font_size
                        high = max_font_size
                        while low <= high:
                            mid = (low + high) // 2
                            char_width = mid * char_width_ratio
                            chars_per_line = max(1, int(max_width / char_width))
                            line_count = math.ceil(len(text) / chars_per_line)
                            total_height = line_count * mid * line_height

                            if total_height <= max_text_height and chars_per_line >= 3:
                                best_font_size = mid
                                low = mid + 1
                            else:
                                high = mid - 1

                        if best_font_size < font_size:
                            logger.info(
                                "Auto-fit fontSize: %d → %d for text length %d chars "
                                "(multi-line fit: %d lines at %dpx width)",
                                font_size, best_font_size, len(text),
                                math.ceil(len(text) / max(1, int(max_width / (best_font_size * char_width_ratio)))),
                                int(max_width),
                            )
                            layer["fontSize"] = best_font_size

                    for layer in result.get("layers", []):
                        layer_type = layer.get("type", "")
                        comp_name = layer.get("componentName", "")

                        if layer_type == "text" or (layer_type == "component" and comp_name in TEXT_COMPONENT_NAMES):
                            _auto_fit_layer_text(layer, max_text_width, canvas_h)

                        for child in layer.get("children", []):
                            child_type = child.get("type", "")
                            child_comp = child.get("componentName", "")
                            if child_type == "text" or (child_type == "component" and child_comp in TEXT_COMPONENT_NAMES):
                                child_max_width = max_text_width * 0.8
                                _auto_fit_layer_text(child, child_max_width, canvas_h)

                    # ── Fase 3.1: Assign default width for text components ──
                    COMPONENT_DEFAULT_WIDTHS = {
                        "Typewriter": lambda cw: int(cw * 0.85),
                        "TextReveal": lambda cw: int(cw * 0.85),
                        "StyleTextBlock": lambda cw: int(cw * 0.85),
                        "StyleScrambleText": lambda cw: int(cw * 0.85),
                        "WordHighlight": lambda cw: int(cw * 0.85),
                        # v8: títulos display que envuelven por `width`. Sin esto el
                        # solver les pasaba DEFAULT_LAYER_WIDTH=200 → texto larguísimo
                        # envuelto a ~7 líneas que pisaba al ícono (escena 1), y el
                        # estimador de colisión asumía 918 → sub-estimaba la altura.
                        "GlitchTitle": lambda cw: int(cw * 0.85),
                        "HighlightText": lambda cw: int(cw * 0.85),
                        "GradientText": lambda cw: int(cw * 0.85),
                        "SubscribeButton": lambda cw: int(cw * 0.6),
                        "IconifyIcon": lambda cw: 120,
                    }

                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        if comp in COMPONENT_DEFAULT_WIDTHS and "width" not in layer:
                            layer["width"] = COMPONENT_DEFAULT_WIDTHS[comp](canvas_w)
                            logger.info(
                                "Assigned default width %d for %s (canvas: %dpx)",
                                layer["width"], comp, canvas_w,
                            )

                    # Post-processing: Remove groups with no children
                    result["layers"] = [
                        layer for layer in result.get("layers", [])
                        if not (layer.get("type") == "group" and not layer.get("children"))
                    ]

                    for layer in result.get("layers", []):
                        if "lineWidth" in layer and isinstance(layer["lineWidth"], (int, float)):
                            layer["lineWidth"] = round(float(layer["lineWidth"]), 2)

                    # Post-processing: Normalize paths, apply smart layout, and clamp coordinates
                    width, height = _get_canvas_dimensions(aspect_ratio)
                    result = _normalize_paths(result, width, height)
                    result = _apply_smart_layout(result)
                    result = _clamp_coordinates(result, width, height)

                    # Post-validation 1: Ensure default ENTRY + EXIT animations (v7.1)
                    # - entry: antes no se añadía ninguna → íconos/texto aparecían
                    #   de golpe. Ahora cada capa no-fondo entra animada.
                    # - exit/entryDuration van en FRAMES (AnimatedWrapper los usa
                    #   como frames, no segundos). Antes exitDuration=0.5 → la
                    #   salida duraba medio frame = corte seco.
                    BACKGROUND_COMPONENTS = {
                        "KineticBackground", "ParticleField", "FloatingBlobs", "RaysOfLight",
                        "AbstractWave", "GlobalVFX", "NetworkNodes", "GradientOverlay",
                        "GridPerspective",
                        # v8 (Fase 5): efectos full-screen, sin entry/exit propio.
                        "CinematicBars", "Spotlight", "CameraShake", "KenBurns",
                    }
                    TEXT_FOR_ENTRY = {
                        "StyleTextBlock", "Typewriter", "TextReveal", "StyleScrambleText",
                        "SplitText", "GlitchTitle", "TextSwap", "HighlightText", "QuoteBlock",
                        "WordHighlight", "GradientText",
                    }
                    ICON_UI_FOR_ENTRY = {
                        "IconifyIcon", "AnimatedIcon", "StyleBadge", "FloatingBadge",
                        "SubscribeButton", "StyleButton", "StyleChip", "StyleCard",
                        "StyleDivider", "StyleAvatar",
                    }
                    # Componentes que controlan su PROPIA aparición (no se les debe
                    # inyectar entry/exit por defecto, o entrarían en conflicto).
                    SELF_ANIMATED = {"KeywordPop"}

                    # Escenas cortas: animaciones más rápidas y sin escalonado.
                    short_scene = bool(duration_seconds and duration_seconds < 2.5)
                    anim_dur_frames = 8 if short_scene else 15
                    stagger_step = 0.0 if short_scene else 0.12

                    entry_index = 0
                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        is_bg = comp in BACKGROUND_COMPONENTS
                        if comp in SELF_ANIMATED:
                            continue  # se anima solo; no tocar entry/exit

                        # ── Exit por defecto (todas las capas no-fondo) ──
                        if not is_bg and "exit" not in layer:
                            layer["exit"] = "fade-out"
                            layer["exitDuration"] = anim_dur_frames  # frames
                            logger.info(
                                "Added default exit animation to layer: %s",
                                comp or layer.get("type"),
                            )

                        # ── Entry por defecto (todas las capas no-fondo) ──
                        if not is_bg and "entry" not in layer:
                            if layer.get("type") == "text" or comp in TEXT_FOR_ENTRY:
                                layer["entry"] = "slide-up"
                            elif comp in ICON_UI_FOR_ENTRY:
                                layer["entry"] = "scale-in"
                            else:
                                layer["entry"] = "fade-in"
                            layer["entryDuration"] = anim_dur_frames  # frames
                            # Escalonado: cada capa entra un poco después que la anterior
                            if "entryDelay" not in layer:
                                layer["entryDelay"] = round(entry_index * stagger_step, 2)
                            entry_index += 1
                            logger.info(
                                "Added default entry '%s' to layer: %s",
                                layer["entry"], comp or layer.get("type"),
                            )

                    # ── Post-validation 1b: Adaptive timing guard for short scenes ──
                    # CONTRATO DE UNIDADES DEL RENDERER (AnimatedWrapper.tsx):
                    #   • entryDelay → SEGUNDOS (AnimatedWrapper hace delay * fps).
                    #   • entryDuration / exitDuration → FRAMES.
                    #   • La SALIDA siempre termina en el corte de escena
                    #     (exitStart = durationInFrames - exitDuration). El renderer
                    #     NO usa exitDelay, así que aquí no se toca.
                    # Objetivo: en escenas cortas, que entrada + salida no se coman la
                    # escena y quede tiempo "asentado" (visible) antes de la salida.
                    if duration_seconds and duration_seconds > 0:
                        total_frames = max(1, int(duration_seconds * 30))
                        fps = 30
                        # Cada animación (en FRAMES) como máximo ~30% de la escena, de
                        # modo que entrada + salida ≤ 60% y quede ≥40% para delay+settle.
                        max_each = max(4, int(total_frames * 0.30))
                        # La entrada debe TERMINAR como muy tarde al 60% de la escena.
                        entry_finish_cap_frames = int(total_frames * 0.6)

                        for layer in result.get("layers", []):
                            comp = layer.get("componentName", "")
                            if comp in BACKGROUND_COMPONENTS or comp in SELF_ANIMATED:
                                continue

                            # Duraciones en FRAMES: clamp por escena.
                            entry_dur = layer.get("entryDuration")
                            exit_dur = layer.get("exitDuration")
                            if isinstance(entry_dur, (int, float)) and entry_dur > max_each:
                                layer["entryDuration"] = max_each
                                entry_dur = max_each
                                logger.info(
                                    "Clamped entryDuration for '%s' (%.1fs): → %d frames",
                                    comp, duration_seconds, max_each,
                                )
                            if isinstance(exit_dur, (int, float)) and exit_dur > max_each:
                                layer["exitDuration"] = max_each
                                logger.info(
                                    "Clamped exitDuration for '%s' (%.1fs): → %d frames",
                                    comp, duration_seconds, max_each,
                                )

                            # entryDelay en SEGUNDOS: garantizar que la entrada termine
                            # a tiempo (delay*fps + entryDuration ≤ 60% de la escena),
                            # dejando espacio antes de la salida. NO convertir a frames.
                            entry_delay = layer.get("entryDelay", 0)
                            entry_dur_f = entry_dur if isinstance(entry_dur, (int, float)) else 0
                            max_delay_frames = max(0, entry_finish_cap_frames - int(entry_dur_f))
                            max_delay_seconds = round(max_delay_frames / fps, 2)
                            if isinstance(entry_delay, (int, float)) and entry_delay > max_delay_seconds:
                                layer["entryDelay"] = max_delay_seconds
                                logger.info(
                                    "Clamped entryDelay for '%s' (%.1fs): %.2fs → %.2fs",
                                    comp, duration_seconds, entry_delay, max_delay_seconds,
                                )

                    # Post-validation 2: Remove duplicate icons ONLY if they're at the same position (overlap)
                    icon_positions: dict[str, list[tuple]] = {}
                    layers_to_remove: list[int] = []
                    for i, layer in enumerate(result.get("layers", [])):
                        icon = layer.get("icon")
                        if icon:
                            pos = (layer.get("x", 0), layer.get("y", 0))
                            icon_positions.setdefault(icon, []).append((i, pos))

                    for icon, occurrences in icon_positions.items():
                        if len(occurrences) > 1:
                            # Check if any are at the same position (overlap)
                            seen_positions = {}
                            for idx, pos in occurrences:
                                if pos in seen_positions:
                                    layers_to_remove.append(idx)
                                    logger.info(
                                        "Removing overlapping icon '%s' at position %s (duplicate)",
                                        icon, pos,
                                    )
                                else:
                                    seen_positions[pos] = idx

                    for i in reversed(layers_to_remove):
                        result["layers"].pop(i)

                    # Post-validation 2b: Deduplicate icons that appear both inside a group's children
                    # AND as a standalone layer — keep the one inside the group, remove the standalone.
                    def _collect_icon_refs(layers_list: list, path: str = "") -> list[tuple[str, str, dict]]:
                        """Collect all icon references as (icon_id, path, layer_ref)."""
                        refs: list[tuple[str, str, dict]] = []
                        for idx, lyr in enumerate(layers_list):
                            icon = lyr.get("icon")
                            if icon and isinstance(icon, str):
                                refs.append((icon, f"{path}[{idx}]", lyr))
                            kids = lyr.get("children")
                            if isinstance(kids, list):
                                refs.extend(_collect_icon_refs(kids, f"{path}[{idx}].children"))
                        return refs

                    all_icon_refs = _collect_icon_refs(result.get("layers", []))
                    # Find icons that appear both inside a group (path contains "children")
                    # and as a standalone layer (path does NOT contain "children")
                    icons_in_groups: set[str] = set()
                    standalone_icons: list[tuple[str, str, dict]] = []
                    for icon_id, path, layer_ref in all_icon_refs:
                        if "children" in path:
                            icons_in_groups.add(icon_id)
                        else:
                            standalone_icons.append((icon_id, path, layer_ref))

                    dedup_removals: list[int] = []
                    for icon_id, path, layer_ref in standalone_icons:
                        if icon_id in icons_in_groups:
                            # Find the index of this standalone layer in result["layers"]
                            for idx, top_layer in enumerate(result.get("layers", [])):
                                if top_layer is layer_ref:
                                    dedup_removals.append(idx)
                                    logger.info(
                                        "Removed standalone IconifyIcon '%s' (duplicate of icon inside group)",
                                        icon_id,
                                    )
                                    break

                    for idx in reversed(dedup_removals):
                        result["layers"].pop(idx)

                    # Post-validation 3: Smart redistribution of overlapping layers
                    non_bg_layers = [
                        l for l in result.get("layers", [])
                        if not (l.get("type") == "component" and l.get("componentName") == "KineticBackground")
                    ]

                    if len(non_bg_layers) > 1:
                        positions = set()
                        for l in non_bg_layers:
                            positions.add((l.get("x", 0), l.get("y", 0)))

                        if len(positions) <= 1:
                            # All layers at same position — distribute intelligently
                            canvas_w, canvas_h = _get_canvas_dimensions(aspect_ratio)

                            # Categorize layers by role
                            decorative = []  # Background effects, particles
                            text_layers = []  # Main text components
                            ui_layers = []     # Buttons, badges, CTAs
                            icon_layers = [] # Icons

                            for layer in non_bg_layers:
                                comp = layer.get("componentName", "")
                                if comp in ("ParticleField", "FloatingBlobs", "RaysOfLight", "AbstractWave", "GlobalVFX"):
                                    decorative.append(layer)
                                elif comp in ("Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText") or layer.get("type") == "text":
                                    text_layers.append(layer)
                                elif comp in ("SubscribeButton", "StyleButton", "CTABanner", "SocialProgressBar"):
                                    ui_layers.append(layer)
                                elif comp in ("IconifyIcon", "AnimatedIcon"):
                                    icon_layers.append(layer)
                                else:
                                    decorative.append(layer)

                            # Position decorative layers at full canvas (they fill the background)
                            for layer in decorative:
                                layer["x"] = 0
                                layer["y"] = 0

                            # Position text layers in the center zone
                            text_zone_top = int(-canvas_h * 0.15)
                            text_spacing = 250
                            for i, layer in enumerate(text_layers):
                                layer["x"] = 0
                                layer["y"] = text_zone_top + (i * text_spacing)

                            # Position icons above text
                            icon_zone_top = int(-canvas_h * 0.3)
                            for i, layer in enumerate(icon_layers):
                                layer["x"] = (i - len(icon_layers) // 2) * 150
                                layer["y"] = icon_zone_top

                            # Position UI layers at bottom
                            ui_zone_y = int(canvas_h * 0.35)
                            for i, layer in enumerate(ui_layers):
                                layer["x"] = 0
                                layer["y"] = ui_zone_y + (i * 120)

                            logger.info(
                                "Smart redistributed %d layers: %d decorative, %d text, %d icons, %d UI",
                                len(non_bg_layers), len(decorative), len(text_layers), len(icon_layers), len(ui_layers),
                            )

                    # Post-validation 3b (Fase 3): de-solapamiento por bounding box.
                    # Cubre el caso general (capas en posiciones distintas que igual
                    # se pisan por su tamaño real), que la redistribución de arriba
                    # —solo para capas apiladas en el mismo punto— no detecta.
                    # Post-validation 3a (Fase 3): quitar CTA duplicado ANTES de
                    # de-solapar (así no se reacomoda algo que sobra).
                    result = _dedup_cta_components(result)

                    _cw, _ch = _get_canvas_dimensions(aspect_ratio)
                    result = _resolve_vertical_overlaps(result, _cw, _ch)

                    # Post-validation 3c (Fase 4): atenuar decorativos ruidosos
                    # para que no compitan con el texto.
                    result = _tame_decorative_backgrounds(result)

                    # Final validation pass — catch anything missed by post-processing
                    result = validate_and_fix(result, aspect_ratio)

                    return AnimaComposerSpec(**result)
                else:
                    return AnimaComposerSpec.model_validate(result)
            except Exception as parse_error:
                logger.warning("Pydantic parse failed: %s. Attempt %d/%d.", parse_error, attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    continue  # Retry
                return default_fallback

        except Exception as e:
            logger.warning(
                "Error en strategy decision: %s. Attempt %d/%d.",
                str(e)[:100], attempt + 1, max_retries + 1,
            )
            if attempt < max_retries:
                continue
            return default_fallback

    return default_fallback
