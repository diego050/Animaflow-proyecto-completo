import os
import re
import json
import httpx
import asyncio
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.schemas.spec import Spec
from google import genai
from google.genai import types

# =============================================================================
# SCRIPT GENERATION WITH GEMINI
# =============================================================================

def generate_script_from_info(info: str) -> str:
    """Usa Gemini para generar un guion narrativo basado en la información del usuario."""
    from app.core.config import settings
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return "El motor IA generativo está apagado. Configura GEMINI_API_KEY."
    
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        Eres un experto guionista de videos B2B y SaaS. 
        El usuario te ha proporcionado la siguiente información, idea o producto:
        "{info}"
        
        Tu tarea es escribir un guion dinámico, conciso y directo para un video corto (máximo 6 oraciones). 
        El guion debe estar escrito de forma persuasiva, atrapante, y estar listo para ser locutado.
        NO incluyas indicaciones de escena (como "Corte a", "Música", "Voz en off", "Narrador:"). 
        SOLO escribe el texto puro que la persona o IA leerá.
        """
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"[LLM API] Error generando guion: {e}")
        return "Error al generar guion. Por favor, intenta de nuevo o escríbelo manualmente."


# =============================================================================
# VOICEBOX TTS INTEGRATION
# =============================================================================

VOICEBOX_API_URL = "http://127.0.0.1:17493"
AUDIO_STORAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/audio"))

class VisualSpecResult(BaseModel):
    media_query: str = Field(description="Descripción visual detallada de la escena (en INGLÉS, ideal para generadores de IA).")
    backgroundColor: str = Field(description="Color de fondo en formato HEX oscuro, ejemplo #1e293b.")
    textColor: str = Field(description="Color del texto principal en formato HEX contrastante, ejemplo #38bdf8.")

class BatchVisualSpec(BaseModel):
    scenes: list[VisualSpecResult]

def split_text_into_chunks(text: str) -> list[str]:
    """Divide el texto en oraciones lógicas basadas en puntuación."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

async def get_or_create_kokoro_profile() -> str | None:
    """Obtiene o crea el perfil preset de Kokoro para AnimaFlow."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{VOICEBOX_API_URL}/profiles", timeout=10.0)
            res.raise_for_status()
            profiles = res.json()
            existing = next(
                (p["id"] for p in profiles if p["name"] == "animaflow-kokoro-es"),
                None
            )
            if existing:
                return existing

            payload = {
                "name": "animaflow-kokoro-es",
                "language": "es",
                "voice_type": "preset",
                "preset_engine": "kokoro",
                "preset_voice_id": "em_alex"
            }
            res = await client.post(f"{VOICEBOX_API_URL}/profiles", json=payload, timeout=10.0)
            if not res.is_success:
                print(f"[Voicebox API] Error creando perfil Kokoro {res.status_code}: {res.text}")
                return None
            profile_id = res.json()["id"]
            print(f"[Voicebox API] Perfil Kokoro creado: {profile_id}")
            return profile_id
    except Exception as e:
        print(f"[Voicebox API] No se pudo obtener/crear perfil Kokoro: {e}")
        return None

async def generate_tts_with_voicebox(text: str, scene_id: str) -> tuple[Optional[float], Optional[str]]:
    """Llama a la API local de Voicebox y retorna la duración en segundos y la URL del audio."""
    try:
        profile_id = await get_or_create_kokoro_profile()
        if not profile_id:
            print(f"[Voicebox API] Sin perfil Kokoro disponible para {scene_id}.")
            return None, None

        payload = {
            "text": text,
            "profile_id": profile_id,
            "language": "es",
            "engine": "kokoro",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VOICEBOX_API_URL}/generate",
                json=payload,
                timeout=30.0
            )
            if not response.is_success:
                print(f"[Voicebox API] Error {response.status_code} en {scene_id}: {response.text}")
                return None, None

            data = response.json()
            generation_id = data.get("id")
            if not generation_id:
                return None, None

            status_url = f"{VOICEBOX_API_URL}/generate/{generation_id}/status"
            async with client.stream("GET", status_url, timeout=120.0) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            msg = json.loads(line[6:])
                            status = msg.get("status")
                            if status == "completed":
                                duration = msg.get("duration")
                                audio_url = f"{VOICEBOX_API_URL}/audio/{generation_id}"
                                return duration, audio_url
                            elif status == "failed":
                                print(f"[Voicebox API] Generación fallida {scene_id}: {msg.get('error')}")
                                return None, None
                        except json.JSONDecodeError:
                            continue

        return None, None
    except Exception as e:
        print(f"[Voicebox API] Error o no disponible: {e}")
        return None, None


# =============================================================================
# VISUAL SPEC GENERATION WITH GEMINI
# =============================================================================

def generate_batch_visuals_with_llm(chunks: list[str], aspect_ratio: str = "9:16") -> BatchVisualSpec:
    """Usa Gemini para generar un arreglo de escenas visuales para cada bloque de texto."""
    import time
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[LLM API] GEMINI_API_KEY no encontrada. Fallback a escenas genéricas.")
        return BatchVisualSpec(scenes=[
            VisualSpecResult(
                media_query="A cinematic wide shot of a futuristic landscape",
                backgroundColor="#0f172a",
                textColor="#38bdf8"
            ) for _ in chunks
        ])
        
    try:
        client = genai.Client(api_key=api_key)
        
        w, h = get_resolution(aspect_ratio)
        scenes_context = "\n".join([f"Escena {i+1}: \"{t}\"" for i, t in enumerate(chunks)])
        
        prompt = f"""
Eres el director de animación SENIOR de AnimaFlow. Analiza este guion y crea descripciones visuales DETALLADAS para animaciones SVG 2D complejas.

CANVAS: {aspect_ratio} ({w}x{h} píxeles). TODAS las posiciones y tamaños deben caber en este canvas.

{scenes_context}

TU TAREA: Para cada escena, describe una animación SVG 2D única y contextual que refleje el mensaje del texto.

REQUISITOS CRÍTICOS:

1. ANIMACIÓN COMPLEJA:
   - Describe una animación SVG 2D específica (NO abstracta).
   - Puede incluir: colisiones, morphing, partículas, conexiones, revelaciones, construcciones, etc.
   - Usa easing curves: bounce, spring, ease-in-out, elastic.
   - Incluye transiciones de entrada, desarrollo y salida.
   - Ejemplos: "Dos bloques chocan y generan destello", "Calendario aparece con bounce", "Nodos se conectan en secuencia"

2. ELEMENTOS SVG CONCRETOS:
   - Especifica formas: calendarios, cuadrados, círculos, líneas, partículas, etc.
   - Mínimo 3-5 elementos visuales por escena.
   - Describe tamaños, posiciones relativas y colores.
   - POSICIONES: X debe estar entre 0 y {w}, Y entre 0 y {h}.

3. ESTILO VISUAL:
   - Minimalista 2D, sin elementos 3D.
   - Colores vibrantes, sombras, glows, gradientes.
   - Paleta oscura y premium.

4. MEDIA_QUERY EN INGLÉS:
   - Debe ser una descripción narrativa detallada de la animación completa.
   - Cada escena debe tener un media_query DIFERENTE y contextual al texto.
   - Ejemplo escenas distintas: "Two rectangular blocks slide from opposite sides, collide at center creating a bright flash burst..." vs "A leaf grows from bottom center, branches extend outward with organic curves..."

5. COHERENCIA:
   - Mantén coherencia visual entre escenas (misma familia de colores).
   - Devuelve exactamente {len(chunks)} escenas en el mismo orden.
   - NUNCA uses "generic abstract background" o "particle effects" como media_query.

