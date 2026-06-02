# Component Catalog — Complete Reference (108 Components)

**Fecha:** 1 de Junio de 2026
**Tipo:** Component Reference
**Estado:** Completo

---

## 1. Style Components (22) — Genéricos/Reutilizables

*(Ya documentados en `video-style-system-complete.md`, referenciar aquí)*

Todos los componentes extienden `UniversalProps`:
- `x`, `y`: Posición absoluta en el canvas (default: 540, 540 para 1080p)
- `delay`: Delay en frames antes de iniciar animación (default: 0)
- `color`: Color primario del componente
- `textColor`: Color de texto
- `bgColor`: Color de fondo
- `fontSize`: Tamaño de fuente en px

---

## 2. UI Components (31) — Semi-específicos

| Componente | Props Clave | Uso |
|---|---|---|
| SubscribeButton | `text`, `clickedText`, `clickFrame`, `clickedColor` | Botón de suscripción con animación de click y cambio de estado |
| AppStoreButtons | `showApple`, `showGoogle` | Botones de descarga App Store / Google Play con spring stagger |
| BreakingNewsAlert | `headline` | Alerta visual de noticias con pulse agresivo y warning stripes |
| BreakingNewsTicker | `text`, `speed` | Ticker de noticias con marquee scroll horizontal continuo |
| CountdownTimer | `seconds` | Cuenta regresiva circular con ring SVG progress y tick pop |
| CounterNumber | `from`, `to`, `prefix`, `suffix` | Contador numérico animado con interpolación spring |
| FlashSaleTimer | `hours`, `minutes`, `seconds` | Timer de flash sale con bloques HH:MM:SS + milisegundos y pulse |
| FollowerCounter | `startCount`, `endCount`, `platform` | Contador de seguidores con label por plataforma (youtube/insta/tiktok) |
| PercentageRing | `targetPercentage`, `size` | Anillo circular de porcentaje con SVG stroke-dashoffset animado |
| ScoreboardCounter | `valueA`, `valueB`, `labelA`, `labelB`, `colorA`, `colorB` | Marcador deportivo dual con counting animation |
| NotificationToast | `title`, `message`, `icon` | Notificación toast con drop-in desde arriba y blur backdrop |
| MessageBubble | `messages` (semicolon-separated, `S:`/`R:` prefix), `senderColor`, `receiverColor` | Burbujas de chat con stagger per-message y alignment |
| TextBubble | `text`, `pointerPosition` (left/right/top/bottom), `shadow` | Burbuja de texto con pointer triangle configurable |
| QuoteBlock | `text`, `author` | Cita con author, decorative quote mark y border-left accent |
| LowerThird | `name`, `title` | Lower third con width reveal animation y vertical accent bar |
| PromoCodeBanner | `code`, `discount` | Banner de código promo con wiggle effect y dashed separator |
| FeatureChecklist | `itemsStr` (comma-separated), `checkColor` | Lista de features con checkmark SVG draw animation staggered |
| FeatureUnlock | `featureName` | Animación de padlock unlock con shackle rotation y text reveal |
| ProgressPill | `startPercent`, `endPercent`, `barColor`, `trackColor`, `duration`, `showLabel`, `width`, `height` | Barra de progreso pill-shaped con label percentage |
| LoadingSpinner | `speed`, `size` | Spinner circular SVG con rotation continua y fade-in |
| SizeSelector | `sizes` (comma-separated), `selectedSize` | Selector de tallas circular con pop-in stagger y select highlight |
| ShoppingCartBadge | `triggerFrame`, `badgeColor`, `iconColor` | Icono de carrito con badge numerado que aparece en triggerFrame |
| SocialProgressBar | `heightPx` | Barra de progreso horizontal que spannea todo el video (video config duration) |
| SocialSharePopup | `title` | Popup de share social con slide-up drawer y app icons (Copy/WhatsApp/Twitter/Email) |
| FloatingBadge | `text`, `shape` (pill/rect/circle), `borderWidth`, `shadow` | Badge flotante con hover oscillation sinusoidal |
| CalendarDatePop | `targetDate`, `month`, `circleColor` | Calendario mensual con circle draw SVG en fecha target |
| PodcastGuestCard | `name`, `role`, `glowColor` | Card de invitado podcast con avatar placeholder y pulsing glow |
| TestimonialReview | `author`, `review`, `rating`, `starColor` | Testimonio con estrellas staggered reveal y rating |
| MediaFrame | `url`, `borderRadius`, `borderWidth`, `borderColor`, `dropShadow`, `objectFit`, `width`, `height` | Frame de imagen/media con scale entrance y configurable styling |
| BrowserWindow | `text`, `width`, `height` | Mockup de navegador con traffic light dots y scale bounce |
| PhoneMockup | `text` | Mockup de teléfono con notch (Dynamic Island) y slide-up entrance |

---

## 3. Chart Components (12) — Visualización de Datos

