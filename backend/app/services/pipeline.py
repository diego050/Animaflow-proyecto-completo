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

def generate_batch_visuals_with_llm(chunks: list[str]) -> BatchVisualSpec:
    """Usa Gemini para generar un arreglo de escenas visuales para cada bloque de texto."""
    import time
    from app.core.config import settings
    
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
        
        scenes_context = "\n".join([f"Escena {i+1}: \"{t}\"" for i, t in enumerate(chunks)])
        
        prompt = f"""
Eres el director de animación SENIOR de AnimaFlow. Analiza este guion y crea descripciones visuales DETALLADAS para animaciones SVG 2D complejas.

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

3. ESTILO VISUAL:
   - Minimalista 2D, sin elementos 3D.
   - Colores vibrantes, sombras, glows, gradientes.
   - Paleta oscura y premium.

4. MEDIA_QUERY EN INGLÉS:
   - Debe ser una descripción narrativa detallada de la animación completa.
   - Ejemplo: "Two rectangular blocks slide from opposite sides, collide at center creating a bright flash burst, from which text emerges with scale animation. Minimalist 2D style, vibrant colors, bounce easing."

5. AE_METADATA (OBLIGATORIO):
   Además del media_query, genera ae_metadata detallado con:
   
   a) animation_type: ELIGE el más apropiado para el texto:
      - collision: formas que chocan con destello
      - bounce_in: entrada con rebote
      - morphing: transformación de formas
      - particles: sistema de partículas
      - connection: nodos que se conectan
      - reveal: capas que revelan contenido
      - construction: ensamblaje pieza por pieza
      - flash: destello explosivo
      - fade_in: aparición suave
      - scale_emerge: escala desde cero
   
   b) elements: Lista de 3-8 elementos SVG con keyframes:
      - type: rectangle, circle, flash, line, particle
      - position_keyframes: [{{"time": 0, "value": [x, y]}}, {{"time": 1, "value": [x, y]}}]
      - scale_keyframes: [{{"time": 0, "value": [0, 0]}}, {{"time": 1, "value": [100, 100]}}]
      - opacity_keyframes: [{{"time": 0, "value": 0}}, {{"time": 0.5, "value": 100}}]
      - effects: [{{"type": "glow", "intensity": 50, "color": "#38bdf8"}}]
   
   c) text_animation: ELIGE el más apropiado:
      - letter_by_letter: aparece letra por letra
      - word_reveal: aparece palabra por palabra
      - scale_emerge: escala desde cero
      - fade_in: aparición suave

6. COHERENCIA:
   - Mantén coherencia visual entre escenas (misma familia de colores).
   - Devuelve exactamente {len(chunks)} escenas en el mismo orden.

Ejemplo de estructura completa:
{{"scenes": [{{
  "media_query": "Two blocks collide creating flash...",
  "backgroundColor": "#0f172a",
  "textColor": "#38bdf8",
  "ae_metadata": {{
    "animation_type": "collision",
    "elements": [
      {{"type": "rectangle", "id": "block_1", "position_keyframes": [{{"time": 0, "value": [400, 540]}}, {{"time": 1.5, "value": [800, 540]}}], "opacity_keyframes": [{{"time": 0, "value": 0}}, {{"time": 0.3, "value": 100}}], "effects": [{{"type": "drop_shadow", "distance": 10, "color": "#000000", "opacity": 50}}]}},
      {{"type": "flash", "id": "collision_flash", "opacity_keyframes": [{{"time": 1.5, "value": 0}}, {{"time": 1.6, "value": 100}}, {{"time": 1.8, "value": 0}}], "scale_keyframes": [{{"time": 1.5, "value": [0, 0]}}, {{"time": 1.6, "value": [300, 300]}}], "effects": [{{"type": "glow", "intensity": 100, "color": "#fbbf24"}}]}}
    ],
    "text_animation": "word_reveal"
  }}
}}]}}

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
                    wait_time = 3 * (2 ** attempt)  # 3s, 6s, 12s
                    print(f"[LLM API] Batch visuals: retry en {wait_time}s (intento {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                raise
        
        # Si el modelo principal falló, intentar con fallback
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
        
        data = json.loads(response.text)
        
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
        return BatchVisualSpec(scenes=[
            VisualSpecResult(
                media_query="A generic abstract background with particle effects",
                backgroundColor="#0f172a",
                textColor="#38bdf8"
            ) for _ in chunks
        ])


def generate_ae_metadata_with_llm(text: str, media_query: str, duration: float) -> Optional[Dict[str, Any]]:
    """
    Genera ae_metadata para After Effects en llamada separada.
    Esto evita el error 'additionalProperties is not supported' cuando se usa
    response_schema con campos Dict[str, Any].
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


