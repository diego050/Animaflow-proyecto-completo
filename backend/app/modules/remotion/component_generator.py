import os
import re
from typing import Optional, Tuple, Any
from google import genai
from app.core.logging import get_logger

logger = get_logger("remotion")

from .component_postprocess import fix_interpolate_mismatch, wrap_radius_with_math_max
from ..llm.client import _call_gemini_with_retry
from ..llm.visual_spec import VisualSpecResult
from ..llm.component_strategy import (
    decide_scene_strategy,
    StandardLibraryChoice,
    CustomSceneChoice,
    AVAILABLE_COMPONENTS,
)

def _get_api_key_for_model(model_id: str, default_api_key: Optional[str] = None) -> str:
    """Helper to get the right API key based on the model"""
    from app.core.config import settings
    # For Gemini models, if default_api_key is empty or missing, fallback to settings
    if model_id.startswith("gemini"):
        return default_api_key or settings.GEMINI_API_KEY
    return default_api_key or settings.GEMINI_API_KEY


async def decide_and_generate_component(
    scene_index: int,
    visual_spec: Any,
    text: str,
    duration: float,
    job_id: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    word_timestamps: list = None,
    previous_scene_tsx: Optional[str] = None,
) -> Tuple[str, str, Optional[dict], Optional[str]]:
    """
    Decide la estrategia optima para una escena: componente existente o JSON AnimaComposer.

    El LLM evalúa el texto y media_query contra los 85+ componentes de la Standard Library.
    Si encuentra uno que cubra >=80% de lo necesario, lo usa (1-2 tokens).
    Si no, genera un JSON AnimaComposer personalizado (~200-400 tokens).

    Returns:
        (type_name, quality_status, anima_composer_json_or_None, generated_tsx_code)
    """
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        logger.warning("No API key. Defaulting to FadeText.")
        return "FadeText", "defaulted", None, None

    media_query = visual_spec.media_query if visual_spec else ""

    try:
        strategy = decide_scene_strategy(
            text=text,
            media_query=media_query,
            available_components=AVAILABLE_COMPONENTS,
            api_key=api_key,
            model=model,
        )

        if strategy.mode == "component":
            # Delegamos la generación real del código al LLM, pasando la arquitectura dorada y timestamps.
            logger.info(
                "Scene %d: Generating complex React TSX component via LLM...",
                scene_index,
                extra={"job_id": job_id},
            )
            type_name, q_status, generated_tsx = await generate_remotion_component(
                scene_index=scene_index,
                visual_spec=visual_spec,
                text=text,
                duration=duration,
                job_id=job_id,
                aspect_ratio=aspect_ratio,
                user_id=user_id,
                word_timestamps=word_timestamps,
                previous_scene_tsx=previous_scene_tsx
            )
            return type_name, q_status, None, generated_tsx

        # mode == "custom"
        logger.info(
            "Scene %d: Custom scene via AnimaComposer. Justification: %s",
            scene_index,
            strategy.justification[:120],
            extra={"job_id": job_id},
        )
        return "custom", "passed", strategy.anima_composer, None

    except Exception as e:
        logger.error(
            "Strategy decision failed for scene %d: %s. Falling back to simple component.",
            scene_index,
            str(e)[:80],
            extra={"job_id": job_id},
        )
        return "FadeText", "defaulted", None, None


