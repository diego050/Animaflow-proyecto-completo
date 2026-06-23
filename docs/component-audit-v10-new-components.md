# Component Registry — Session v10 New Components ("remocn"-style)

Registry of the **23 new components** created in session v10, adapted from the
"remocn" component library (shadcn-style Remotion primitives) to AnimaFlow's
conventions. This document ensures any future AI agent can discover, understand,
and correctly use these components.

Date of creation: **2026-06-22**

Related docs: `component-audit-v9-new-components.md`, `coordinate-contract.md`,
`responsive-contract.md`, `component-audit-v8.md`

---

## Standards Compliance

ALL 23 components pass the same contracts as v9:

| Standard | Requirement | Status |
|---|---|---|
| **Coordinate Contract** | `top: ${c.height/2 + y}px`, `left: ${c.width/2 + x}px`, `translate(-50%, -50%)` (positioned comps); full-bleed for backgrounds | ✅ |
| **Responsive Sizing** | type/structural sizing via `useCanvas()` (`vmin`/`vw`/`vh`) | ✅ |
| **Determinism** | `useCurrentFrame()` only — no `Math.random()` / `Date.now()` (cursor/pointer gestures adapted to deterministic timelines) | ✅ |
| **UniversalProps** | ALL extend the base interface | ✅ |
| **`style` prop** | ALL accept `style?: Record<string, unknown>` (legacy passthrough) | ✅ |
| **Registry** | import + name + registry entry in `registry.ts` | ✅ |
| **Manifest** | manifest entry with typed props + keyword-rich description | ✅ |
| **AE export** | dedicated block in `components_generator.py` (158/158 coverage incl. 2 parallel-added + 1 clock wipe) | ✅ |
| **Build** | `tsc -b` + `check:manifest` green | ✅ |

Total components: **158** (the 23 v10 additions + 2 parallel-added on top of the prior 133).

---

## Component Catalog

### Text & Typography (text)

| # | Component | Key Props | Description |
|---|---|---|---|
| 1 | `StaggeredFadeUp` | `text`, `textColor`, `fontWeight`, `staggerDelay`, `distance`, `duration`, `speed`, `textAlign` | Words fade in and rise into place one by one (clean modern headline entrance). |
| 2 | `MaskedSlideReveal` | `text`, `textColor`, `fontWeight`, `staggerDelay`, `springDamping`, `speed`, `textAlign` | Words slide up from behind a per-word clipping mask (premium kinetic reveal). |
| 3 | `TrackingIn` | `text`, `textColor`, `fontWeight`, `startTracking`, `startBlur`, `duration`, `speed` | Letter-spacing + blur contract into a crisp settled headline (cinematic intro). |
| 4 | `ShimmerSweep` | `text`, `baseColor`, `shineColor`, `fontWeight`, `cycleDuration`, `speed` | Bright shine band sweeps across text on a loop (loading / "Generating…"). |
| 5 | `SlotMachineRoll` | `from`, `to`, `textColor`, `fontWeight`, `spins`, `springDamping`, `staggerDelay`, `speed` | Digits roll into place like a slot-machine reel (price / score / stat reveal). |
| 6 | `PerspectiveMarquee` | `text`, `textColor`, `fontWeight`, `pixelsPerFrame`, `rotateY`, `rotateX`, `perspective`, `fadeColor`, `speed` | Infinite horizontal marquee tilted in 3D with edge fades. |

### Background (background)

| # | Component | Key Props | Description |
|---|---|---|---|
| 7 | `MeshGradientBg` | `background`, `color1..color4`, `blur`, `speed` | Full-screen animated mesh gradient (aurora-style soft blobs that drift + blend). |
| 8 | `DynamicGrid` | `cellSize`, `lineColor`, `background`, `lineWidth`, `speed`, `direction` (diagonal/up/down/left/right) | Flat 2D line grid scrolling continuously (blueprint / tech backdrop). |

### UI (ui)

