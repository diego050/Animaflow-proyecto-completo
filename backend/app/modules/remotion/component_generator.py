import os
import re
from typing import Optional, Tuple, Any
from google import genai
from app.core.logging import get_logger

logger = get_logger("remotion")

from .component_postprocess import fix_interpolate_mismatch, wrap_radius_with_math_max
from ..llm.client import _call_gemini_with_retry
from ..llm.visual_spec import VisualSpecResult

def _get_api_key_for_model(model_id: str, default_api_key: Optional[str] = None) -> str:
    """Helper to get the right API key based on the model"""
    from app.core.config import settings
    # For Gemini models, if default_api_key is empty or missing, fallback to settings
    if model_id.startswith("gemini"):
        return default_api_key or settings.GEMINI_API_KEY
    return default_api_key or settings.GEMINI_API_KEY


async def generate_remotion_component(
    scene_index: int,
    visual_spec: Any,
    text: str,
    duration: float,
    job_id: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
) -> Tuple[str, str]:
    """Usa Gemini para generar el código React/Remotion dinámico para una escena."""
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText", "defaulted"

    try:
        client = genai.Client(api_key=api_key)
        w, h = get_resolution(aspect_ratio)

        prompt_header = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones SVG 2D complejas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f'Texto del guion: "{text}"\n'
            f'Descripción visual: "{visual_spec.media_query}"\n'
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {visual_spec.backgroundColor} · texto {visual_spec.textColor}\n"
            f"Aspect ratio: {aspect_ratio} (canvas {w}x{h} píxeles)\n\n"
            "════════════════════════════════════════\n"
            "DIRECTRICES DEL DIRECTOR DE ARTE: TEXTO VS ANIMACIÓN\n"
            "════════════════════════════════════════\n"
            "Eres el Director de Arte. Tu tarea es ensamblar la escena usando EXACTAMENTE los componentes premium de nuestra librería.\n"
            "1. NO generes etiquetas <svg>, <rect> ni uses interpolate() manualmente. USA SOLO NUESTROS COMPONENTES.\n"
            "2. REGLA DE ORO SOBRE EL TEXTO (CRÍTICO):\n"
            "   - Si el texto es CORTO (< 8 palabras) e impactante → Usa componentes tipográficos grandes (TextReveal, GlitchTitle).\n"
            "   - Si el texto es una PREGUNTA o PROBLEMA → Usa SearchEngineTyping o TextBubble.\n"
            "   - Si el texto describe una ACCIÓN o PROCESO → Prioriza animaciones visuales (primitivas, gráficos) y usa texto de apoyo.\n"
            "   - Si el texto menciona NÚMEROS/DATOS → Usa Data Viz (CounterNumber, BarChartReveal) y minimiza el texto literal.\n"
            "   - Si es una TRANSICIÓN entre ideas (ej: 'pero', 'entonces') → Usa SOLO una transición visual SIN texto visible.\n"
            "   - NUNCA transcribas literalmente todo el guion a texto visible. El narrador ya lo dice.\n"
            "3. LÍMITE DE COMPONENTES: Usa MÁXIMO 4 a 6 componentes por escena. Prioriza claridad visual sobre saturación.\n"
            "4. COMPOSICIÓN: Combina primitivas inteligentemente. (Ej: <AnimatedShape> como fondo + <AnimatedIcon> encima).\n\n"
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
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- Nombre del componente exportado: SceneComponent (exacto).\n"
            "- Props recibidos: text (string), durationInFrames (number).\n"
            "- DEBES importar los componentes desde '../../components/[Nombre]'. Solo importa los que uses.\n"
            "- Sigue las 'DIRECTRICES DEL DIRECTOR DE ARTE' para decidir la composición tipográfica (0, 1 o más componentes de texto combinados).\n"
            "- PROHIBIDO usar <svg> crudos.\n"
            "- PROHIBIDO agregar librerías externas o Tailwind.\n\n"
            "ESTRUCTURA BASE (REEMPLAZA LOS COLORES Y ESTILOS SEGÚN EL MEDIA_QUERY):\n"
        )

        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        prompt_code = (
            "import React from 'react';\n"
            "// Importa los componentes que hayas elegido\n"
            "import { ParticleField } from '../../components/ParticleField';\n"
            "import { SplitText } from '../../components/SplitText';\n\n"
            "export const SceneComponent = ({ text, durationInFrames }) => {\n"
            "    // Analiza el media_query y configura los colores adecuadamente.\n"
            "    return (\n"
            f"        <div style={{{{ width: '100%', height: '100%', backgroundColor: '{bg_color}', overflow: 'hidden' }}}}>\n"
            f"            <ParticleField color1=\"{txt_color}\" color2=\"{bg_color}\" density={{50}} />\n"
            f"            <SplitText topText=\"ANIMATION\" bottomText=\"SYSTEM\" revealedText={{text}} color=\"{txt_color}\" revealedColor=\"#10b981\" fontSize={{80}} x={{{w // 2}}} y={{{h // 2}}} delay={{15}} />\n"
            "        </div>\n"
            "    );\n"
            "};\n\n"
            "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
        )

        prompt = prompt_header + prompt_code

        # Intentar con modelo principal con retry automático
        response = None
        try:
            response = await _call_gemini_with_retry(
                client, prompt, max_retries=3, model=model
            )
        except Exception as e:
            # Fallback to secondary model if primary fails
            logger.warning("Modelo principal %s saturado. Usando fallback.", model)
            try:
                response = await _call_gemini_with_retry(
                    client, prompt, max_retries=1, model=model
                )
            except Exception as e2:
                logger.warning(
                    "Fallback también falló (%s...). Usando componente por defecto FadeText.",
                    str(e2)[:60],
                )
                return "FadeText", "defaulted"

        code = response.text.strip()

        # Limpieza básica por si el LLM incluye bloques markdown
        if code.startswith("```tsx"):
            code = code[6:]
        elif code.startswith("```javascript"):
            code = code[13:]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
        code = code.strip()

        # Post-procesamiento para evitar errores comunes en TSX generado
        # 1. Corregir 'easing.' (minúscula) a 'Easing.' (mayúscula)
        code = re.sub(r"\beasing\.", "Easing.", code)

        # 2. Asegurar que Easing está en el import de remotion
        if "from 'remotion'" in code and "Easing" not in code:
            code = code.replace(
                "interpolate } from 'remotion'", "interpolate, Easing } from 'remotion'"
            )

        # 3. Asegurar que React está importado
        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code

        # 4. Validar que no haya valores negativos en atributos SVG
        if "r={" in code and "Math.max" not in code:
            logger.warning("Posible valor negativo en radio SVG para escena %d", scene_index)

        # 5. Corregir mismatches en interpolate()
        code = fix_interpolate_mismatch(code)

        # 6. Envolver TODOS los r={{}} con Math.max(0, ...) si no lo tienen ya
        code = wrap_radius_with_math_max(code)

        # 7. Fix double-brace Math.max errors
        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)
        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)

        # 8. Fix unbalanced parentheses in Math.max
        code = re.sub(r"Math\.max\(0,\s*\{([^}]+)\)", r"Math.max(0, \1)", code)

        # Guardar archivo físicamente en subdirectorio por usuario
        from app.core.config import settings
        generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
        user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
        os.makedirs(user_dir, exist_ok=True)

        file_name = f"Scene_{job_id}_{scene_index}.tsx"
        file_path = os.path.join(user_dir, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        # 9. Validar calidad de la escena generada
        from app.modules.remotion.scene_validator import validate_scene_tsx
        validation = validate_scene_tsx(code)
        
        if not validation["valid"]:
            error_msgs = "\n".join(validation["errors"] + validation["warnings"])
            logger.warning("Escena %d no pasó validación de calidad. Intentando curar. Errores: %s", scene_index, error_msgs)
            
            # Intentar curarlo (escribirá encima del archivo si tiene éxito)
            healed = await heal_remotion_component(user_id, job_id, scene_index, error_msgs)
            if not healed:
                logger.error("No se pudo curar la escena %d. Usando fallback.", scene_index)
                return "FadeText", "defaulted"
            
            return f"Scene_{job_id}_{scene_index}", "healed"

        logger.info("Componente TSX generado para escena %d -> %s (user: %s)", scene_index, file_name, user_id or 'anonymous', extra={"job_id": job_id})
        return f"Scene_{job_id}_{scene_index}", "passed"
    except (TimeoutError, ValueError) as e:
        logger.error("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText", "defaulted"
    except Exception as e:
        # Fallback: return default component on any unexpected error
        logger.exception("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText", "defaulted"


async def heal_remotion_component(
    user_id: Optional[str],
    job_id: str,
    scene_index: int,
    error_message: str,
) -> bool:
    """Intenta curar un componente TSX que falló al compilar."""
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        return False

    # Leer el código actual
    generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
    user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
    file_name = f"Scene_{job_id}_{scene_index}.tsx"
    file_path = os.path.join(user_dir, file_name)

    if not os.path.exists(file_path):
        logger.error("No se puede curar %s porque no existe", file_path)
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        broken_code = f.read()

    prompt = (
        "El siguiente código React/Remotion tiene errores técnicos o no cumple con las reglas de calidad:\n\n"
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
        client = genai.Client(api_key=api_key)
        response = await _call_gemini_with_retry(
            client, prompt, max_retries=2, model=model
        )
        
        code = response.text.strip()
        if code.startswith("```tsx"): code = code[6:]
        elif code.startswith("```javascript"): code = code[13:]
        elif code.startswith("```"): code = code[3:]
        if code.endswith("```"): code = code[:-3]
        code = code.strip()
        
        # Post-procesamiento
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
        return True
    except Exception as e:
        logger.error("Fallo la curación de %s: %s", file_name, e, extra={"job_id": job_id})
        return False