| Componente | Props Clave | Uso |
|---|---|---|
| BarChartReveal | `data` (number[]), `color1`, `color2`, `width`, `height` | Barras verticales con gradient y staggered spring reveal |
| PieChartReveal | `values` (comma-separated), `colors`, `labels` | Donut chart con conic-gradient sweep y legend staggered |
| FunnelChart | `values`, `colors`, `labels` | Embudo de conversión con trapezoid SVG y width proportional |
| HorizontalBarRace | `items` (Name:value comma-separated), `colors`, `speed` | Carrera de barras horizontales con label y value display |
| RadarSpiderChart | `values` (comma-separated 0-100), `fillColor`, `labels` | Radar/spider chart SVG con web rings, spokes y data polygon |
| StockCandlestick | `data` (H,L,O,C semicolon-separated), `upColor`, `downColor` | Gráfico de velas japonesas con wick + body y staggered draw |
| GitCommitGraph | `commits`, `branch` | Gráfico de actividad de commits estilo GitHub contributions |
| TrendLine | `data`, `direction` | Línea de tendencia con animación de dibujo progresivo |
| AudioSpectrumBars | `data`, `bars` | Barras de espectro de audio con altura variable por frecuencia |
| SoundWaveCircle | `data`, `radius` | Visualización circular de onda de sonido con barras radiales |
| WaveformVisualizer | `data`, `bars` | Visualizador de waveform con barras verticales animadas |
| NetworkNodes | `nodes`, `edges` | Gráfico de red/nodos con conexiones SVG y particle flow |

---

## 4. Text Effects (13) — Efectos de Texto

| Componente | Props Clave | Uso |
|---|---|---|
| Typewriter | `text`, `speed` (frames per char), `width`, `durationInFrames` | Efecto máquina de escribir con blinking cursor y dynamic speed |
| TextReveal | `text`, `animation` (fade/blur/slide_up), `glowIntensity`, `width` | Revelación palabra por palabra con stagger y text shadow glow |
| TextSwap | `initialText`, `finalText`, `initialColor`, `finalColor` | Intercambio de textos tipo slot machine con slide/fade |
| SplitText | `topText`, `bottomText`, `revealedText`, `revealedColor` | Texto dividido que se separa para revelar mensaje interior |
| GlitchTitle | `text`, `width` | Título con glitch effect (red/cyan channel offset + clipPath) |
| StrikethroughText | `text` | Texto tachado con línea animada que cruza el texto |
| UnderlineReveal | `text` | Subrayado que se revela progresivamente bajo el texto |
| HighlightText | `text`, `highlight` | Texto con porción resaltada (background highlight) |
| SearchEngineTyping | `query`, `results` | Simulación de búsqueda con typing y resultados apareciendo |
| EmojiFloat | `emoji`, `count` | Emojis flotando hacia arriba con random speed/size/opacity |
| CursorClick | `x`, `y`, `clicks` | Cursor con animación de clicks en posición específica |
| AnimatedArrow | `direction`, `color` | Flecha animada con movimiento direccional |
| AnimatedLine | `points`, `color` | Línea animada que se dibuja punto a punto |

---

## 5. Transitions (5) — Transiciones entre Escenas

| Componente | Props Clave | Uso |
|---|---|---|
| GlitchTransition | `intensity`, `durationFrames`, `triggerFrame` | Transición glitch con invert/hue-rotate y bloques de color |
| ZoomBlurTransition | `durationFrames`, `triggerFrame` | Transición zoom blur con scale 1→3 y blur exponencial |
| WipeTransition | `color`, `durationFrames`, `triggerFrame` | Transición wipe diagonal (rotated rectangle sweep) |
| LightLeakTransition | `durationFrames`, `triggerFrame`, `colorPrimary`, `colorSecondary`, `intensity` | Transición light leak con blur blobs y screen blend mode |
| GradientOverlay | `color1`, `color2`, `angle`, `opacity` | Overlay de gradiente con fade-in progresivo |

---

## 6. Backgrounds & VFX (11) — Fondos y Efectos Visuales

| Componente | Props Clave | Uso |
|---|---|---|
| KineticBackground | `color1`, `color2`, `theme` (default/neon/dark_glow) | Fondo de gradiente animado con angle shift continuo |
| FloatingBlobs | `color1`, `color2`, `width`, `height` | Blobs flotantes con gooey SVG filter (blur + contrast matrix) |
| ParticleField | `color1`, `color2`, `density` | Campo de partículas con upward movement y wrap-around |
| RaysOfLight | `count`, `angle` | Rayos de luz con rotation y opacity pulsante |
| RippleEffect | `x`, `y`, `count` | Efecto ripple circular expandiéndose desde punto central |
| AbstractWave | `waves`, `colors` | Onda abstracta SVG con múltiples capas sinusoidales |
| GlobalVFX | `intensity`, `withLensCurve` | Efecto VFX global: film grain noise + lens curve/vignette + chromatic aberration |
| GridPerspective | `rows`, `cols` | Perspectiva de grid con vanishing point y líneas convergentes |
| MaskedReveal | `mask`, `direction` | Revelación con máscara que descubre contenido progresivamente |
| SplitScreenGrid | `cols`, `rows` | Grid de pantalla dividida con celdas animadas individualmente |
| RaysOfLight | `count`, `angle`, `color` | Rayos de luz volumétrica con rotation y fade |