| # | Component | Key Props | Description |
|---|---|---|---|
| 9 | `SpotlightCard` | `title`, `body`, `cardWidth`, `cardHeight`, `glowSize`, `glowOpacity`, `glowColor`, `cardColor`, `textColor`, `mutedColor`, `borderColor`, `borderRadius`, `speed` | Dark card with a soft radial spotlight gliding over the surface. Glow follows a deterministic orbit (no cursor in video). |
| 10 | `DataFlowPipes` | `pipeColor`, `pulseColor`, `pulseLength`, `pulseDuration`, `nodeColor`, `textColor`, `accent`, `nodes`, `speed` | Circuit-board pipes connecting labeled nodes with pulses travelling along them (data flow / pipeline / architecture). Distinct from NetworkNodes (proximity neural net). |
| 11 | `CodeDiffWipe` | `before`, `after`, `language`, `background`, `textColor`, `accent`, `fontSize`, `transitionStart`, `transitionDuration`, `showHandle`, `speed` | Code editor wiping from a before to an after version with a sweeping handle (code diff / refactor / migration). Complements CodeBlockHighlight + TerminalHacker (neither does diffs). |
| 12 | `DragAndDropFlow` | `accent`, `dropzoneLabel`, `fileName`, `cardColor`, `textColor`, `mutedColor`, `speed` | A file card drags into a dropzone, drops, then uploads with a progress bar + success check (file upload / drag and drop). Gesture plays on a deterministic timeline. |

### UI — AI mockups (ui)

| # | Component | Key Props | Description |
|---|---|---|---|
| 13 | `ClaudeChat` | `greeting`, `placeholder`, `prompt`, `modelName`, `modelTier`, `accentColor`, `bgColor`, `textColor`, `mutedColor`, `speed` | Claude.ai-style chat landing: greeting, input with a prompt being typed, model chip. |
| 14 | `ChatGpt` | `greeting`, `placeholder`, `prompt`, `accentColor`, `bgColor`, `textColor`, `mutedColor`, `speed` | ChatGPT-style chat landing: greeting + pill input with a prompt being typed. |
| 15 | `ClaudeCode` | `title`, `userName`, `model`, `cwd`, `placeholder`, `prompt`, `accentColor`, `bgColor`, `textColor`, `mutedColor`, `speed` | Claude Code CLI mockup: terminal welcome box (user/model/cwd) + prompt input typed. |
| 16 | `OpenCode` | `placeholder`, `query`, `agentName`, `modelName`, `provider`, `accentColor`, `bgColor`, `textColor`, `mutedColor`, `speed` | OpenCode TUI mockup: logo, query input typed, status bar (agent / model / provider). |

### Social / VFX / diagram

| # | Component | Category | Description |
|---|---|---|---|
| 17 | `GitHubStars` | Social | GitHub repo card with an animated star counter + star icon (light/dark theme). |
| 18 | `XFollowCard` | Social | X (Twitter) profile follow card: cover, avatar, name + verified, handle, bio, meta, Follow button. |
| 19 | `XFollowersOverview` | Social | X followers summary: avatar, handle, big animated follower count. Distinct from generic `FollowerCounter` (IG/YT/TikTok). |
| 20 | `Confetti` | Effects & VFX | Burst of confetti pieces flying up + falling under gravity, spinning (celebration). Seeded, deterministic. |
| 21 | `EcosystemConstellation` | UI | Central hub with orbiting satellites + connecting lines (ecosystem / integrations / hub-and-spoke). |
| 22 | `InfiniteBentoPan` | Background | Bento grid of cards panning diagonally forever, looping, with accented cards. |
| 23 | `StyleClockWipe` | Effects & VFX | Clock wipe transition using conic-gradient mask that sweeps like a clock hand (circular wipe / radial wipe / iris transition). Configurable mode (in/out), direction (clockwise/counter-clockwise), duration, and colors. |

> Plus 2 components added in parallel (outside the remocn batches) that now also
> have AE blocks for 1:1 coverage: `StyleShakeCard`, `StyleSpotlightReveal`.

---

## Transitions (separate subsystem)

These live in `frontend/src/remotion/transitions/` — NOT in the component
manifest/registry/AE pipeline. They are scene-to-scene transitions with the
contract `({ progress, color }) => JSX` and are selected by name via the per-scene
`transition` field. Registered in `TransitionWrapper.tsx` (`TRANSITION_MAP` +
exports), `backend/app/schemas/spec.py` (the `transition` field descriptions) and
`frontend/src/types/spec.ts` (the `transition` union).