Responde SOLO con JSON válido.
"""
        
        # INTENTO 1: Modelo principal con retry
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=BatchVisualSpec,
                        temperature=0.7,
                    ),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
                
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2 ** attempt)
                    print(f"[LLM API] Batch visuals: retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        if response is None:
            print(f"[LLM API] ⚠️ WARNING: Modelo principal {settings.GEMINI_MODEL} saturado para batch visuals. Usando fallback {settings.GEMINI_FALLBACK_MODEL}")
            response = client.models.generate_content(
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BatchVisualSpec,
                    temperature=0.7,
                ),
            )
        
        # Parsear JSON con limpieza
        raw_text = response.text.strip()
        # Extraer JSON de bloques markdown si existen
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```json") or line.startswith("```"):
                    in_json = not in_json
                    continue
                if in_json:
                    json_lines.append(line)
            raw_text = "\n".join(json_lines)
        
        data = json.loads(raw_text)
        
        # Validar que media_query no sea genérico
        generic_phrases = ["generic abstract background", "particle effects", "futuristic landscape"]
        for scene in data.get('scenes', []):
            media_query = scene.get('media_query', '').lower()
            if any(phrase in media_query for phrase in generic_phrases):
                print(f"[LLM API] ⚠️ WARNING: media_query genérico detectado. Regenerando...")
                raise ValueError("media_query genérico detectado, reintentando")
        
        return BatchVisualSpec(**data)
    except Exception as e:
        print(f"[LLM API] Error conectando con Gemini: {e}")
        # Fallback con escenas diferenciadas
        fallback_queries = [
            "A plant leaf growing from bottom center with organic curves and glowing particles",
            "A heart shape forming from connected dots with warm golden light",
            "Water drops falling into a pool creating expanding ripple circles",
            "Sun rays expanding from center with warm gradient transitions",
            "Mountain peaks emerging from fog with layered parallax movement",
            "A tree branching upward with leaves appearing one by one",
        ]
        return BatchVisualSpec(scenes=[
            VisualSpecResult(
                media_query=fallback_queries[i % len(fallback_queries)],
                backgroundColor="#0f172a",
                textColor="#38bdf8"
            ) for i, _ in enumerate(chunks)
        ])


def generate_ae_structure(svg_elements: list, text: str, duration: float, bg_color: str, text_color: str, width: int, height: int, effects: list = None, job_id: str = None, scene_id: int = None) -> Optional[str]:
    """
    FASE 1: Genera la ESTRUCTURA ESTÁTICA del script AE (sin animaciones).
    Crea composición, layers, shapes, fills, strokes, gradients, text layer.
    NO incluye setValueAtTime() calls.
    """
    import time
    from app.core.config import settings
    from app.services.ae_export import hex_to_rgb_array
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE-Structure] GEMINI_API_KEY no encontrada.")
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
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""Genera la ESTRUCTURA ESTÁTICA de un script de After Effects (SIN animaciones).

CANVAS: {width}x{height}, {duration}s, 30fps. FONDO: {bg_color}

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
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.3),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "500", "502", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2 ** attempt)
                    print(f"[LLM AE-Structure] Retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        if response is None:
            response = client.models.generate_content(
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3),
            )
        
        script = response.text.strip()
        if script.startswith("```"):
            lines = script.split("\n")
            code_lines = []
            in_code = False
            for line in lines:
                if line.startswith("```jsx") or line.startswith("```javascript") or line.startswith("```"):
                    in_code = not in_code
                    continue
                if in_code:
                    code_lines.append(line)
            script = "\n".join(code_lines)
        
        return script
        
    except Exception as e:
        print(f"[LLM AE-Structure] ERROR: {type(e).__name__}: {e}")
        return None


def generate_ae_animations(layer_names: list, animation_data: dict, duration: float, tsx_code: str = None, fase1_output: str = None, svg_elements: list = None, missing_layers: list = None, text_info: dict = None, width: int = 1080, height: int = 1920, job_id: str = None, scene_id: int = None) -> Optional[str]:
    """
    FASE 2: Genera SOLO las animaciones (setValueAtTime calls) para un script AE.
    Recibe contexto COMPLETO: TSX original, output de Fase 1, geometría SVG.
    """
    import time
    from app.core.config import settings
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE-Animations] GEMINI_API_KEY no encontrada.")
        return None
    
    try:
        layers_str = "\n".join([f"- {name}" for name in layer_names])
        
        animations_filtered = animation_data.get("animations", [])
        anims_compact = []
        for a in animations_filtered:
            anims_compact.append({
                "variable": a["variable"],
                "type": a["type"],
                "keyframes": a["keyframes"],
                "easing": a.get("easing", "linear"),
                "ae_property": a.get("ae_property", "")
            })
        
        text_anim_context = ""
        if text_info and text_info.get("style"):
            style = text_info["style"]
            pos = text_info.get("position", {})
            text_anim_context = f"""
TEXTO DETALLES:
- Color: {style.get('color', 'N/A')}
- FontSize: {style.get('fontSize', '68px')}
- FontWeight: {style.get('fontWeight', 900)}
- TextShadow: {style.get('textShadow', 'N/A')}
- Posición: {pos}
"""
        
        missing_context = ""
        if missing_layers:
            missing_context = f"""
ATENCIÓN: En un intento anterior, los siguientes layers NO fueron animados:
{", ".join(missing_layers)}

Debes generar animaciones para TODOS los layers, INCLUYENDO estos que faltaron.
"""
        
        tsx_context = ""
        if tsx_code:
            tsx_context = f"""
=== CÓDIGO TSX ORIGINAL (React/Remotion) ===
Este es el código fuente que genera la animación en el frontend.
Analiza CADA elemento y su animación para traducirlo fielmente a After Effects.

```tsx
{tsx_code[:6000]}
```
"""
        
        fase1_context = ""
        if fase1_output:
            fase1_context = f"""
=== ESTRUCTURA EXISTENTE EN AFTER EFFECTS (Fase 1) ===
Estos son los layers que YA fueron creados. Usa EXACTAMENTE estos nombres de variable.

{fase1_output[:6000]}
"""
        
        svg_context = ""
        if svg_elements:
            svg_context = f"""
