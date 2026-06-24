"""Generador de animaciones Remotion con IA (prototipo admin code-gen).

La IA escribe un componente React/Remotion COMPLETO (no orquesta el catálogo).
El modelo NO está hardcodeado: sale de las credenciales del usuario o del que se pase.
"""
from typing import Optional
import re

from app.core.logging import get_logger
from app.modules.llm.animation_validator import validate_animation_code

logger = get_logger("animation_gen")

# Dimensiones por aspect ratio. El prototipo usa 9:16 (reel vertical).
_DIMS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
}
_FPS = 30

_SYSTEM_RULES = """Eres un experto en motion-graphics con Remotion (React). Generas UN componente \
React autocontenido que renderiza una animación PROFESIONAL, dinámica y moderna (estilo reel viral).

REGLAS OBLIGATORIAS:
1. UN solo componente, exportado EXACTAMENTE así: `export const Animation: React.FC = () => { ... }`.
2. Imports ÚNICAMENTE de "react" y "remotion". NADA más (sin librerías externas, sin CSS imports, sin URLs/imágenes externas).
   De "remotion" puedes usar: AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence, Series, random, interpolateColors.
3. DETERMINISMO ESTRICTO (crítico — el preview debe verse IGUAL que el render):
   - PROHIBIDO: Math.random(), Date.now(), new Date(), performance.now(), setTimeout, setInterval.
   - Para cualquier "azar" usa SIEMPRE `random("una-semilla-string")` de remotion (mismo seed = mismo valor para siempre).
   - TODA la animación se deriva de useCurrentFrame(). Nada de tiempo real.
4. Estilos SOLO inline (style={{...}}). NUNCA uses className (no hay CSS global; quedaría sin estilo).
5. Diseña para un lienzo VERTICAL 9:16. Usa <AbsoluteFill>. Centra el contenido, deja márgenes seguros, texto grande y legible.
6. Hazlo DINÁMICO y PROFESIONAL: gradientes, sombras/glows, springs con rebote, movimiento continuo (parallax/float con Math.sin(frame/N)), entradas y salidas escalonadas. El CENTRO debe ser un VISUAL fuerte (formas, tarjetas, cifras, íconos vectoriales hechos con SVG/divs), NO solo texto plano.
7. Si usas texto: corto e impactante, bien tipografiado (peso alto, buen tracking). Nada de párrafos largos.
8. Puedes dibujar formas/íconos con SVG inline o divs con estilos. Asegúrate de que SVG use elementos SVG (<circle>, <path>) DENTRO de un <svg>, nunca como divs sueltos.
9. Devuelve SOLO el código TSX del componente. Sin explicaciones, sin markdown, sin ```."""

# Few-shot: un ejemplo BUENO y DETERMINISTA para anclar calidad.
_FEWSHOT = """EJEMPLO de salida válida (estilo y calidad esperados):
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";

export const Animation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const float = Math.sin(frame / 18) * 14;
  const titleIn = interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, #1e293b, #020617 70%)", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const px = random("px-" + i) * 1080;
        const py = (random("py-" + i) * 1920 + frame * (1 + random("sp-" + i) * 2)) % 1920;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 4, height: 4, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8", opacity: 0.4 }} />;
      })}
      <div style={{ transform: "scale(" + pop + ") translateY(" + float + "px)", width: 520, height: 520, borderRadius: 48, background: "linear-gradient(135deg, #38bdf8, #6366f1)", boxShadow: "0 40px 90px rgba(56,189,248,0.4)", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: 220, fontWeight: 900, color: "#fff" }}>+250%</div>
      </div>
      <h1 style={{ position: "absolute", bottom: 280, color: "#fff", fontSize: 64, fontWeight: 800, opacity: titleIn, textAlign: "center", margin: 0 }}>Crecimiento real</h1>
    </AbsoluteFill>
  );
};"""


def _strip_fences(text: str) -> str:
    """Quita ```tsx ... ``` y prosa antes/después; deja solo el código."""
    t = (text or "").strip()
    t = re.sub(r'^```[a-zA-Z]*\s*\n', '', t)
    t = re.sub(r'\n```\s*$', '', t)
    t = t.replace('```tsx', '').replace('```jsx', '').replace('```typescript', '').replace('```ts', '').replace('```', '')
    return t.strip()


def _build_prompt(user_prompt, width, height, duration_frames, previous_code, edit_instruction):
    canvas = f"Lienzo {width}x{height} (vertical 9:16, formato reel) a {_FPS}fps, duración {duration_frames} frames."
    if previous_code and edit_instruction:
        return (
            f"{_SYSTEM_RULES}\n\n{canvas}\n\nEste es el componente ACTUAL:\n"
            f"{previous_code}\n\n"
            f'El usuario pide este CAMBIO: "{edit_instruction}"\n\n'
            "Aplica SOLO ese cambio (lo mínimo necesario) y conserva TODO lo demás igual. "
            "Devuelve el componente COMPLETO ya corregido, solo código."
        )
    return (
        f"{_SYSTEM_RULES}\n\n{_FEWSHOT}\n\n{canvas}\n\n"
        f'Crea una animación para: "{user_prompt}"\n\n'
        "Devuelve SOLO el código del componente."
    )


def generate_animation(
    prompt: str,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    aspect_ratio: str = "9:16",
    duration_seconds: int = 6,
    previous_code: Optional[str] = None,
    edit_instruction: Optional[str] = None,
) -> dict:
    """Genera (o edita) un componente Remotion. Devuelve dict con code/valid/errors/meta."""
    from app.modules.llm.resolver import resolve_llm_credentials
    from app.modules.llm.client import _call_llm_sync
    from google import genai
    from google.genai import types

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    use_model = model or creds.model  # configurable — NO hardcode
    if not api_key:
        raise ValueError("No hay API key de LLM configurada para tu usuario.")

    width, height = _DIMS.get(aspect_ratio, _DIMS["9:16"])
    duration_frames = int(duration_seconds * _FPS)

    client = genai.Client(api_key=api_key)
    full_prompt = _build_prompt(prompt, width, height, duration_frames, previous_code, edit_instruction)

    # Sin response_schema (es código, no JSON). Sin thinking_config (dejamos el default
    # del modelo: a Gemini el thinking le ayuda a programar; a Gemma no se le manda).
    config = types.GenerateContentConfig(temperature=0.4, max_output_tokens=12000)

    code = ""
    errors: list[str] = []
    for attempt in range(2):  # 1 intento + 1 retry con feedback
        resp = _call_llm_sync(
            client=client, model=use_model, contents=full_prompt,
            config=config, label="LLM Animation",
        )
        code = _strip_fences(resp.text or "")
        valid, errors = validate_animation_code(code)
        if valid:
            break
        logger.warning("Animación inválida (intento %d): %s", attempt + 1, errors)
        full_prompt += (
            f"\n\nEl código que diste tuvo estos PROBLEMAS: {errors}. "
            "Corrígelos y devuelve el componente completo, solo código."
        )

    return {
        "code": code,
        "valid": len(errors) == 0,
        "errors": errors,
        "model": use_model,
        "width": width,
        "height": height,
        "duration_frames": duration_frames,
    }
