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
                is_retryable = any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
                
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


def generate_ae_script_from_tsx(tsx_code: str, text: str, duration: float, bg_color: str = "#0f172a", text_color: str = "#38bdf8", width: int = 1080, height: int = 1920) -> Optional[str]:
    """
    Traduce código TSX de Remotion directamente a ExtendScript de After Effects.
    Usa createPath() para paths SVG, addShape() para círculos, addSolid() para fondos.
    """
    import time
    from app.core.config import settings
    from app.services.ae_export import hex_to_rgb_array
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LLM AE] GEMINI_API_KEY no encontrada. ae_script será null.")
        return None
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
Eres un experto en After Effects ExtendScript y React/Remotion. Traduce este código TSX a un script de After Effects funcional.

CANVAS: {width}x{height} píxeles, {duration} segundos, 30fps.
COLOR FONDO: {bg_color}
COLOR TEXTO: {text_color}

CÓDIGO TSX DE REMOTION:
```tsx
{tsx_code[:5000]}
```

Tu tarea: Crear un script de After Effects que reproduzca visualmente esta animación.

REGLAS CRÍTICAS:

1. FONDO:
   var bgLayer = comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Fondo", {width}, {height}, 1);

2. PATHS SVG → Shape object (NO usar createPath, no existe en ExtendScript):
   // Para <path d="M x1 y1 L x2 y2 C cx1 cy1 cx2 cy2 x3 y3 Z" />
   var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
   var pathProp = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
   var myShape = new Shape();
   myShape.vertices = [[x1,y1], [x2,y2], [x3,y3]];
   myShape.inTangents = [[0,0], [0,0], [0,0]];
   myShape.outTangents = [[0,0], [0,0], [0,0]];
   myShape.closed = true;  // true si el path tiene Z, false si no
   pathProp.property("ADBE Vector Shape").setValue(myShape);
   var fill = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
   fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array("#color")});

   // Para curvas bezier (C en SVG), ajustar tangentes:
   // C cx1 cy1 cx2 cy2 x3 y3 → outTangent del punto anterior = [cx1-x1, cy1-y1], inTangent de x3 = [cx2-x3, cy2-y3]

3. CÍRCULOS → Ellipse:
   var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
   var ellipse = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
   ellipse.property("ADBE Vector Ellipse Size").setValue([diameter, diameter]);
   var fill = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
   fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array("#color")});
   
   // IMPORTANTE: NO usar setValueAtTime() en ellipse.property("ADBE Vector Ellipse Size")
   // Para animar tamaño de elipse, usar AD BE Scale del layer:
   // layer.property("ADBE Transform Group").property("ADBE Scale").setValueAtTime(t, [scaleX, scaleY]);

4. LÍNEAS → Shape object abierto:
   var myShape = new Shape();
   myShape.vertices = [[x1,y1], [x2,y2]];
   myShape.inTangents = [[0,0], [0,0]];
   myShape.outTangents = [[0,0], [0,0]];
   myShape.closed = false;
   pathProp.property("ADBE Vector Shape").setValue(myShape);
   var stroke = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
   stroke.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array("#color")});
   stroke.property("ADBE Vector Stroke Width").setValue(2);

5. ANIMACIONES (SOLO en Transform Group del layer):
   // Posición:
   var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
   posProp.setValueAtTime(0, [x, y]);
   posProp.setValueAtTime(1, [x2, y2]);
   
   // Escala (en porcentaje, 100 = normal):
   var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
   scaleProp.setValueAtTime(0, [0, 0]);
   scaleProp.setValueAtTime(1, [100, 100]);
   
   // Opacidad:
   var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
   opacityProp.setValueAtTime(0, 0);
   opacityProp.setValueAtTime(0.5, 100);
   
   // Rotación (en grados):
   var rotProp = layer.property("ADBE Transform Group").property("ADBE Rotation");
   rotProp.setValueAtTime(0, 0);
   rotProp.setValueAtTime(1, 360);

