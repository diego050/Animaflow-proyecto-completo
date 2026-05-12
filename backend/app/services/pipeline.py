import os
import re
import httpx
import json
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.schemas.spec import Spec
from google import genai
from google.genai import types

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
    """Obtiene o crea el perfil preset de Kokoro para AnimaFlow.
    
    Voicebox requiere que el engine y voice_type del perfil sean compatibles:
    - engine 'kokoro' solo funciona con voice_type 'preset'
    - Los perfiles 'cloned' solo aceptan engines de clonación (qwen, chatterbox, etc.)
    
    Retorna el profile_id o None si falla.
    """
    try:
        async with httpx.AsyncClient() as client:
            # Buscar perfil preset Kokoro existente
            res = await client.get(f"{VOICEBOX_API_URL}/profiles", timeout=10.0)
            res.raise_for_status()
            profiles = res.json()
            existing = next(
                (p["id"] for p in profiles if p["name"] == "animaflow-kokoro-es"),
                None
            )
            if existing:
                return existing

            # Crear perfil preset Kokoro en español (voz masculina em_alex)
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

def generate_batch_visuals_with_llm(chunks: list[str]) -> BatchVisualSpec:
    """Usa Gemini para generar un arreglo de escenas visuales para cada bloque de texto."""
    from app.core.config import settings
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[LLM API] GEMINI_API_KEY no encontrada. Fallback a escenas genéricas.")
        return BatchVisualSpec(scenes=[
            VisualSpecResult(
                media_query="A cinematic cinematic wide shot of a futuristic landscape",
                backgroundColor="#0f172a",
                textColor="#38bdf8"
            ) for _ in chunks
        ])
        
    try:
        client = genai.Client(api_key=api_key)
        
        scenes_context = "\n".join([f"Escena {i+1}: \"{t}\"" for i, t in enumerate(chunks)])
        
        prompt = f"""
        Eres el director de arte de AnimaFlow, un pipeline de videos generativos premium.
        Tienes un guion dividido en {len(chunks)} escenas.

        {scenes_context}

        Tu tarea es proponer la configuración visual NARRATIVA para cada escena.
        El media_query NO es una descripción de fondo abstracto — es la instrucción para crear el OBJETO VISUAL PRINCIPAL que ilustra el concepto del texto.

        REGLAS CRÍTICAS:
        1. media_query SIEMPRE EN INGLÉS. Debe describir un OBJETO CONCRETO o METÁFORA VISUAL que represente el concepto del texto.
           Ejemplos BUENOS: "animated chocolate bar SVG with bite taken out, symbolizing impulse purchase"
                           "stock market line chart SVG rising steeply, TradingView style, minimal dark theme"
                           "SVG padlock closing with spring animation, symbolizing security"
                           "three vertical bar chart columns growing sequentially, data analytics style"
                           "SVG calendar with days crossing out, time passing animation"
                           "network of connected nodes expanding from center, growth metaphor"
           Ejemplos MALOS: "abstract blue particles floating" / "dark gradient background" / "futuristic landscape"
        2. Paleta oscura y premium (backgroundColor oscuro, textColor contrastante y vibrante).
        3. Coherencia visual entre escenas — misma familia de colores pero con variación.
        4. Devuelve exactamente {len(chunks)} escenas en el mismo orden.
        """
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BatchVisualSpec,
                temperature=0.7,
            ),
        )
        import json as _json
        data = _json.loads(response.text)
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