---

## 7. Social Media (7) — Overlays de Redes Sociales

| Componente | Props Clave | Uso |
|---|---|---|
| TikTokOverlay | `likes`, `comments`, `shares`, `soundName` | Overlay de TikTok con sidebar de iconos y sound name |
| InstagramPost | `username`, `likes`, `caption` | Mockup de post de Instagram con header, image area y actions |
| TweetCard | `username`, `handle`, `content`, `retweets`, `likes`, `verified` | Tweet card con avatar, verified badge y engagement stats |
| YouTubeEndScreen | `title`, `subscribeColor` | End screen de YouTube con video slots y subscribe button |
| TinderSwipeCard | `name`, `age`, `bio` | Card de Tinder con foto, info y swipe animation |
| MusicPlayerUI | `title`, `artist`, `progress` | UI de reproductor de música con barra de progreso y controls |
| TerminalHacker | `lines`, `speed` | Terminal estilo hacker con líneas de código apareciendo |

---

## 8. Misc (8) — Varios

| Componente | Props Clave | Uso |
|---|---|---|
| AnimatedShape | `shape` (rect/circle/rounded-rect/pill/diamond/hexagon), `width`, `height`, `startX`, `endX`, `startY`, `endY`, `shadowColor`, `shadowBlur`, `rotation` | Forma animada con movimiento interpolado y múltiples shape types |
| AnimatedIcon | `icon` (star/heart/arrow/check/cross/bolt/fire/rocket/diamond/crown), `animation` (bounce/pulse/spin/float/shake), `size` | Icono SVG con entrance spring + continuous animation loop |
| IconifyIcon | `name`, `size`, `color` | Icono de Iconify library con configurable size y color |
| CodeBlockHighlight | `code`, `language`, `highlightLine`, `accentColor` | Bloque de código con syntax header, line numbers y highlight line reveal |
| PricingTableReveal | `tier1`, `tier2`, `tier3`, `price1`, `price2`, `price3`, `highlightColor` | Tabla de precios 3-tier con center highlight y staggered scale |
| ProductCardReveal | `name`, `price`, `image` | Card de producto con reveal animation y pricing |
| VersusScreen | `nameA`, `nameB`, `colorA`, `colorB` | Pantalla versus con split diagonal clip-path y VS badge central |
| APIRequestFlow | `endpoint`, `method`, `response` | Visualización de flujo de API request con nodos y conexiones |

---

## Convenciones de Props

### UniversalProps (todos los componentes)
```typescript
interface UniversalProps {
  x?: number;           // Posición X (default: 540 para 1080p)
  y?: number;           // Posición Y (default: 540 para 1080p)
  delay?: number;       // Delay en frames (default: 0)
  color?: string;       // Color primario
  textColor?: string;   // Color de texto
  bgColor?: string;     // Color de fondo
  fontSize?: number;    // Tamaño de fuente en px
}
```

### Patrones Comunes

**String arrays como comma-separated:**
- `values="40,35,25"` → se parsea con `.split(',').map(Number)`
- `items="Name1:100,Name2:80"` → se parsea con `.split(',').map(item => item.split(':'))`
- `messages="S:Hello;R:Hi"` → se parsea con `.split(';')` y prefix `S:`/`R:`

**Animación pattern estándar:**
```typescript
const frame = useCurrentFrame();
const adjustedFrame = Math.max(0, frame - delay);
const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
```

**Staggered animations:**
```typescript
items.map((item, idx) => {
  const itemFrame = Math.max(0, adjustedFrame - (idx * 5));
  const progress = spring({ frame: itemFrame, fps, config: { damping: 14 } });
});
```

**Posicionamiento:**
```typescript
style={{
  position: 'absolute',
  top: `${y}px`,
  left: `${x}px`,
  transform: 'translate(-50%, -50%)',
}}
```

### Config de Spring Más Usadas
| Config | Uso |
|---|---|
| `{ damping: 14 }` | Entrance estándar (más común) |
| `{ damping: 12, mass: 0.8 }` | Pop rápido y ligero |
| `{ damping: 10, mass: 1.2 }` | Pop con más overshoot |
| `{ damping: 20, mass: 2 }` | Counting animation suave |
| `{ damping: 10, stiffness: 300 }` | Violent pop (BreakingNews) |

### Resolución Target
- **1080p:** 1080x1920 (vertical/video) o 1920x1080 (horizontal)
- **Centro default:** x=540, y=540 para 1080x1080 square
- **Z-index ranges:** 0-5 (backgrounds), 10-40 (content), 50-80 (UI overlays), 90-999 (transitions/VFX)
