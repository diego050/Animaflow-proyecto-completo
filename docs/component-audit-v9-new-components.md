# Component Registry — Session v9 New Components (2026-06-22)

Registry of all **23 new components** created in session v9. This document ensures any future AI agent can discover, understand, and correctly use these components.

Date of creation: **2026-06-22**

Related docs: `coordinate-contract.md`, `responsive-contract.md`, `component-audit-v8.md`

---

## Standards Compliance

ALL 23 components pass the following contracts:

| Standard | Requirement | Status |
|---|---|---|
| **Coordinate Contract** | `left: ${c.width/2 + x}px`, `top: ${c.height/2 + y}px`, `transform: 'translate(-50%, -50%)'` | ✅ |
| **Responsive Sizing** | ALL use `useCanvas()` — zero hardcoded structural px | ✅ |
| **Determinism** | ALL use `useCurrentFrame()` — no `Math.random()` (except Remotion's `random(i)` which is deterministic) or `Date.now()` | ✅ |
| **UniversalProps** | ALL extend the base interface | ✅ |
| **Registry** | ALL have import + name + registry entry in `registry.ts` | ✅ |
| **Manifest** | ALL have manifest entry with typed props | ✅ |
| **9:16 Compatible** | ALL work in vertical format | ✅ |

---

## Component Catalog

### Charts & Data (dataviz)

| # | Component | Role | Key Props | Description |
|---|---|---|---|---|
| 1 | `StyleLineChart` | dataviz | `data`, `lineColor`, `lineColorEnd`, `fillColor`, `fillArea`, `showDots`, `showGrid`, `showYAxisLabels`, `showAxisLines`, `title` | Line/area chart with glassmorphic card, gradient line, glow, clipPath area reveal, Y-axis labels |
| 2 | `StylePieChart` | dataviz | `data`, `showLabels`, `showValues`, `variant`, `innerRadius`, `explodeSlice`, `showTitle`, `title`, `centerText` | Pie/donut chart with glassmorphic card, strokeDasharray donut, center text, explode bug fix |
| 3 | `StyleDonutChart` | dataviz | `data`, `showLabels`, `showTitle`, `title`, `centerValue`, `centerLabel`, `centerSuffix`, `showBackgroundRing`, `ringColor`, `strokeWidth` | KPI donut with animated center counter, background ring, completion rate |
| 4 | `StyleMultiBar` | dataviz | `data`, `showTitle`, `title`, `showValues`, `barHeight`, `maxValue` | Card with N animated progress bars, each with label + animated percentage counter |
| 5 | `StyleStatCard` | dataviz | `from`, `to`, `prefix`, `suffix`, `label`, `showLabel`, `subStatPrimary`, `subStatSecondary`, `subStatColor`, `duration`, `numberSize` | KPI stat card with animated counter, label, sub-stats row |
| 6 | `StyleComparisonChart` | dataviz | `beforeValue`, `afterValue`, `beforeLabel`, `afterLabel`, `beforeColor`, `afterColor`, `showTitle`, `title`, `maxValue`, `barWidth` | Before/after comparison with two animated bars, values, divider |
| 12 | `StyleProgressSteps` | dataviz | `steps`, `framesPerStep`, `direction`, `showTitle`, `title`, `circleSize`, `lineLength`, `activeColor`, `inactiveColor`, `gradientStart/End`, `springDamping/Stiffness/Mass` | Progress timeline with sequential step fill, connecting lines, horizontal/vertical |

### Text & Typography (text)

| # | Component | Role | Key Props | Description |
|---|---|---|---|---|
| 7 | `StylePulseText` | text | `text`, `textColor`, `glowColor`, `cycleDuration`, `staggerDelay`, `pulseScale`, `fontWeight` | Per-character pulse animation with glow, continuous loop |
| 8 | `StyleSpringText` | text | `text`, `textColor`, `entranceFrom`, `maxRotation`, `staggerDelay`, `springMass`, `springDamping`, `textAlign` | Per-character spring entrance with opacity + translation + rotation |
| 9 | `StyleCountdown` | text | `labels`, `framesPerLabel`, `fontSize`, `finalFontSize`, `textColor`, `gradientStart`, `gradientEnd`, `bgColor`, `springDamping`, `springStiffness`, `springMass` | Cinematic "5-4-3-2-1-GO" countdown with per-number spring |
| 13 | `StyleTextHighlight` | text | `text`, `framesPerWord`, `fontSize`, `textColor`, `gradientStart/End`, `highlightOpacity`, `borderRadius`, `paddingX/Y`, `fontWeight`, `gap` | Per-word background pill that fills sequentially |

### Layout & Containers (container)

| # | Component | Role | Key Props | Description |
|---|---|---|---|---|
| 10 | `StyleRotatingCarousel` | container | `cards`, `rotationSpeed`, `radius`, `cardWidth`, `cardHeight`, `showTitle`, `title`, `cardGradientStart/End`, `iconGradientStart/End` | 3D rotating carousel with all cards visible, depth simulation |
| 14 | `StyleCardFlip` | container | `frontText`, `backText`, `frontGradientStart/End`, `backGradientStart/End`, `cardWidth/Height`, `fontSize`, `borderRadius`, `perspective`, `springDamping/Mass`, `loop` | 3D card flip with configurable front/back faces |

### UI & Social (social)

| # | Component | Role | Key Props | Description |
|---|---|---|---|---|
| 11 | `StyleNotificationStack` | social | `notifications`, `showTitle`, `title`, `cardWidth`, `slideDistance`, `springDamping/Stiffness/Mass`, `showBadge`, `badgeCount`, `badgeColor` | Stack of notification cards sliding in from right with staggered spring |

### Effects & VFX (vfx)

| # | Component | Role | Key Props | Description |
|---|---|---|---|---|
| 15 | `StyleParticleExplosion` | vfx | `particleCount`, `text`, `textFontSize`, `textColor`, `textShadow`, `particleSize`, `maxDistance`, `hueStart/Range`, `saturation`, `lightness`, `springDamping/Mass`, `rotationSpeed`, `fadeDuration` | Particle explosion with spring physics, rotation, fade out |
| 16 | `StyleSoundWave` | vfx | `variant` (line/bars), `color`, `width`, `glow`, `lineWidth`, `amplitude`, `points`, `direction`, `speed`, `barCount`, `maxBarHeight`, `gap` | Sound wave with two variants: continuous sine wave or equalizer bars |
| 17 | `StylePixelTransition` | vfx | `pixelSize`, `width`, `height`, `bgColor`, `hueStart/Range`, `saturationMin/Max`, `lightnessMin/Max`, `maxDelay` | Pixelated background fill with random appearance |
| 18 | `StyleStarfield` | vfx | `starCount`, `width`, `height`, `bgColor`, `starColor`, `colorVariation`, `minSize`, `maxSize`, `speed`, `cycleLength`, `movement` (radial/random/directional), `direction`, `opacityFade` | Starfield with 3 movement patterns, configurable colors and area |
| 19 | `StyleBokehCircles` | vfx | `circleCount`, `width`, `height`, `bgColor`, `colors`, `minSize`, `maxSize`, `speed`, `minOpacity`, `maxOpacity` | Bokeh/depth-of-field with soft glowing circles, drift, pulse |
| 20 | `StyleGridPulse` | vfx | `cols`, `rows`, `width`, `height`, `bgColor`, `dotColor`, `dotSize`, `waveSpeed`, `waveFrequency`, `minOpacity`, `maxOpacity`, `minScale`, `maxScale` | Grid of dots with pulse wave traveling outward from center |
| 21 | `StyleLiquidWave` | vfx | `numberOfPoints`, `width`, `height`, `bgColor`, `waveColorStart/End`, `amplitude`, `speed`, `frequency`, `blur`, `yOffset` | SVG liquid wave with gradient, blur, sine wave animation |
| 22 | `StyleZoomPulse` | vfx | `url`, `width`, `height`, `minScale`, `maxScale`, `speed`, `overlay`, `overlayColor`, `color1`, `color2` | Image that pulses (zooms in/out rhythmically) in continuous loop |
| 23 | `StyleParallaxPan` | vfx | `url`, `width`, `height`, `direction`, `scale`, `duration`, `overlay`, `overlayColor`, `color1`, `color2` | Image that pans slowly in configurable direction with scale > 1 |

---

## Comparison Tables

### Image Motion Components

| Component | Behavior | Loop? | Use Case |
|---|---|---|---|
| KenBurns (existing) | One-way zoom + pan | No | Hero image entrance |
| StyleZoomPulse | Rhythmic zoom in/out | Yes (sine wave) | Ambient background, mood |
| StyleParallaxPan | Continuous slow pan in one direction | Yes | Subtle movement, depth |

### Text Animation Components

| Component | Effect | Loop? | Use Case |
|---|---|---|---|
| StylePulseText | Per-character pulse + glow | Yes | Emphasis, continuous energy |
| StyleSpringText | Per-character spring entrance | No (one-time) | Title reveal, entrance |
| StyleTextHighlight | Per-word background pill fill | No (sequential) | Karaoke-style, reading guide |
| StyleCountdown | Sequential label reveal with spring | No (one-way) | Launch, event countdown |

### Chart Components

| Component | Visual | Use Case |
|---|---|---|
| StyleLineChart | Line/area with gradient + glow | Trends, time series |
| StylePieChart | Pie/donut with legend | Parts of whole |
| StyleDonutChart | Donut with center counter | KPI completion rate |
| StyleMultiBar | Multiple progress bars | Skills, comparisons |
| StyleComparisonChart | Two bars side by side | Before/after |
| StyleProgressSteps | Timeline with steps | Process, roadmap |
| StyleStatCard | Single KPI with sub-stats | Dashboard metric |

### Background/VFX Components

| Component | Visual | Use Case |
|---|---|---|
| StyleParticleExplosion | Burst from center | Impact, celebration |
| StyleSoundWave | Line or bars | Audio visualization |
| StylePixelTransition | Pixel fill | Tech, digital mood |
| StyleStarfield | Stars with 3 movements | Space, ambiance |
| StyleBokehCircles | Soft glowing circles | Dreamy, romantic |
| StyleGridPulse | Dot grid with wave | Tech, data viz |
| StyleLiquidWave | SVG sine wave | Fluid, ambient |

---

## Compliance Checklist

- [x] All 23 components use coordinate contract (`x/y` + `translate(-50%, -50%)`)
- [x] All 23 components use `useCanvas()` for responsive sizing
- [x] All 23 components are deterministic (`useCurrentFrame()`, no `Math.random()`/`Date.now()`)
- [x] All 23 components extend `UniversalProps`
- [x] All 23 components registered in `registry.ts`
- [x] All 23 components have manifest entries with typed props
- [x] All 23 components compatible with 9:16 aspect ratio
- [x] All 23 components pass `tsc -b` type checking

---

## Summary

**23 new components** created in session v9 across 5 categories:

| Category | Count | Components |
|---|---|---|
| Charts & Data | 7 | StyleLineChart, StylePieChart, StyleDonutChart, StyleMultiBar, StyleStatCard, StyleComparisonChart, StyleProgressSteps |
| Text & Typography | 4 | StylePulseText, StyleSpringText, StyleCountdown, StyleTextHighlight |
| Layout & Containers | 2 | StyleRotatingCarousel, StyleCardFlip |
| UI & Social | 1 | StyleNotificationStack |
| Effects & VFX | 9 | StyleParticleExplosion, StyleSoundWave, StylePixelTransition, StyleStarfield, StyleBokehCircles, StyleGridPulse, StyleLiquidWave, StyleZoomPulse, StyleParallaxPan |

Total component count after v9: **112 + 23 = 135 components**