async def generate_remotion_component(scene_index: int, visual_spec: VisualSpecResult, text: str, duration: float, job_id: str) -> str:
    """Usa Gemini para generar el código React/Remotion dinámico para una escena."""
    from app.core.config import settings
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[LLM API] GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText"

    try:
        # Usamos cliente asíncrono
        client = genai.Client(api_key=api_key)
        
        prompt_header = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones cinematográficas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f"Texto del guion: \"{text}\"\n"
            f"Descripción visual: \"{visual_spec.media_query}\"\n"
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {visual_spec.backgroundColor} · texto {visual_spec.textColor}\n\n"
            "════════════════════════════════════════\n"
            "FILOSOFÍA — ANIMACIÓN NARRATIVA DE ALTA FIDELIDAD\n"
            "════════════════════════════════════════\n"
            "NUNCA hagas solo texto + fondo. SIEMPRE hay un objeto SVG principal GRANDE y DETALLADO.\n\n"
            "ESTÁNDARES DE CALIDAD OBLIGATORIOS:\n"
            "1. TAMAÑO DEL OBJETO: El SVG principal debe medir 250-400px. Si es pequeño, FALLAS.\n"
            "2. DETALLE DEL SVG: Mínimo 5-8 elementos SVG (rect, path, circle, line...). No íconos minimalistas.\n"
            "3. FONDO: NUNCA negro puro. Usa radialGradient o linearGradient. Ejemplo: '#0a0a1a' con glow radial dorado/azul centrado.\n"
            "4. COLORES DEL OBJETO: Usa gradientes internos en el SVG con <defs>/<linearGradient>. Añade sombras con filter: drop-shadow.\n"
            "5. TIPOGRAFÍA PREMIUM: fontSize 56-72px, fontWeight 800-900, letterSpacing '-2px' o '-3px', textTransform 'uppercase'.\n"
            "6. GLOW/AURA: El objeto debe tener un resplandor detrás (un div/circle SVG grande, opacidad 0.15-0.3, blur via boxShadow o filter).\n\n"
            "ARQUETIPOS VISUALES — ELIGE EL MÁS RELEVANTE:\n"
            f"El texto dice: \"{text}\"\n"
            "• CHOCOLATE/CAPRICHO → Barra de chocolate SVG (300x200px): rectángulo marrón oscuro con segmentos en grid (6 cuadrados), brillos en la esquina superior, sombra bajo. Aparece con spring() rebotando desde arriba. Texto: 'NO ES UN CAPRICHO' en amarillo dorado.\n"
            "• INVERSIÓN/DINERO → Gráfica de stock SVG (350x200px): eje X/Y, línea de precio que se dibuja de izquierda a derecha con strokeDashoffset animado, área de relleno verde bajo la línea, puntos en los picos. La línea SUBE al final.\n"
            "• TIEMPO → Reloj analógico SVG (280px): círculo con 12 marcas de hora, aguja de minutos y hora que giran con interpolate, números en posiciones 12/3/6/9.\n"
            "• CRECIMIENTO/RED → 5-7 nodos circulares conectados por líneas que aparecen con spring() en secuencia, expandiéndose desde el centro.\n"
            "• SEGURIDAD → Candado SVG (250x300px): cuerpo del candado + arco superior, se cierra con animación spring, tiene brillo metálico.\n"
            "• DATOS → 6-8 barras verticales de distintas alturas que crecen desde abajo con interpolate en secuencia escalonada (delay por índice).\n"
            "• VELOCIDAD → Líneas paralelas que salen disparadas desde la izquierda con distintos offsets y opacidades, efecto motion blur.\n"
            "• ÉXITO/LOGRO → Estrella o trofeo SVG dorado con rayos que se expanden, partículas que salen (círculos pequeños en posiciones radiales).\n\n"
            "════════════════════════════════════════\n"
            "ESTRUCTURA DE CAPAS (OBLIGATORIA)\n"
            "════════════════════════════════════════\n"
            "CAPA 1 - FONDO (zIndex 0, position absolute, width/height 100%):\n"
            "  → background: radialGradient o linearGradient. Ej: 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0a1a 70%)'\n"
            "  → Opcional: elementos de fondo sutiles (puntos, líneas de grid con opacidad 0.05)\n\n"
            "CAPA 2 - AURA/GLOW (zIndex 1, position absolute, centrado):\n"
            "  → Un div o circle SVG grande (300-500px), backgroundColor del color del objeto, opacity: 0.12-0.2, filter: 'blur(80px)'\n"
            "  → Aparece con interpolate de opacity: 0 → 0.2\n\n"
            "CAPA 3 - OBJETO PRINCIPAL (zIndex 5, centrado, marginBottom '10%'):\n"
            "  → El SVG detallado de 250-400px del concepto.\n"
            "  → scale: spring() con damping 10, stiffness 150 (rebote pronunciado)\n"
            "  → rotate: leve rotación inicial (-15deg → 0deg) con spring()\n\n"
            "CAPA 4 - TEXTO (zIndex 10, position absolute, bottom '12%'):\n"
            "  → Aparece en frame 25-50 con interpolate opacity 0→1, translateY 40→0\n"
            "  → fontSize 60-72px, fontWeight 900, letterSpacing '-2px', textTransform 'uppercase'\n"
            "  → textShadow: '0 0 40px rgba(255,200,0,0.5)' o el color del objeto\n\n"
            "════════════════════════════════════════\n"
            "TÉCNICAS REMOTION ESENCIALES\n"
            "════════════════════════════════════════\n"
            "const scaleIn = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });\n"
            "const rotateIn = interpolate(spring({ frame, fps, config: { damping: 8, stiffness: 120 } }), [0,1], [-15,0]);\n"
            "const lineProgress = interpolate(frame, [5, durationInFrames*0.65], [0, 1], { extrapolateRight: 'clamp' });\n"
            "const glowOpacity = interpolate(frame, [0, 20], [0, 0.18], { extrapolateRight: 'clamp' });\n"
            "const textOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });\n"
            "const textY = interpolate(frame, [25, 50], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });\n"
            "// Para líneas SVG animadas: strokeDasharray={totalLen} strokeDashoffset={totalLen * (1 - lineProgress)}\n\n"
            "════════════════════════════════════════\n"
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- SOLO importa de 'remotion' y 'react'. NADA más.\n"
            "- Nombre del componente: SceneComponent (exacto).\n"
            "- Props: text (string), durationInFrames (number).\n"
            "- SVG inline en JSX. Usa <svg viewBox> + <defs> para gradientes internos.\n"
            "- PROHIBIDO: CSS transitions, Tailwind, librerías externas, @keyframes.\n"
            "- PROHIBIDO: objetos placeholder, SVGs vacíos, rectángulos sin detalle.\n"
            "- El código debe compilar sin errores y ser 100% funcional.\n\n"
            "ESTRUCTURA BASE (REEMPLAZA Y EXPANDE — NO copies literal):\n"
        )
        
        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        prompt_code = (
            "import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';\n"
            "import React from 'react';\n\n"
            "export const SceneComponent = ({ text, durationInFrames }) => {\n"
            "    const frame = useCurrentFrame();\n"
            "    const { fps } = useVideoConfig();\n\n"
            "    // CAPA 2: animaciones del objeto visual principal\n\n"
            "    // CAPA 3: animaciones del texto\n"
            "    const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });\n"
            "    const textY = interpolate(frame, [20, 40], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });\n\n"
            "    return (\n"
            f"        <div style={{{{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '{bg_color}', fontFamily: 'Inter, Outfit, sans-serif' }}}}>\n"
            "            {/* CAPA 1: fondo */}\n"
            "            {/* CAPA 2: objeto SVG narrativo OBLIGATORIO */}\n"
            "            {/* CAPA 3: texto con animacion de entrada */}\n"
            "            <div style={{ position: 'absolute', bottom: '15%', textAlign: 'center', zIndex: 10, opacity: textOpacity, transform: `translateY(${textY}px)` }}>\n"
            f"                <h1 style={{{{ color: '{txt_color}', fontSize: '52px', margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}}}>{{text}}</h1>\n"
            "            </div>\n"
            "        </div>\n"
            "    );\n"
            "};\n\n"
            "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
        )
        
        prompt = prompt_header + prompt_code
        import asyncio
        
        # Lógica de reintento para evitar el 429 RESOURCE_EXHAUSTED
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await client.aio.models.generate_content(
                    model='gemini-3.1-flash-lite-preview',
                    contents=prompt,
                )
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    if attempt < max_retries - 1:
                        wait_time = 15 * (attempt + 1)
                        print(f"[LLM API] Límite de cuota detectado (429). Esperando {wait_time}s antes de reintentar...")
                        await asyncio.sleep(wait_time)
                        continue
                raise e
                
        code = response.text.strip()
        
        # Limpieza básica por si el LLM incluye bloques markdown
        if code.startswith("```tsx"): code = code[6:]
        elif code.startswith("```javascript"): code = code[13:]
        elif code.startswith("```"): code = code[3:]
        if code.endswith("```"): code = code[:-3]
        code = code.strip()
        
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

