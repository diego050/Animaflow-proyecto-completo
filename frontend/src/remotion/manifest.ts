/**
 * Component Manifest — Single source of truth for all 111 AnimaFlow components.
 *
 * This manifest replaces the duplicated sources of truth:
 * - TypeScript interfaces (component files)
 * - sanitizeProps whitelist
 * - Pydantic enum (backend)
 * - LLM prompt component list
 * - DB seed data
 *
 * Each entry describes a component's props, category, role, and defaults.
 */

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type PropType =
  | 'string'
  | 'number'
  | 'color'
  | 'boolean'
  | 'select'
  | 'text-long'
  | 'icon'
  | 'list';

export interface PropDefinition {
  name: string;
  type: PropType;
  label: string;
  description: string;
  defaultValue?: string | number | boolean | (string | number)[];
  options?: string[];
  min?: number;
  max?: number;
}

export interface ComponentManifestEntry {
  name: string;
  category: string;
  role: string;
  description: string;
  props: PropDefinition[];
}

// ---------------------------------------------------------------------------
// Universal Props (applied to ALL components via UniversalProps)
// ---------------------------------------------------------------------------

export const UNIVERSAL_PROPS = new Set([
  'x', 'y', 'color', 'bgColor', 'textColor', 'fontSize', 'width', 'height', 'delay',
  'type', 'componentName', 'zIndex', 'filter', 'style',
  'scale', 'rotation', 'opacity',
  'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
]);

// ---------------------------------------------------------------------------
// Component Manifest Data
// ---------------------------------------------------------------------------