> **Atomic transitions (v10):** the transition contract was extended to
> `({ progress, color, params }) => JSX`. A new optional `transition_params`
> object flows scene → `MainComposition` → `TransitionWrapper` → the transition,
> so the v10 transitions expose atomic props (direction, blur, cols/rows,
> pattern, aberrationOffset, etc.) with sensible defaults. The transition
> **duration** is also per-cut atomic via `transition_params.durationFrames`
> (default 18 ≈ 0.6s), honored by both the preview and the AE export. NOTE: there
> is currently NO frontend UI that writes `transition`/`transition_params` — they
> come from the LLM spec or auto-pick. A per-scene transitions UI is a pending
> frontend task. The original
> transitions (Fade/Wipe/Zoom/Glitch/LightLeak/Gradient) ignore `params` and keep
> working unchanged. New transition names were also added to `VALID_TRANSITIONS`
> in `MainComposition` so overrides are honored.

| Transition | Effect |
|---|---|
| `ZoomThroughTransition` | **Special (compositor):** real 2-scene zoom — the outgoing scene zooms in (`targetScale`) and dissolves over the real incoming scene (like `CrossDissolve` + scale). Implemented via `CrossDissolveOut` in `MainComposition`, NOT an overlay. Atomic param: `targetScale` (default 2.5). |
| `SpatialPush` | **Special (compositor):** real push — the outgoing scene slides off-screen (`direction`) revealing the incoming, no fade. Implemented via `CrossDissolveOut` (slide), NOT an overlay. Atomic param: `direction` (left/right/up/down, default left). |
| `FrostedGlassWipe` | A frosted-glass panel sweeps across, blurring what's behind, then clears. |
| `GridPixelateWipe` | A 12×7 grid fills in a diagonal wave (pixelated reveal). |
| `ChromaticAberrationWipe` | A wipe whose edge splits into red/cyan fringes peaking mid-transition (cleaner than `GlitchTransition`). |
| `WhipPanTransition` | Fast whip pan: a motion-blurred band sweeps across (X/Y-stretch + speed streaks) to mask the cut. Params: `direction`, `stretch`, `blur`. |
| `SlideWipe` | A solid panel slides across, covering at the midpoint then sliding off to reveal the next scene. Params: `direction`, `useSpring`. |
| `MorphTransition` | **Special (compositor):** the outgoing scene zooms OUT (`scaleTo`, default 0.5) and dissolves over the incoming (morph feel). Same `CrossDissolveOut` mechanism as CrossDissolve/ZoomThrough. |
| `CrossDissolve` | **Special:** true A↔B crossfade, NOT a veil. Implemented at the compositor level in `MainComposition` (`CrossDissolveOut`): the outgoing scene is re-rendered aligned to its own timeline and faded out (1→0) over the real incoming scene. The only transition that blends two scenes. Cost: the outgoing scene renders twice across its duration — use sparingly. |

Atomic param keys per transition: `ZoomThroughTransition` → `targetScale` (compositor); `MorphTransition` → `scaleTo` (compositor); `SpatialPush` → `direction` (compositor); `FrostedGlassWipe` → `glassBlur`/`direction`; `GridPixelateWipe` → `cols`/`rows`/`pattern`/`fade`; `ChromaticAberrationWipe` → `direction`/`aberrationOffset`; `WhipPanTransition` → `direction`/`stretch`/`blur`; `SlideWipe` → `direction`/`useSpring`. Passed via the scene's `transition_params`.

Skipped (transitions): `DirectionalWipe` (covered by `WipeTransition`).
Skipped (not a transition): `DeviceMockupZoom` — a device mockup; covered by
`PhoneMockup` + `BrowserWindow` (+ the universal `scale` prop). A dedicated laptop
mockup could be added later as a component if needed.

---

## AE export — full-video timeline parity (v10)

`backend/app/modules/ae_export/script_builder.py::create_ae_full_script` now builds
a **master composition** so the downloaded `.jsx` reproduces the whole edited video
(not just isolated scenes), editable layer by layer in After Effects:

- Each scene is captured as a **precomp** (`Scene 1`, `Scene 2`, …) via
  `__afFindNewComp` (measures `app.project.numItems` before/after each scene block,
  so it works regardless of the scene script's internal variable names — including
  LLM-generated `ae_script_code`).