async def _process_chunks_async(job_id: str, chunks: list[str], batch_visuals: BatchVisualSpec) -> list[dict]:
    timeline_scenes = []
    current_start_time = 0.0
    import asyncio

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
            "audio_url": audio_url
        })
        current_start_time += duration
        
    write_index_ts(job_id, timeline_scenes)
    return timeline_scenes

def write_index_ts(job_id: str, timeline_scenes: list[dict]):
    import os
    # Escribir index.ts para exportar módulos explícitamente (compatible con Remotion Webpack CLI)
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
    
    # Construir objeto visual spec para Gemini
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
    import asyncio
    return asyncio.run(_regenerate_scene_async(job_id, spec, scene_index, new_media_query, new_text))

def run_pipeline(job_id: str, script_text: str):
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = "processing"
        db.commit()

        # 1. Fragmentación Lógica (Multi-Scene)
        chunks = split_text_into_chunks(script_text)
        if not chunks:
            chunks = [script_text]

        print(f"[{job_id}] Guion segmentado en {len(chunks)} escenas.")

        # 2. TTS por fragmento (o fallback matemático de duración)
        timeline_scenes = []
        current_start_time = 0.0

        print(f"[{job_id}] Generando prompts visuales en Batch con Gemini...")
        batch_visuals = generate_batch_visuals_with_llm(chunks)

        import asyncio
        timeline_scenes = asyncio.run(_process_chunks_async(job_id, chunks, batch_visuals))

        # Guardamos el timeline completo y lo validamos con Pydantic
        from app.schemas.spec import TimelineSpec
        final_spec = {"scenes": timeline_scenes}
        spec_obj = TimelineSpec(**final_spec)
        job.result_spec = spec_obj.model_dump()
        job.status = "completed"
        db.commit()

    except Exception as e:
        job.status = f"failed: {str(e)}"
        db.commit()
    finally:
        db.close()

def render_video_pipeline(job_id: str):
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job or not job.result_spec:
        db.close()
        return

    try:
        job.status = "rendering"
        db.commit()

        # Remotion necesita un JSON string como --props
        import json as _json
        spec_json = _json.dumps({"spec": job.result_spec})
        
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
        
        # Opcional: --gl=angle o --log=info si hay problemas
        # Dependiendo del OS, env=os.environ.copy() puede ser necesario
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