export const COMPONENT_MANIFEST: ComponentManifestEntry[] = [
  // ========================================================================
  // TEXT COMPONENTS
  // ========================================================================
  {
    name: 'Typewriter',
    category: 'Text',
    role: 'text',
    description: 'Typewriter effect that reveals text character by character, optionally synced to word timestamps.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'The text to type out' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Characters per frame (lower = slower)', defaultValue: 2, min: 1, max: 10 },
      { name: 'durationInFrames', type: 'number', label: 'Duration (frames)', description: 'Total frames for typing animation' },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for karaoke sync' },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight', defaultValue: 900 },
    ],
  },
  {
    name: 'TextReveal',
    category: 'Text',
    role: 'text',
    description: 'Word-by-word reveal animation with fade, blur, or slide-up effects.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'The text to reveal' },
      { name: 'animation', type: 'select', label: 'Animation', description: 'Reveal animation type', defaultValue: 'slide_up', options: ['fade', 'blur', 'slide_up'] },
      { name: 'glowIntensity', type: 'number', label: 'Glow Intensity', description: 'Text glow effect intensity (0-1)', defaultValue: 0.5, min: 0, max: 1 },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for karaoke sync' },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight', defaultValue: 900 },
    ],
  },
  {
    name: 'StyleTextBlock',
    category: 'Text',
    role: 'text',
    description: 'Versatile text block with heading, body, caption, and quote variants.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'The text content' },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Text style variant', defaultValue: 'heading', options: ['heading', 'body', 'caption', 'quote'] },
      { name: 'align', type: 'select', label: 'Alignment', description: 'Text alignment', defaultValue: 'center', options: ['left', 'center', 'right'] },
      { name: 'maxLines', type: 'number', label: 'Max Lines', description: 'Maximum number of lines before truncation' },
      { name: 'truncate', type: 'boolean', label: 'Truncate', description: 'Con Max Lines: true recorta con "…"; false deja fluir/envolver', defaultValue: true },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight override' },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for karaoke sync' },
    ],
  },
  {
    name: 'StyleScrambleText',
    category: 'Text',
    role: 'text',
    description: 'Hacker-style text scramble that decodes characters over time.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'The text to scramble/decode' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Decode speed (chars per frame)', defaultValue: 2, min: 1, max: 10 },
      { name: 'characters', type: 'string', label: 'Scramble Characters', description: 'Character set for scramble effect', defaultValue: '#$%&@!?*+=^~01' },
      { name: 'loop', type: 'boolean', label: 'Loop', description: 'Whether to loop the scramble effect', defaultValue: false },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight', defaultValue: 700 },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for karaoke sync' },
    ],
  },
  {
    name: 'WordHighlight',
    category: 'Text',
    role: 'text',
    description: 'Karaoke-style subtitle that highlights the currently spoken word.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'The full text to display' },
      { name: 'highlightColor', type: 'color', label: 'Highlight Color', description: 'Color for the active word', defaultValue: '#fbbf24' },
      { name: 'activeScale', type: 'number', label: 'Active Scale', description: 'Scale factor for the active word (1 = no pop)', defaultValue: 1.18, min: 1, max: 2 },
      { name: 'dimUpcoming', type: 'boolean', label: 'Dim Upcoming', description: 'Dim words not yet spoken', defaultValue: true },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight', defaultValue: 900 },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for karaoke sync' },
    ],
  },
  {
    name: 'SplitText',
    category: 'Text',
    role: 'text',
    description: 'Text that splits apart to reveal hidden content between top and bottom halves.',
    props: [
      { name: 'topText', type: 'string', label: 'Top Text', description: 'Text shown in the top half', defaultValue: 'SECRET' },
      { name: 'bottomText', type: 'string', label: 'Bottom Text', description: 'Text shown in the bottom half', defaultValue: 'MESSAGE' },
      { name: 'revealedText', type: 'string', label: 'Revealed Text', description: 'Text revealed when split opens', defaultValue: 'UNLOCKED' },
      { name: 'revealedColor', type: 'color', label: 'Revealed Color', description: 'Color of the revealed text', defaultValue: '#10b981' },
    ],
  },
  {
    name: 'TextSwap',
    category: 'Text',
    role: 'text',
    description: 'Slot-machine style text swap from initial to final text.',
    props: [
      { name: 'initialText', type: 'string', label: 'Initial Text', description: 'Text shown before swap', defaultValue: 'BEFORE' },
      { name: 'finalText', type: 'string', label: 'Final Text', description: 'Text shown after swap', defaultValue: 'AFTER' },
      { name: 'initialColor', type: 'color', label: 'Initial Color', description: 'Color of initial text', defaultValue: '#ef4444' },
      { name: 'finalColor', type: 'color', label: 'Final Color', description: 'Color of final text', defaultValue: '#10b981' },
    ],
  },
  {
    name: 'GlitchTitle',
    category: 'Text',
    role: 'text',
    description: 'Title with glitch effect using RGB channel separation and clip paths.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'The title text' },
    ],
  },
  {
    name: 'GradientText',
    category: 'Text',
    role: 'text',
    description: 'Text filled with an animated (shimmering) color gradient. Modern, eye-catching headline style.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'The text', defaultValue: 'Texto degradado' },
      { name: 'colors', type: 'list', label: 'Colors', description: 'Gradient colors (2-4)', defaultValue: ['#00FFAB', '#38bdf8', '#a855f7'] },
      { name: 'angle', type: 'number', label: 'Angle', description: 'Gradient angle (deg)', defaultValue: 100, min: 0, max: 360 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Shimmer speed (0 = static)', defaultValue: 1, min: 0, max: 4 },
      { name: 'fontWeight', type: 'number', label: 'Font Weight', description: 'Font weight', defaultValue: 900, min: 100, max: 900 },
    ],
  },
  {
    name: 'StrikethroughText',
    category: 'Text',
    role: 'text',
    description: 'Text with an animated strikethrough line that appears after the text.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'The text to strikethrough', defaultValue: 'Strikethrough' },
      { name: 'strikeColor', type: 'color', label: 'Strike Color', description: 'Color of the strikethrough line', defaultValue: '#ef4444' },
      { name: 'strikeWidth', type: 'number', label: 'Strike Width', description: 'Thickness of the strikethrough line', defaultValue: 8, min: 2, max: 20 },
    ],
  },
  {
    name: 'UnderlineReveal',
    category: 'Text',
    role: 'text',
    description: 'Text with an animated underline that draws in from left to right.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'The text to underline', defaultValue: 'Underline' },
      { name: 'underlineColor', type: 'color', label: 'Underline Color', description: 'Color of the underline', defaultValue: '#3b82f6' },
      { name: 'underlineWidth', type: 'number', label: 'Underline Width', description: 'Thickness of the underline', defaultValue: 6, min: 2, max: 20 },
    ],
  },
  {
    name: 'HighlightText',
    category: 'Text',
    role: 'text',
    description: 'Text with a highlighter effect that sweeps across from left to right.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'The text to highlight' },
      { name: 'highlightColor', type: 'color', label: 'Highlight Color', description: 'Color of the highlight', defaultValue: '#eab308' },
    ],
  },

  // ========================================================================
  // ICON COMPONENTS
  // ========================================================================
  {
    name: 'IconifyIcon',
    category: 'UI',
    role: 'ui',
    description: 'Renders an Iconify icon by name (e.g., "mdi:heart"). Supports entry/exit animations.',
    props: [
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Iconify icon name (prefix:name format)' },
      { name: 'size', type: 'number', label: 'Size', description: 'Icon size in pixels', defaultValue: 120, min: 16, max: 500 },
      { name: 'entry', type: 'select', label: 'Entry Animation', description: 'Entry animation type', options: ['fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale-in', 'spring-in', 'bounce-in'] },
      { name: 'exit', type: 'select', label: 'Exit Animation', description: 'Exit animation type', options: ['fade-out', 'slide-up-out', 'slide-down-out', 'slide-left-out', 'slide-right-out', 'scale-out', 'spring-out', 'bounce-out'] },
      { name: 'entryDelay', type: 'number', label: 'Entry Delay (s)', description: 'Delay before entry animation starts', defaultValue: 0 },
      { name: 'entryDuration', type: 'number', label: 'Entry Duration (frames)', description: 'Duration of entry animation', defaultValue: 30 },
      { name: 'exitDuration', type: 'number', label: 'Exit Duration (frames)', description: 'Duration of exit animation', defaultValue: 30 },
    ],
  },
  {
    name: 'AnimatedIcon',
    category: 'UI',
    role: 'ui',
    description: 'Animated SVG icon with bounce, pulse, spin, float, or shake animations.',
    props: [
      { name: 'icon', type: 'select', label: 'Icon', description: 'Icon type', defaultValue: 'star', options: ['star', 'heart', 'arrow', 'check', 'cross', 'bolt', 'fire', 'rocket', 'diamond', 'crown'] },
      { name: 'animation', type: 'select', label: 'Animation', description: 'Continuous animation type', defaultValue: 'bounce', options: ['bounce', 'pulse', 'spin', 'float', 'shake'] },
      { name: 'size', type: 'number', label: 'Size', description: 'Icon size in pixels', defaultValue: 120, min: 16, max: 500 },
    ],
  },
  {
    name: 'KeywordPop',
    category: 'UI',
    role: 'ui',
    description: 'Icon that pops in when a specific trigger word is spoken (synced to audio timestamps).',
    props: [
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Iconify icon name (prefix:name format)' },
      { name: 'triggerWord', type: 'string', label: 'Trigger Word', description: 'Word that triggers the icon appearance' },
      { name: 'size', type: 'number', label: 'Size', description: 'Icon size in pixels', defaultValue: 160, min: 16, max: 500 },
      { name: 'wordTimestamps', type: 'list', label: 'Word Timestamps', description: 'Array of word timing objects for sync' },
    ],
  },

  // ========================================================================
  // BACKGROUND COMPONENTS
  // ========================================================================
  {
    name: 'KineticBackground',
    category: 'Background',
    role: 'background',
    description: 'Animated gradient background with slow shifting colors.',
    props: [
      { name: 'color1', type: 'color', label: 'Color 1', description: 'Primary gradient color', defaultValue: '#0f172a' },
      { name: 'color2', type: 'color', label: 'Color 2', description: 'Secondary gradient color', defaultValue: '#312e81' },
      { name: 'theme', type: 'select', label: 'Theme', description: 'Preset color theme', defaultValue: 'default', options: ['default', 'neon', 'dark_glow'] },
    ],
  },
  {
    name: 'ParticleField',
    category: 'Background',
    role: 'background',
    description: 'Floating particle field with configurable density and colors.',
    props: [
      { name: 'color1', type: 'color', label: 'Particle Color', description: 'Color of the particles', defaultValue: '#ffffff' },
      { name: 'color2', type: 'color', label: 'Background Color', description: 'Background color', defaultValue: '#0f172a' },
      { name: 'density', type: 'number', label: 'Density', description: 'Number of particles', defaultValue: 50, min: 10, max: 200 },
    ],
  },
  {
    name: 'FloatingBlobs',
    category: 'Background',
    role: 'background',
    description: 'Fondo ambiental de glows de color suaves y difusos. Opacidad vía Universal Props.',
    props: [
      { name: 'color1', type: 'color', label: 'Color 1', description: 'Color del primer glow', defaultValue: '#f43f5e' },
      { name: 'color2', type: 'color', label: 'Color 2', description: 'Color del segundo glow', defaultValue: '#38bdf8' },
      { name: 'count', type: 'number', label: 'Cantidad de glows', description: 'Número de glows (1-5)', defaultValue: 2, min: 1, max: 5 },
      { name: 'blur', type: 'number', label: 'Desenfoque', description: 'Desenfoque del conjunto (vmin)', defaultValue: 6, min: 0, max: 20 },
    ],
  },
  {
    name: 'RaysOfLight',
    category: 'Background',
    role: 'background',
    description: 'Rotating light rays emanating from center with soft gradient.',
    props: [
      { name: 'color1', type: 'color', label: 'Ray Color', description: 'Color of the light rays', defaultValue: '#ffffff' },
      { name: 'color2', type: 'color', label: 'Background Color', description: 'Background color', defaultValue: '#0f172a' },
      { name: 'numRays', type: 'number', label: 'Number of Rays', description: 'How many rays to render', defaultValue: 12, min: 4, max: 36 },
    ],
  },
  {
    name: 'AbstractWave',
    category: 'Background',
    role: 'background',
    description: 'Multiple overlapping sine waves with glow effects.',
    props: [
      { name: 'width', type: 'number', label: 'Width', description: 'Wave container width', defaultValue: 1080 },
      { name: 'height', type: 'number', label: 'Height', description: 'Wave container height', defaultValue: 400 },
    ],
  },
  {
    name: 'KenBurns',
    category: 'Background',
    role: 'background',
    description: 'Cinematic full-bleed Ken Burns effect (slow zoom/pan) over an image, with animated gradient fallback when no image. Ideal for visual-only scenes.',
    props: [
      { name: 'url', type: 'string', label: 'Image URL', description: 'Background image to pan/zoom. Leave empty for gradient.', defaultValue: '' },
      { name: 'direction', type: 'select', label: 'Direction', description: 'Camera motion', defaultValue: 'zoom-in', options: ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'] },
      { name: 'intensity', type: 'number', label: 'Intensity', description: 'Zoom/pan range (subtle 0.05 to strong 0.4)', defaultValue: 0.15, min: 0.05, max: 0.4 },
      { name: 'color1', type: 'color', label: 'Color 1', description: 'Gradient fallback start (no image)', defaultValue: '#0f172a' },
      { name: 'color2', type: 'color', label: 'Color 2', description: 'Gradient fallback end (no image)', defaultValue: '#1e293b' },
      { name: 'overlay', type: 'number', label: 'Overlay', description: 'Dark overlay opacity for text legibility (0-1)', defaultValue: 0, min: 0, max: 1 },
    ],
  },
  {
    name: 'CinematicBars',
    category: 'Background',
    role: 'background',
    description: 'Letterbox / cinematic black bars (top + bottom) for a 2.39:1 film look. Overlay that pairs with KenBurns for visual scenes.',
    props: [
      { name: 'size', type: 'number', label: 'Bar Size', description: 'Bar height as % of canvas (per bar)', defaultValue: 11, min: 0, max: 25 },
      { name: 'color', type: 'color', label: 'Color', description: 'Bar color', defaultValue: '#000000' },
      { name: 'animate', type: 'boolean', label: 'Animate', description: 'Slide bars in', defaultValue: true },
    ],
  },
  {
    name: 'Spotlight',
    category: 'Background',
    role: 'background',
    description: 'Theatrical spotlight overlay: lights the center and darkens the edges to focus attention on the subject. Full-screen, cinematic.',
    props: [
      { name: 'radius', type: 'number', label: 'Radius', description: 'Spotlight size (% of canvas)', defaultValue: 55, min: 10, max: 95 },
      { name: 'intensity', type: 'number', label: 'Darkness', description: 'Edge darkness (0-1)', defaultValue: 0.7, min: 0, max: 1 },
      { name: 'color', type: 'color', label: 'Color', description: 'Darkness color', defaultValue: '#000000' },
      { name: 'animate', type: 'boolean', label: 'Animate', description: 'Subtle breathing of the spotlight', defaultValue: true },
    ],
  },
  {
    name: 'CameraShake',
    category: 'Background',
    role: 'background',
    description: 'Scene-wide handheld camera shake (affects the WHOLE scene, not one layer). Use for impact/energy moments. It draws nothing by itself.',
    props: [
      { name: 'intensity', type: 'number', label: 'Intensity', description: 'Shake amplitude (px)', defaultValue: 12, min: 0, max: 60 },
      { name: 'frequency', type: 'number', label: 'Frequency', description: 'Shakes per second (approx)', defaultValue: 8, min: 1, max: 20 },
      { name: 'rotation', type: 'number', label: 'Rotation', description: 'Max rotation (degrees)', defaultValue: 0.6, min: 0, max: 5 },
      { name: 'decay', type: 'boolean', label: 'Decay', description: 'Strong initial impact that settles', defaultValue: false },
    ],
  },
  {
    name: 'GlobalVFX',
    category: 'Background',
    role: 'background',
    description: 'Full-screen film grain, vignette, and chromatic aberration overlay.',
    props: [
      { name: 'intensity', type: 'number', label: 'Intensity', description: 'VFX intensity (0-1)', defaultValue: 0.5, min: 0, max: 1 },
      { name: 'withLensCurve', type: 'boolean', label: 'Lens Curve', description: 'Enable CRT/vignette effect', defaultValue: true },
    ],
  },
  {
    name: 'NetworkNodes',
    category: 'Background',
    role: 'background',
    description: 'Full-screen ambient "neural network" background: nodes drift and connect by proximity. Deterministic. Good behind text or as a visual-only backdrop.',
    props: [
      { name: 'nodeColor', type: 'color', label: 'Node Color', description: 'Color of the nodes', defaultValue: '#38bdf8' },
      { name: 'lineColor', type: 'color', label: 'Line Color', description: 'Color of the connections (defaults to node color)' },
      { name: 'nodeCount', type: 'number', label: 'Node Count', description: 'Number of nodes (density)', defaultValue: 18, min: 3, max: 60 },
      { name: 'connectionDistance', type: 'number', label: 'Connection Distance', description: 'Distance (px) under which nodes connect. Empty = auto.', min: 80, max: 600 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Ambient drift speed', defaultValue: 1, min: 0, max: 4 },
    ],
  },
  {
    name: 'GradientOverlay',
    category: 'Background',
    role: 'background',
    description: 'Fading gradient overlay with configurable angle and opacity.',
    props: [
      { name: 'color1', type: 'color', label: 'Color 1', description: 'Start gradient color', defaultValue: '#000000' },
      { name: 'color2', type: 'color', label: 'Color 2', description: 'End gradient color', defaultValue: 'transparent' },
      { name: 'angle', type: 'number', label: 'Angle', description: 'Gradient angle in degrees', defaultValue: 180, min: 0, max: 360 },
      { name: 'opacity', type: 'number', label: 'Opacity', description: 'Overlay opacity', defaultValue: 0.8, min: 0, max: 1 },
    ],
  },
  {
    name: 'GridPerspective',
    category: 'Background',
    role: 'background',
    description: 'Retro perspective grid moving forward with continuous loop.',
    props: [
      { name: 'color1', type: 'color', label: 'Grid Color', description: 'Color of the grid lines', defaultValue: '#38bdf8' },
      { name: 'color2', type: 'color', label: 'Background Color', description: 'Background color', defaultValue: '#0f172a' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Grid movement speed', defaultValue: 4, min: 1, max: 20 },
    ],
  },

  // ========================================================================
  // UI COMPONENTS
  // ========================================================================
  {
    name: 'StyleBadge',
    category: 'UI',
    role: 'ui',
    description: 'Status badge with variant colors (success, warning, error, info, neutral) and optional icon.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Badge text', defaultValue: 'Badge' },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Badge color variant', defaultValue: 'neutral', options: ['success', 'warning', 'error', 'info', 'neutral'] },
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Optional Iconify icon' },
      { name: 'size', type: 'select', label: 'Size', description: 'Badge size', defaultValue: 'md', options: ['sm', 'md', 'lg'] },
      { name: 'shadow', type: 'boolean', label: 'Sombra', description: 'Mostrar boxShadow', defaultValue: true },
      { name: 'borderRadius', type: 'number', label: 'Radio de borde', description: 'px (999 = píldora)', defaultValue: 999, min: 0, max: 999 },
    ],
  },
  {
    name: 'StyleButton',
    category: 'UI',
    role: 'ui',
    description: 'Button with variant styles (primary, secondary, ghost, outline) and optional icon.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Button text', defaultValue: 'Click Here' },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Button style variant', defaultValue: 'primary', options: ['primary', 'secondary', 'ghost', 'outline'] },
      { name: 'size', type: 'select', label: 'Size', description: 'Button size', defaultValue: 'md', options: ['sm', 'md', 'lg'] },
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Optional Iconify icon' },
      { name: 'iconPosition', type: 'select', label: 'Icon Position', description: 'Icon placement', defaultValue: 'left', options: ['left', 'right'] },
      { name: 'shadow', type: 'boolean', label: 'Sombra', description: 'Mostrar boxShadow', defaultValue: true },
      { name: 'borderRadius', type: 'number', label: 'Radio de borde', description: 'px (override)', defaultValue: 14, min: 0, max: 999 },
    ],
  },
  {
    name: 'StyleCard',
    category: 'UI',
    role: 'ui',
    description: 'Card container with elevated, filled, outlined, or glass variants.',
    props: [
      { name: 'title', type: 'string', label: 'Title', description: 'Card title' },
      { name: 'subtitle', type: 'string', label: 'Subtitle', description: 'Card subtitle' },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Card style variant', defaultValue: 'elevated', options: ['elevated', 'filled', 'outlined', 'glass'] },
      { name: 'width', type: 'number', label: 'Width', description: 'Card width', defaultValue: 400 },
      { name: 'height', type: 'number', label: 'Height', description: 'Card height' },
    ],
  },
  {
    name: 'StyleChip',
    category: 'UI',
    role: 'ui',
    description: 'Chip/tag component with filled, outlined, or soft variants.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Chip text', defaultValue: 'Chip' },
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Optional Iconify icon' },
      { name: 'deletable', type: 'boolean', label: 'Deletable', description: 'Show delete indicator', defaultValue: false },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Chip style variant', defaultValue: 'filled', options: ['filled', 'outlined', 'soft'] },
      { name: 'size', type: 'select', label: 'Size', description: 'Chip size', defaultValue: 'md', options: ['sm', 'md', 'lg'] },
    ],
  },
  {
    name: 'StyleDivider',
    category: 'UI',
    role: 'ui',
    description: 'Horizontal or vertical divider line with solid, dashed, dotted, or gradient styles.',
    props: [
      { name: 'orientation', type: 'select', label: 'Orientation', description: 'Divider direction', defaultValue: 'horizontal', options: ['horizontal', 'vertical'] },
      { name: 'thickness', type: 'number', label: 'Thickness', description: 'Line thickness', defaultValue: 1, min: 1, max: 10 },
      { name: 'lineStyle', type: 'select', label: 'Line Style', description: 'Line pattern', defaultValue: 'solid', options: ['solid', 'dashed', 'dotted', 'gradient'] },
      { name: 'width', type: 'number', label: 'Width', description: 'Divider width', defaultValue: 400 },
      { name: 'height', type: 'number', label: 'Height', description: 'Divider height', defaultValue: 200 },
    ],
  },
  {
    name: 'StyleAvatar',
    category: 'UI',
    role: 'ui',
    description: 'Avatar with icon, name, subtitle, animated ring, and optional badge.',
    props: [
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Iconify icon for avatar', defaultValue: 'mdi:account' },
      { name: 'name', type: 'string', label: 'Name', description: 'Display name below avatar' },
      { name: 'subtitle', type: 'string', label: 'Subtitle', description: 'Subtitle text' },
      { name: 'size', type: 'select', label: 'Size', description: 'Avatar size', defaultValue: 'md', options: ['sm', 'md', 'lg'] },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Ring style', defaultValue: 'ring', options: ['solid', 'ring', 'gradient'] },
      { name: 'showBadge', type: 'boolean', label: 'Show Badge', description: 'Display notification badge', defaultValue: false },
      { name: 'badgeText', type: 'string', label: 'Badge Text', description: 'Badge content' },
    ],
  },
  {
    name: 'StyleProgressBar',
    category: 'UI',
    role: 'ui',
    description: 'Progress bar with linear or circular variants and animated fill.',
    props: [
      { name: 'value', type: 'number', label: 'Value', description: 'Current progress value', defaultValue: 73, min: 0, max: 100 },
      { name: 'max', type: 'number', label: 'Max Value', description: 'Maximum value', defaultValue: 100 },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Progress bar type', defaultValue: 'linear', options: ['linear', 'circular'] },
      { name: 'showLabel', type: 'boolean', label: 'Show Label', description: 'Display percentage label', defaultValue: true },
      { name: 'labelPosition', type: 'select', label: 'Label Position', description: 'Label placement', defaultValue: 'top', options: ['top', 'bottom', 'inside'] },
      { name: 'size', type: 'number', label: 'Size', description: 'Circular progress size', defaultValue: 120 },
      { name: 'strokeWidth', type: 'number', label: 'Stroke Width', description: 'Circular progress stroke width', defaultValue: 8 },
    ],
  },
  {
    name: 'StyleTicker',
    category: 'UI',
    role: 'ui',
    description: 'Scrolling ticker tape for financial data or news headlines.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'Ticker content', defaultValue: 'BTC $45,230 • ETH $3,120 • SOL $98' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Scroll speed', defaultValue: 2, min: 0.5, max: 10 },
      { name: 'separator', type: 'string', label: 'Separator', description: 'Item separator', defaultValue: ' • ' },
    ],
  },
  {
    name: 'StyleAnimateNumber',
    category: 'UI',
    role: 'ui',
    description: 'Animated counter that interpolates from a starting value to a target.',
    props: [
      { name: 'value', type: 'number', label: 'Target Value', description: 'Final number to reach', defaultValue: 100 },
      { name: 'from', type: 'number', label: 'Start Value', description: 'Starting number', defaultValue: 0 },
      { name: 'prefix', type: 'string', label: 'Prefix', description: 'Text before number (e.g., "$")' },
      { name: 'suffix', type: 'string', label: 'Suffix', description: 'Text after number (e.g., "+")' },
      { name: 'decimals', type: 'number', label: 'Decimals', description: 'Number of decimal places', defaultValue: 0, min: 0, max: 4 },
      { name: 'format', type: 'select', label: 'Format', description: 'Number formatting style', defaultValue: 'number', options: ['number', 'currency', 'percentage', 'compact'] },
      { name: 'duration', type: 'number', label: 'Duration (frames)', description: 'Animation duration', defaultValue: 60 },
    ],
  },
  {
    name: 'StyleWatermark',
    category: 'UI',
    role: 'ui',
    description: 'Subtle watermark logo or icon positioned at corners or center.',
    props: [
      { name: 'src', type: 'string', label: 'Image URL', description: 'Watermark image URL' },
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Fallback Iconify icon', defaultValue: 'mdi:watermark' },
      { name: 'position', type: 'select', label: 'Position', description: 'Watermark placement', defaultValue: 'top-right', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] },
      { name: 'opacity', type: 'number', label: 'Opacity', description: 'Watermark opacity', defaultValue: 0.3, min: 0, max: 1 },
      { name: 'size', type: 'number', label: 'Size', description: 'Watermark size in pixels', defaultValue: 60 },
    ],
  },
  {
    name: 'StyleFakeScroll',
    category: 'UI',
    role: 'ui',
    description: 'Auto-scrolling list of items with optional scrollbar, simulating a feed.',
    props: [
      { name: 'items', type: 'list', label: 'Items', description: 'Array of scroll items with content, icon, subtitle' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Scroll speed', defaultValue: 1, min: 0.5, max: 5 },
      { name: 'itemHeight', type: 'number', label: 'Item Height', description: 'Height per item', defaultValue: 80 },
      { name: 'visibleItems', type: 'number', label: 'Visible Items', description: 'Number of visible items', defaultValue: 3 },
      { name: 'showScrollbar', type: 'boolean', label: 'Show Scrollbar', description: 'Display scrollbar indicator', defaultValue: true },
    ],
  },
  {
    name: 'StyleCursor',
    category: 'UI',
    role: 'ui',
    description: 'Animated cursor that moves through points with click ripple effects.',
    props: [
      { name: 'points', type: 'list', label: 'Points', description: 'Array of cursor positions with x, y, click, holdFrames' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Cursor movement speed', defaultValue: 1, min: 0.5, max: 5 },
      { name: 'showRipple', type: 'boolean', label: 'Show Ripple', description: 'Display click ripple effect', defaultValue: true },
    ],
  },
  {
    name: 'StyleCallout',
    category: 'UI',
    role: 'ui',
    description: 'Callout annotation with arrow, circle, or highlight variants pointing to content.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Callout text', defaultValue: '¡Mira aquí!' },
      { name: 'direction', type: 'select', label: 'Direction', description: 'Arrow direction', defaultValue: 'right', options: ['left', 'right', 'top', 'bottom'] },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Callout style', defaultValue: 'arrow', options: ['arrow', 'circle', 'highlight'] },
    ],
  },
  {
    name: 'StyleVideoPlayer',
    category: 'UI',
    role: 'ui',
    description: 'Video player container with PiP, fullscreen, or inline variants.',
    props: [
      { name: 'src', type: 'string', label: 'Video URL', description: 'Video source URL' },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Player layout', defaultValue: 'pip', options: ['pip', 'fullscreen', 'inline'] },
      { name: 'size', type: 'select', label: 'Size', description: 'Player size', defaultValue: 'md', options: ['sm', 'md', 'lg'] },
      { name: 'autoplay', type: 'boolean', label: 'Autoplay', description: 'Start playing automatically', defaultValue: true },
      { name: 'loop', type: 'boolean', label: 'Loop', description: 'Loop the video', defaultValue: true },
      { name: 'muted', type: 'boolean', label: 'Muted', description: 'Mute the video', defaultValue: true },
    ],
  },
  {
    name: 'StyleSimulatedHover',
    category: 'UI',
    role: 'ui',
    description: 'Simulates a mouse hover effect on a button, card, or link element.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Element text', defaultValue: 'Click Here' },
      { name: 'icon', type: 'icon', label: 'Icon', description: 'Optional Iconify icon' },
      { name: 'hoverFrame', type: 'number', label: 'Hover Frame', description: 'Frame when hover starts', defaultValue: 60 },
      { name: 'hoverDuration', type: 'number', label: 'Hover Duration', description: 'Hover animation duration in frames', defaultValue: 30 },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Element type', defaultValue: 'button', options: ['button', 'card', 'link'] },
    ],
  },

  // ========================================================================
  // CHART & DATA COMPONENTS
  // ========================================================================
  {
    name: 'StyleBarChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Bar chart with vertical or horizontal orientation and animated bars.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {label, value, color} objects' },
      { name: 'variant', type: 'select', label: 'Orientation', description: 'Chart orientation', defaultValue: 'vertical', options: ['vertical', 'horizontal'] },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display bar labels', defaultValue: true },
      { name: 'showValues', type: 'boolean', label: 'Show Values', description: 'Display bar values', defaultValue: true },
      { name: 'maxValue', type: 'number', label: 'Max Value', description: 'Maximum value for scale' },
      { name: 'barGap', type: 'number', label: 'Bar Gap', description: 'Gap between bars', defaultValue: 12 },
    ],
  },
  {
    name: 'StylePieChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Pie or donut chart with animated slice reveal and legend.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {label, value, color} objects' },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display legend labels', defaultValue: true },
      { name: 'showValues', type: 'boolean', label: 'Show Values', description: 'Display percentage values', defaultValue: true },
      { name: 'variant', type: 'select', label: 'Variant', description: 'Chart type', defaultValue: 'donut', options: ['pie', 'donut'] },
      { name: 'innerRadius', type: 'number', label: 'Inner Radius', description: 'Donut hole radius', defaultValue: 40 },
      { name: 'explodeSlice', type: 'number', label: 'Explode Slice', description: 'Index of slice to explode', defaultValue: 0 },
    ],
  },
  {
    name: 'StyleLineChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Line chart with animated drawing, optional area fill, dots, and grid.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {x, y} points' },
      { name: 'showDots', type: 'boolean', label: 'Show Dots', description: 'Display data point dots', defaultValue: true },
      { name: 'showGrid', type: 'boolean', label: 'Show Grid', description: 'Display grid lines', defaultValue: true },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display x-axis labels', defaultValue: true },
      { name: 'lineColor', type: 'color', label: 'Line Color', description: 'Line stroke color', defaultValue: '#00FFAB' },
      { name: 'fillColor', type: 'color', label: 'Fill Color', description: 'Area fill color', defaultValue: 'rgba(0, 255, 171, 0.1)' },
      { name: 'fillArea', type: 'boolean', label: 'Fill Area', description: 'Show area under line', defaultValue: true },
      { name: 'lineWidth', type: 'number', label: 'Line Width', description: 'Stroke width', defaultValue: 3, min: 1, max: 10 },
    ],
  },
  {
    name: 'StyleFunnelChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Funnel chart showing conversion stages with percentages.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {label, value, color} funnel stages' },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display stage labels', defaultValue: true },
      { name: 'showValues', type: 'boolean', label: 'Show Values', description: 'Display stage values', defaultValue: true },
      { name: 'showPercentages', type: 'boolean', label: 'Show Percentages', description: 'Display conversion rates', defaultValue: true },
    ],
  },
  {
    name: 'StyleRadarChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Radar/spider chart with animated data points and grid.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {label, value} axes' },
      { name: 'maxValue', type: 'number', label: 'Max Value', description: 'Maximum axis value', defaultValue: 100 },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display axis labels', defaultValue: true },
      { name: 'showGrid', type: 'boolean', label: 'Show Grid', description: 'Display grid circles', defaultValue: true },
      { name: 'showValues', type: 'boolean', label: 'Show Values', description: 'Display data values', defaultValue: false },
      { name: 'fillColor', type: 'color', label: 'Fill Color', description: 'Polygon fill color', defaultValue: 'rgba(0, 255, 171, 0.15)' },
      { name: 'lineColor', type: 'color', label: 'Line Color', description: 'Polygon stroke color', defaultValue: '#00FFAB' },
      { name: 'size', type: 'number', label: 'Size', description: 'Chart diameter', defaultValue: 240 },
    ],
  },
  {
    name: 'StyleBarRace',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Horizontal bar race chart sorted by value with animated growth.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of {label, value, color} items' },
      { name: 'barHeight', type: 'number', label: 'Bar Height', description: 'Height of each bar', defaultValue: 32 },
      { name: 'gap', type: 'number', label: 'Gap', description: 'Gap between bars', defaultValue: 8 },
      { name: 'showLabels', type: 'boolean', label: 'Show Labels', description: 'Display item labels', defaultValue: true },
      { name: 'showValues', type: 'boolean', label: 'Show Values', description: 'Display bar values', defaultValue: true },
      { name: 'duration', type: 'number', label: 'Duration (frames)', description: 'Animation duration', defaultValue: 90 },
    ],
  },
  {
    name: 'BarChartReveal',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Bar chart with staggered spring reveal animation and gradient bars.',
    props: [
      { name: 'color1', type: 'color', label: 'Color 1', description: 'Primary bar gradient color', defaultValue: '#3b82f6' },
      { name: 'color2', type: 'color', label: 'Color 2', description: 'Secondary bar gradient color', defaultValue: '#0ea5e9' },
      { name: 'data', type: 'list', label: 'Data', description: 'Array of bar heights (0-100)', defaultValue: [30, 50, 75, 45, 90] },
      { name: 'width', type: 'number', label: 'Width', description: 'Chart width', defaultValue: 800 },
      { name: 'height', type: 'number', label: 'Height', description: 'Chart height', defaultValue: 500 },
    ],
  },
  {
    name: 'PieChartReveal',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Donut pie chart with sweep reveal animation and legend.',
    props: [
      { name: 'values', type: 'string', label: 'Values', description: 'Comma-separated values', defaultValue: '40,35,25' },
      { name: 'colors', type: 'string', label: 'Colors', description: 'Comma-separated hex colors', defaultValue: '#3b82f6,#10b981,#f59e0b' },
      { name: 'labels', type: 'string', label: 'Labels', description: 'Comma-separated labels', defaultValue: 'Product A,Product B,Product C' },
    ],
  },
  {
    name: 'FunnelChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Funnel chart with trapezoid stages and spring entrance.',
    props: [
      { name: 'values', type: 'string', label: 'Values', description: 'Comma-separated values', defaultValue: '10000,5000,2000,500' },
      { name: 'colors', type: 'string', label: 'Colors', description: 'Comma-separated hex colors', defaultValue: '#3b82f6,#8b5cf6,#ec4899,#ef4444' },
      { name: 'labels', type: 'string', label: 'Labels', description: 'Comma-separated labels', defaultValue: 'Visits,Signups,Trials,Customers' },
    ],
  },
  {
    name: 'HorizontalBarRace',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Horizontal bar race with Name:Value format and staggered spring animation.',
    props: [
      { name: 'items', type: 'string', label: 'Items', description: 'Comma-separated Name:Value pairs', defaultValue: 'JavaScript:100,Python:90,TypeScript:85' },
      { name: 'colors', type: 'string', label: 'Colors', description: 'Comma-separated hex colors', defaultValue: '#f7df1e,#3776ab,#3178c6,#00add8,#dea584' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Animation speed multiplier' },
    ],
  },
  {
    name: 'RadarSpiderChart',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Radar/spider chart with web grid and animated data polygon.',
    props: [
      { name: 'values', type: 'string', label: 'Values', description: 'Comma-separated values (0-100)', defaultValue: '80,95,60,85,70' },
      { name: 'fillColor', type: 'color', label: 'Fill Color', description: 'Polygon fill color', defaultValue: 'rgba(59, 130, 246, 0.5)' },
      { name: 'labels', type: 'string', label: 'Labels', description: 'Comma-separated axis labels', defaultValue: 'Speed,Power,Agility,Stamina,Focus' },
    ],
  },
  {
    name: 'PercentageRing',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Circular progress ring with animated stroke and percentage display.',
    props: [
      { name: 'targetPercentage', type: 'number', label: 'Target %', description: 'Target percentage (0-100)', defaultValue: 85, min: 0, max: 100 },
      { name: 'size', type: 'number', label: 'Size', description: 'Ring diameter', defaultValue: 400 },
    ],
  },
  {
    name: 'CounterNumber',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Large animated counter with prefix and suffix.',
    props: [
      { name: 'from', type: 'number', label: 'Start Value', description: 'Starting number', defaultValue: 0 },
      { name: 'to', type: 'number', label: 'End Value', description: 'Target number', defaultValue: 1000000 },
      { name: 'prefix', type: 'string', label: 'Prefix', description: 'Text before number', defaultValue: '$' },
      { name: 'suffix', type: 'string', label: 'Suffix', description: 'Text after number', defaultValue: '+' },
    ],
  },
  {
    name: 'ScoreboardCounter',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Two-team scoreboard with animated counters and colored headers.',
    props: [
      { name: 'valueA', type: 'number', label: 'Team A Value', description: 'Score for team A', defaultValue: 104 },
      { name: 'valueB', type: 'number', label: 'Team B Value', description: 'Score for team B', defaultValue: 98 },
      { name: 'labelA', type: 'string', label: 'Team A Label', description: 'Team A name', defaultValue: 'HOME' },
      { name: 'labelB', type: 'string', label: 'Team B Label', description: 'Team B name', defaultValue: 'AWAY' },
      { name: 'colorA', type: 'color', label: 'Team A Color', description: 'Team A header color', defaultValue: '#ef4444' },
      { name: 'colorB', type: 'color', label: 'Team B Color', description: 'Team B header color', defaultValue: '#3b82f6' },
    ],
  },
  {
    name: 'FollowerCounter',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Social media follower counter with platform icon and animated count.',
    props: [
      { name: 'startCount', type: 'number', label: 'Start Count', description: 'Starting follower count', defaultValue: 5000 },
      { name: 'endCount', type: 'number', label: 'End Count', description: 'Target follower count', defaultValue: 100000 },
      { name: 'platform', type: 'select', label: 'Platform', description: 'Social media platform', defaultValue: 'insta', options: ['youtube', 'insta', 'tiktok'] },
    ],
  },
  {
    name: 'TrendLine',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Animated trend line with glow effect drawn from data points.',
    props: [
      { name: 'data', type: 'list', label: 'Data', description: 'Array of Y values (0-100)', defaultValue: [20, 30, 25, 45, 40, 65, 55, 85, 80, 100] },
      { name: 'width', type: 'number', label: 'Width', description: 'Chart width', defaultValue: 800 },
      { name: 'height', type: 'number', label: 'Height', description: 'Chart height', defaultValue: 400 },
    ],
  },
  {
    name: 'StockCandlestick',
    category: 'Charts & Data',
    role: 'dataviz',
    description: 'Stock candlestick chart with OHLC data and staggered animation.',
    props: [
      { name: 'data', type: 'string', label: 'Data', description: 'Semicolon-separated High,Low,Open,Close groups', defaultValue: '120,90,100,110;130,105,110,125' },
      { name: 'upColor', type: 'color', label: 'Up Color', description: 'Color for bullish candles', defaultValue: '#22c55e' },
      { name: 'downColor', type: 'color', label: 'Down Color', description: 'Color for bearish candles', defaultValue: '#ef4444' },
    ],
  },

  // ========================================================================
  // SOCIAL & MEDIA COMPONENTS
  // ========================================================================
  {
    name: 'TikTokOverlay',
    category: 'Social',
    role: 'social',
    description: 'TikTok-style overlay with likes, comments, shares, and sound name.',
    props: [
      { name: 'likes', type: 'string', label: 'Likes', description: 'Like count display', defaultValue: '1.2M' },
      { name: 'comments', type: 'string', label: 'Comments', description: 'Comment count display', defaultValue: '45.2K' },
      { name: 'shares', type: 'string', label: 'Shares', description: 'Share count display', defaultValue: '12K' },
      { name: 'soundName', type: 'string', label: 'Sound Name', description: 'Audio track name', defaultValue: 'Original Sound - Creator' },
    ],
  },
  {
    name: 'InstagramPost',
    category: 'Social',
    role: 'social',
    description: 'Instagram post mockup with username, likes, and caption.',
    props: [
      { name: 'username', type: 'string', label: 'Username', description: 'Instagram username', defaultValue: 'animaflow.app' },
      { name: 'likes', type: 'string', label: 'Likes', description: 'Like count', defaultValue: '1,245' },
      { name: 'caption', type: 'text-long', label: 'Caption', description: 'Post caption text', defaultValue: 'Launching our new feature today!' },
    ],
  },
  {
    name: 'TweetCard',
    category: 'Social',
    role: 'social',
    description: 'Twitter/X tweet card with username, handle, content, and engagement stats.',
    props: [
      { name: 'username', type: 'string', label: 'Username', description: 'Display name', defaultValue: 'SaaS Founder' },
      { name: 'handle', type: 'string', label: 'Handle', description: 'Twitter handle', defaultValue: '@saas_founder' },
      { name: 'content', type: 'text-long', label: 'Content', description: 'Tweet text', defaultValue: 'Just shipped the new feature.' },
      { name: 'retweets', type: 'string', label: 'Retweets', description: 'Retweet count', defaultValue: '1.2K' },
      { name: 'likes', type: 'string', label: 'Likes', description: 'Like count', defaultValue: '4.5K' },
      { name: 'verified', type: 'boolean', label: 'Verified', description: 'Show verified badge', defaultValue: true },
    ],
  },
  {
    name: 'YouTubeEndScreen',
    category: 'Social',
    role: 'social',
    description: 'YouTube end screen with video slots, subscribe button, and title.',
    props: [
      { name: 'title', type: 'string', label: 'Title', description: 'End screen title', defaultValue: 'Thanks for watching!' },
      { name: 'subscribeColor', type: 'color', label: 'Subscribe Color', description: 'Subscribe button color', defaultValue: '#ff0000' },
    ],
  },
  {
    name: 'SubscribeButton',
    category: 'Social',
    role: 'social',
    description: 'Subscribe button with click animation and state change.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Button text', defaultValue: 'Subscribe' },
      { name: 'clickedText', type: 'string', label: 'Clicked Text', description: 'Text after click', defaultValue: 'Subscribed' },
      { name: 'clickFrame', type: 'number', label: 'Click Frame', description: 'Frame when button is clicked', defaultValue: 90 },
      { name: 'clickedColor', type: 'color', label: 'Clicked Color', description: 'Color after click', defaultValue: '#333333' },
    ],
  },
  {
    name: 'AppStoreButtons',
    category: 'Social',
    role: 'social',
    description: 'App Store and Google Play download buttons with staggered entrance.',
    props: [
      { name: 'showApple', type: 'boolean', label: 'Show Apple', description: 'Display App Store button', defaultValue: true },
      { name: 'showGoogle', type: 'boolean', label: 'Show Google', description: 'Display Google Play button', defaultValue: true },
    ],
  },
  {
    name: 'ShoppingCartBadge',
    category: 'Social',
    role: 'social',
    description: 'Shopping cart icon with animated badge that appears on trigger frame.',
    props: [
      { name: 'triggerFrame', type: 'number', label: 'Trigger Frame', description: 'Frame when badge appears', defaultValue: 60 },
      { name: 'badgeColor', type: 'color', label: 'Badge Color', description: 'Badge background color', defaultValue: '#ef4444' },
      { name: 'iconColor', type: 'color', label: 'Icon Color', description: 'Cart icon color', defaultValue: '#0f172a' },
    ],
  },
  {
    name: 'SizeSelector',
    category: 'Social',
    role: 'social',
    description: 'Size selector (XS, S, M, L, XL) with animated selection highlight.',
    props: [
      { name: 'sizes', type: 'string', label: 'Sizes', description: 'Comma-separated size options', defaultValue: 'XS,S,M,L,XL' },
      { name: 'selectedSize', type: 'string', label: 'Selected Size', description: 'Currently selected size', defaultValue: 'M' },
    ],
  },
  {
    name: 'SocialProgressBar',
    category: 'Social',
    role: 'social',
    description: 'Instagram/TikTok-style story progress bar spanning the full video duration.',
    props: [
      { name: 'heightPx', type: 'number', label: 'Height', description: 'Bar height in pixels', defaultValue: 4, min: 1, max: 20 },
    ],
  },
  {
    name: 'SocialSharePopup',
    category: 'Social',
    role: 'social',
    description: 'Share popup drawer with social app icons (WhatsApp, Twitter, Email).',
    props: [
      { name: 'title', type: 'string', label: 'Title', description: 'Popup title', defaultValue: 'Share to friends' },
    ],
  },

  // ========================================================================
  // LAYOUT & CONTAINER COMPONENTS
  // ========================================================================
  {
    name: 'BrowserWindow',
    category: 'UI',
    role: 'ui',
    description: 'Browser window mockup with traffic light buttons and content area.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Content text displayed in the window' },
      { name: 'width', type: 'number', label: 'Width', description: 'Window width', defaultValue: 800 },
      { name: 'height', type: 'number', label: 'Height', description: 'Window height', defaultValue: 500 },
    ],
  },
  {
    name: 'PhoneMockup',
    category: 'UI',
    role: 'ui',
    description: 'Phone mockup with notch (Dynamic Island) and content area, slides up from bottom.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Content text displayed on screen' },
    ],
  },
  {
    name: 'LogoReveal',
    category: 'Branding',
    role: 'ui',
    description: 'Brand intro: animated reveal of a logo image (url) and/or brand name + tagline, with a shine sweep. Supports logo image, text, or both.',
    props: [
      { name: 'url', type: 'string', label: 'Logo URL', description: 'Logo image. Leave empty for text-only brand.', defaultValue: '' },
      { name: 'brand', type: 'string', label: 'Brand', description: 'Brand name / handle', defaultValue: 'Tu Marca' },
      { name: 'tagline', type: 'string', label: 'Tagline', description: 'Optional line below the brand', defaultValue: '' },
      { name: 'brandColor', type: 'color', label: 'Brand Color', description: 'Brand text color', defaultValue: '#ffffff' },
      { name: 'taglineColor', type: 'color', label: 'Tagline Color', description: 'Tagline color', defaultValue: '#94a3b8' },
      { name: 'shine', type: 'boolean', label: 'Shine', description: 'Light sweep over the logo', defaultValue: true },
    ],
  },
  {
    name: 'BrandOutro',
    category: 'Branding',
    role: 'ui',
    description: 'Closing brand card for the last scene: logo + brand + handle + CTA. Supports logo image, text, or both.',
    props: [
      { name: 'url', type: 'string', label: 'Logo URL', description: 'Logo image. Optional.', defaultValue: '' },
      { name: 'brand', type: 'string', label: 'Brand', description: 'Brand name', defaultValue: 'Tu Marca' },
      { name: 'handle', type: 'string', label: 'Handle', description: '@user or domain', defaultValue: '@tumarca' },
      { name: 'cta', type: 'string', label: 'CTA', description: 'Call to action', defaultValue: 'Síguenos' },
      { name: 'brandColor', type: 'color', label: 'Brand Color', description: 'Brand text color', defaultValue: '#0f172a' },
      { name: 'accentColor', type: 'color', label: 'Accent Color', description: 'Handle + CTA color', defaultValue: '#00FFAB' },
      { name: 'cardColor', type: 'color', label: 'Card Color', description: 'Card background', defaultValue: '#ffffff' },
    ],
  },
  {
    name: 'MediaFrame',
    category: 'UI',
    role: 'ui',
    description: 'Image/media frame with configurable border, shadow, and object-fit.',
    props: [
      { name: 'url', type: 'string', label: 'Image URL', description: 'Media source URL' },
      { name: 'borderRadius', type: 'number', label: 'Border Radius', description: 'Corner radius', defaultValue: 20 },
      { name: 'borderWidth', type: 'number', label: 'Border Width', description: 'Border thickness', defaultValue: 0 },
      { name: 'borderColor', type: 'color', label: 'Border Color', description: 'Border color', defaultValue: '#ffffff' },
      { name: 'dropShadow', type: 'boolean', label: 'Drop Shadow', description: 'Enable shadow effect', defaultValue: true },
      { name: 'objectFit', type: 'select', label: 'Object Fit', description: 'Image scaling mode', defaultValue: 'cover', options: ['cover', 'contain', 'fill'] },
      { name: 'width', type: 'number', label: 'Width', description: 'Frame width', defaultValue: 600 },
      { name: 'height', type: 'number', label: 'Height', description: 'Frame height', defaultValue: 400 },
    ],
  },
  {
    name: 'SplitScreenGrid',
    category: 'UI',
    role: 'ui',
    description: 'Four-quadrant split screen that animates from full screen to grid layout.',
    props: [
      { name: 'splitFrame', type: 'number', label: 'Split Frame', description: 'Frame when split animation starts', defaultValue: 60 },
    ],
  },
  {
    name: 'QuoteBlock',
    category: 'Text',
    role: 'text',
    description: 'Styled quote block with decorative quotation mark and author attribution.',
    props: [
      { name: 'text', type: 'text-long', label: 'Quote Text', description: 'The quote content', defaultValue: 'The future belongs to those who build it.' },
      { name: 'author', type: 'string', label: 'Author', description: 'Quote attribution', defaultValue: 'Creator' },
    ],
  },
  {
    name: 'LowerThird',
    category: 'UI',
    role: 'ui',
    description: 'Lower third name/title graphic with accent bar and slide-in animation.',
    props: [
      { name: 'name', type: 'string', label: 'Name', description: 'Person name', defaultValue: 'JANE DOE' },
      { name: 'title', type: 'string', label: 'Title', description: 'Job title or role', defaultValue: 'Chief Technology Officer' },
    ],
  },
  {
    name: 'CountdownTimer',
    category: 'UI',
    role: 'ui',
    description: 'Countdown timer with ring progress and pop animation on each second.',
    props: [
      { name: 'seconds', type: 'number', label: 'Seconds', description: 'Countdown duration in seconds', defaultValue: 10 },
    ],
  },
  {
    name: 'LoadingSpinner',
    category: 'UI',
    role: 'ui',
    description: 'Circular loading spinner with configurable speed and size.',
    props: [
      { name: 'speed', type: 'number', label: 'Speed', description: 'Rotation speed multiplier', defaultValue: 1, min: 0.5, max: 5 },
      { name: 'size', type: 'number', label: 'Size', description: 'Spinner diameter', defaultValue: 100 },
    ],
  },
  {
    name: 'NotificationToast',
    category: 'UI',
    role: 'ui',
    description: 'Notification toast that drops in from top with icon, title, and message.',
    props: [
      { name: 'title', type: 'string', label: 'Title', description: 'Notification title', defaultValue: 'Payment Received' },
      { name: 'message', type: 'string', label: 'Message', description: 'Notification message', defaultValue: '$4,200.00 from Acme Corp' },
      { name: 'icon', type: 'string', label: 'Icon', description: 'Emoji or icon for notification', defaultValue: '💰' },
    ],
  },
  {
    name: 'MessageBubble',
    category: 'UI',
    role: 'ui',
    description: 'Chat message bubbles with sender/receiver styling and staggered entrance.',
    props: [
      { name: 'messages', type: 'text-long', label: 'Messages', description: 'Semicolon-separated messages (R: for receiver, S: for sender)', defaultValue: 'R:Hey, did you see the new feature?;S:Yeah! It looks amazing.' },
      { name: 'senderColor', type: 'color', label: 'Sender Color', description: 'Sender bubble color', defaultValue: '#22c55e' },
      { name: 'receiverColor', type: 'color', label: 'Receiver Color', description: 'Receiver bubble color', defaultValue: '#334155' },
    ],
  },
  {
    name: 'TextBubble',
    category: 'UI',
    role: 'ui',
    description: 'Speech bubble with configurable pointer position and pop entrance.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'Bubble content', defaultValue: 'Hello World!' },
      { name: 'pointerPosition', type: 'select', label: 'Pointer Position', description: 'Bubble pointer direction', defaultValue: 'bottom', options: ['left', 'right', 'top', 'bottom'] },
      { name: 'shadow', type: 'boolean', label: 'Shadow', description: 'Enable drop shadow', defaultValue: true },
    ],
  },
  {
    name: 'FeatureChecklist',
    category: 'UI',
    role: 'ui',
    description: 'Checklist with animated checkmarks and staggered text reveal.',
    props: [
      { name: 'itemsStr', type: 'string', label: 'Items', description: 'Comma-separated checklist items', defaultValue: 'Free Worldwide Shipping,Premium Quality Materials,30-Day Money Back Guarantee' },
      { name: 'checkColor', type: 'color', label: 'Check Color', description: 'Checkmark color', defaultValue: '#10b981' },
    ],
  },
  {
    name: 'FeatureUnlock',
    category: 'UI',
    role: 'ui',
    description: 'Padlock that unlocks to reveal a feature name with animation.',
    props: [
      { name: 'featureName', type: 'string', label: 'Feature Name', description: 'Name of the unlocked feature', defaultValue: 'Premium Export 4K' },
    ],
  },
  {
    name: 'FlashSaleTimer',
    category: 'UI',
    role: 'ui',
    description: 'Flash sale countdown with hours, minutes, seconds, and milliseconds blocks.',
    props: [
      { name: 'hours', type: 'number', label: 'Hours', description: 'Starting hours', defaultValue: 0 },
      { name: 'minutes', type: 'number', label: 'Minutes', description: 'Starting minutes', defaultValue: 15 },
      { name: 'seconds', type: 'number', label: 'Seconds', description: 'Starting seconds', defaultValue: 30 },
    ],
  },
  {
    name: 'FloatingBadge',
    category: 'UI',
    role: 'ui',
    description: 'Floating badge with continuous hover animation and configurable shape.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Badge text', defaultValue: 'NEW!' },
      { name: 'shape', type: 'select', label: 'Shape', description: 'Badge shape', defaultValue: 'pill', options: ['pill', 'rect', 'circle'] },
      { name: 'borderWidth', type: 'number', label: 'Border Width', description: 'Border thickness', defaultValue: 0 },
      { name: 'shadow', type: 'boolean', label: 'Shadow', description: 'Enable glow shadow', defaultValue: true },
    ],
  },
  {
    name: 'ProgressPill',
    category: 'UI',
    role: 'ui',
    description: 'Pill-shaped progress bar with animated fill from start to end percentage.',
    props: [
      { name: 'startPercent', type: 'number', label: 'Start %', description: 'Starting percentage', defaultValue: 0, min: 0, max: 100 },
      { name: 'endPercent', type: 'number', label: 'End %', description: 'Target percentage', defaultValue: 100, min: 0, max: 100 },
      { name: 'barColor', type: 'color', label: 'Bar Color', description: 'Fill color', defaultValue: '#3b82f6' },
      { name: 'trackColor', type: 'color', label: 'Track Color', description: 'Background track color', defaultValue: '#e2e8f0' },
      { name: 'duration', type: 'number', label: 'Duration (frames)', description: 'Animation duration', defaultValue: 60 },
      { name: 'showLabel', type: 'boolean', label: 'Show Label', description: 'Display percentage text', defaultValue: true },
      { name: 'width', type: 'number', label: 'Width', description: 'Bar width', defaultValue: 600 },
      { name: 'height', type: 'number', label: 'Height', description: 'Bar height', defaultValue: 40 },
    ],
  },
  {
    name: 'PromoCodeBanner',
    category: 'UI',
    role: 'ui',
    description: 'Promotional banner with discount amount and dashed code box, with wiggle effect.',
    props: [
      { name: 'code', type: 'string', label: 'Promo Code', description: 'Discount code text', defaultValue: 'SUMMER50' },
      { name: 'discount', type: 'string', label: 'Discount', description: 'Discount display text', defaultValue: '50% OFF' },
    ],
  },
  {
    name: 'PodcastGuestCard',
    category: 'UI',
    role: 'ui',
    description: 'Podcast guest card with avatar, name, role, and pulsing glow effect.',
    props: [
      { name: 'name', type: 'string', label: 'Name', description: 'Guest name', defaultValue: 'Sam Altman' },
      { name: 'role', type: 'string', label: 'Role', description: 'Guest title/role', defaultValue: 'CEO, OpenAI' },
      { name: 'glowColor', type: 'color', label: 'Glow Color', description: 'Card glow color', defaultValue: '#3b82f6' },
    ],
  },
  {
    name: 'PricingTableReveal',
    category: 'UI',
    role: 'ui',
    description: 'Three-tier pricing table with highlighted "Most Popular" center card.',
    props: [
      { name: 'tier1', type: 'string', label: 'Tier 1 Name', description: 'First tier name', defaultValue: 'Starter' },
      { name: 'tier2', type: 'string', label: 'Tier 2 Name', description: 'Second tier name', defaultValue: 'Pro' },
      { name: 'tier3', type: 'string', label: 'Tier 3 Name', description: 'Third tier name', defaultValue: 'Enterprise' },
      { name: 'price1', type: 'string', label: 'Tier 1 Price', description: 'First tier price', defaultValue: '$0' },
      { name: 'price2', type: 'string', label: 'Tier 2 Price', description: 'Second tier price', defaultValue: '$29' },
      { name: 'price3', type: 'string', label: 'Tier 3 Price', description: 'Third tier price', defaultValue: '$99' },
      { name: 'highlightColor', type: 'color', label: 'Highlight Color', description: 'Center card color', defaultValue: '#3b82f6' },
    ],
  },
  {
    name: 'ProductCardReveal',
    category: 'UI',
    role: 'ui',
    description: 'Product card with image placeholder, title, and price badge with float animation.',
    props: [
      { name: 'title', type: 'string', label: 'Title', description: 'Product name', defaultValue: 'Limited Edition Sneakers' },
      { name: 'price', type: 'string', label: 'Price', description: 'Product price', defaultValue: '$199.99' },
      { name: 'priceColor', type: 'color', label: 'Price Color', description: 'Price badge color', defaultValue: '#10b981' },
    ],
  },
  {
    name: 'CalendarDatePop',
    category: 'UI',
    role: 'ui',
    description: 'Calendar month view with animated circle drawing around target date.',
    props: [
      { name: 'targetDate', type: 'number', label: 'Target Date', description: 'Day to highlight', defaultValue: 15, min: 1, max: 31 },
      { name: 'month', type: 'string', label: 'Month', description: 'Month name', defaultValue: 'November' },
      { name: 'circleColor', type: 'color', label: 'Circle Color', description: 'Highlight circle color', defaultValue: '#ef4444' },
    ],
  },
  {
    name: 'CodeBlockHighlight',
    category: 'UI',
    role: 'ui',
    description: 'Code editor mockup with syntax highlighting and animated line highlight.',
    props: [
      { name: 'code', type: 'text-long', label: 'Code', description: 'Code content with newlines' },
      { name: 'language', type: 'string', label: 'Language', description: 'Programming language label', defaultValue: 'javascript' },
      { name: 'highlightLine', type: 'number', label: 'Highlight Line', description: 'Line number to highlight (1-indexed)', defaultValue: 2 },
      { name: 'accentColor', type: 'color', label: 'Accent Color', description: 'Highlight accent color', defaultValue: '#38bdf8' },
    ],
  },
  {
    name: 'MusicPlayerUI',
    category: 'UI',
    role: 'ui',
    description: 'Music player UI with album art, song info, progress bar, and controls.',
    props: [
      { name: 'songTitle', type: 'string', label: 'Song Title', description: 'Track name', defaultValue: 'Lo-Fi Chill Vibes' },
      { name: 'artist', type: 'string', label: 'Artist', description: 'Artist name', defaultValue: 'AnimaFlow Beats' },
      { name: 'progressColor', type: 'color', label: 'Progress Color', description: 'Progress bar color', defaultValue: '#1db954' },
      { name: 'albumColor', type: 'color', label: 'Album Color', description: 'Album art gradient color', defaultValue: '#f5576c' },
    ],
  },
  {
    name: 'TerminalHacker',
    category: 'UI',
    role: 'ui',
    description: 'Terminal window with typewriter effect and blinking cursor.',
    props: [
      { name: 'lines', type: 'string', label: 'Lines', description: 'Comma-separated terminal lines', defaultValue: 'npm install animaflow,> Installing dependencies...,> Success!' },
      { name: 'cursorColor', type: 'color', label: 'Cursor Color', description: 'Blinking cursor color', defaultValue: '#22c55e' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Typing speed (chars per frame)', defaultValue: 2, min: 1, max: 10 },
    ],
  },
  {
    name: 'TestimonialReview',
    category: 'UI',
    role: 'ui',
    description: 'Review card with animated star rating, quote, and author attribution.',
    props: [
      { name: 'author', type: 'string', label: 'Author', description: 'Reviewer name', defaultValue: 'Sarah Jenkins' },
      { name: 'review', type: 'text-long', label: 'Review', description: 'Review text', defaultValue: '"This tool saved our team 20 hours a week!"' },
      { name: 'rating', type: 'number', label: 'Rating', description: 'Star rating (1-5)', defaultValue: 5, min: 1, max: 5 },
      { name: 'starColor', type: 'color', label: 'Star Color', description: 'Star fill color', defaultValue: '#fbbf24' },
    ],
  },
  {
    name: 'TinderSwipeCard',
    category: 'UI',
    role: 'ui',
    description: 'Tinder-style card that swipes right with a "MATCH!" stamp overlay.',
    props: [
      { name: 'name', type: 'string', label: 'Name', description: 'Card name/title', defaultValue: 'SaaS Startup' },
      { name: 'subtitle', type: 'string', label: 'Subtitle', description: 'Card subtitle', defaultValue: 'Looking for growth' },
      { name: 'swipeFrame', type: 'number', label: 'Swipe Frame', description: 'Frame when swipe starts', defaultValue: 90 },
      { name: 'stampColor', type: 'color', label: 'Stamp Color', description: 'MATCH stamp color', defaultValue: '#22c55e' },
      { name: 'stampText', type: 'string', label: 'Stamp Text', description: 'Stamp overlay text', defaultValue: 'MATCH!' },
    ],
  },
  {
    name: 'VersusScreen',
    category: 'UI',
    role: 'ui',
    description: 'VS comparison screen with two colored sides and central badge.',
    props: [
      { name: 'nameA', type: 'string', label: 'Name A', description: 'Left side name', defaultValue: 'REACT' },
      { name: 'nameB', type: 'string', label: 'Name B', description: 'Right side name', defaultValue: 'VUE' },
      { name: 'colorA', type: 'color', label: 'Color A', description: 'Left side background', defaultValue: '#61dafb' },
      { name: 'colorB', type: 'color', label: 'Color B', description: 'Right side background', defaultValue: '#42b883' },
    ],
  },
  {
    name: 'APIRequestFlow',
    category: 'UI',
    role: 'ui',
    description: 'API request/response flow visualization with client box, arrow, and server response.',
    props: [
      { name: 'method', type: 'select', label: 'HTTP Method', description: 'Request method', defaultValue: 'POST', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      { name: 'endpoint', type: 'string', label: 'Endpoint', description: 'API endpoint path', defaultValue: '/api/v1/generate' },
      { name: 'responseCode', type: 'number', label: 'Response Code', description: 'HTTP status code', defaultValue: 200 },
      { name: 'requestBody', type: 'text-long', label: 'Request Body', description: 'JSON body of the API request' },
      { name: 'responseBody', type: 'text-long', label: 'Response Body', description: 'JSON body of the API response' },
      { name: 'arrowSpeed', type: 'number', label: 'Velocidad de flecha', description: '1 = normal, 2 = el doble de rápida', defaultValue: 1, min: 0.25, max: 4 },
    ],
  },

  // ========================================================================
  // TRANSITION COMPONENTS
  // ========================================================================
  {
    name: 'MaskedReveal',
    category: 'Transition',
    role: 'transition',
    description: 'Content reveal using overflow mask with directional slide (up, down, left, right).',
    props: [
      { name: 'direction', type: 'select', label: 'Direction', description: 'Reveal direction', defaultValue: 'up', options: ['up', 'down', 'left', 'right'] },
      { name: 'content', type: 'text-long', label: 'Content', description: 'Revealed content text', defaultValue: 'Revealed Text' },
      { name: 'width', type: 'number', label: 'Width', description: 'Mask container width', defaultValue: 800 },
      { name: 'height', type: 'number', label: 'Height', description: 'Mask container height', defaultValue: 150 },
    ],
  },
  {
    name: 'LightLeakTransition',
    category: 'Transition',
    role: 'transition',
    description: 'Cinematic light leak transition with two overlapping blurred light blobs.',
    props: [
      { name: 'durationFrames', type: 'number', label: 'Duration (frames)', description: 'Transition duration', defaultValue: 20 },
      { name: 'triggerFrame', type: 'number', label: 'Trigger Frame', description: 'Frame when transition starts', defaultValue: 130 },
      { name: 'colorPrimary', type: 'color', label: 'Primary Color', description: 'First light leak color', defaultValue: 'rgba(255, 120, 0, 0.7)' },
      { name: 'colorSecondary', type: 'color', label: 'Secondary Color', description: 'Second light leak color', defaultValue: 'rgba(255, 50, 0, 0.5)' },
      { name: 'intensity', type: 'number', label: 'Intensity', description: 'Transition intensity (0-1)', defaultValue: 1, min: 0, max: 1 },
    ],
  },
  {
    name: 'GlitchTransition',
    category: 'Transition',
    role: 'transition',
    description: 'Digital glitch transition with color inversion and block displacement.',
    props: [
      { name: 'intensity', type: 'number', label: 'Intensity', description: 'Glitch intensity (0-1)', defaultValue: 1, min: 0, max: 1 },
      { name: 'durationFrames', type: 'number', label: 'Duration (frames)', description: 'Transition duration', defaultValue: 10 },
      { name: 'triggerFrame', type: 'number', label: 'Trigger Frame', description: 'Frame when transition starts', defaultValue: 140 },
    ],
  },
  {
    name: 'WipeTransition',
    category: 'Transition',
    role: 'transition',
    description: 'Diagonal wipe transition that sweeps across the screen.',
    props: [
      { name: 'durationFrames', type: 'number', label: 'Duration (frames)', description: 'Transition duration', defaultValue: 15 },
      { name: 'triggerFrame', type: 'number', label: 'Trigger Frame', description: 'Frame when transition starts', defaultValue: 135 },
    ],
  },
  {
    name: 'ZoomBlurTransition',
    category: 'Transition',
    role: 'transition',
    description: 'Zoom and blur transition that scales up with increasing blur.',
    props: [
      { name: 'durationFrames', type: 'number', label: 'Duration (frames)', description: 'Transition duration', defaultValue: 15 },
      { name: 'triggerFrame', type: 'number', label: 'Trigger Frame', description: 'Frame when transition starts', defaultValue: 135 },
    ],
  },

  // ========================================================================
  // CINEMATIC & EFFECTS COMPONENTS
  // ========================================================================
  {
    name: 'WaveformVisualizer',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Animated sine waveform with multiple frequency layers and glow.',
    props: [
      { name: 'lineWidth', type: 'number', label: 'Line Width', description: 'Stroke thickness', defaultValue: 6, min: 1, max: 20 },
      { name: 'amplitude', type: 'number', label: 'Amplitude', description: 'Wave height', defaultValue: 100, min: 20, max: 300 },
    ],
  },
  {
    name: 'AudioSpectrumBars',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Equalizer-style audio spectrum bars with pseudo-random heights.',
    props: [
      { name: 'barCount', type: 'number', label: 'Bar Count', description: 'Number of bars', defaultValue: 15, min: 5, max: 50 },
      { name: 'barWidth', type: 'number', label: 'Bar Width', description: 'Width of each bar', defaultValue: 12, min: 4, max: 30 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Animation speed multiplier', defaultValue: 1, min: 0.5, max: 5 },
    ],
  },
  {
    name: 'SoundWaveCircle',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Expanding concentric circle ripples from a center dot.',
    props: [
      { name: 'rings', type: 'number', label: 'Rings', description: 'Number of expanding rings', defaultValue: 4, min: 1, max: 10 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Expansion speed multiplier', defaultValue: 1, min: 0.5, max: 5 },
    ],
  },
  {
    name: 'RippleEffect',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Pulsing ring ripples that expand and fade from a center point.',
    props: [
      { name: 'maxRadius', type: 'number', label: 'Max Radius', description: 'Maximum ring radius', defaultValue: 300, min: 50, max: 600 },
      { name: 'count', type: 'number', label: 'Count', description: 'Number of staggered rings', defaultValue: 3, min: 1, max: 10 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Expansion speed multiplier', defaultValue: 1, min: 0.5, max: 5 },
    ],
  },
  {
    name: 'EmojiFloat',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Floating emoji particles that rise upward with wiggle and fade.',
    props: [
      { name: 'emoji', type: 'string', label: 'Emoji', description: 'Emoji character to float', defaultValue: '🔥' },
      { name: 'count', type: 'number', label: 'Count', description: 'Number of emoji particles', defaultValue: 10, min: 1, max: 50 },
      { name: 'spread', type: 'number', label: 'Spread', description: 'Horizontal spread range', defaultValue: 300, min: 50, max: 800 },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Float speed multiplier', defaultValue: 1, min: 0.5, max: 5 },
    ],
  },
  {
    name: 'CursorClick',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Animated cursor that moves to a target and clicks with ripple effect.',
    props: [
      { name: 'startX', type: 'number', label: 'Start X', description: 'Starting X position', defaultValue: 800 },
      { name: 'startY', type: 'number', label: 'Start Y', description: 'Starting Y position', defaultValue: 1500 },
      { name: 'endX', type: 'number', label: 'End X', description: 'Target X position', defaultValue: 540 },
      { name: 'endY', type: 'number', label: 'End Y', description: 'Target Y position', defaultValue: 960 },
    ],
  },
  {
    name: 'SearchEngineTyping',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Search bar with typewriter effect and ripple ring on completion.',
    props: [
      { name: 'text', type: 'string', label: 'Text', description: 'Search query text' },
      { name: 'width', type: 'number', label: 'Width', description: 'Search bar width', defaultValue: 900 },
    ],
  },
  {
    name: 'GitCommitGraph',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Git branch visualization with commits, feature branch, and merge.',
    props: [
      { name: 'branches', type: 'number', label: 'Branches', description: 'Number of feature branches', defaultValue: 2, min: 1, max: 5 },
      { name: 'nodeColor', type: 'color', label: 'Node Color', description: 'Main commit node color', defaultValue: '#3b82f6' },
      { name: 'mergeFrame', type: 'number', label: 'Merge Frame', description: 'Frame when merge animation starts', defaultValue: 90 },
    ],
  },
  {
    name: 'BreakingNewsAlert',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Breaking news banner with aggressive pulse animation and warning stripes.',
    props: [
      { name: 'headline', type: 'string', label: 'Headline', description: 'Breaking news headline', defaultValue: 'MAJOR ANNOUNCEMENT' },
    ],
  },
  {
    name: 'BreakingNewsTicker',
    category: 'Cinematic',
    role: 'decorative',
    description: 'Breaking news ticker bar with scrolling text and "BREAKING" badge.',
    props: [
      { name: 'text', type: 'text-long', label: 'Text', description: 'Ticker scroll text', defaultValue: 'LATEST UPDATES: Market hits record highs...' },
      { name: 'speed', type: 'number', label: 'Speed', description: 'Scroll speed', defaultValue: 10, min: 1, max: 30 },
    ],
  },

  // ========================================================================
  // GENERAL / PRIMITIVE COMPONENTS
  // ========================================================================
  {
    name: 'AnimatedArrow',
    category: 'General',
    role: 'general',
    description: 'Animated SVG arrow that draws from start to end point with optional curve.',
    props: [
      { name: 'startX', type: 'number', label: 'Start X', description: 'Arrow start X position', defaultValue: 200 },
      { name: 'startY', type: 'number', label: 'Start Y', description: 'Arrow start Y position', defaultValue: 200 },
      { name: 'endX', type: 'number', label: 'End X', description: 'Arrow end X position', defaultValue: 800 },
      { name: 'endY', type: 'number', label: 'End Y', description: 'Arrow end Y position', defaultValue: 800 },
      { name: 'curved', type: 'boolean', label: 'Curved', description: 'Use bezier curve', defaultValue: true },
      { name: 'strokeWidth', type: 'number', label: 'Stroke Width', description: 'Arrow line thickness', defaultValue: 10, min: 1, max: 30 },
      { name: 'headSize', type: 'number', label: 'Head Size', description: 'Arrowhead size', defaultValue: 25, min: 10, max: 60 },
    ],
  },
  {
    name: 'AnimatedLine',
    category: 'General',
    role: 'general',
    description: 'Animated line that draws from start to end with optional arrowhead and dash style.',
    props: [
      { name: 'startX', type: 'number', label: 'Start X', description: 'Line start X position', defaultValue: 100 },
      { name: 'startY', type: 'number', label: 'Start Y', description: 'Line start Y position', defaultValue: 100 },
      { name: 'endX', type: 'number', label: 'End X', description: 'Line end X position', defaultValue: 900 },
      { name: 'endY', type: 'number', label: 'End Y', description: 'Line end Y position', defaultValue: 900 },
      { name: 'strokeWidth', type: 'number', label: 'Stroke Width', description: 'Line thickness', defaultValue: 8, min: 1, max: 30 },
      { name: 'dashStyle', type: 'select', label: 'Dash Style', description: 'Line pattern', defaultValue: 'solid', options: ['solid', 'dashed', 'dotted'] },
      { name: 'arrowHead', type: 'boolean', label: 'Arrow Head', description: 'Show arrowhead at end', defaultValue: false },
    ],
  },
  {
    name: 'AnimatedShape',
    category: 'General',
    role: 'general',
    description: 'Animated shape (rect, circle, pill, diamond, hexagon) that moves from start to end.',
    props: [
      { name: 'shape', type: 'select', label: 'Shape', description: 'Shape type', defaultValue: 'rounded-rect', options: ['rect', 'circle', 'rounded-rect', 'pill', 'diamond', 'hexagon'] },
      { name: 'width', type: 'number', label: 'Width', description: 'Shape width', defaultValue: 200 },
      { name: 'height', type: 'number', label: 'Height', description: 'Shape height', defaultValue: 200 },
      { name: 'borderRadius', type: 'number', label: 'Border Radius', description: 'Corner radius for rounded shapes', defaultValue: 32 },
      { name: 'startX', type: 'number', label: 'Start X', description: 'Starting X position', defaultValue: -200 },
      { name: 'startY', type: 'number', label: 'Start Y', description: 'Starting Y position', defaultValue: 540 },
      { name: 'endX', type: 'number', label: 'End X', description: 'Target X position', defaultValue: 540 },
      { name: 'endY', type: 'number', label: 'End Y', description: 'Target Y position', defaultValue: 540 },
      { name: 'shadowColor', type: 'color', label: 'Shadow Color', description: 'Drop shadow color', defaultValue: 'rgba(0,0,0,0.3)' },
      { name: 'shadowBlur', type: 'number', label: 'Shadow Blur', description: 'Shadow blur radius', defaultValue: 20 },
      { name: 'shadowOffsetY', type: 'number', label: 'Shadow Offset Y', description: 'Shadow vertical offset', defaultValue: 10 },
      { name: 'rotation', type: 'number', label: 'Rotation', description: 'Rotation in degrees', defaultValue: 0 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Get manifest entry by component name */
export function getComponentManifest(name: string): ComponentManifestEntry | undefined {
  return COMPONENT_MANIFEST.find((entry) => entry.name === name);
}

/** Get all component names from the manifest */
export function getManifestComponentNames(): string[] {
  return COMPONENT_MANIFEST.map((entry) => entry.name);
}

/** Get allowed props for a component (returns Set of prop names) */
export function getAllowedProps(componentName: string): Set<string> {
  const entry = getComponentManifest(componentName);
  if (!entry) return new Set();
  return new Set(entry.props.map((p) => p.name));
}

/** Get manifest entries filtered by category */
export function getComponentsByCategory(category: string): ComponentManifestEntry[] {
  return COMPONENT_MANIFEST.filter((entry) => entry.category === category);
}

/** Get manifest entries filtered by role */
export function getComponentsByRole(role: string): ComponentManifestEntry[] {
  return COMPONENT_MANIFEST.filter((entry) => entry.role === role);
}

/** Generate a props object with default values for a component */
export function getDefaultProps(componentName: string): Record<string, unknown> {
  const entry = getComponentManifest(componentName);
  if (!entry) return {};

  const defaults: Record<string, unknown> = {};
  for (const prop of entry.props) {
    if (prop.defaultValue !== undefined) {
      defaults[prop.name] = prop.defaultValue;
    }
  }
  return defaults;
}
