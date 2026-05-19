import json
import time
from typing import Optional
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync


def generate_ae_structure(
    svg_elements: list,
    text: str,
    duration: float,
    bg_color: str,
    text_color: str,
    width: int,
    height: int,
    effects: list = None,
    enriched_summary: str = None,
    job_id: str = None,
    scene_id: int = None,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    FASE 1: Genera la ESTRUCTURA ESTÁTICA del script AE (sin animaciones).
    Crea composición, layers, shapes, fills, strokes, gradients, text layer.
    NO incluye setValueAtTime() calls.
    """
    from app.core.config import settings
    from app.modules.ae_export.deterministic.utils import hex_to_rgb_array
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model
    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada.")
        return None

    try:
        svg_context = ""
        if svg_elements:
            svg_context = f"""
GEOMETRÍA EXACTA (coordenadas precisas):
{json.dumps(svg_elements, indent=2)}

Para cada elemento:
- "path": usa new Shape() con vertices, inTangents, outTangents, closed
- "circle": usa ellipse.property("ADBE Vector Ellipse Size").setValue([diametro, diametro])
- "rect": usa rect.property("ADBE Vector Rect Size").setValue([width, height])
- "line": usa new Shape() con 2 vertices, closed=false
- Colores fill/stroke son exactos — conviértelos con hex_to_rgb_array()
"""

        effects_context = ""
        if effects:
            effects_context = f"""
EFECTOS VISUALES:
{json.dumps(effects, indent=2)}
"""

        enriched_context = ""
        if enriched_summary:
            enriched_context = f"""
=== DATOS EXACTOS DEL TSX (PRIORIDAD MÁXIMA — usar estos valores, NO inventar) ===
{enriched_summary}
=== FIN DATOS EXACTOS ===
"""

        client = genai.Client(api_key=api_key)

        prompt = f"""Genera la ESTRUCTURA ESTÁTICA de un script de After Effects (SIN animaciones).

CANVAS: {width}x{height}, {duration}s, 30fps. FONDO: {bg_color}

{enriched_context}
{svg_context}
{effects_context}

TEXTO: "{text}"
COLOR TEXTO: {text_color}
Posición texto: X={width//2}, Y={int(height*0.7)} como base.
Si hay elementos visuales en la zona inferior (Y > {int(height*0.6)}), mover texto a Y={int(height*0.82)}.
fontSize=68px, Bold, centrado

REGLAS CRÍTICAS:
1. Crea comp, background solid, shape layers, text layer
2. SOLO estructura: layers, shapes, fills, strokes, gradients
3. NO setValueAtTime() — solo setValue() para propiedades estáticas
4. Nombra cada layer con nombre descriptivo (Leaf_1, Circle_2, Ripple_3, textLayer)
5. Usa la estructura de shape layer obligatoria
6. CÍRCULOS/ELLIPSES: NUNCA uses [0, 0] como tamaño. Usa el tamaño real del SVG. Si el SVG dice rx=15, ry=30 → setValue([30, 60]). Si no hay tamaño definido, usa [50, 50] como mínimo.
7. PATHS CERRADOS: Si un path tiene 3+ vertices que forman una forma cerrada (ej: corazón, hoja), usa s.closed = true. Solo usa closed=false para líneas abiertas.
8. NO uses funciones helper (createShapeLayer, etc.). Crea cada layer EXPLÍCITAMENTE con código directo.
9. NO uses arrays geo[] con loops for. Cada layer debe ser creado individualmente.
10. POSICIONES EXACTAS: Para CADA shape layer, agrega su posición exacta usando:
    sl.property("ADBE Transform Group").property("ADBE Position").setValue([X, Y]);
    Donde [X, Y] es el centro aproximado de los vértices del path.
    - Calcula el centro: promedio de todos los vértices del path
    - NUNCA uses [540, 960] para todos los elementos — cada uno debe tener posición ÚNICA
    - Si el SVG tiene vértices [[540, 960], [470, 1030]], centro ≈ [505, 995]
11. GENERA TODOS LOS ELEMENTOS: El SVG parser te proporciona TODOS los elementos visuales. Debes crear un shape layer para CADA UNO. Si hay 15 elementos en svg_elements, genera 15 shape layers. NO omitas ninguno.
13. TRIM PATHS: Si algún elemento es una línea (type="line") o path que necesita efecto de "dibujo" (stroke-dasharray, stroke-dashoffset en el TSX), agrega después del stroke:
    var trim = vg.addProperty("ADBE Vector Filter - Trim");
    trim.property("ADBE Vector Trim Start").setValue(0);
    trim.property("ADBE Vector Trim End").setValue(100);
    Esto permite animar el "draw-on" effect con .property("ADBE Vector Trim End").setValueAtTime(...)

ESTRUCTURA SHAPE LAYER (OBLIGATORIA):
Shape Layer → ADBE Root Vectors Group → ADBE Vector Group (addProperty) → ADBE Vectors Group (.property) → shapes/fills/strokes

CÓDIGO BASE:
var comp = app.project.items.addComp("Scene", {width}, {height}, 1, {duration}, 30);
comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Background", {width}, {height}, 1, {duration});

var sl = comp.layers.addShape(); sl.name = "Element_1";
var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg = g.property("ADBE Vectors Group");
var ps = vg.addProperty("ADBE Vector Shape - Group");
var s = new Shape(); s.vertices = [[0,0],[100,100]]; s.inTangents = [[0,0],[0,0]]; s.outTangents = [[0,0],[0,0]]; s.closed = true;
ps.property("ADBE Vector Shape").setValue(s);
var f = vg.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue([R,G,B]);

MATCH NAMES: Path=`ADBE Vector Shape - Group`, Ellipse=`ADBE Vector Shape - Ellipse`, Rect=`ADBE Vector Shape - Rect`, Fill=`ADBE Vector Graphic - Fill`, Stroke=`ADBE Vector Graphic - Stroke`
VECTORS GROUP: usar .property("ADBE Vectors Group"), NO addProperty
LÍNEAS: closed=false siempre explícito

EFECTOS — USAR SIEMPRE NOMBRES DE PROPIEDADES, NUNCA ÍNDICES NUMÉRICOS:

Drop Shadow:
  var ds = layer.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
  ds.property("ADBE Drop Shadow-0002").setValue(75);
  ds.property("ADBE Drop Shadow-0005").setValue(20);
  ds.property("ADBE Drop Shadow-0004").setValue(4);
  - NUNCA usar ds.property(1), ds.property(2), etc. — SIEMPRE usar nombres.
  - Agregar Drop Shadow a TODOS los shape layers principales.

Glow (ADBE Glo2):
  var glow = layer.property("ADBE Effect Parade").addProperty("ADBE Glo2");
  glow.property("ADBE Glo2-0003").setValue(10);
  glow.property("ADBE Glo2-0004").setValue(1.5);
  glow.property("ADBE Glo2-0002").setValue(60);

GRADIENTES — usar efecto "Gradient Ramp" (ADBE Ramp):
1. Crear shape con fill sólido base (color intermedio del gradiente)
2. Aplicar efecto: layer.property("ADBE Effect Parade").addProperty("ADBE Ramp")
3. Configurar con NOMBRES de propiedades (NUNCA índices numéricos):
   ramp.property("ADBE Ramp-0002").setValue([R,G,B]);
   ramp.property("ADBE Ramp-0004").setValue([R,G,B]);
   ramp.property("ADBE Ramp-0005").setValue(2);  // 1=Linear, 2=Radial
   ramp.property("ADBE Ramp-0001").setValue([x1, y1]);  // punto inicio
   ramp.property("ADBE Ramp-0003").setValue([x2, y2]);    // punto fin
4. SI el TSX usa radialGradient → setValue(2) para Radial
5. SI el TSX usa linearGradient → setValue(1) para Linear

TEXTO:
var textLayer = comp.layers.addText("TEXTO_AQUI");
var td = textLayer.property("Source Text").value;
td.resetCharStyle();
td.fontSize = 68; td.fauxBold = true;
td.fillColor = {hex_to_rgb_array(text_color)};
td.justification = ParagraphJustification.CENTER_JUSTIFY;
textLayer.property("Source Text").setValue(td);
textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width//2}, {int(height*0.7)}]);

SOLO código ExtendScript estático. Sin comentarios largos. Sin funciones helper. Sin arrays geo[]. Cada layer creado individualmente."""

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = _call_llm_sync(
                    client,
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.3),
                    label="LLM AE-Structure",
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(
                    code in error_str
                    for code in ["429", "500", "502", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
                )
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2**attempt)
                    logger.warning(
                        "Retry en %ds (intento %d/%d)",
                        wait_time,
                        attempt + 1,
                        max_retries,
                    )
                    time.sleep(wait_time)
                    continue
                logger.exception("AE-Structure LLM call failed after %d attempts", attempt + 1)
                raise

        if response is None:
            response = _call_llm_sync(
                client,
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3),
                label="LLM AE-Structure",
            )

        script = response.text.strip()
        if script.startswith("```"):
            lines = script.split("\n")
            code_lines = []
            in_code = False
            for line in lines:
                if (
                    line.startswith("```jsx")
                    or line.startswith("```javascript")
                    or line.startswith("```")
                ):
                    in_code = not in_code
                    continue
                if in_code:
                    code_lines.append(line)
            script = "\n".join(code_lines)

        return script

    except (TimeoutError, ValueError) as e:
        logger.error("ERROR: %s: %s", type(e).__name__, e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected LLM error
        logger.exception("ERROR: %s: %s", type(e).__name__, e)
        return None
