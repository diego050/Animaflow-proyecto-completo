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


def generate_ae_script_from_tsx(tsx_code: str, text: str, duration: float, bg_color: str = "#0f172a", text_color: str = "#38bdf8", width: int = 1080, height: int = 1920, job_id: str = None, scene_id: int = None) -> Optional[str]:
    """
    Traduce código TSX de Remotion directamente a ExtendScript de After Effects.
    Usa createPath() para paths SVG, addShape() para círculos, addSolid() para fondos.
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
    
    print(f"[LLM AE] ✅ Iniciando generación AE script (width={width}, height={height}, duration={duration})")
    
    try:
        from app.services.svg_parser import parse_svg_from_tsx
        from app.services.tsx_animation_parser import parse_tsx_animations
        svg_elements = parse_svg_from_tsx(tsx_code)
        print(f"[LLM AE] SVG parser encontró {len(svg_elements)} elementos")
        if not svg_elements:
            print(f"[LLM AE] ⚠️ WARNING: SVG parser no encontró elementos en el TSX")
        
        # Extract animation data
        animation_data = parse_tsx_animations(tsx_code, duration, 30)
        print(f"[LLM AE] Animation parser encontró {len(animation_data.get('animations', []))} animaciones")
        
        svg_context = ""
        if svg_elements:
            import json
            svg_context = f"""
GEOMETRÍA EXACTA EXTRAÍDA DEL SVG (USA ESTAS COORDENADAS EXACTAS):
{json.dumps(svg_elements, indent=2)}

Para cada elemento:
- "path": usa new Shape() con vertices, inTangents, outTangents, closed
- "circle": usa ellipse.property("ADBE Vector Ellipse Size").setValue([diametro, diametro])
- "rect": usa rect.property("ADBE Vector Rect Size").setValue([width, height])
- "line": usa new Shape() con 2 vertices, closed=false
- "ellipse": usa ellipse.property("ADBE Vector Ellipse Size").setValue([rx*2, ry*2])
- Los colores fill/stroke son exactos — conviértelos con hex_to_rgb_array()
"""
        
        # Animation context for LLM
        animation_context = ""
        if animation_data.get("animations"):
            import json
            animation_context = f"""
ANIMACIONES EXACTAS EXTRAÍDAS DEL TSX (REPLICA ESTOS KEYFRAMES):
{json.dumps(animation_data, indent=2)}