async def generate_remotion_component(
    scene_index: int,
    visual_spec: Any,
    text: str,
    duration: float,
    job_id: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    word_timestamps: list = None,
    previous_scene_tsx: Optional[str] = None,
) -> Tuple[str, str, Optional[str]]:
    """Usa Gemini con System Instructions para generar código React/Remotion complejo."""
    import json
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    from app.modules.llm.resolver import resolve_llm_credentials
    from app.modules.llm.client import _send_chat_message_with_retry
    from google.genai import types

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText", "defaulted", None

    try:
        client = genai.Client(api_key=api_key)
        w, h = get_resolution(aspect_ratio)

        base_instruction = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones SVG 2D complejas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "DIRECTRICES DEL DIRECTOR DE ARTE: TEXTO VS ANIMACIÓN\n"
            "════════════════════════════════════════\n"
            "Eres el Director de Arte. Tu tarea es ensamblar la escena usando EXACTAMENTE los componentes premium de nuestra librería.\n"
            "1. NO generes etiquetas <svg>, <rect> ni uses interpolate() manualmente. USA SOLO NUESTROS COMPONENTES.\n"
            "2. REGLA DE ORO SOBRE EL TEXTO (CRÍTICO): NUNCA QUEMES TEXTO EN DURO.\n"
            "   - Está estrictamente prohibido escribir frases crudas dentro de las etiquetas (ej: MAL: <div>Loro</div>).\n"
            "   - SIEMPRE usa la variable {text} inyectada por las props.\n"
            "   - Si necesitas palabras específicas, usa JavaScript puro para extraerlas de {text} o busca la palabra en wordTimestamps.\n"
            "   - Si el texto es CORTO (< 8 palabras) e impactante → Usa componentes tipográficos grandes (TextReveal, GlitchTitle).\n"
            "   - Si el texto describe una ACCIÓN o PROCESO → Prioriza animaciones visuales (primitivas, gráficos) y usa texto de apoyo.\n"
            "3. LÍMITE DE COMPONENTES: Usa MÁXIMO 4 a 6 componentes por escena. Prioriza claridad visual sobre saturación.\n"
            "4. COMPOSICIÓN Y CONTINUIDAD: Combina primitivas inteligentemente. **CRÍTICO: Si el 'media_query' indica un cambio radical de ambiente o una transición dura (ej: glitch, wipe, blur), ESTÁS OBLIGADO a usar uno de los componentes de transición (ZoomBlurTransition, GlitchTransition, etc.) además de los componentes principales.**\n\n"
            "════════════════════════════════════════\n"
            "LA MAGIA DE LA SINCRONIZACIÓN (wordTimestamps)\n"
            "════════════════════════════════════════\n"
            "Recibes la prop 'wordTimestamps'. Úsala para disparar animaciones EXACTAMENTE en la palabra clave:\n"
            "EJEMPLO:\n"
            "  const claveFrame = wordTimestamps.find(w => w.word.toLowerCase().includes('secreto'))?.startFrame || 0;\n"
            "  <RippleEffect delay={claveFrame} x={500} y={500} />\n\n"
            "════════════════════════════════════════\n"
            "PROPS UNIVERSALES (TODOS los componentes aceptan estas)\n"
            "════════════════════════════════════════\n"
            "- color=\"#hex\" → Color principal/acento del componente\n"
            "- bgColor=\"#hex\" → Color de fondo\n"
            "- textColor=\"#hex\" → Color del texto\n"
            "- fontSize={N} → Tamaño de fuente en px\n"
            "- width={N}, height={N} → Dimensiones del componente en px\n"
            "- delay={N} → Frames de retraso antes de aparecer\n"
            "- x={N}, y={N} → Posición en pantalla (centrado)\n\n"
            "EJEMPLO: <SubscribeButton color=\"#3b82f6\" textColor=\"#ffffff\" width={400} delay={30} />\n"
            "Esto crea un botón AZUL en vez del rojo default. USA ESTOS PROPS para adaptar el estilo a la marca.\n\n"
        )
        
        component_library = (
            "════════════════════════════════════════\n"
            "LIBRERÍA DE COMPONENTES DISPONIBLES\n"
            "════════════════════════════════════════\n"
            "A) <KineticBackground />\n"
            "   Props opcionales: theme ('default', 'neon', 'dark_glow'), color1, color2\n\n"
            "B) <GridPerspective />\n"
            "   Props opcionales: color1 (líneas), color2 (fondo), speed\n"
            "   Ideal para temática retro, tecnología, programación o 'Matrix'.\n\n"
            "C) <ParticleField />\n"
            "   Props opcionales: color1 (partículas), color2 (fondo), density (int)\n"
            "   Ideal para documentales, espacio, magia, o ambientes relajantes/premium.\n\n"
            "D) <RaysOfLight />\n"
            "   Props opcionales: color1 (rayos), color2 (fondo), numRays (int)\n"
            "   Ideal para revelaciones divinas, esperanza, amaneceres o premios.\n\n"
            "E) <TextReveal />\n"
            "   Props: text, color, animation ('fade'|'blur'|'slide_up')\n\n"
            "F) <GlitchTitle />\n"
            "   Props: text, color\n"
            "   Ideal para temas tech, IA, hackers.\n\n"
            "G) <HighlightText />\n"
            "   Props: text, highlightColor\n"
            "   Un marcador neón pinta el fondo detrás del texto.\n\n"
            "H) <Typewriter />\n"
            "   Props: text, speed (frames por letra, default: 2)\n\n"
            "I) <StrikethroughText />\n"
            "   Props: text, strikeColor, strikeWidth\n"
            "   Tacha una palabra animadamente (ej: precios viejos, conceptos erróneos).\n\n"
            "J) <UnderlineReveal />\n"
            "   Props: text, underlineColor, underlineWidth\n"
            "   Subraya el texto dinámicamente de izquierda a derecha.\n\n"
            "K) <SplitText />\n"
            "   Props: topText, bottomText, revealedText, revealedColor\n"
            "   El texto se divide por la mitad para revelar un mensaje secreto detrás.\n\n"
            "L) <TextSwap />\n"
            "   Props: initialText, finalText, initialColor, finalColor\n"
            "   Efecto de máquina tragamonedas (Antes -> Después).\n\n"
            "════════════════════════════════════════\n"
            "PRIMITIVAS GEOMÉTRICAS (LEGO BLOCKS)\n"
            "════════════════════════════════════════\n"
            "Estas son tus piezas atómicas. Úsalas para construir CUALQUIER COSA combinándolas:\n\n"
            "1) <AnimatedShape />\n"
            "   Props: shape ('rect'|'circle'|'rounded-rect'|'pill'|'diamond'|'hexagon'), width, height, startX, startY, endX, endY, color, shadowColor\n"
            "   Formas geométricas básicas que se mueven de A a B. Úsalas como contenedores, fondos o acentos.\n\n"
            "2) <AnimatedLine />\n"
            "   Props: startX, startY, endX, endY, color, strokeWidth, dashStyle ('solid'|'dashed'|'dotted'), arrowHead (bool)\n"
            "   Línea que se dibuja sola. Úsala para subrayar, tachar, o conectar elementos.\n\n"
            "3) <AnimatedIcon />\n"
            "   Props: icon ('star'|'heart'|'arrow'|'check'|'cross'|'bolt'|'fire'|'rocket'|'diamond'|'crown'), animation ('bounce'|'pulse'|'spin'|'float'|'shake'), size, color, x, y\n"
            "   Iconos dinámicos. Ideales para decorar, señalar o enfatizar.\n\n"
            "4) <FloatingBadge />\n"
            "   Props: text, shape ('pill'|'rect'|'circle'), color, textColor, x, y, fontSize\n"
            "   Etiqueta flotante. Perfecta para 'NEW!', '50% OFF', 'PRO', etc.\n\n"
            "5) <AnimatedArrow />\n"
            "   Props: startX, startY, endX, endY, color, curved (bool)\n"
            "   Flecha que señala de un punto a otro. Ideal para tutoriales o anotaciones.\n\n"
            "6) <EmojiFloat />\n"
            "   Props: emoji, count, spread, x, y\n"
            "   Emite múltiples emojis que flotan hacia arriba (tipo IG Live reactions).\n\n"
            "7) <GradientOverlay />\n"
            "   Props: color1, color2, angle, opacity\n"
            "   Filtro cinematográfico o sombra direccional. Úsalo para asegurar legibilidad del texto sobre fondos caóticos.\n\n"
            "8) <TextBubble />\n"
            "   Props: text, pointerPosition ('left'|'right'|'top'|'bottom'), bgColor, textColor, x, y\n"
            "   Burbuja de chat/diálogo.\n\n"
            "9) <MediaFrame />\n"
            "   Props: url, borderRadius, borderWidth, borderColor, dropShadow (bool), objectFit ('cover'|'contain'), x, y, width, height\n"
            "   Contenedor para cargar imágenes/fotos por URL con marco estilizado y animación de escala.\n\n"
            "10) <RippleEffect />\n"
            "   Props: color, maxRadius, count, speed, x, y\n"
            "   Ondas/anillos que se expanden continuamente. Ideal para simular un radar, click o llamar la atención.\n\n"
            "11) <MaskedReveal />\n"
            "   Props: content, direction ('up'|'down'|'left'|'right'), color, bgColor, x, y, width, height\n"
            "   Efecto premium donde el contenido aparece deslizándose desde detrás de una máscara invisible.\n\n"
            "12) <ProgressPill />\n"
            "   Props: startPercent, endPercent, barColor, trackColor, duration, showLabel, x, y, width, height\n"
            "   Barra de progreso gruesa que se llena dinámicamente.\n\n"
            "13) <LottieAnimation />\n"
            "   Props: lottieUrl, loop, speed, x, y, width, height\n"
            "   Para cargar archivos Lottie (.json) cuando necesites animaciones vectoriales muy complejas.\n\n"
            "════════════════════════════════════════\n"
            "MOCKUPS B2B / UI (NUEVO BLOQUE)\n"
            "════════════════════════════════════════\n"
            "UI1) <BrowserWindow />\n"
            "   Props: text (título grande de la ventana)\n"
            "   Una ventana de navegador tipo Mac flotando en 3D. Úsala para temas de Software o Web.\n\n"
            "UI2) <SearchEngineTyping />\n"
            "   Props: text (lo que se buscará)\n"
            "   La clásica barra de Google escribiendo la consulta. Úsala para preguntas o 'cómo hacer...'\n\n"
            "UI3) <PhoneMockup />\n"
            "   Props: text (notificación o mensaje)\n"
            "   Un iPhone apareciendo desde abajo. Úsala para apps móviles, notificaciones o chats.\n\n"
            "UI4) <CursorClick />\n"
            "   Props: startX, startY, endX, endY\n"
            "   Un mouse haciendo click. Puedes combinarlo con BrowserWindow.\n\n"
            "════════════════════════════════════════\n"
            "DATA VIZ (GRÁFICOS Y MÉTRICAS)\n"
            "════════════════════════════════════════\n"
            "M) <BarChartReveal />\n"
            "   Props: color1, color2\n"
            "   Gráfico de barras que crecen. Úsalo para ventas, crecimiento, SEO.\n\n"
            "N) <TrendLine />\n"
            "   Props: color\n"
            "   Línea de tendencia que se dibuja rápido de izquierda a derecha.\n\n"
            "O) <PercentageRing />\n"
            "   Props: color, targetPercentage (int)\n"
            "   Un anillo radial que se carga hasta el targetPercentage. Úsalo para retención, éxito, eficiencia.\n\n"
            "════════════════════════════════════════\n"
            "FORMAS, NODOS Y ABSTRACTOS (ESTÉTICA TECH/IA)\n"
            "════════════════════════════════════════\n"
            "P) <NetworkNodes />\n"
            "   Props: nodeColor, lineColor\n"
            "   Puntos conectados por líneas que pulsan. Ideal para representar IAs, APIs o redes de Blockchain.\n\n"
            "Q) <AbstractWave />\n"
            "   Props: color\n"
            "   Ondas infinitas fluyendo suavemente (como Siri o frecuencias de audio).\n\n"
            "R) <FloatingBlobs />\n"
            "   Props: color1, color2\n"
            "   Formas orgánicas estilo lava-lamp fusionándose (Gooey effect). Da un toque ultra-moderno de fondo.\n\n"
            "════════════════════════════════════════\n"
            "TRANSICIONES VISUALES (EFECTOS FX)\n"
            "════════════════════════════════════════\n"
            "S) <ZoomBlurTransition />\n"
            "   Un impacto acelerado hacia la cámara (Zoom + Blur) al final de la escena para pasar a la siguiente.\n\n"
            "T) <GlitchTransition />\n"
            "   Interferencia digital agresiva estilo VHS o Hackeo. Úsalo para dar dinamismo entre escenas cortas.\n\n"
            "U) <WipeTransition />\n"
            "   Props: color\n"
            "   Un barrido sólido oblicuo a alta velocidad que limpia la pantalla. Muy usado en cine de acción o tech veloz.\n\n"
            "V) <LightLeakTransition />\n"
            "   Destellos de luz cálidos (naranja/rojo) que cruzan la pantalla. Ideal para looks de verano, lifestyle o recuerdos.\n\n"
            "════════════════════════════════════════\n"
            "VFX GLOBALES Y SOCIAL MEDIA\n"
            "════════════════════════════════════════\n"
            "W) <GlobalVFX />\n"
            "   Añade ruido de película (Film Grain), aberración cromática y curvatura de lente. Ponlo siempre al fondo de videos 'Retro' o 'Cinematográficos'.\n\n"
            "X) <SocialProgressBar />\n"
            "   Barra de progreso estilo TikTok en la parte inferior. Obligatorio para videos de formato corto (Shorts/Reels).\n\n"
            "Y) <SubscribeButton />\n"
            "   Props: color (default: #FF0000), textColor, clickedColor, text, clickedText, clickFrame (int), fontSize\n"
            "   Botón CTA totalmente configurable. Cambia a clickedColor en el clickFrame. USA color para adaptarlo a la marca del cliente (azul, verde, etc).\n\n"
            "════════════════════════════════════════\n"
            "E-COMMERCE & RETAIL (VENTAS B2C)\n"
            "════════════════════════════════════════\n"
            "Z) <ProductCardReveal />\n"
            "   Props: title, price, bgColor (default: #ffffff), priceColor (default: #10b981), textColor, fontSize, delay\n"
            "   Una tarjeta 3D elegante. Personaliza priceColor para cambiar el botón de precio (rojo para urgencia, verde para eco, morado para premium).\n\n"
            "AA) <TestimonialReview />\n"
            "    Props: author, review, rating (int 1-5), starColor (default: #fbbf24), bgColor, textColor, fontSize\n"
            "    Las 5 estrellas se pintan secuencialmente. Cambia starColor para que coincida con la marca (ej: rojo para Yelp, verde para Trustpilot).\n\n"
            "AB) <ShoppingCartBadge />\n"
            "    Props: triggerFrame (int), badgeColor (default: #ef4444), iconColor, delay\n"
            "    El carrito con un badge que salta. Cambia badgeColor para que combine con la marca.\n\n"
            "AC) <FeatureChecklist />\n"
            "    Props: itemsStr (ej: 'Envío Gratis,24H,Garantía'), checkColor (default: #10b981), textColor, fontSize, delay\n"
            "    Los checks se dibujan uno tras otro. Cambia checkColor para que sea del color de la marca.\n\n"
            "════════════════════════════════════════\n"
            "INTERFACES INTERACTIVAS (DINÁMICAS)\n"
            "════════════════════════════════════════\n"
            "AD) <TinderSwipeCard />\n"
            "    Props: name, subtitle, swipeFrame (int), bgColor, stampColor (default: #22c55e), stampText (default: 'MATCH!')\n"
            "    Tarjeta de swipe. Personaliza stampText y stampColor (ej: stampText='APPROVED' stampColor='#3b82f6' para B2B).\n\n"
            "AE) <CalendarDatePop />\n"
            "    Props: targetDate (int), month (string), circleColor (default: #ef4444), bgColor, textColor\n"
            "    Calendario donde el día clave es circulado. Cambia circleColor (azul para corporate, verde para eco).\n\n"
            "AF) <SplitScreenGrid />\n"
            "    Props: splitFrame (int)\n"
            "    Inicia cubriendo todo, y luego se divide en 4 cuadrantes estilo videollamada de Zoom.\n\n"
            "AG) <MusicPlayerUI />\n"
            "    Props: songTitle, artist, progressColor (default: #1db954), bgColor, albumColor\n"
            "    Reproductor musical. Cambia progressColor para que sea del color de la plataforma (Spotify verde, Apple rojo, etc).\n\n"
            "════════════════════════════════════════\n"
            "DEV TOOLS & TECH (SaaS B2B)\n"
            "════════════════════════════════════════\n"
            "AH) <TerminalHacker />\n"
            "    Props: lines (string separado por comas), textColor (default: #22c55e), bgColor, cursorColor, speed\n"
            "    Terminal CMD/Bash escribiendo líneas de código. Perfecto para Tech YouTube y SaaS.\n\n"
            "AI) <APIRequestFlow />\n"
            "    Props: method ('GET'|'POST'), endpoint, responseCode (int), color, bgColor\n"
            "    Flecha de API request con JSON response. Úsalo para explicar arquitecturas o integraciones.\n\n"
            "AJ) <GitCommitGraph />\n"
            "    Props: branches (int), nodeColor, mergeFrame (int)\n"
            "    Ramas que se bifurcan y fusionan. Para workflows, colaboración o branching.\n\n"
            "AK) <CodeBlockHighlight />\n"
            "    Props: code, language, highlightLine (int), accentColor\n"
            "    Bloque de código con resaltado de línea. Muestra la solución técnica a un problema.\n\n"
            "AL) <NotificationToast />\n"
            "    Props: title, message, icon\n"
            "    Push notification estilo iOS/Android. Para alertas de pago, mensajes o éxitos.\n\n"
            "AM) <LoadingSpinner />\n"
            "    Props: speed, size\n"
            "    Spinner circular animado.\n\n"
            "════════════════════════════════════════\n"
            "PODCAST & AUDIO\n"
            "════════════════════════════════════════\n"
            "AN) <AudioSpectrumBars />\n"
            "    Props: barCount, barWidth, speed\n"
            "    Barras ecualizador que saltan. Ideal para promos de podcasts o tracks musicales.\n\n"
            "AO) <PodcastGuestCard />\n"
            "    Props: name, role, glowColor\n"
            "    Card de invitado con glow pulsante. Presenta al speaker del episodio.\n\n"
            "AP) <MessageBubble />\n"
            "    Props: messages (ej: 'S:Hola;R:¿Qué tal?'), senderColor, receiverColor\n"
            "    Chat estilo iMessage. Úsalo para storytelling conversacional.\n\n"
            "AQ) <WaveformVisualizer />\n"
            "    Props: lineWidth, amplitude\n"
            "    Onda de audio continua tipo SoundCloud.\n\n"
            "AR) <QuoteBlock />\n"
            "    Props: text, author\n"
            "    Cita elegante con comillas decorativas gigantes.\n\n"
            "AS) <SoundWaveCircle />\n"
            "    Props: rings, speed\n"
            "    Círculos concéntricos pulsantes desde un centro. Efecto radar/sonar de audio.\n\n"
            "════════════════════════════════════════\n"
            "NEWS, BROADCAST & SPORTS\n"
            "════════════════════════════════════════\n"
            "AT) <LowerThird />\n"
            "    Props: name, title, color, bgColor, textColor\n"
            "    Barra inferior de presentador clásica de noticieros.\n\n"
            "AU) <BreakingNewsTicker />\n"
            "    Props: text, bgColor, speed\n"
            "    Marquee de texto corriendo (cinta de noticias inferior).\n\n"
            "AV) <VersusScreen />\n"
            "    Props: nameA, nameB, colorA, colorB\n"
            "    Pantalla dividida A vs B con línea diagonal. Ideal para comparativas.\n\n"
            "AW) <ScoreboardCounter />\n"
            "    Props: valueA, valueB, labelA, labelB, colorA, colorB\n"
            "    Marcador deportivo o empresarial que cuenta hacia arriba.\n\n"
            "AX) <BreakingNewsAlert />\n"
            "    Props: headline, bgColor, textColor\n"
            "    Banner 'ÚLTIMA HORA' pulsante en rojo intenso o color de marca.\n\n"
            "AY) <CountdownTimer />\n"
            "    Props: seconds, bgColor, textColor, color\n"
            "    Cuenta regresiva visual con anillo de progreso.\n\n"
            "════════════════════════════════════════\n"
            "ADVANCED DATA VIZ (Consultoría, Finanzas, Reportes)\n"
            "════════════════════════════════════════\n"
            "AZ) <PieChartReveal />\n"
            "    Props: values (ints por comas), colors (hex por comas), labels (textos por comas)\n"
            "    Gráfico circular con sectores que giran al entrar.\n\n"
            "BA) <StockCandlestick />\n"
            "    Props: data (H,L,O,C por comas separados por ;), upColor, downColor\n"
            "    Velas de trading animadas para Crypto/Bolsa.\n\n"
            "BB) <RadarSpiderChart />\n"
            "    Props: values (0-100 por comas), fillColor, labels (por comas), color\n"
            "    Telaraña comparativa de características (estilo RPG stats o consultoría).\n\n"
            "BC) <FunnelChart />\n"
            "    Props: values (ints por comas), colors (hex por comas), labels (por comas)\n"
            "    Embudo de conversión para ventas y marketing.\n\n"
            "BD) <HorizontalBarRace />\n"
            "    Props: items (Name:Val por comas), colors (hex por comas)\n"
            "    Barras horizontales que 'compiten' a lo largo del tiempo.\n\n"
            "BE) <CounterNumber />\n"
            "    Props: from (int), to (int), prefix, suffix, color\n"
            "    Número grande que sube fluidamente (ej: $0 → $1M+).\n\n"
            "════════════════════════════════════════\n"
            "════════════════════════════════════════\n"
            "SOCIAL MEDIA & UGC (Agencias, Creadores, Influencers)\n"
            "════════════════════════════════════════\n"
            "BF) <TweetCard />\n"
            "    Props: username, handle, content, retweets, likes, verified\n"
            "    Tarjeta de Twitter interactiva ideal para mostrar reviews o citas.\n\n"
            "BG) <InstagramPost />\n"
            "    Props: username, likes, caption, bgColor\n"
            "    Post de Instagram estético con mockup de imagen.\n\n"
            "BH) <TikTokOverlay />\n"
            "    Props: likes, comments, shares, soundName, color\n"
            "    Interfaz lateral de TikTok (corazón, comentario, share) que aparece con rebote.\n\n"
            "BI) <YouTubeEndScreen />\n"
            "    Props: title, subscribeColor\n"
            "    Pantalla final de YouTube con placeholders para siguientes videos.\n\n"
            "BJ) <FollowerCounter />\n"
            "    Props: startCount, endCount, platform (youtube|insta|tiktok), color\n"
            "    Contador masivo de seguidores que sube velozmente.\n\n"
            "BK) <SocialSharePopup />\n"
            "    Props: title, bgColor\n"
            "    Modal de 'Compartir en...' estilo iOS emergente.\n\n"
            "════════════════════════════════════════\n"
            "ADVANCED E-COMMERCE & B2C (Shopify, Dropshipping, SaaS)\n"
            "════════════════════════════════════════\n"
            "BL) <PromoCodeBanner />\n"
            "    Props: code, discount, bgColor, color\n"
            "    Cupón de descuento interactivo con borde punteado.\n\n"
            "BM) <SizeSelector />\n"
            "    Props: sizes (por comas), selectedSize, color, bgColor\n"
            "    Selector de tallas o variantes para ropa/productos.\n\n"
            "BN) <AppStoreButtons />\n"
            "    Props: showApple, showGoogle, bgColor\n"
            "    Botones de 'Descarga en App Store / Play Store'.\n\n"
            "BO) <FeatureUnlock />\n"
            "    Props: featureName, color, bgColor\n"
            "    Candado que se abre y revela una función exclusiva (SaaS/Gamification).\n\n"
            "BP) <FlashSaleTimer />\n"
            "    Props: hours, minutes, seconds, color\n"
            "    Temporizador regresivo agresivo para generar FOMO y urgencia de compra.\n\n"
            "BQ) <PricingTableReveal />\n"
            "    Props: tier1, tier2, tier3, price1, price2, price3, highlightColor\n"
            "    Tres columnas de precios donde la central (Pro) hace pop-out.\n\n"
            "════════════════════════════════════════\n"
            "- Nombre del componente exportado: SceneComponent (exacto).\n"
            "- Props recibidos: text (string), durationInFrames (number), wordTimestamps (array de {word, start, end, startFrame}).\n"
            "- DEBES importar los componentes desde '../../components/[Nombre]'. Solo importa los que uses.\n"
            "- PROHIBIDO usar <svg> crudos.\n"
            "- PROHIBIDO agregar librerías externas o Tailwind.\n\n"
        )
        
        rules_block = (
            "════════════════════════════════════════\n"
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- Nombre del componente exportado: SceneComponent (exacto).\n"
            "- Props recibidos: text (string), durationInFrames (number), wordTimestamps (array de {word, start, end, startFrame}).\n"
            "- DEBES importar los componentes desde '../../components/[Nombre]'. Solo importa los que uses.\n"
            "- PROHIBIDO usar <svg> crudos.\n"
            "- PROHIBIDO agregar librerías externas o Tailwind.\n\n"
        )
        
        golden_example = (
            "════════════════════════════════════════\n"
            "GOLDEN EXAMPLE (ESTÁNDAR DE CALIDAD REQUERIDO)\n"
            "════════════════════════════════════════\n"
            "import React from 'react';\n"
            "import { GlobalVFX } from '../../components/GlobalVFX';\n"
            "import { RaysOfLight } from '../../components/RaysOfLight';\n"
            "import { AnimatedShape } from '../../components/AnimatedShape';\n"
            "import { MaskedReveal } from '../../components/MaskedReveal';\n"
            "import { RippleEffect } from '../../components/RippleEffect';\n"
            "\n"
            "export const SceneComponent = ({ text, durationInFrames, wordTimestamps }) => {\n"
            "    const loroFrame = wordTimestamps?.find(w => w.word.toLowerCase().includes('loro'))?.startFrame || 30;\n"
            "    const menteFrame = wordTimestamps?.find(w => w.word.toLowerCase().includes('salud'))?.startFrame || 90;\n"
            "    return (\n"
            "        <div style={{ width: '100%', height: '100%', backgroundColor: '#0B2416', overflow: 'hidden', position: 'relative' }}>\n"
            "            <GlobalVFX />\n"
            "            <RaysOfLight color1=\"#FCD34D\" color2=\"#0B2416\" numRays={12} />\n"
            "            <RippleEffect color=\"#F59E0B\" maxRadius={600} count={3} speed={2} x={540} y={960} delay={loroFrame} />\n"
            "            <AnimatedShape shape=\"circle\" width={800} height={800} startX={540} startY={960} endX={540} endY={960} color=\"rgba(245, 158, 11, 0.1)\" delay={menteFrame} />\n"
            "            <MaskedReveal content={<div style={{ color: '#FCD34D', fontSize: 120, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>{text}</div>} direction=\"up\" color=\"#FCD34D\" bgColor=\"transparent\" x={540} y={960} width={900} height={600} />\n"
            "        </div>\n"
            "    );\n"
            "};\n\n"
        )
        
        if previous_scene_tsx:
            system_instruction = base_instruction + rules_block
        else:
            system_instruction = base_instruction + component_library + rules_block + golden_example

        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        
        word_timestamps_str = "[]"
        if word_timestamps:
            for wt in word_timestamps:
                if "startFrame" not in wt:
                    wt["startFrame"] = int(wt["start"] * 30)
            word_timestamps_str = json.dumps(word_timestamps)
            
        context_prompt = ""
        if previous_scene_tsx:
            context_prompt = (
                "════════════════════════════════════════\n"
                "CONTEXTO DE LA ESCENA ANTERIOR (¡MANTÉN LA COHERENCIA VISUAL!)\n"
                "════════════════════════════════════════\n"
                "Para la escena anterior generaste este código TSX:\n\n"
                f"```tsx\n{previous_scene_tsx}\n```\n\n"
                "INSTRUCCIÓN CRÍTICA: Como no te he pasado el catálogo completo de componentes, SOLO DEBES USAR los componentes que ya importaste en el código de la escena anterior (o primitivas básicas de React). "
                "Debes mantener EXACTAMENTE el mismo estilo visual para esta nueva escena. "
                "Reutiliza los mismos componentes de fondo (ej. GlobalVFX, Particles), la misma paleta de colores y el mismo estilo general. "
                "Cambia ÚNICAMENTE el texto, los tiempos (delay/duración) y ajusta la animación principal para que encaje con el nuevo texto.\n\n"
            )

        prompt = (
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f'Texto del guion: "{text}"\n'
            f'Descripción visual: "{visual_spec.media_query}"\n'
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {bg_color} · texto {txt_color}\n"
            f"Aspect ratio: {aspect_ratio} (canvas {w}x{h} píxeles)\n"
            f"wordTimestamps: {word_timestamps_str}\n\n"
            f"{context_prompt}"
            "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
        )

        response = None
        try:
            # En lugar de usar system_instruction en la config (que puede saturar al modelo),
            # usamos Context Priming: enviamos las reglas primero y esperamos un "OK".
            chat = client.aio.chats.create(model=model)
            
            warmup_prompt = system_instruction + "\n\nLee estas instrucciones cuidadosamente. Si estás listo para empezar a animar, responde ÚNICAMENTE con la palabra 'OK'."
            await _send_chat_message_with_retry(chat, warmup_prompt, max_retries=2)
            
            # Una vez el modelo está "caliente" y anclado en el contexto, enviamos la tarea
            response = await _send_chat_message_with_retry(
                chat, prompt, max_retries=3
            )
        except Exception as e:
            logger.warning("Modelo principal %s saturado o falló (%s). Usando fallback.", model, str(e))
            try:
                chat = client.aio.chats.create(model=model)
                await _send_chat_message_with_retry(chat, "Actúa como un experto en React y Remotion. Responde OK.", max_retries=1)
                response = await _send_chat_message_with_retry(
                    chat, prompt, max_retries=1
                )
            except Exception as e2:
                logger.warning(
                    "Fallback también falló (%s...). Usando componente por defecto FadeText.",
                    str(e2)[:60],
                )
                return "FadeText", "defaulted", None

        code = response.text.strip()

        if code.startswith("```tsx"):
            code = code[6:]
        elif code.startswith("```javascript"):
            code = code[13:]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
        code = code.strip()

        code = re.sub(r"\beasing\.", "Easing.", code)

        if "from 'remotion'" in code and "Easing" not in code:
            code = code.replace(
                "interpolate } from 'remotion'", "interpolate, Easing } from 'remotion'"
            )

        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code

        if "r={" in code and "Math.max" not in code:
            logger.warning("Posible valor negativo en radio SVG para escena %d", scene_index)

        code = fix_interpolate_mismatch(code)
        code = wrap_radius_with_math_max(code)

        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)
        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)
        code = re.sub(r"Math\.max\(0,\s*\{([^}]+)\)", r"Math.max(0, \1)", code)

        from app.core.config import settings
        generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
        user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
        os.makedirs(user_dir, exist_ok=True)

        file_name = f"Scene_{job_id}_{scene_index}.tsx"
        file_path = os.path.join(user_dir, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        from app.modules.remotion.scene_validator import validate_scene_tsx
        validation = validate_scene_tsx(code)
        
        if not validation["valid"]:
            error_msgs = "\n".join(validation["errors"] + validation["warnings"])
            logger.warning("Escena %d no pasó validación de calidad. Intentando curar. Errores: %s", scene_index, error_msgs)
            
            healed_code = await heal_remotion_component(user_id, job_id, scene_index, error_msgs, chat)
            if not healed_code:
                logger.error("No se pudo curar la escena %d. Usando fallback.", scene_index)
                return "FadeText", "defaulted", None
            
            return f"Scene_{job_id}_{scene_index}", "healed", healed_code

        logger.info("Componente TSX generado para escena %d -> %s (user: %s)", scene_index, file_name, user_id or 'anonymous', extra={"job_id": job_id})
        return f"Scene_{job_id}_{scene_index}", "passed", code
    except (TimeoutError, ValueError) as e:
        logger.error("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText", "defaulted", None
    except Exception as e:
        logger.exception("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText", "defaulted", None


async def heal_remotion_component(
    user_id: Optional[str],
    job_id: str,
    scene_index: int,
    error_message: str,
    chat=None,
) -> Optional[str]:
    from app.core.config import settings
    from app.modules.llm.client import _send_chat_message_with_retry

    generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
    user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
    file_name = f"Scene_{job_id}_{scene_index}.tsx"
    file_path = os.path.join(user_dir, file_name)

    if not os.path.exists(file_path):
        logger.error("No se puede curar %s porque no existe", file_path)
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        broken_code = f.read()

    prompt = (
        "El código React/Remotion que acabas de generar tiene errores técnicos o no cumple con las reglas de calidad:\n\n"
        f"ERRORES:\n{error_message}\n\n"
        "CÓDIGO ACTUAL:\n"
        "```tsx\n"
        f"{broken_code}\n"
        "```\n\n"
        "Tu tarea es arreglar estos errores y devolver el código TSX corregido. "
        "Si el error dice que faltan componentes, añade un fondo (ej: <ParticleField>) o texto (ej: <TextReveal>). "
        "Si el error dice que hay SVGs crudos, reemplázalos por <AnimatedShape> u otro componente de la librería. "
        "Asegúrate de importar los componentes correctamente desde '../../components/[Nombre]'.\n"
        "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
    )

    try:
        response = await _send_chat_message_with_retry(
            chat, prompt, max_retries=2
        )
        
        code = response.text.strip()
        if code.startswith("```tsx"): code = code[6:]
        elif code.startswith("```javascript"): code = code[13:]
        elif code.startswith("```"): code = code[3:]
        if code.endswith("```"): code = code[:-3]
        code = code.strip()
        
        code = re.sub(r"\beasing\.", "Easing.", code)
        if "from 'remotion'" in code and "Easing" not in code:
            code = code.replace("interpolate } from 'remotion'", "interpolate, Easing } from 'remotion'")
        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code
        code = fix_interpolate_mismatch(code)
        code = wrap_radius_with_math_max(code)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        logger.info("Componente curado con éxito: %s", file_name, extra={"job_id": job_id})
        return code
    except Exception as e:
        logger.exception("Error intentando curar componente: %s", str(e), extra={"job_id": job_id})
        return None