=== GEOMETRÍA SVG EXACTA (coordenadas reales) ===
{json.dumps(svg_elements, indent=2)}
"""
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""Tienes el contexto COMPLETO para generar animaciones fieles al diseño original de React.

{fase1_context}
{tsx_context}
{svg_context}

=== LAYERS QUE DEBES ANIMAR (USA EXACTAMENTE ESTOS NOMBRES) ===
{layers_str}
- textLayer (text layer)

=== ANIMACIONES DEL PARSER (keyframes a replicar) ===
{json.dumps(anims_compact, indent=2)}

{text_anim_context}
{missing_context}

REGLAS CRÍTICAS:
1. SOLO setValueAtTime() calls — NO crear layers, NO var comp, NO addShape
2. USA EXACTAMENTE los nombres de layers de la lista. NO inventes nombres.
3. Genera animaciones para TODOS los layers de la lista. Si hay {len(layer_names)} layers, genera {len(layer_names)} bloques.
4. Si un layer no tiene animación específica en el TSX, agrega al menos fade-in de opacidad:
   var {layer_names[0]}Opac = {layer_names[0]}.property("ADBE Transform Group").property("ADBE Opacity");
   {layer_names[0]}Opac.setValueAtTime(0, 0);
   {layer_names[0]}Opac.setValueAtTime(0.5, 100);
5. Para opacity: valores 0-100 (no 0-1)
6. Para scale: valores tipo [100, 100] para 100%, [0, 0] para 0%, [120, 120] para 120%
   - NUNCA uses valores mayores a 500% ([500, 500])
7. Para position: [X, Y] dentro del canvas {width}x{height}
8. Comenta cada bloque con el nombre del layer

COORDENADAS:
- Si "isOffset": true → SUMA el offset a la posición base
- Si "isPixelValue": true → convierte a scale % máximo 300%
- NUNCA uses valores de offset como posiciones absolutas
- Para positionY: [X_fijo, baseY + offset]

MAPEO DE PROPIEDADES:
- position → .property("ADBE Transform Group").property("ADBE Position")
- scale → .property("ADBE Transform Group").property("ADBE Scale")
- opacity → .property("ADBE Transform Group").property("ADBE Opacity")
- rotation → .property("ADBE Transform Group").property("ADBE Rotate Z")

EJEMPLO FORMATO:
// Animations for Leaf_1
var leafPos = Leaf_1.property("ADBE Transform Group").property("ADBE Position");
leafPos.setValueAtTime(0.0, [540, 1400]);
leafPos.setValueAtTime(2.0, [540, 960]);

var leafOpac = Leaf_1.property("ADBE Transform Group").property("ADBE Opacity");
leafOpac.setValueAtTime(0.0, 0);
leafOpac.setValueAtTime(0.667, 100);

// Animations for textLayer
var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(0, 0);
textOpac.setValueAtTime(0.8, 100);

SOLO código ExtendScript de animaciones. Sin comentarios largos. Sin crear layers. Sin var comp."""
        
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.2),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "500", "502", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2 ** attempt)
                    print(f"[LLM AE-Animations] Retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        if response is None:
            response = client.models.generate_content(
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
        
        script = response.text.strip()
        if script.startswith("```"):
            lines = script.split("\n")
            code_lines = []
            in_code = False
            for line in lines:
                if line.startswith("```jsx") or line.startswith("```javascript") or line.startswith("```"):
                    in_code = not in_code
                    continue
                if in_code:
                    code_lines.append(line)
            script = "\n".join(code_lines)
        
        return script
        
    except Exception as e:
        print(f"[LLM AE-Animations] ERROR: {type(e).__name__}: {e}")
        return None


def _extract_layer_names(structure_script: str) -> list:
    """Extrae nombres de layers del script de estructura Fase 1.
    
    Detecta layers creados de 3 formas:
    1. var NAME = comp.layers.addShape()
    2. var NAME = comp.layers.addText()
    3. Array geo con { name: "...", type: "..." } (cuando LLM usa helper functions)
    """
    layers = []
    
    # Pattern: var NAME = comp.layers.addShape()
    shape_pattern = r'var\s+(\w+)\s*=\s*comp\.layers\.addShape\(\)'
    for match in re.finditer(shape_pattern, structure_script):
        layers.append(match.group(1))
    
    # Pattern: var NAME = comp.layers.addText()
    text_pattern = r'var\s+(\w+)\s*=\s*comp\.layers\.addText\('
    for match in re.finditer(text_pattern, structure_script):
        layers.append(match.group(1))
    
    # Pattern: var NAME = comp.layers.addSolid()
    solid_pattern = r'var\s+(\w+)\s*=\s*comp\.layers\.addSolid\('
    for match in re.finditer(solid_pattern, structure_script):
        layers.append(match.group(1))
    
    # Also look for .name = "..." assignments
    name_pattern = r'(\w+)\.name\s*=\s*"([^"]+)"'
    for match in re.finditer(name_pattern, structure_script):
        var_name = match.group(1)
        layer_name = match.group(2)
        if var_name not in layers and layer_name not in ['Background', 'Fondo', 'BG']:
            layers.append(var_name)
    
    # CRITICAL: Extract layer names from geo arrays (when LLM uses helper functions)
    # Pattern: { name: "Branch_L", type: "path", ... }
    geo_name_pattern = r'\{\s*name:\s*"([^"]+)"\s*,\s*type:'
    for match in re.finditer(geo_name_pattern, structure_script):
        geo_name = match.group(1)
        if geo_name not in layers:
            layers.append(geo_name)
    
    return layers if layers else ["textLayer"]


def _post_process_script(script: str) -> str:
    """Aplica todas las reglas de post-processing al script ensamblado."""
    # a) Remove duplicate randomRange
    def remove_duplicate_generate_random(script_text):
        pattern = r'(function (?:randomRange|generateRandomNumber)\([^)]*\)\s*\{[^}]*\})'
        matches = list(re.finditer(pattern, script_text))
        if len(matches) > 1:
            for m in matches[1:]:
                script_text = script_text[:m.start()] + script_text[m.end():]
        return script_text
    
    script = remove_duplicate_generate_random(script)
    
    # b) layers.length → layers.numLayers
    script = re.sub(r'\.layers\.length', '.layers.numLayers', script)
    
    # c) ADBE Rotation → ADBE Rotate Z
    script = re.sub(r'\bADBE Rotation\b', 'ADBE Rotate Z', script)
    
    # d) Remove createPath
    if "createPath(" in script:
        script = script.replace("createPath(", "// REMOVED: createPath(")
    
    # e) Fix unclosed quotes
    script = re.sub(r'\.property\("([^"]+)\)\)', r'.property("\1"))', script)
    
    # f) generateRandomNumber → randomRange
    script = script.replace('generateRandomNumber', 'randomRange')
    
    # g) Normalize randomRange
    script = re.sub(
        r'function randomRange\([^)]*\)\s*\{[^}]*\}',
        'function randomRange(min, max) {\n    return min + (Math.random() * (max - min));\n}',
        script
    )
    
    # h) Fix undefined closed
    script = script.replace('s.closed = item.closed;', 's.closed = item.closed !== undefined ? item.closed : false;')
    
    # i) Fix layer.property("Effects") → layer.property("ADBE Effect Parade")
    script = re.sub(r'(\w+)\.Effects\.addProperty', r'\1.property("ADBE Effect Parade").addProperty', script)
    
    # j) Fix ADBE Glow → ADBE Glo2 (AE uses ADBE Glo2 for glow effect)
    script = script.replace('"ADBE Glow"', '"ADBE Glo2"')
    script = script.replace("'ADBE Glow'", "'ADBE Glo2'")
    # Also fix bare "Glo2" without ADBE prefix
    script = script.replace('"Glo2"', '"ADBE Glo2"')
    script = script.replace("'Glo2'", "'ADBE Glo2'")
    
    # k) Fix Glow Radius property number (Glo2 property 3 is radius)
    script = re.sub(r'\.property\("Glow Radius"\)', '.property(3)', script)
    
    # l) Fix Gradient Fill → Fill + ADBE Ramp (AE no permite setear gradient colors via script)
    # Detect: addProperty("ADBE Vector Graphic - G-Fill") or "Grd Fill"
    # Replace with: addProperty("ADBE Vector Graphic - Fill") + ADBE Ramp effect
    def fix_gradient_to_ramp(script_text):
        # Remove G-Fill/Grd Fill lines and replace with Fill
        script_text = script_text.replace('"ADBE Vector Graphic - G-Fill"', '"ADBE Vector Graphic - Fill"')
        script_text = script_text.replace("'ADBE Vector Graphic - G-Fill'", "'ADBE Vector Graphic - Fill'")
        script_text = script_text.replace('"ADBE Vector Graphic - Grd Fill"', '"ADBE Vector Graphic - Fill"')
        script_text = script_text.replace("'ADBE Vector Graphic - Grd Fill'", "'ADBE Vector Graphic - Fill'")
        
        # Remove Grad Colors property lines (they cause crashes)
        script_text = re.sub(r'\w+\.property\(["\']ADBE Vector Grad Colors["\']\)\.setValue\([^)]+\);?\s*', '', script_text)
        script_text = re.sub(r'\w+\.property\(["\']ADBE Vector Grad Start Pt["\']\)\.setValue\([^)]+\);?\s*', '', script_text)
        script_text = re.sub(r'\w+\.property\(["\']ADBE Vector Grad End Pt["\']\)\.setValue\([^)]+\);?\s*', '', script_text)
        script_text = re.sub(r'\w+\.property\(["\']ADBE Vector Grad Type["\']\)\.setValue\([^)]+\);?\s*', '', script_text)
        
        return script_text
    
    script = fix_gradient_to_ramp(script)
    
    # m-1) Normalize Ramp properties: convert any numeric indices to match names
    # CORRECT Ramp indices: 1=Start of Ramp(point), 2=Start Color(RGB), 3=End of Ramp(point), 4=End Color(RGB), 5=Ramp Shape(int)
    # The prompt NOW instructs LLM to use match names, but legacy/hallucinated numeric refs still need fixing
    def fix_ramp_properties(script_text):
        """Convert Ramp numeric indices to match names and fix wrong index mappings."""
        # Find all ramp variables
        ramp_vars = set()
        for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Ramp"\)', script_text):
            ramp_vars.add(m.group(1))
        
        for rvar in ramp_vars:
            rv = re.escape(rvar)
            # Fix numeric index → match name for this ramp variable
            # property(1) → Start of Ramp (point)
            script_text = re.sub(rf'{rv}\.property\(1\)\.setValue', f'{rvar}.property("ADBE Ramp-0001").setValue', script_text)
            # property(2) → Start Color (RGB array)
            script_text = re.sub(rf'{rv}\.property\(2\)\.setValue', f'{rvar}.property("ADBE Ramp-0002").setValue', script_text)
            # property(3) with array → WRONG (was being used as Start Color but 3=End of Ramp=point)
            # If property(3).setValue([R,G,B]) found, it's likely a misplaced Start Color → fix to "Start Color"
            script_text = re.sub(rf'{rv}\.property\(3\)\.setValue\(\[([^\]]+)\]\)', rf'{rvar}.property("ADBE Ramp-0002").setValue([\1])', script_text)
            # property(3) with scalar → End of Ramp point (unlikely, but safe)
            # property(4) with array → End Color (correct)
            script_text = re.sub(rf'{rv}\.property\(4\)\.setValue\(\[([^\]]+)\]\)', rf'{rvar}.property("ADBE Ramp-0004").setValue([\1])', script_text)
            # property(4) with scalar → was misplaced Ramp Shape → fix to "Ramp Shape"
            script_text = re.sub(rf'{rv}\.property\(4\)\.setValue\(([12])\)', rf'{rvar}.property("ADBE Ramp-0005").setValue(\1)', script_text)
            # property(5) → Ramp Shape
            script_text = re.sub(rf'{rv}\.property\(5\)\.setValue', f'{rvar}.property("ADBE Ramp-0005").setValue', script_text)
            
            # Also fix if LLM used string names (normalize casing)
            script_text = re.sub(rf'{rv}\.property\(["\']Interpolation["\']\)', f'{rvar}.property("ADBE Ramp-0005")', script_text)
            script_text = re.sub(rf'{rv}\.property\(["\']Start Point["\']\)', f'{rvar}.property("ADBE Ramp-0001")', script_text)
            script_text = re.sub(rf'{rv}\.property\(["\']End Point["\']\)', f'{rvar}.property("ADBE Ramp-0003")', script_text)
        
        return script_text
    
    script = fix_ramp_properties(script)
    
    # m-0.6) Ensure Ramp has Ramp Shape set (default to Linear=1 if not set)
    def ensure_ramp_interpolation(script_text):
        ramp_pattern = r'(\w+)\s*=\s*\w+\.property\("ADBE Effect Parade"\)\.addProperty\("ADBE Ramp"\);'
        for match in re.finditer(ramp_pattern, script_text):
            ramp_var = match.group(1)
            if not re.search(rf'{re.escape(ramp_var)}\.property\("ADBE Ramp-0005"\)\.setValue', script_text):
                insert_pos = match.end()
                script_text = script_text[:insert_pos] + f'\n{ramp_var}.property("ADBE Ramp-0005").setValue(1);' + script_text[insert_pos:]
        return script_text
    
    script = ensure_ramp_interpolation(script)
    
    # m) Fix Drop Shadow: convert numeric indices to match names
    # This eliminates ALL regex collision issues between DS, Ramp, and Glow
    def fix_drop_shadow_properties(script_text):
        """Convert Drop Shadow numeric indices to match names."""
        ds_vars = set()
        for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Drop Shadow"\)', script_text):
            ds_vars.add(m.group(1))
        
        for dvar in ds_vars:
            dv = re.escape(dvar)
            # Convert numeric indices to match names
            script_text = re.sub(rf'{dv}\.property\(1\)\.setValue', f'{dvar}.property("ADBE Drop Shadow-0002").setValue', script_text)
            script_text = re.sub(rf'{dv}\.property\(2\)\.setValue', f'{dvar}.property("ADBE Drop Shadow-0005").setValue', script_text)
            script_text = re.sub(rf'{dv}\.property\(3\)\.setValue', f'{dvar}.property("ADBE Drop Shadow-0001").setValue', script_text)
            script_text = re.sub(rf'{dv}\.property\(4\)\.setValue', f'{dvar}.property("ADBE Drop Shadow-0004").setValue', script_text)
            script_text = re.sub(rf'{dv}\.property\(5\)\.setValue', f'{dvar}.property("ADBE Drop Shadow-0003").setValue', script_text)
        
        return script_text
    
    script = fix_drop_shadow_properties(script)
    
    # m-2) Fix Glow: convert numeric indices to match names
    def fix_glow_properties(script_text):
        """Convert Glow numeric indices to match names."""
        glow_vars = set()
        for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Glo2"\)', script_text):
            glow_vars.add(m.group(1))
        
        for gvar in glow_vars:
            gv = re.escape(gvar)
            script_text = re.sub(rf'{gv}\.property\(1\)\.setValue', f'{gvar}.property("ADBE Glo2-0002").setValue', script_text)
            script_text = re.sub(rf'{gv}\.property\(2\)\.setValue', f'{gvar}.property("ADBE Glo2-0003").setValue', script_text)
            script_text = re.sub(rf'{gv}\.property\(3\)\.setValue', f'{gvar}.property("ADBE Glo2-0003").setValue', script_text)
            script_text = re.sub(rf'{gv}\.property\(4\)\.setValue', f'{gvar}.property("ADBE Glo2-0004").setValue', script_text)
        
        return script_text
    
    script = fix_glow_properties(script)

    # n) Clean up any remaining gradient property references
    script = re.sub(r'\w+\.property\(["\']ADBE Vector Grad[^"\']+["\']\)\.setValue\([^)]*\);?\s*', '', script)
    script = re.sub(r'\w+\.property\(["\']ADBE Vector Gradient[^"\']+["\']\)\.setValue\([^)]*\);?\s*', '', script)
    
    # n-0.5) Guard Ramp color properties: ensure "Start Color" and "End Color" always receive arrays, not scalars
    def guard_ramp_colors(script_text):
        """Ensure ramp*.property('Start Color') and ramp*.property('End Color') have array values."""
        ramp_vars = set()
        for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Ramp"\)', script_text):
            ramp_vars.add(m.group(1))
        
        for rvar in ramp_vars:
            rv = re.escape(rvar)
            # Remove any scalar setValue on Start Color or End Color
            script_text = re.sub(rf'{rv}\.property\("ADBE Ramp-0002"\)\.setValue\(\d+\);?\s*', '', script_text)
            script_text = re.sub(rf'{rv}\.property\("ADBE Ramp-0004"\)\.setValue\(\d+\);?\s*', '', script_text)
        
        return script_text
    
    script = guard_ramp_colors(script)
    
    # n-1) Inject Trim Paths where animations reference them but structure doesn't have them
    def inject_trim_paths(script_text):
        # Detect if any animation references ADBE Vector Trim
        has_trim_anim = 'ADBE Vector Trim' in script_text or 'Vector Trim' in script_text
        if not has_trim_anim:
            return script_text
        
        # Find layers that use trim animations — broader pattern matching
        trim_layers = set()
        # Pattern 1: varTrim = var.property("ADBE Root Vectors Group")
        for match in re.finditer(r'(\w+)Trim\s*=\s*\1\.property\("ADBE Root Vectors Group"\)', script_text):
            trim_layers.add(match.group(1))
        # Pattern 2: var.property(...).property("ADBE Vector Trim")
        for match in re.finditer(r'(sl\d+)\.property\([^)]+\)(?:\.property\([^)]+\))*\.property\("ADBE Vector Trim', script_text):
            trim_layers.add(match.group(1))
        # Pattern 3: varTrim = var.property("ADBE Root Vectors Group").property(1)
        for match in re.finditer(r'var\s+(\w+)Trim\s*=\s*(\w+)\.property', script_text):
            layer_var = match.group(2)
            if layer_var.startswith('sl'):
                trim_layers.add(layer_var)
        
        if not trim_layers:
            return script_text
        
        # Check which layers already have Trim Paths in structure
        for layer_var in list(trim_layers):
            # Check if addProperty("ADBE Vector Filter - Trim") already exists for this layer
            has_trim_structure = re.search(
                rf'{re.escape(layer_var)}\.property.*addProperty\("ADBE Vector Filter - Trim"\)',
                script_text
            )
            if has_trim_structure:
                trim_layers.discard(layer_var)
        
        # For each layer, find where the stroke is defined and add Trim Paths after it
        for layer_var in trim_layers:
            # Look for the stroke definition in this layer (broader pattern)
            stroke_pattern = rf'(var\s+st\w+\s*=\s*vg\w+\.addProperty\("ADBE Vector Graphic - Stroke"\);[^\n]*(?:\n[^\n]*st\w+\.property[^\n]*)*?)'
            stroke_match = re.search(stroke_pattern, script_text)
            
            if not stroke_match:
                # Try alternative: look for any addProperty near this layer
                stroke_pattern = rf'({re.escape(layer_var)}[^\n]*addProperty\("ADBE Vector Graphic - Stroke"\);)'
                stroke_match = re.search(stroke_pattern, script_text)
            
            if stroke_match:
                # Insert Trim Paths after the stroke block
                insert_pos = stroke_match.end()
                # Find the end of the stroke properties block (look for next newline after stroke width)
                next_lines = script_text[insert_pos:insert_pos+500]
                width_match = re.search(r'(Stroke Width[^\n]*\n)', next_lines)
                if width_match:
                    insert_pos += width_match.end()
                
                trim_code = f'\nvar trim_{layer_var} = vg1.addProperty("ADBE Vector Filter - Trim");\ntrim_{layer_var}.property("ADBE Vector Trim Start").setValue(0);\ntrim_{layer_var}.property("ADBE Vector Trim End").setValue(100);'
                script_text = script_text[:insert_pos] + trim_code + script_text[insert_pos:]
        
        # Fix Trim Paths animation references to use the injected trim variable
        for layer_var in trim_layers:
            # Pattern: varTrim = var.property("ADBE Root Vectors Group").property(1).property("ADBE Vector Trim").property("ADBE Vector Trim End")
            old_pattern = rf'{re.escape(layer_var)}Trim\s*=\s*{re.escape(layer_var)}\.property\("ADBE Root Vectors Group"\)\.property\(1\)\.property\("ADBE Vector Trim"\)\.property\("ADBE Vector Trim End"\)'
            new_code = f'{layer_var}Trim = trim_{layer_var}.property("ADBE Vector Trim End")'
            script_text = re.sub(old_pattern, new_code, script_text)
            
            # Also fix: var.property("ADBE Root Vectors Group").property("ADBE Vectors Group").property("ADBE Vector Trim")
            old_pattern2 = rf'{re.escape(layer_var)}Trim\s*=\s*{re.escape(layer_var)}\.property\("ADBE Root Vectors Group"\)\.property\("ADBE Vectors Group"\)\.property\("ADBE Vector Trim"\)\.property\("ADBE Vector Trim End"\)'
            script_text = re.sub(old_pattern2, new_code, script_text)
        
        return script_text
    
    script = inject_trim_paths(script)
    
    # o) Remove orphan Drop Shadow access blocks (property without addProperty)
    # If .property("ADBE Drop Shadow") exists but no .addProperty("ADBE Drop Shadow") before it,
    # remove the entire var ds = ... block
    def remove_orphan_drop_shadows(script_text):
        has_add = 'addProperty("ADBE Drop Shadow")' in script_text or "addProperty('ADBE Drop Shadow')" in script_text
        if has_add:
            return script_text
        
        # Remove lines that access ADBE Drop Shadow property
        lines = script_text.split('\n')
        filtered = []
        skip_next = False
        for line in lines:
            if 'ADBE Drop Shadow' in line and 'addProperty' not in line:
                skip_next = True
                continue
            if skip_next and (line.strip().startswith('ds.') or line.strip() == ''):
                if line.strip().startswith('ds.'):
                    continue
                skip_next = False
            if '// Visual Effects' in line:
                continue
            filtered.append(line)
        return '\n'.join(filtered)
    
    script = remove_orphan_drop_shadows(script)
    
    # p) Fix absurd text position values (offsets used as absolute positions)
    # If textPos setValueAtTime has Y < 100, it's likely an offset → add to base (1344)
    def fix_absurd_text_positions(script_text, base_y=1344):
        pattern = r'(textPos\.setValueAtTime\([^,]+,\s*\[(\d+),\s*)(\d+\.?\d*)(\]\))'
        def fix(m):
            x = m.group(2)
            y = float(m.group(3))
            suffix = m.group(4)
            if y < 100:
                corrected_y = base_y + y
                return f'{m.group(1)}{corrected_y}{suffix}'
            return m.group(0)
        return re.sub(pattern, fix, script_text)
    
    script = fix_absurd_text_positions(script)
    
    # q) Fix absurd scale values > 2000% (likely pixel-to-percentage conversion errors)
    def fix_absurd_scale(script_text):
        pattern = r'\.setValueAtTime\(([^,]+),\s*\[(\d{4,}),\s*(\d{4,})\]\)'
        def fix(m):
            time_val = m.group(1)
            x = int(m.group(2))
            y = int(m.group(3))
            if x > 2000:
                x = min(x // 10, 500)
            if y > 2000:
                y = min(y // 10, 500)
            return f'.setValueAtTime({time_val}, [{x}, {y}])'
        return re.sub(pattern, fix, script_text)
    
    script = fix_absurd_scale(script)
    
    return script


def generate_ae_script_from_tsx(tsx_code: str, text: str, duration: float, bg_color: str = "#0f172a", text_color: str = "#38bdf8", width: int = 1080, height: int = 1920, job_id: str = None, scene_id: int = None) -> Optional[str]:
    """
    Traduce código TSX de Remotion a ExtendScript de After Effects usando 2 fases:
    Fase 1: Estructura estática (layers, shapes, fills, text)
    Fase 2: Animaciones (setValueAtTime calls)
    Ensamblaje: Fase 1 + Fase 2 = script completo
    """
    import time
    import os
    from datetime import datetime
    from app.core.config import settings
    from app.services.ae_export import hex_to_rgb_array
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE] ⚠️ GEMINI_API_KEY no encontrada. ae_script será null.")
        return None
    
    print(f"[LLM AE] ✅ Iniciando generación AE script 2 fases (width={width}, height={height}, duration={duration})")
    
    try:
        from app.services.svg_parser import parse_svg_from_tsx
        from app.services.tsx_animation_parser import parse_tsx_animations
        
        svg_elements = parse_svg_from_tsx(tsx_code)
        print(f"[LLM AE] SVG parser encontró {len(svg_elements)} elementos")
        
        animation_data = parse_tsx_animations(tsx_code, duration, 30)
        anim_count = len(animation_data.get("animations", []))
        print(f"[LLM AE] Animation parser encontró {anim_count} animaciones")
        
        # === FASE 1: ESTRUCTURA ESTÁTICA ===
        print(f"[LLM AE] 🟢 FASE 1: Generando estructura estática...")
        structure = generate_ae_structure(
            svg_elements, text, duration, bg_color, text_color, width, height,
            effects=animation_data.get("effects", []),
            job_id=job_id, scene_id=scene_id
        )
        
        if not structure:
            print(f"[LLM AE] ❌ FASE 1 falló")
            return None
        
        print(f"[LLM AE] ✅ FASE 1 completada ({len(structure)} chars)")
        
        # Extraer nombres de layers
        layer_names = _extract_layer_names(structure)
        print(f"[LLM AE] Layers detectados: {layer_names}")
        
        # === FASE 2: ANIMACIONES CON CONTEXTO COMPLETO ===
        print(f"[LLM AE] 🟢 FASE 2: Generando animaciones con contexto completo...")
        animations = generate_ae_animations(
            layer_names, animation_data, duration,
            tsx_code=tsx_code,
            fase1_output=structure,
            svg_elements=svg_elements,
            text_info=animation_data.get("text_animation", {}),
            width=width, height=height,
            job_id=job_id, scene_id=scene_id
        )
        
        # VALIDACIÓN ALL-OR-NOTHING: verificar que TODOS los layers tengan animación
        def _validate_all_layers_animated(layers, anim_script):
            if not anim_script:
                return layers[:]
            animated = set()
            for layer in layers:
                if re.search(rf'\b{re.escape(layer)}\b.*setValueAtTime', anim_script, re.DOTALL):
                    animated.add(layer)
            return [l for l in layers if l not in animated]
        
        missing = _validate_all_layers_animated(layer_names, animations or "")
        if missing:
            print(f"[LLM AE] ⚠️ Fase 2 omitió {len(missing)} layers: {missing}. Reintentando COMPLETO...")
            # Reintentar Fase 2 COMPLETA con énfasis en layers faltantes
            animations = generate_ae_animations(
                layer_names, animation_data, duration,
                tsx_code=tsx_code,
                fase1_output=structure,
                svg_elements=svg_elements,
                missing_layers=missing,
                text_info=animation_data.get("text_animation", {}),
                width=width, height=height,
                job_id=job_id, scene_id=scene_id
            )
            
            missing2 = _validate_all_layers_animated(layer_names, animations or "")
            if missing2:
                print(f"[LLM AE] ⚠️ Fase 2 retry aún omitió {len(missing2)} layers: {missing2}. Tercer intento...")
                animations = generate_ae_animations(
                    layer_names, animation_data, duration,
                    tsx_code=tsx_code,
                    fase1_output=structure,
                    svg_elements=svg_elements,
                    missing_layers=missing2,
                    text_info=animation_data.get("text_animation", {}),
                    width=width, height=height,
                    job_id=job_id, scene_id=scene_id
                )
                
                missing3 = _validate_all_layers_animated(layer_names, animations or "")
                if missing3:
                    print(f"[LLM AE] ⚠️ Fase 2 aún omitió {len(missing3)} layers tras 3 intentos")
        
        if not animations:
            print(f"[LLM AE] ❌ FASE 2 falló, usando solo estructura")
            full_script = structure
        else:
            print(f"[LLM AE] ✅ FASE 2 completada ({len(animations)} chars)")
            full_script = structure + "\n\n// === ANIMATIONS ===\n\n" + animations
        
        # === POST-PROCESSING ===
        full_script = _post_process_script(full_script)
        
        # === DEBUG FILE LOGGING ===
        try:
            debug_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage', 'debug')
            os.makedirs(debug_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scene_str = f"scene_{scene_id}" if scene_id is not None else "scene_X"
            job_str = job_id if job_id else "job_unknown"
            debug_filename = f"{job_str}_{scene_str}_{timestamp}.txt"
            debug_path = os.path.join(debug_dir, debug_filename)
            
            addshape_count = len(re.findall(r'\.addShape\(\)', full_script))
            addtext_count = len(re.findall(r'\.addText\(', full_script))
            addsolid_count = len(re.findall(r'\.addSolid\(', full_script))
            setvalueat_count = len(re.findall(r'\.setValueAtTime\(', full_script))
            createpath_count = len(re.findall(r'createPath\(', full_script))
            
            debug_content = f"""=== METADATA ===
job_id: {job_id or 'unknown'}
scene_id: {scene_id if scene_id is not None else 'unknown'}
timestamp: {timestamp}
phase: 2-phase (structure + animations)
svg_elements_found: {len(svg_elements)}
animation_count: {anim_count}
layers_detected: {layer_names}
structure_length: {len(structure)}
animations_length: {len(animations) if animations else 0}
total_script_length: {len(full_script)}

=== VALIDATION ===
addShape() calls: {addshape_count}
addText() calls: {addtext_count}
addSolid() calls: {addsolid_count}
setValueAtTime() calls: {setvalueat_count}
createPath() detected: {'YES (' + str(createpath_count) + ')' if createpath_count > 0 else 'NO'}

=== STRUCTURE (FASE 1) ===
{structure}

=== ANIMATIONS (FASE 2) ===
{animations or 'FAILED'}

=== FULL SCRIPT ===
{full_script}
"""
            
            with open(debug_path, 'w', encoding='utf-8') as f:
                f.write(debug_content)
            
            print(f"[LLM AE] 💾 Debug guardado: {debug_filename} (shapes={addshape_count}, text={addtext_count}, solids={addsolid_count}, anims={setvalueat_count})")
        except Exception as debug_err:
            print(f"[LLM AE] ⚠️ Error guardando debug file: {debug_err}")
        
        return full_script
        
    except Exception as e:
        import traceback
        print(f"[LLM AE] ❌ ERROR generando script AE: {type(e).__name__}: {e}")
        traceback.print_exc()
        return None


def generate_ae_metadata_from_tsx(tsx_code: str, text: str, duration: float, width: int = 1080, height: int = 1920) -> Optional[Dict[str, Any]]:
    """
    Genera ae_metadata analizando el código TSX generado por Remotion.
    Esto asegura que AE y Remotion tengan los mismos elementos visuales.
    """
    import time
    from app.core.config import settings
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE] GEMINI_API_KEY no encontrada. ae_metadata será null.")
        return None
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
Eres un experto en After Effects y Remotion. Analiza este código TSX de Remotion y genera metadata equivalente para After Effects.

CANVAS AE: {width}x{height} píxeles. TODAS las posiciones [x, y] deben estar dentro de este rango.
  - X válido: 0 a {width}
  - Y válido: 0 a {height}
  - Centro del canvas: [{width//2}, {height//2}]

TEXTO DE LA ESCENA: "{text}"
DURACIÓN: {duration} segundos

CÓDIGO TSX DE REMOTION:
```tsx
{tsx_code[:4000]}
```

Tu tarea: Traduce los elementos visuales del TSX a ae_metadata para After Effects.

Genera un JSON con:
- animation_type: ELIGE UNO basado en lo que ves en el TSX: collision, bounce_in, morphing, particles, connection, reveal, construction, flash, fade_in, scale_emerge
- elements: Lista de 3-8 elementos que correspondan a lo que hay en el TSX. Cada elemento tiene:
  - type: rectangle, circle, flash, line, particle (elige el más cercano al elemento SVG del TSX)
  - id: nombre descriptivo basado en el TSX
  - position_keyframes: [{{"time": 0, "value": [x, y]}}, {{"time": duracion, "value": [x, y]}}]
  - scale_keyframes: [{{"time": 0, "value": [0, 0]}}, {{"time": duracion, "value": [100, 100]}}]
  - opacity_keyframes: [{{"time": 0, "value": 0}}, {{"time": 0.5, "value": 100}}]
  - effects: [{{"type": "glow", "intensity": 50, "color": "#38bdf8"}}]
  - CRÍTICO: Las posiciones [x, y] DEBEN estar dentro del canvas {width}x{height}.
- text_animation: ELIGE UNO basado en cómo aparece el texto en el TSX: letter_by_letter, word_reveal, scale_emerge, fade_in

IMPORTANTE:
- Los elementos deben reflejar lo que realmente existe en el TSX (paths, circles, lines, etc.)
- Si el TSX tiene un path de hoja, genera un circle o rectangle que lo represente
- Si el TSX tiene partículas, genera elementos type "particle"
- Las posiciones y tiempos deben ser coherentes con la animación del TSX
- NUNCA inventes elementos que no existen en el TSX

Responde SOLO con JSON válido.
"""
        
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
                
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2 ** attempt)
                    print(f"[LLM AE-TSX] Retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        if response is None:
            print(f"[LLM AE-TSX] Modelo principal saturado. Usando fallback.")
            response = client.models.generate_content(
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```json") or line.startswith("```"):
                    in_json = not in_json
                    continue
                if in_json:
                    json_lines.append(line)
            raw_text = "\n".join(json_lines)
        
        return json.loads(raw_text)
        
    except Exception as e:
        print(f"[LLM AE-TSX] Error generando ae_metadata desde TSX: {e}")
        return None


def generate_ae_metadata_with_llm(text: str, media_query: str, duration: float, width: int = 1080, height: int = 1920) -> Optional[Dict[str, Any]]:
    """
    Genera ae_metadata para After Effects en llamada separada.
    width y height se pasan para que el LLM genere posiciones dentro del canvas.
    """
    import time
    from app.core.config import settings
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE] GEMINI_API_KEY no encontrada. ae_metadata será null.")
        return None
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
Eres un experto en After Effects. Genera metadata de animación para una escena de video.

CANVAS: {width}x{height} píxeles. TODAS las posiciones [x, y] deben estar dentro de este rango.
  - X válido: 0 a {width}
  - Y válido: 0 a {height}
  - Centro del canvas: [{width//2}, {height//2}]

TEXTO: "{text}"
ANIMACIÓN: "{media_query}"
DURACIÓN: {duration} segundos

Genera un JSON con:
- animation_type: ELIGE UNO: collision, bounce_in, morphing, particles, connection, reveal, construction, flash, fade_in, scale_emerge
- elements: Lista de 3-8 elementos SVG con keyframes. Cada elemento tiene:
  - type: rectangle, circle, flash, line, particle
  - id: nombre único (ej: "block_1", "flash_1")
  - position_keyframes: [{{"time": 0, "value": [x, y]}}, {{"time": 1, "value": [x, y]}}]
  - scale_keyframes: [{{"time": 0, "value": [0, 0]}}, {{"time": 1, "value": [100, 100]}}]
  - opacity_keyframes: [{{"time": 0, "value": 0}}, {{"time": 0.5, "value": 100}}]
  - effects: [{{"type": "glow", "intensity": 50, "color": "#38bdf8"}}]
  - CRÍTICO: Los valores de position_keyframes [x, y] DEBEN estar dentro del canvas {width}x{height}.
- text_animation: ELIGE UNO: letter_by_letter, word_reveal, scale_emerge, fade_in

Ejemplo:
{{
  "animation_type": "collision",
  "elements": [
    {{"type": "rectangle", "id": "block_1", "position_keyframes": [{{"time": 0, "value": [400, 540]}}, {{"time": 1.5, "value": [800, 540]}}], "opacity_keyframes": [{{"time": 0, "value": 0}}, {{"time": 0.3, "value": 100}}], "effects": [{{"type": "drop_shadow", "distance": 10, "color": "#000000", "opacity": 50}}]}},
    {{"type": "flash", "id": "collision_flash", "opacity_keyframes": [{{"time": 1.5, "value": 0}}, {{"time": 1.6, "value": 100}}, {{"time": 1.8, "value": 0}}], "scale_keyframes": [{{"time": 1.5, "value": [0, 0]}}, {{"time": 1.6, "value": [300, 300]}}], "effects": [{{"type": "glow", "intensity": 100, "color": "#fbbf24"}}]}}
  ],
  "text_animation": "word_reveal"
}}

Responde SOLO con JSON válido.
"""
        
        # Retry con backoff
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
                
                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2 ** attempt)
                    print(f"[LLM AE] Retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        # Fallback si el modelo principal falló
        if response is None:
            print(f"[LLM AE] ⚠️ WARNING: Modelo principal saturado. Usando fallback.")
            response = client.models.generate_content(
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
        
        return json.loads(response.text)
        
    except Exception as e:
        print(f"[LLM AE] Error generando ae_metadata: {e}")
        return None


# =============================================================================
# REMOTION COMPONENT GENERATION WITH GEMINI
# =============================================================================

async def _call_gemini_with_retry(client, prompt: str, max_retries: int = 3, model: str = None) -> any:
    """
    Llama a Gemini API con reintentos automáticos para errores transitorios (429, 503).
    Usa backoff exponencial: 5s → 10s → 20s
    """
    from app.core.config import settings
    
    if model is None:
        model = settings.GEMINI_MODEL
    
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
            )
            return response
        except Exception as e:
            error_str = str(e)
            # Detectar errores retryables: 429 (quota), 503 (unavailable), RESOURCE_EXHAUSTED, UNAVAILABLE
            is_retryable = any(code in error_str for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"])
            
            if is_retryable and attempt < max_retries - 1:
                wait_time = 3 * (2 ** attempt)  # 3s, 6s, 12s (backoff exponencial optimizado)
                print(f"[LLM API] Error transitorio ({error_str[:60]}...). Reintentando en {wait_time}s (intento {attempt+1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue
            
            # No es retryable o se acabaron los intentos
            raise


async def generate_remotion_component(scene_index: int, visual_spec: VisualSpecResult, text: str, duration: float, job_id: str, aspect_ratio: str = "9:16") -> str:
    """Usa Gemini para generar el código React/Remotion dinámico para una escena."""
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[LLM API] GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText"

    try:
        client = genai.Client(api_key=api_key)
        w, h = get_resolution(aspect_ratio)
        
        prompt_header = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones SVG 2D complejas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f"Texto del guion: \"{text}\"\n"
            f"Descripción visual: \"{visual_spec.media_query}\"\n"
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {visual_spec.backgroundColor} · texto {visual_spec.textColor}\n"
            f"Aspect ratio: {aspect_ratio} (canvas {w}x{h} píxeles)\n\n"
            "════════════════════════════════════════\n"
            "REQUISITOS DE ANIMACIÓN COMPLEJA\n"
            "════════════════════════════════════════\n"
            "1. ANALIZA el media_query y determina QUÉ tipo de animación necesita:\n"
            "   - Colisión: formas que chocan, generan destello, rebotan\n"
            "   - Morphing: una forma se transforma en otra\n"
            "   - Partículas: elementos pequeños que se agrupan/dispersan\n"
            "   - Conexión: nodos que se conectan progresivamente\n"
            "   - Revelación: capas que se deslizan para revelar contenido\n"
            "   - Construcción: elementos que se ensamblan pieza por pieza\n"
            "   - O cualquier otra animación contextual que el media_query describa\n\n"
            "2. USA EASING CURVES para movimiento natural:\n"
            "   - Easing.out(Easing.back(2)) para rebote\n"
            "   - Easing.inOut(Easing.cubic) para transiciones suaves\n"
            "   - Easing.out(Easing.quad) para desaceleración\n"
            "   - spring({ config: { damping: 8, stiffness: 200 } }) para elasticidad\n"
            "   - Easing.bezier([0.68, -0.55, 0.265, 1.55]) para custom curves\n\n"
            "3. SVG DETALLADO: Mínimo 3-5 elementos (rect, circle, path, line, ellipse).\n"
            "   - Usa <defs> para gradientes y filtros\n"
            "   - Aplica drop-shadow para profundidad\n"
            "   - Incluye glow effects con filter: blur()\n\n"
            "4. ANIMACIONES EN CAPAS:\n"
            "   - Entrada (frames 0-30): aparición de elementos principales\n"
            "   - Desarrollo (frames 30-durationInFrames-30): animación central\n"
            "   - Salida (últimos 30 frames): transición de salida o loop\n\n"
            "5. TEXTO PREMIUM:\n"
            "   - fontSize 56-72px, fontWeight 800-900\n"
            "   - Animación: letter_by_letter, word_reveal, o scale_emerge\n"
            "   - textShadow con glow del color del objeto principal\n\n"
            f"6. CANVAS: El viewBox del SVG debe ser exactamente \"0 0 {w} {h}\".\n"
            f"   Todas las posiciones y tamaños deben caber dentro de {w}x{h}.\n"
            f"   Centro del canvas: [{w//2}, {h//2}].\n\n"
            "════════════════════════════════════════\n"
            "EJEMPLOS DE CÓDIGO PARA DIFERENTES ANIMACIONES\n"
            "════════════════════════════════════════\n"
            "COLISIÓN:\n"
            "  const block1X = interpolate(frame, [0, 40], [-200, 0], {{ easing: Easing.out(Easing.back(2)) }});\n"
            "  const block2X = interpolate(frame, [0, 40], [200, 0], {{ easing: Easing.out(Easing.back(2)) }});\n"
            "  const flashOpacity = interpolate(frame, [40, 45, 50], [0, 1, 0], {{ extrapolateRight: 'clamp' }});\n"
            "  const flashScale = interpolate(frame, [40, 45], [0, 3], {{ easing: Easing.out(Easing.quad) }});\n\n"
            "MORPHING:\n"
            "  const morphProgress = interpolate(frame, [20, 60], [0, 1], {{ easing: Easing.inOut(Easing.cubic) }});\n"
            "  // Interpola entre dos paths SVG o transforma shapes\n\n"
            "PARTÍCULAS:\n"
            "  const particles = Array.from({{ length: 8 }}).map((_, i) => ({{\n"
            "    x: interpolate(frame, [i*5, i*5+30], [-100, 0], {{ easing: Easing.out(Easing.quad) }}),\n"
            "    opacity: interpolate(frame, [i*5, i*5+20, i*5+40], [0, 1, 0])\n"
            "  }}));\n\n"
            "BOUNCE IN:\n"
            "  const bounceY = interpolate(frame, [0, 30], [-200, 0], {{ easing: Easing.out(Easing.back(3)) }});\n"
            "  const bounceScale = spring({{ frame, fps, config: {{ damping: 10, stiffness: 150 }} }});\n\n"
            "════════════════════════════════════════\n"
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- SOLO importa de 'remotion' y 'react'. NADA más.\n"
            "- Nombre del componente: SceneComponent (exacto).\n"
            "- Props: text (string), durationInFrames (number).\n"
            "- SVG inline en JSX. Usa <svg viewBox> + <defs> para gradientes internos.\n"
            "- PROHIBIDO: CSS transitions, Tailwind, librerías externas, @keyframes.\n"
            "- PROHIBIDO: objetos placeholder, SVGs vacíos, rectángulos sin detalle.\n"
            "- El código debe compilar sin errores y ser 100% funcional.\n"
            "- IMPORTA Easing de 'remotion': import {{ useCurrentFrame, useVideoConfig, spring, interpolate, Easing }} from 'remotion';\n"
            "- NUNCA uses 'easing' en minúscula. SIEMPRE usa 'Easing' con E mayúscula.\n"
            "- Si usas easing en interpolate, debe ser: easing: Easing.out(Easing.back(2))\n"
            "- CRUCIAL: En interpolate(), inputRange y outputRange DEBEN tener exactamente la misma cantidad de elementos.\n"
            "  Ejemplo CORRECTO: interpolate(frame, [0, 10, 20], [0, 1, 0]) → 3 inputs, 3 outputs\n"
            "  Ejemplo INCORRECTO: interpolate(frame, [0, 20], [0, 1, 0]) → 2 inputs, 3 outputs ← FALLA\n"
            "- Si necesitas fade in/out, usa: interpolate(frame, [start, mid, end], [0, 1, 0]) con 3 valores en ambos\n"
            "- CRUCIAL para SVG: NUNCA uses valores directos en r={}. SIEMPRE usa Math.max(0, expression).\n"
            "  Ejemplo CORRECTO: r={{Math.max(0, 100 * springScale)}}\n"
            "  Ejemplo INCORRECTO: r={{100 * springScale}} ← puede ser negativo y romper SVG\n\n"
            "ESTRUCTURA BASE (REEMPLAZA Y EXPANDE — NO copies literal):\n"
        )
        
        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        prompt_code = (
            "import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';\n"
            "import React from 'react';\n\n"
            "export const SceneComponent = ({ text, durationInFrames }) => {\n"
            "    const frame = useCurrentFrame();\n"
            "    const { fps } = useVideoConfig();\n\n"
            "    // Analiza el media_query y crea animaciones SVG complejas contextualizadas\n"
            "    // Usa easing curves: Easing.out(Easing.back(2)), Easing.inOut(Easing.cubic), spring()\n"
            "    // Crea mínimo 3-5 elementos SVG (rect, circle, path, line, ellipse)\n"
            "    // Implementa: entrada (0-30f), desarrollo (30f-durationInFrames-30f), salida (últimos 30f)\n"
            "    // IMPORTANTE: Cuando uses spring() para escalar circulos, usa Math.max(0, radius * scale)\n"
            "    // para evitar valores negativos. Ejemplo: r={{Math.max(0, 20 * coreScale)}}\n\n"
            "    return (\n"
            f"        <div style={{{{ width: '100%', height: '100%', backgroundColor: '{bg_color}', overflow: 'hidden', fontFamily: 'Inter, Outfit, sans-serif' }}}}>\n"
            "            {/* SVG principal con animaciones complejas */}\n"
            f"            <svg viewBox=\"0 0 {w} {h}\" style={{ position: 'absolute', width: '100%', height: '100%' }}>\n"
            "                {/* Elementos SVG animados aquí */}\n"
            "            </svg>\n"
            "            \n"
            "            {/* Texto con animación de entrada */}\n"
            "            <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>\n"
            f"                <h1 style={{{{ color: '{txt_color}', fontSize: '64px', fontWeight: 900, margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}}}>{{text}}</h1>\n"
            "            </div>\n"
            "        </div>\n"
            "    );\n"
            "};\n\n"
            "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
        )
        
        prompt = prompt_header + prompt_code
        
        # Intentar con modelo principal (gemma-4-31b-it) con retry automático
        response = None
        try:
            response = await _call_gemini_with_retry(client, prompt, max_retries=3)
        except Exception as e:
            # Fallback a modelo secundario si el principal falla
            print(f"[LLM API] ⚠️ WARNING: Modelo principal {settings.GEMINI_MODEL} saturado. Usando fallback {settings.GEMINI_FALLBACK_MODEL}")
            try:
                response = await _call_gemini_with_retry(client, prompt, max_retries=1, model=settings.GEMINI_FALLBACK_MODEL)
            except Exception as e2:
                print(f"[LLM API] ⚠️ WARNING: Fallback también falló ({str(e2)[:60]}). Usando componente por defecto FadeText.")
                return "FadeText"
        
        code = response.text.strip()
        
        # Limpieza básica por si el LLM incluye bloques markdown
        if code.startswith("```tsx"): code = code[6:]
        elif code.startswith("```javascript"): code = code[13:]
        elif code.startswith("```"): code = code[3:]
        if code.endswith("```"): code = code[:-3]
        code = code.strip()
        
        # Post-procesamiento para evitar errores comunes en TSX generado
        import re
        
        # 1. Corregir 'easing.' (minúscula) a 'Easing.' (mayúscula)
        code = re.sub(r'\beasing\.', 'Easing.', code)
        
        # 2. Asegurar que Easing está en el import de remotion
        if "from 'remotion'" in code and 'Easing' not in code:
            code = code.replace(
                "interpolate } from 'remotion'",
                "interpolate, Easing } from 'remotion'"
            )
        
        # 3. Asegurar que React está importado
        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code
        
        # 4. Validar que no haya valores negativos en atributos SVG
        if 'r={' in code and 'Math.max' not in code:
            print(f"[TSX] ⚠️ WARNING: Posible valor negativo en radio SVG para escena {scene_index}")
        
        # 5. Corregir mismatches en interpolate() donde inputRange y outputRange tienen longitudes distintas
        def fix_interpolate_mismatch(code):
            """Detecta y corrige mismatches en interpolate(inputRange, outputRange)"""
            pattern = r'interpolate\(([^,]+),\s*\[([^\]]+)\],\s*\[([^\]]+)\]'
            
            def check_match(m):
                arg = m.group(1)
                input_range = m.group(2)
                output_range = m.group(3)
                
                input_vals = [x.strip() for x in input_range.split(',')]
                output_vals = [x.strip() for x in output_range.split(',')]
                input_count = len(input_vals)
                output_count = len(output_vals)
                
                if input_count != output_count:
                    if output_count > input_count:
                        # Agregar puntos intermedios al input range
                        first = input_vals[0]
                        last = input_vals[-1]
                        new_input = [first]
                        for i in range(1, output_count - 1):
                            # Interpolar proporcionalmente
                            fraction = f"{i}/{output_count-1}"
                            new_input.append(f"({first} + ({last} - {first}) * {fraction})")
                        new_input.append(last)
                        return f"interpolate({arg}, [{', '.join(new_input)}], [{output_range}]"
                    else:
                        # Recortar output range para que coincida con input
                        new_output = output_vals[:input_count]
                        return f"interpolate({arg}, [{input_range}], [{', '.join(new_output)}]"
                return m.group(0)
            
            return re.sub(pattern, check_match, code)
        
        code = fix_interpolate_mismatch(code)
        
        # 6. Envolver TODOS los r={} con Math.max(0, ...) si no lo tienen ya
        def wrap_radius_with_math_max(code):
            """Envuelve r={expression} con Math.max(0, ...) si no está ya protegido"""
            # Patrón para r={...} que NO empieza con Math.max
            pattern = r'r=\{((?!Math\.max)[^}]+)\}'
            
            def wrap_match(m):
                expr = m.group(1).strip()
                return f'r={{Math.max(0, {expr})}}'
            
            return re.sub(pattern, wrap_match, code)
        
        code = wrap_radius_with_math_max(code)
        
        # 7. Fix double-brace Math.max errors: r={Math.max(0, { Math.max(0, expr))}}
        code = re.sub(r'\{Math\.max\(0,\s*\{', '{Math.max(0, ', code)
        code = re.sub(r'\)\)\}\}', '))}', code)
        code = re.sub(r'\{Math\.max\(0,\s*\{', '{Math.max(0, ', code)
        code = re.sub(r'\)\)\}\}', '))}', code)
        
        # 8. Fix unbalanced parentheses in Math.max
        code = re.sub(r'Math\.max\(0,\s*\{([^}]+)\)', r'Math.max(0, \1)', code)
        
        # Guardar archivo físicamente
        generated_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated"))
        os.makedirs(generated_dir, exist_ok=True)
        
        file_name = f"Scene_{job_id}_{scene_index}.tsx"
        file_path = os.path.join(generated_dir, file_name)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        print(f"[{job_id}] Componente TSX generado para escena {scene_index} -> {file_name}")
        return f"Scene_{job_id}_{scene_index}"
    except Exception as e:
        print(f"[LLM API] Error programando componente para escena {scene_index}: {e}")
        return "FadeText"


# =============================================================================
# SCENE PROCESSING
# =============================================================================

async def _process_chunks_async(job_id: str, chunks: list[str], batch_visuals: BatchVisualSpec, aspect_ratio: str = "9:16") -> list[dict]:
    from app.core.resolutions import get_resolution
    w, h = get_resolution(aspect_ratio)
    timeline_scenes = []
    current_start_time = 0.0

    for i, chunk in enumerate(chunks):
        print(f"[{job_id}] Enviando escena {i+1} a Voicebox para TTS...")
        duration, audio_url = await generate_tts_with_voicebox(chunk, f"Escena-{i+1}")
        print(f"[{job_id}] TTS escena {i+1}: duration={duration}, audio_url={audio_url}")
        
        if duration is None:
            duration = max(3.0, len(chunk) / 15.0)
        
        # Download audio from Voicebox and cache locally
        if audio_url:
            os.makedirs(AUDIO_STORAGE, exist_ok=True)
            local_path = os.path.join(AUDIO_STORAGE, f"{job_id}_{i}.mp3")
            try:
                import requests
                response = requests.get(audio_url, timeout=10)
                if response.status_code == 200:
                    with open(local_path, 'wb') as f:
                        f.write(response.content)
                    audio_url = f"http://localhost:8000/api/audio/{job_id}_{i}.mp3"
                    print(f"[{job_id}] Audio cached locally: {local_path}")
                else:
                    print(f"[{job_id}] Failed to download audio from Voicebox: {response.status_code}")
                    audio_url = None
            except Exception as e:
                print(f"[{job_id}] Error downloading audio: {e}")
                audio_url = None
        
        visual_spec = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else batch_visuals.scenes[-1]

        print(f"[{job_id}] Generando código TSX de Remotion para escena {i+1}...")
        component_type_name = await generate_remotion_component(i, visual_spec, chunk, duration, job_id, aspect_ratio)

        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # AE script generation deferred to export step (saves tokens during iteration)
        print(f"[{job_id}] AE script generation deferred to export step (escena {i+1})")

        timeline_scenes.append({
            "start_time_seconds": round(current_start_time, 2),
            "duration_seconds": round(duration, 2),
            "text": chunk,
            "type": component_type_name,
            "media_query": visual_spec.media_query,
            "remotion_props": {
                "backgroundColor": visual_spec.backgroundColor,
                "textColor": visual_spec.textColor
            },
            "sfx": [],
            "audio_url": audio_url,
            "ae_script_code": None
        })
        current_start_time += duration
        
    write_index_ts(job_id, timeline_scenes)
    return timeline_scenes

def write_index_ts(job_id: str, timeline_scenes: list[dict]):
    """Escribe index.ts para exportar módulos explícitamente (compatible con Remotion Webpack CLI)."""
    generated_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated"))
    index_path = os.path.join(generated_dir, "index.ts")
    
    imports = []
    exports = []
    for i, s in enumerate(timeline_scenes):
        type_name = s["type"]
        if type_name not in ("FadeText", "Fade Text"):
            var_name = f"SceneMod_{i}"
            imports.append(f"import * as {var_name} from './{type_name}';")
            exports.append(f"  '{type_name}': {var_name},")
            
    content = "\n".join(imports) + "\n\nexport const generatedModules: Record<string, any> = {\n" + "\n".join(exports) + "\n};\n"
    
    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[{job_id}] Generado index.ts para componentes dinámicos.")
    except Exception as e:
        print(f"[{job_id}] Error escribiendo index.ts: {e}")

async def _regenerate_scene_async(job_id: str, spec: dict, scene_index: int, new_media_query: str, new_text: str) -> dict:
    from app.core.resolutions import get_resolution
    scene = spec["scenes"][scene_index]
    aspect_ratio = spec.get("aspect_ratio", "9:16")
    w, h = get_resolution(aspect_ratio)
    
    if new_text != scene["text"]:
        print(f"[{job_id}] Regenerando TTS para escena {scene_index}...")
        duration, audio_url = await generate_tts_with_voicebox(new_text, f"Escena-{scene_index+1}")
        print(f"[{job_id}] TTS escena {scene_index+1}: duration={duration}, audio_url={audio_url}")
        if duration is not None:
            scene["duration_seconds"] = round(duration, 2)
            # Download and cache audio
            if audio_url:
                os.makedirs(AUDIO_STORAGE, exist_ok=True)
                local_path = os.path.join(AUDIO_STORAGE, f"{job_id}_{scene_index}.mp3")
                try:
                    import requests
                    response = requests.get(audio_url, timeout=10)
                    if response.status_code == 200:
                        with open(local_path, 'wb') as f:
                            f.write(response.content)
                        audio_url = f"http://localhost:8000/api/audio/{job_id}_{scene_index}.mp3"
                        print(f"[{job_id}] Audio cached locally: {local_path}")
                    else:
                        print(f"[{job_id}] Failed to download audio: {response.status_code}")
                        audio_url = None
                except Exception as e:
                    print(f"[{job_id}] Error downloading audio: {e}")
                    audio_url = None
            scene["audio_url"] = audio_url
    
    scene["text"] = new_text
    scene["media_query"] = new_media_query
    
    visual_spec = VisualSpecResult(
        media_query=new_media_query,
        backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
        textColor=scene.get("remotion_props", {}).get("textColor", "#ffffff")
    )
    
    print(f"[{job_id}] Regenerando TSX para escena {scene_index}...")
    component_type_name = await generate_remotion_component(scene_index, visual_spec, new_text, scene["duration_seconds"], job_id, aspect_ratio)
    
    scene["type"] = component_type_name
    
    # AE script generation deferred to export step
    scene["ae_script_code"] = None
    
    spec["scenes"][scene_index] = scene
    
    write_index_ts(job_id, spec["scenes"])
    
    return spec

def regenerate_single_scene_sync(job_id: str, spec: dict, scene_index: int, new_media_query: str, new_text: str) -> dict:
    return asyncio.run(_regenerate_scene_async(job_id, spec, scene_index, new_media_query, new_text))


# =============================================================================
# MAIN PIPELINE FUNCTIONS
# =============================================================================

def run_pipeline(job_id: str, script_text: str, aspect_ratio: str = "9:16"):
    """Ejecuta el pipeline completo de generación de video."""
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        db.close()
        return

    # Actualizar aspect_ratio del job
    job.aspect_ratio = aspect_ratio
    db.commit()

    try:
        # Estado 1: Segmentación
        job.status = "segmenting"
        db.commit()
        
        # 1. Fragmentación Lógica (Multi-Scene)
        chunks = split_text_into_chunks(script_text)
        if not chunks:
            chunks = [script_text]

        print(f"[{job_id}] Guion segmentado en {len(chunks)} escenas (aspect_ratio: {aspect_ratio}).")

        # Estado 2: Generando visuales con Gemini
        job.status = "visuals_generating"
        db.commit()
        
        print(f"[{job_id}] Generando prompts visuales en Batch con Gemini...")
        batch_visuals = generate_batch_visuals_with_llm(chunks, aspect_ratio)

        # Estado 3: Procesando escenas (TTS + TSX)
        job.status = "processing_scenes"
        db.commit()
        
        timeline_scenes = asyncio.run(_process_chunks_async(job_id, chunks, batch_visuals, aspect_ratio))

        # Guardamos el timeline completo y lo validamos con Pydantic
        from app.schemas.spec import TimelineSpec
        final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
        spec_obj = TimelineSpec(**final_spec)
        job.result_spec = spec_obj.model_dump()
        
        # Estado 4: Completado
        job.status = "completed"
        db.commit()

    except Exception as e:
        job.status = f"failed: {str(e)}"
        db.commit()
    finally:
        db.close()

def render_video_pipeline(job_id: str):
    """Ejecuta el renderizado de video con Remotion CLI."""
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job or not job.result_spec:
        db.close()
        return

    try:
        job.status = "rendering"
        db.commit()

        # Remotion necesita un JSON string como --props
        spec_json = json.dumps({"spec": job.result_spec})
        
        # Directorios
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend"))
        output_dir = os.path.join(frontend_dir, "public", "videos")
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, f"{job_id}.mp4")
        
        import subprocess
        # Comando para Remotion CLI
        print(f"[{job_id}] Iniciando Renderizado MP4 con Remotion CLI...")
        npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
        cmd = [
            npx_cmd, "remotion", "render", 
            "src/remotion/Root.tsx", 
            "AnimaFlow-Main", 
            output_file, 
            f"--props={spec_json}"
        ]
        
        result = subprocess.run(cmd, cwd=frontend_dir, capture_output=True, text=True, encoding="utf-8", env=os.environ.copy())
        
        if result.returncode != 0:
            print(f"[{job_id}] Error en Render: {result.stderr}")
            raise Exception(f"Remotion CLI falló: {result.stderr}")
            
        print(f"[{job_id}] Render exitoso -> {output_file}")
        
        job.status = "completed_video"
        # En React, los archivos en public/videos se acceden directo desde la raíz
        job.video_url = f"/videos/{job_id}.mp4"
        db.commit()
    except Exception as e:
        print(f"[{job_id}] Excepción renderizando: {e}")
        job.status = f"failed_render: {str(e)}"
        db.commit()
    finally:
        db.close()