- A master comp `AnimaFlow_Video` places each scene precomp at its **cumulative time
  offset** (contiguous timeline, total = sum of scene durations).
- **Transitions** are emitted at each cut (`_transition_layer_code`):
  - Veil transitions (Fade/Glitch/LightLeak/Gradient/Frosted/Pixelate/Chromatic) →
    a color solid with opacity `0→100→0` centered on the cut.
  - Directional (Wipe/SlideWipe/SpatialPush/WhipPan) → a solid that sweeps across.
  - Blend (CrossDissolve/ZoomThrough) → the outgoing scene precomp is duplicated,
    `timeRemapEnabled` (freezes the last frame when extended past its end) and faded
    out (+ scaled for zoom) over the incoming scene → a real 2-scene blend in AE.

Note: AE transitions are native approximations of the preview (solids + keyframes /
precomp blends), tuned to match timing (`SCENE_TRANSITION_FRAMES = 18 ≈ 0.6s`). The
per-component download (`admin.py`) is unchanged — it still exports a single
component/scene without a timeline.

---

## Dedup Decisions (remocn items intentionally SKIPPED)

These remocn components were **not** created because AnimaFlow already covers them:

| remocn | Existing equivalent |
|---|---|
| `Typewriter` | `Typewriter` (with cursor + karaoke `wordTimestamps`) |
| `MatrixDecode` | `StyleScrambleText` (scramble/decode) |
| `RGBGlitchText` | `GlitchTitle` (RGB channel split, clipPath, blend screen) |
| `InfiniteMarquee` | `StyleTicker` (loop / direction / separator) |
| `InlineHighlight` / `MarkerHighlight` | `HighlightText` (marker sweep) + `WordHighlight` (karaoke) — low-novelty, skipped |
| `AnimatedLineChart` | `StyleLineChart` (line/area, grid, dots, draws itself) |
| `AnimatedBarChart` | `StyleBarChart` (vertical/horizontal animated bars) |
| `ProgressSteps` | `StyleProgressSteps` (steps, framesPerStep, direction, active/inactive colors) |

Near-but-distinct (kept separate on purpose):

| New | Why not a duplicate |
|---|---|
| `MeshGradientBg` | `FloatingBlobs` = discrete radial glows; this = continuous full-bleed blended mesh |
| `DynamicGrid` | `GridPerspective` = 3D floor; `StyleGridPulse` = dot matrix; this = flat scrolling line grid |
| `SpotlightCard` | `Spotlight` = background light; this = a card with title/body + grazing glow |
| `DataFlowPipes` | `NetworkNodes` = proximity neural net; this = orthogonal circuit pipes with travelling pulses |
| `CodeDiffWipe` | `CodeBlockHighlight`/`TerminalHacker` = typing/highlight/terminal; this = before/after diff wipe |
| `ClaudeCode` / `OpenCode` | branded AI-agent CLIs vs the generic `TerminalHacker` |
| `TrackingIn` | overlaps slightly with a pure `BlurReveal` (being built separately) but adds letter-spacing tracking |

### "Black screen" assessment
The existing code/terminal components (`TerminalHacker`, `CodeBlockHighlight`) are
already well-built (mac chrome, typing, line highlight, line numbers, elevation/
radius tokens, responsive). They did **not** need fixing — the new `CodeDiffWipe`
and the AI CLIs (`ClaudeCode`, `OpenCode`) **add** capabilities rather than
replace them.

---

## Notes

- **AE export**: deterministic approximations (native shape/text layers + simple
  keyframes), not pixel-perfect reproductions. Text comps emit a text layer +
  opacity/position/scale keyframes; backgrounds emit a bg solid + color blobs
  (mesh) or line shapes (grid); UI/AI mockups emit a window/card + input box +
  greeting/title + typed prompt text.
- **Re-embed pending**: until the project-end re-embed/re-seed runs, the LLM
  matcher cannot auto-select these 16 — they are usable in the gallery/playground
  and via explicit selection meanwhile.
- **Naming**: clean names (no `Style` prefix), matching the existing primitives
  (`SplitText`, `TextReveal`, `Typewriter`, `TerminalHacker`). Exception:
  `StyleClockWipe` uses the `Style` prefix as it belongs to the Style* family of
  configurable transition/VFX components.