6. TEXTO:
   var textLayer = comp.layers.addText("{text}");
   textLayer.property("ADBE Text Properties").property("ADBE Text Fill Color").setValue({hex_to_rgb_array(text_color)});

7. COORDENADAS:
   - El viewBox del TSX es "0 0 {width} {height}"
   - Las coordenadas del TSX son directamente aplicables al canvas de AE
   - Si el TSX usa translate(x, y), sumar esas coordenadas a la posición base

8. GLOW:
   var effects = layer.property("ADBE Effect Parade");
   var glow = effects.addProperty("ADBE Glo2");
   glow.property(3).setValue(50);
   glow.property(4).setValue(1);

9. RANDOM:
   - NO usar Math.random() en ExtendScript (puede fallar en AE)
   - Usar generateRandomNumber() en su lugar
   - Ejemplo: var x = 540 + (generateRandomNumber() - 0.5) * 300;

10. EXPRESIONES:
    - Evitar usar expresiones complejas en scripts (.jsx)
    - Si necesitas animación continua (pulse, oscillation), usa setValueAtTime() con keyframes manuales
    - NO usar: layer.property("ADBE Scale").expression = "..."

IMPORTANTE:
- NO usar addSolid() para elementos que no sean fondo
- NO usar createPath() — NO existe en ExtendScript. Usar "new Shape()" con vertices, inTangents, outTangents, closed
- NO usar setValueAtTime() en ellipse.property("ADBE Vector Ellipse Size") — retorna null. Usar AD BE Scale del layer
- NO usar Math.random() — usar generateRandomNumber()
- NO usar expressions en scripts — usar keyframes manuales con setValueAtTime()
- Mantener el orden de capas: fondo → elementos traseros → elementos delanteros → texto
- Cada capa debe tener nombre descriptivo

Responde SOLO con el código ExtendScript. Sin markdown, sin explicaciones.
"""
        
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                    ),
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
                
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
        
        return script
        
    except Exception as e:
        print(f"[LLM AE-TSX] Error generando script AE desde TSX: {e}")
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
                is_retryable = any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
                
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
                is_retryable = any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
                
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
            is_retryable = any(code in error_str for code in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"])
            
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
        
        if duration is None:
            duration = max(3.0, len(chunk) / 15.0)
        
        visual_spec = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else batch_visuals.scenes[-1]

        print(f"[{job_id}] Generando código TSX de Remotion para escena {i+1}...")
        component_type_name = await generate_remotion_component(i, visual_spec, chunk, duration, job_id, aspect_ratio)

        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # Generar ExtendScript directamente desde el TSX
        print(f"[{job_id}] Generando ExtendScript AE desde TSX para escena {i+1}...")
        tsx_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated", f"Scene_{job_id}_{i}.tsx"))
        tsx_code = ""
        if os.path.exists(tsx_file_path):
            with open(tsx_file_path, "r", encoding="utf-8") as f:
                tsx_code = f.read()
        
        ae_script_code = None
        if tsx_code:
            ae_script_code = generate_ae_script_from_tsx(
                tsx_code, chunk, duration,
                visual_spec.backgroundColor, visual_spec.textColor,
                w, h
            )
        else:
            print(f"[{job_id}] TSX no encontrado, ae_script será null.")

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
            "ae_script_code": ae_script_code
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
        if duration is not None:
            scene["duration_seconds"] = round(duration, 2)
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
    
    # Generar ExtendScript directamente desde el TSX
    print(f"[{job_id}] Generando ExtendScript AE desde TSX para escena {scene_index}...")
    tsx_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated", f"Scene_{job_id}_{scene_index}.tsx"))
    tsx_code = ""
    if os.path.exists(tsx_file_path):
        with open(tsx_file_path, "r", encoding="utf-8") as f:
            tsx_code = f.read()
    
    if tsx_code:
        scene["ae_script_code"] = generate_ae_script_from_tsx(
            tsx_code, new_text, scene["duration_seconds"],
            visual_spec.backgroundColor, visual_spec.textColor,
            w, h
        )
    else:
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