async def generate_remotion_component(scene_index: int, visual_spec: VisualSpecResult, text: str, duration: float, job_id: str) -> str:
    """Usa Gemini para generar el código React/Remotion dinámico para una escena."""
    from app.core.config import settings
    
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[LLM API] GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText"

    try:
        client = genai.Client(api_key=api_key)
        
        prompt_header = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones SVG 2D complejas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f"Texto del guion: \"{text}\"\n"
            f"Descripción visual: \"{visual_spec.media_query}\"\n"
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {visual_spec.backgroundColor} · texto {visual_spec.textColor}\n\n"
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
            "            <svg viewBox=\"0 0 1920 1080\" style={{ position: 'absolute', width: '100%', height: '100%' }}>\n"
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

async def _process_chunks_async(job_id: str, chunks: list[str], batch_visuals: BatchVisualSpec) -> list[dict]:
    timeline_scenes = []
    current_start_time = 0.0

    for i, chunk in enumerate(chunks):
        print(f"[{job_id}] Enviando escena {i+1} a Voicebox para TTS...")
        duration, audio_url = await generate_tts_with_voicebox(chunk, f"Escena-{i+1}")
        
        # Lógica de fallback si Voicebox no está activo o falla
        if duration is None:
            duration = max(3.0, len(chunk) / 15.0)
        
        visual_spec = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else batch_visuals.scenes[-1]

        print(f"[{job_id}] Generando código TSX de Remotion para escena {i+1}...")
        component_type_name = await generate_remotion_component(i, visual_spec, chunk, duration, job_id)

        # Añadir pausa asíncrona para proteger el límite de 15 RPM (Requests Per Minute)
        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # Generar ae_metadata en llamada separada (evita additionalProperties error)
        print(f"[{job_id}] Generando ae_metadata para escena {i+1}...")
        ae_meta = generate_ae_metadata_with_llm(chunk, visual_spec.media_query, duration)

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
            "ae_metadata": ae_meta
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
    scene = spec["scenes"][scene_index]
    
    # Regenerar TTS si el texto cambió
    if new_text != scene["text"]:
        print(f"[{job_id}] Regenerando TTS para escena {scene_index}...")
        duration, audio_url = await generate_tts_with_voicebox(new_text, f"Escena-{scene_index+1}")
        if duration is not None:
            scene["duration_seconds"] = round(duration, 2)
            scene["audio_url"] = audio_url
    
    scene["text"] = new_text
    scene["media_query"] = new_media_query
    
    # Construir objeto visual spec para LLM
    visual_spec = VisualSpecResult(
        media_query=new_media_query,
        backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
        textColor=scene.get("remotion_props", {}).get("textColor", "#ffffff")
    )
    
    print(f"[{job_id}] Regenerando TSX para escena {scene_index}...")
    component_type_name = await generate_remotion_component(scene_index, visual_spec, new_text, scene["duration_seconds"], job_id)
    
    scene["type"] = component_type_name
    spec["scenes"][scene_index] = scene
    
    # Reescribir el index.ts
    write_index_ts(job_id, spec["scenes"])
    
    return spec

def regenerate_single_scene_sync(job_id: str, spec: dict, scene_index: int, new_media_query: str, new_text: str) -> dict:
    return asyncio.run(_regenerate_scene_async(job_id, spec, scene_index, new_media_query, new_text))


# =============================================================================
# MAIN PIPELINE FUNCTIONS
# =============================================================================

def run_pipeline(job_id: str, script_text: str):
    """Ejecuta el pipeline completo de generación de video."""
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        # Estado 1: Segmentación
        job.status = "segmenting"
        db.commit()
        
        # 1. Fragmentación Lógica (Multi-Scene)
        chunks = split_text_into_chunks(script_text)
        if not chunks:
            chunks = [script_text]

        print(f"[{job_id}] Guion segmentado en {len(chunks)} escenas.")

        # Estado 2: Generando visuales con Gemini
        job.status = "visuals_generating"
        db.commit()
        
        print(f"[{job_id}] Generando prompts visuales en Batch con Gemini...")
        batch_visuals = generate_batch_visuals_with_llm(chunks)

        # Estado 3: Procesando escenas (TTS + TSX)
        job.status = "processing_scenes"
        db.commit()
        
        timeline_scenes = asyncio.run(_process_chunks_async(job_id, chunks, batch_visuals))

        # Guardamos el timeline completo y lo validamos con Pydantic
        from app.schemas.spec import TimelineSpec
        final_spec = {"scenes": timeline_scenes}
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