INSTRUCCIONES:
- Replica CADA animación con setValueAtTime() usando los tiempos y valores exactos
- Para spring animations: usa keyframes [0s, 0%], [0.1s, 120%], [0.3s, 100%]
- Para opacity: fade-in 0→100, fade-out 100→0 en los tiempos indicados
- Para position: usa los valores de translateY/translateX del TSX
- Para scale: usa los valores de scale del TSX
- Mantén el orden de entrada/salida de elementos como en el TSX
"""
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""Traduce TSX de Remotion a ExtendScript de After Effects.

CANVAS: {width}x{height}, {duration}s, 30fps. FONDO: {bg_color}
TEXTO DE LA ESCENA: "{text}"
COLOR TEXTO: {text_color}
{svg_context}
{animation_context}
TSX:
{tsx_code[:3000]}

REGLAS:
1. FONDO: comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Fondo", {width}, {height}, 1)
2. **OBLIGATORIO: Crear 1 layer por CADA elemento SVG en GEOMETRÍA EXACTA**. NO omitir ninguno.
3. PATHS: comp.layers.addShape(); name="Path_N"; ADBE Vector Shape con new Shape() (vertices, inTangents, outTangents, closed)
4. CÍRCULOS: comp.layers.addShape(); name="Circle_N"; ADBE Vector Shape - Ellipse con setValue([d,d]); animar con ADBE Scale
5. LÍNEAS: comp.layers.addShape(); name="Line_N"; new Shape() con vertices=[[x1,y1],[x2,y2]], inTangents=[[0,0],[0,0]], outTangents=[[0,0],[0,0]], closed=false (siempre explícito, nunca undefined)
6. ANIMACIONES: interpolate([s,e],[v1,v2]) → setValueAtTime(s/30,v1); setValueAtTime(e/30,v2). spring() → Scale keyframes [0,0%],[0.1s,120%],[0.3s,100%]
7. TEXTO: Analiza el TSX para ver cómo se muestra el texto (cuántas líneas, saltos naturales). Replica los mismos saltos de línea en AE usando \n. Si el TSX muestra texto en 2-3 líneas por limitación de ancho, agrega \n en los mismos puntos. Si es una palabra sola centrada, usa una sola línea. Ejemplo: comp.layers.addText("Tus plantas limpian el aire\ny reducen el estrés.");
8. RANDOM: function randomRange(min, max) {{ return min + (Math.random() * (max - min)); }}. NO usar generateRandomNumber (built-in de AE sin params). NO Math.random() directo. NO expressions. NO ADBE Rotation (usar ADBE Rotate Z)
9. TEXTO POS: X={width//2}, Y={int(height*0.7)}-{int(height*0.85)}. fontSize=64, Bold. Fade-in 0-0.8s, fade-out últimos 0.3s

ESTRUCTURA SHAPE LAYER (OBLIGATORIA):
Shape Layer → ADBE Root Vectors Group → ADBE Vector Group (addProperty) → ADBE Vectors Group (.property) → shapes/fills/strokes

CÓDIGO:
var sl = comp.layers.addShape(); sl.name = "S";
var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg = g.property("ADBE Vectors Group");
var ps = vg.addProperty("ADBE Vector Shape - Group");
var s = new Shape(); s.vertices = [[0,0],[100,100]]; s.inTangents = [[0,0],[0,0]]; s.outTangents = [[0,0],[0,0]]; s.closed = true;
ps.property("ADBE Vector Shape").setValue(s);
var f = vg.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue([R,G,B]);
var st = vg.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue([R,G,B]); st.property("ADBE Vector Stroke Width").setValue(2);

MATCH NAMES: Path=`ADBE Vector Shape - Group`, Ellipse=`ADBE Vector Shape - Ellipse`, Rect=`ADBE Vector Shape - Rect`, Fill=`ADBE Vector Graphic - Fill`, Stroke=`ADBE Vector Graphic - Stroke`, Trim=`ADBE Vector Filter - Trim`
VECTORS GROUP: usar .property("ADBE Vectors Group"), NO addProperty
LÍNEAS: convertir x1,y1,x2,y2 → vertices=[[x1,y1],[x2,y2]], closed=false

EJEMPLO:
var comp = app.project.items.addComp("S", {width}, {height}, 1, {duration}, 30);
comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "BG", {width}, {height}, 1);
var c = comp.layers.addShape(); c.name = "C1";
var cg = c.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg = cg.property("ADBE Vectors Group");
var e = vg.addProperty("ADBE Vector Shape - Ellipse"); e.property("ADBE Vector Ellipse Size").setValue([100,100]);
vg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0.29,0.87,0.50]);
c.property("ADBE Transform Group").property("ADBE Position").setValue([540,960]);
c.property("ADBE Transform Group").property("ADBE Scale").setValueAtTime(0,[0,0]); c.property("ADBE Transform Group").property("ADBE Scale").setValueAtTime(0.5,[100,100]);
// Texto en 2 líneas (replicando layout del TSX):
var txt = comp.layers.addText("Tus plantas limpian el aire\ny reducen el estrés.");
var td = txt.property("Source Text").value;
td.fontSize = 64; td.fauxBold = true;
td.fillColor = {hex_to_rgb_array(text_color)};
td.justification = ParagraphJustification.CENTER_JUSTIFY;
txt.property("Source Text").setValue(td);
txt.property("ADBE Transform Group").property("ADBE Position").setValue([540,1344]);
txt.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(0,0);
txt.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(0.8,100);

SOLO código ExtendScript."""
        print(f"[LLM AE] Enviando prompt a Gemini (longitud: {len(prompt)} chars)")
        
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                print(f"[LLM AE] Llamada a Gemini API (intento {attempt+1}/{max_retries})...")
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                    ),
                )
                print(f"[LLM AE] ✅ Respuesta recibida de Gemini (longitud: {len(response.text)} chars)")
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
                    temperature=0.7,
                ),
            )
        
        script = response.text.strip()
        # Limpiar bloques markdown si existen
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
        
        # Post-processing: fix common AE scripting errors
        # a) Remove duplicate randomRange() / generateRandomNumber() — keep first, remove rest
        def remove_duplicate_generate_random(script_text):
            pattern = r'(function (?:randomRange|generateRandomNumber)\([^)]*\)\s*\{[^}]*\})'
            matches = list(re.finditer(pattern, script_text))
            if len(matches) > 1:
                for m in matches[1:]:
                    script_text = script_text[:m.start()] + script_text[m.end():]
            return script_text
        
        script = remove_duplicate_generate_random(script)
        
        # b) Replace layers.length → layers.numLayers
        script = re.sub(r'\.layers\.length', '.layers.numLayers', script)
        
        # c) Replace ADBE Rotation → ADBE Rotate Z (word boundary to avoid Rotate Z becoming Rotate ZZ)
        script = re.sub(r'\bADBE Rotation\b', 'ADBE Rotate Z', script)
        
        # d) Validate no createPath() slipped through
        if "createPath(" in script:
            print(f"[LLM AE] ⚠️ createPath() detected in output, removing...")
            script = script.replace("createPath(", "// REMOVED: createPath(")
        
        # e) Fix unclosed quotes in .property() calls (e.g. "ADBE Opacity)) → "ADBE Opacity"))
        script = re.sub(
            r'\.property\("([^"]+)\)\)',
            r'.property("\1"))',
            script
        )
        
        # f) Rename generateRandomNumber → randomRange (avoid AE built-in conflict)
        script = script.replace('generateRandomNumber', 'randomRange')
        
        # g) Normalize randomRange(min, max) — LLM sometimes generates it without params
        script = re.sub(
            r'function randomRange\([^)]*\)\s*\{[^}]*\}',
            'function randomRange(min, max) {\n    return min + (Math.random() * (max - min));\n}',
            script
        )
        
        # h) Fix undefined closed → false (AE requires boolean, not undefined)
        script = script.replace('s.closed = item.closed;', 's.closed = item.closed !== undefined ? item.closed : false;')
        
        # === DEBUG FILE LOGGING ===
        try:
            debug_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'storage', 'debug')
            os.makedirs(debug_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scene_str = f"scene_{scene_id}" if scene_id is not None else "scene_X"
            job_str = job_id if job_id else "job_unknown"
            debug_filename = f"{job_str}_{scene_str}_{timestamp}.txt"
            debug_path = os.path.join(debug_dir, debug_filename)
            
            # Count validation metrics
            addshape_count = len(re.findall(r'\.addShape\(\)', script))
            addtext_count = len(re.findall(r'\.addText\(', script))
            addsolid_count = len(re.findall(r'\.addSolid\(', script))
            createpath_count = len(re.findall(r'createPath\(', script))
            mathrandom_count = len(re.findall(r'Math\.random\(\)', script))
            rotation_count = len(re.findall(r'ADBE Rotation\b', script))
            
            debug_content = f"""=== METADATA ===
job_id: {job_id or 'unknown'}
scene_id: {scene_id if scene_id is not None else 'unknown'}
timestamp: {timestamp}
svg_elements_found: {len(svg_elements)}
prompt_length: {len(prompt)}
response_raw_length: {len(response.text)}
post_processed_length: {len(script)}

=== VALIDATION ===
addShape() calls: {addshape_count}
addText() calls: {addtext_count}
addSolid() calls: {addsolid_count}
createPath() detected: {'YES (' + str(createpath_count) + ')' if createpath_count > 0 else 'NO'}
Math.random() detected: {'YES (' + str(mathrandom_count) + ')' if mathrandom_count > 0 else 'NO'}
ADBE Rotation detected: {'YES (' + str(rotation_count) + ')' if rotation_count > 0 else 'NO'}

=== PROMPT (primeros 1000 chars) ===
{prompt[:1000]}

=== RESPONSE RAW ===
{response.text}

=== POST-PROCESSED ===
{script}
"""
            
            with open(debug_path, 'w', encoding='utf-8') as f:
                f.write(debug_content)
            
            print(f"[LLM AE] 💾 Debug guardado: {debug_filename} (shapes={addshape_count}, text={addtext_count}, solids={addsolid_count})")
        except Exception as debug_err:
            print(f"[LLM AE] ⚠️ Error guardando debug file: {debug_err}")
        
        return script
        
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
