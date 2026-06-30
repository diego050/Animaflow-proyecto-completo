"""Generador de animaciones Remotion con IA (prototipo admin code-gen).

La IA escribe un componente React/Remotion COMPLETO (no orquesta el catálogo).
El modelo NO está hardcodeado: sale de las credenciales del usuario o del que se pase.
"""
from typing import Optional
import re

from app.core.logging import get_logger
from app.modules.llm.animation_validator import validate_animation_code
from app.services.settings_store import get_setting

logger = get_logger("animation_gen")

_FPS = 30


def _parse_dims(aspect_ratio: str) -> tuple[int, int]:
    """Dims (w, h) para CUALQUIER aspect ratio 'W:H' (presets o custom: 4:3, 21:9, 2.39:1…).
    El lado CORTO queda en 1080 (igual que los presets); el largo escala. Default 9:16."""
    try:
        w_str, h_str = str(aspect_ratio).replace(" ", "").split(":")
        wr, hr = float(w_str), float(h_str)
        if wr <= 0 or hr <= 0:
            raise ValueError
    except Exception:  # noqa: BLE001
        return (1080, 1920)
    ratio = wr / hr
    if ratio >= 1:  # horizontal o cuadrado → alto 1080
        h, w = 1080, round(1080 * ratio)
    else:  # vertical → ancho 1080
        w, h = 1080, round(1080 / ratio)
    return (w + (w % 2), h + (h % 2))  # dims pares (encoders)

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
   - CLAMP OBLIGATORIO: en CADA `interpolate(...)` pon SIEMPRE `{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }`. Si no, fuera del rango los valores se disparan al infinito y el texto/elementos "vuelan" fuera de pantalla. Ej: `interpolate(frame, [0, 30], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })`.
4. Estilos SOLO inline (style={{...}}). NUNCA uses className (no hay CSS global; quedaría sin estilo).
5. RESPONSIVO al lienzo (NO hardcodees el tamaño): obtén las dimensiones con `const { width, height } = useVideoConfig()` y posiciona/escala TODO relativo a esos valores (porcentajes, width/2, width*0.08, Math.min(width,height), etc.). Nunca uses números fijos asumiendo 1080×1920. Usa <AbsoluteFill>, centra el contenido, deja márgenes seguros, texto grande y legible. Debe verse bien en cualquier proporción (vertical, cuadrado u horizontal).
6. Hazlo DINÁMICO y PROFESIONAL: gradientes, sombras/glows, springs con rebote, movimiento continuo (parallax/float con Math.sin(frame/N)), entradas y salidas escalonadas. El CENTRO debe ser un VISUAL fuerte (formas, tarjetas, cifras, íconos vectoriales hechos con SVG/divs), NO solo texto plano.
7. Si usas texto: corto e impactante, bien tipografiado (peso alto, buen tracking). Nada de párrafos largos.
   FUENTE: usa SIEMPRE `fontFamily: 'Inter, sans-serif'` en el texto (esa fuente está cargada y
   garantiza que el render mp4 salga IGUAL al preview). NO uses otras fuentes ni solo 'sans-serif'.
8. Puedes dibujar formas/íconos con SVG inline o divs con estilos. Asegúrate de que SVG use elementos SVG (<circle>, <path>) DENTRO de un <svg>, nunca como divs sueltos.
9. PROHIBIDO ABSOLUTAMENTE: barras de progreso, líneas/barras de tiempo, "scrubbers", indicadores de duración o de % de reproducción (esas barritas horizontales en el borde inferior o superior). NUNCA las pongas — el reproductor ya tiene la suya y se ven mal duplicadas.
10. EDITABILIDAD (para edición manual determinista): declara TODOS los valores ajustables como `const` ARRIBA con nombres claros en camelCase, y úsalos en el JSX:
    - Colores: UNO POR elemento visual, SIN COMPARTIR aunque el valor sea el mismo (ej. `dotColor`, `subtitleColor`, `bgColorStart`, `bgColorEnd` por separado — NUNCA un solo `accentColor` para cosas distintas como subtítulo Y puntos). Incluye SIEMPRE los colores del fondo/gradiente como consts.
    - Textos visibles (`headline`, `subtitle`), posiciones/offsets base, rotaciones.
    - TAMAÑOS como FACTOR con nombre, NO el número suelto dentro de la fórmula: declara `const titleSize = 0.12;` y usa `fontSize: width * titleSize` (NO `fontSize: width * 0.12`). Igual para otros tamaños relativos (`elementSize`, etc.). Así el tamaño es editable a mano.
    - Grupos repetidos (partículas, anillos, barras): declara su CANTIDAD y su color/tamaño como consts (`particleCount = 15`, `particleColor = "#86efac"`, `particleSize = 8`) y úsalos en el loop.
    La lógica y el movimiento pueden seguir inline.
11. VARIEDAD Y LIBERTAD CREATIVA (clave): tienes LIBERTAD TOTAL de diseño dentro de estas reglas técnicas. Cada animación debe ser DISTINTA — NO caigas en la misma fórmula de siempre (figura/tarjeta centrada + título abajo). Según la idea, explora composiciones diferentes: pantalla dividida, full-bleed, asimétrica, cuadrícula, diagonal, secuencia de momentos, SIN texto, tipografía gigante como protagonista, formas abstractas, capas en profundidad, etc. Lo OBLIGATORIO es la calidad, el determinismo y las reglas técnicas; la COMPOSICIÓN es libre y debe sorprender. Inventa algo propio para cada pedido.
12. Devuelve SOLO el código TSX del componente. Sin explicaciones, sin markdown, sin ```."""

# Few-shot: un ejemplo SOLO como referencia TÉCNICA (no de diseño) para anclar el patrón correcto
# sin que la IA copie la composición — la variedad/creatividad la rige la regla 11.
_FEWSHOT = """EJEMPLO solo como REFERENCIA TÉCNICA (cómo se escribe: responsivo a width/height, determinista, \
consts editables, nivel de pulido). NO copies su diseño, composición ni temática — INVENTA algo TOTALMENTE \
distinto y propio para cada pedido (otra estructura, otros elementos, otra idea):
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";

export const Animation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const pop = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const float = Math.sin(frame / 18) * (height * 0.012);
  const titleIn = interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const card = Math.min(width, height) * 0.5;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, #1e293b, #020617 70%)", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const px = random("px-" + i) * width;
        const py = (random("py-" + i) * height + frame * (1 + random("sp-" + i) * 2)) % height;
        return <div key={i} style={{ position: "absolute", left: px, top: py, width: 4, height: 4, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8", opacity: 0.4 }} />;
      })}
      <div style={{ transform: `scale(${pop}) translateY(${float}px)`, width: card, height: card, borderRadius: card * 0.09, background: "linear-gradient(135deg, #38bdf8, #6366f1)", boxShadow: "0 40px 90px rgba(56,189,248,0.4)", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: card * 0.42, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif" }}>+250%</div>
      </div>
      <h1 style={{ position: "absolute", bottom: height * 0.14, color: "#fff", fontSize: width * 0.06, fontWeight: 800, opacity: titleIn, fontFamily: "Inter, sans-serif", textAlign: "center", margin: 0 }}>Crecimiento real</h1>
    </AbsoluteFill>
  );
};"""


# Respaldo seguro: componente mínimo, responsivo y SIEMPRE válido (texto sobre el fondo).
# Se usa cuando el code-gen de una escena falla — sustituye al orquestador como red.
_FALLBACK_TEMPLATE = '''import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Animation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const fade = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "__BG__", justifyContent: "center", alignItems: "center", padding: width * 0.09 }}>
      <div style={{ transform: `scale(${pop})`, opacity: fade, color: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: width * 0.07, fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
        __TEXT__
      </div>
    </AbsoluteFill>
  );
};'''


def fallback_scene_code(text: str, bg: Optional[str] = None) -> str:
    """Código de una escena de respaldo seguro (texto sobre fondo). Siempre válido."""
    safe = (text or "Escena").strip()
    for ch in ('\\', '`', '{', '}', '<', '>', '"'):
        safe = safe.replace(ch, "'" if ch == '"' else "")
    return _FALLBACK_TEMPLATE.replace("__BG__", bg or "#0f172a").replace("__TEXT__", safe[:200])


def _strip_fences(text: str) -> str:
    """Quita ```tsx ... ``` y prosa antes/después; deja solo el código."""
    t = (text or "").strip()
    t = re.sub(r'^```[a-zA-Z]*\s*\n', '', t)
    t = re.sub(r'\n```\s*$', '', t)
    t = t.replace('```tsx', '').replace('```jsx', '').replace('```typescript', '').replace('```ts', '').replace('```', '')
    return t.strip()


def _ensure_interpolate_clamp(code: str) -> str:
    """Determinista (sin IA): agrega `{ extrapolateLeft/Right: "clamp" }` a los `interpolate(...)`
    que no tengan extrapolate, balanceando paréntesis. Evita que valores se disparen al infinito
    fuera del rango (el bug del 'texto que vuela'). Si ya trae extrapolate, lo respeta."""
    out = code or ""
    needle = "interpolate("
    closes: list[int] = []  # posiciones del ')' de cierre de cada call sin extrapolate
    i = 0
    while True:
        idx = out.find(needle, i)
        if idx < 0:
            break
        # 'interpolateColors(' no aplica: find ya matchea solo 'interpolate('
        open_paren = idx + len(needle) - 1
        depth = 0
        j = open_paren
        in_str = ""
        while j < len(out):
            c = out[j]
            if in_str:
                if c == in_str and out[j - 1] != "\\":
                    in_str = ""
            elif c in ("'", '"', "`"):
                in_str = c
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        if j >= len(out):
            break
        inner = out[open_paren + 1:j]
        if "extrapolate" not in inner:
            closes.append(j)
        i = open_paren + 1  # permite detectar interpolate anidados
    for close in sorted(closes, reverse=True):
        out = out[:close] + ', { extrapolateLeft: "clamp", extrapolateRight: "clamp" }' + out[close:]
    return out


def _build_prompt(user_prompt, width, height, duration_frames, previous_code, edit_instruction, design_md=None, variation=False, fps=_FPS):
    canvas = f"Lienzo {width}x{height} a {fps}fps, duración {duration_frames} frames. Diseña RESPONSIVO con useVideoConfig() — no asumas un tamaño fijo."
    if previous_code and edit_instruction:
        return (
            f"{_SYSTEM_RULES}\n\n{canvas}\n\nEste es el componente ACTUAL:\n"
            f"{previous_code}\n\n"
            f'El usuario pide este CAMBIO: "{edit_instruction}"\n\n'
            "Aplica SOLO ese cambio (lo mínimo necesario) y conserva TODO lo demás igual. "
            "Devuelve el componente COMPLETO ya corregido, solo código."
        )
    # Opt-in: brand kit / design.md (solo si el usuario lo pasó) → colores/fuente/estilo FIELES.
    brand = (
        f"\n\nKIT DE MARCA / DISEÑO DEL USUARIO (respétalo fielmente: usa ESTOS colores, fuente y "
        f"estilo en toda la animación):\n{design_md}\n"
        if design_md
        else ""
    )
    # Opt-in: variación (solo cuando se pide explícitamente) → enfoque visual claramente distinto.
    vary = (
        "\n\nGENERA UNA VERSIÓN CON UN ENFOQUE VISUAL CLARAMENTE DISTINTO: otra composición, otros "
        "elementos/íconos, otra paleta dentro del mood. Aléjate de la fórmula típica, sé muy creativo."
        if variation
        else ""
    )
    return (
        f"{_SYSTEM_RULES}\n\n{_FEWSHOT}\n\n{canvas}{brand}\n\n"
        f'Crea una animación para: "{user_prompt}"{vary}\n\n'
        "Devuelve SOLO el código del componente."
    )


# ── Edición QUIRÚRGICA (search/replace, estilo Cursor/Aider) ──
# La IA devuelve solo los bloques que cambian; se aplican al código → el resto queda IDÉNTICO.

_SR_RE = re.compile(
    r"<{3,}\s*SEARCH\s*\n(.*?)\n={3,}\s*\n(.*?)\n>{3,}\s*REPLACE",
    re.DOTALL,
)


def _build_edit_prompt(previous_code: str, edit_instruction: str, canvas: str) -> str:
    return (
        f"{_SYSTEM_RULES}\n\n{canvas}\n\n"
        f"COMPONENTE ACTUAL:\n{previous_code}\n\n"
        f'CAMBIO pedido por el usuario: "{edit_instruction}"\n\n'
        "Devuelve SOLO los cambios mínimos como bloques SEARCH/REPLACE — NADA de código completo, "
        "sin explicaciones, sin markdown. Por cada cambio, EXACTAMENTE este formato:\n"
        "<<<<<<< SEARCH\n"
        "[fragmento EXACTO del código actual a reemplazar, copiado tal cual con su indentación]\n"
        "=======\n"
        "[fragmento nuevo]\n"
        ">>>>>>> REPLACE\n\n"
        "REGLAS:\n"
        "- El bloque SEARCH debe ser copia EXACTA y ÚNICA de una parte del código actual (incluye "
        "suficiente contexto para que sea único; respeta espacios e indentación).\n"
        "- Cambia SOLO lo necesario para el pedido. NO toques absolutamente nada más.\n"
        "- Puedes devolver varios bloques SEARCH/REPLACE si hace falta."
    )


def _apply_search_replace(code: str, text: str) -> tuple[str, list[tuple[str, str]], list[str]]:
    """Aplica los bloques SEARCH/REPLACE de `text` sobre `code`.
    Devuelve (nuevo_code, pares_aplicados[(search,replace)], bloques_search_que_fallaron)."""
    blocks = _SR_RE.findall(text or "")
    applied: list[tuple[str, str]] = []
    failed: list[str] = []
    for search, replace in blocks:
        if search and search in code:
            code = code.replace(search, replace, 1)
            applied.append((search, replace))
        else:
            failed.append(search)
    return code, applied, failed


_MAX_EDIT_ATTEMPTS = 2  # intentos de edición quirúrgica antes de caer a regen completa


def _edit_codegen_surgical(
    previous_code: str, edit_instruction: str, api_key: str, use_model: str, canvas: str,
    provider: str = "gemini",
) -> Optional[dict]:
    """Edición quirúrgica (search/replace) con REINTENTOS: si algún bloque no calza, se le dice
    a la IA cuál falló y se reintenta (la 2ª vez suele calzar) — SIN regenerar todo. Solo tras
    agotar los intentos devuelve None (→ fallback a regeneración completa). Todo-o-nada por intento.
    """
    from app.modules.llm.router import call_text_llm

    prompt = _build_edit_prompt(previous_code, edit_instruction, canvas)
    tokens = {"in": 0, "out": 0, "total": 0}

    for attempt in range(_MAX_EDIT_ATTEMPTS):
        out = call_text_llm(
            prompt=prompt, api_key=api_key, model=use_model, provider=provider,
            temperature=0.3, max_tokens=8000, label="LLM Animation Edit",
        )
        t = out["tokens"]
        tokens["in"] += t["in"]; tokens["out"] += t["out"]; tokens["total"] += t["total"]

        new_code, applied_pairs, failed = _apply_search_replace(previous_code, out["text"] or "")
        new_code = _ensure_interpolate_clamp(new_code)
        applied = len(applied_pairs)
        total = applied + len(failed)

        if total > 0 and applied == total:
            valid, errors = validate_animation_code(new_code)
            if valid and not _smoke_test_code(new_code):
                logger.info("Edición quirúrgica OK (%d bloque(s), intento %d)", applied, attempt + 1)
                return {
                    "code": new_code, "errors": errors, "tokens": tokens,
                    "changes": [{"before": s, "after": r} for s, r in applied_pairs],
                }
            feedback = (
                "Al aplicar tus bloques el componente quedó inválido. Revísalos y reintenta "
                "con bloques correctos (solo cambios mínimos)."
            )
        elif total == 0:
            feedback = (
                "No devolviste ningún bloque en formato SEARCH/REPLACE. Devuelve SOLO los cambios "
                "en ese formato EXACTO (<<<<<<< SEARCH / ======= / >>>>>>> REPLACE)."
            )
        else:
            failed_join = "\n--- otro bloque que falló ---\n".join(s for s in failed if s)
            feedback = (
                f"{applied}/{total} bloques se aplicaron. Estos bloques SEARCH NO coincidieron con "
                f"el código actual — cópialos EXACTOS (carácter por carácter, misma indentación) del "
                f"COMPONENTE ACTUAL y reenvía TODOS los bloques de cambio:\n{failed_join}"
            )

        logger.info(
            "Edición quirúrgica intento %d/%d: %d/%d bloques → reintento",
            attempt + 1, _MAX_EDIT_ATTEMPTS, applied, total,
        )
        prompt += f"\n\nPROBLEMA en tu respuesta anterior: {feedback}"

    logger.info("Edición quirúrgica agotó %d intentos → fallback a regeneración completa", _MAX_EDIT_ATTEMPTS)
    return None


def _resolve_codegen_target(user_id, model_arg) -> tuple[str, str, str]:
    """Resuelve (modelo, provider, api_key) para code-gen.

    Prioridad de modelo: arg explícito (del job) > `codegen.model_override` (DB) > default
    del usuario. El PROVIDER sale del catálogo según el modelo elegido, y la API key se
    resuelve para ESE proveedor (no el default del usuario) — así un modelo de Claude usa la
    key de Claude aunque el default sea Gemini.
    """
    from app.modules.llm.resolver import resolve_llm_credentials
    from app.services.model_catalog import get_model_info

    creds = resolve_llm_credentials(user_id)
    use_model = model_arg or get_setting("codegen.model_override") or creds.model
    info = get_model_info(use_model)
    provider = info.provider if info else creds.provider
    if provider == creds.provider:
        api_key = creds.api_key
    else:
        try:
            api_key = resolve_llm_credentials(user_id, provider_override=provider).api_key
        except Exception:  # noqa: BLE001
            api_key = creds.api_key
    return use_model, provider, api_key


def generate_animation(
    prompt: str,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    aspect_ratio: str = "9:16",
    duration_seconds: int = 6,
    previous_code: Optional[str] = None,
    edit_instruction: Optional[str] = None,
    design_md: Optional[str] = None,
    variation: bool = False,
    fps: int = _FPS,
) -> dict:
    """Genera (o edita) un componente Remotion. Devuelve dict con code/valid/errors/meta.
    `design_md` (kit de marca) y `variation` son OPT-IN: solo influyen si se pasan."""
    use_model, provider, api_key = _resolve_codegen_target(user_id, model)
    if not api_key:
        raise ValueError("No hay API key de LLM configurada para tu usuario.")

    fps = int(fps) if fps and 1 <= int(fps) <= 120 else _FPS
    width, height = _parse_dims(aspect_ratio)
    duration_frames = int(duration_seconds * fps)

    # EDICIÓN: primero intenta surgical (search/replace → preserva todo lo demás IDÉNTICO,
    # estilo Cursor). Si no aplica nada o sale inválido, cae a regeneración completa.
    if previous_code and edit_instruction:
        canvas = (
            f"Lienzo {width}x{height} a {fps}fps, duración {duration_frames} frames. "
            "Diseña RESPONSIVO con useVideoConfig()."
        )
        edited = _edit_codegen_surgical(previous_code, edit_instruction, api_key, use_model, canvas, provider)
        if edited:
            return {
                "code": edited["code"],
                "valid": len(edited["errors"]) == 0,
                "errors": edited["errors"],
                "model": use_model,
                "width": width,
                "height": height,
                "duration_frames": duration_frames,
                "fps": fps,
                "tokens": edited["tokens"],
                "edit_mode": "surgical",
                "changes": edited.get("changes", []),
            }

    full_prompt = _build_prompt(prompt, width, height, duration_frames, previous_code, edit_instruction, design_md, variation, fps)
    code, errors, tokens = _run_codegen(full_prompt, api_key, use_model, provider)
    return {
        "code": code,
        "valid": len(errors) == 0,
        "errors": errors,
        "model": use_model,
        "width": width,
        "height": height,
        "duration_frames": duration_frames,
        "fps": fps,
        "tokens": tokens,
        "edit_mode": "full" if (previous_code and edit_instruction) else "create",
    }


_MAX_CODEGEN_ATTEMPTS = 3  # 1 intento + 2 reparaciones con la IA (NO hay orquestador)


def _run_codegen(full_prompt: str, api_key: str, use_model: str, provider: str = "gemini") -> tuple[str, list[str], dict]:
    """Llama al LLM (del `provider` dado, vía router multi-proveedor), saca el código, valida;
    si falla, reintenta con la IA (auto-reparación). Devuelve (code, errors, tokens)."""
    from app.modules.llm.router import call_text_llm

    # Temperatura y nº de intentos tuneables desde la DB (admin) con default de código.
    temperature = float(get_setting("codegen.temperature", 0.4))
    max_attempts = int(get_setting("codegen.max_attempts", _MAX_CODEGEN_ATTEMPTS))
    max_output = int(get_setting("codegen.max_output_tokens", 12000))  # tope del tamaño del componente

    code = ""
    errors: list[str] = []
    tokens = {"in": 0, "out": 0, "total": 0}
    for attempt in range(max_attempts):
        out = call_text_llm(
            prompt=full_prompt, api_key=api_key, model=use_model, provider=provider,
            temperature=temperature, max_tokens=max_output, label="LLM Animation",
        )
        t = out["tokens"]
        tokens["in"] += t["in"]; tokens["out"] += t["out"]; tokens["total"] += t["total"]
        code = _strip_fences(out["text"] or "")
        code = _ensure_interpolate_clamp(code)
        valid, errors = validate_animation_code(code)
        if valid:
            # Smoke-test: compila de verdad en el render-server (atrapa sintaxis/estructura
            # rota que el validador regex no ve). Best-effort.
            smoke_err = _smoke_test_code(code)
            if not smoke_err:
                break
            errors = [smoke_err]
            logger.warning("Smoke-test falló (intento %d/%d): %s", attempt + 1, max_attempts, smoke_err)
        else:
            logger.warning("Animación inválida (intento %d/%d): %s", attempt + 1, max_attempts, errors)
        # Reparación: le devolvemos SU código fallido + los problemas para que lo arregle
        # o cree otro (conservando la escena/timing/dirección de arte del prompt original).
        full_prompt += (
            f"\n\nEl código que generaste tuvo estos PROBLEMAS: {errors}.\n"
            f"Este fue tu código (arréglalo o créalo de nuevo respetando la escena):\n{code}\n\n"
            "Devuelve el componente COMPLETO ya corregido, solo código."
        )
    return code, errors, tokens


def _smoke_test_code(code: str) -> Optional[str]:
    """Pide al render-server compilar el código y verificar que exporte un componente
    (sin renderizar). Devuelve None si OK (o si no se pudo verificar — best-effort), o el
    mensaje de error si el código no compila/estructura mal."""
    import httpx
    from app.core.config import settings

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{settings.RENDER_SERVER_URL}/smoke-test", json={"code": code}
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("Smoke-test no disponible (se omite): %s", e)
        return None  # best-effort: no bloquear la generación si el render-server no responde
    if data.get("ok"):
        return None
    return f"el código no compila o no exporta bien el componente: {data.get('error')}"


def generate_scene_animation(
    text: str,
    duration_seconds: float,
    word_timestamps: Optional[list] = None,
    bg_hint: Optional[str] = None,
    art_direction: Optional[str] = None,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    aspect_ratio: str = "9:16",
    variation: bool = False,
) -> dict:
    """Fase 3: genera el componente de UNA escena (consciente del guion + timing del audio).

    El audio ya narra `text`, así que la animación lo ILUSTRA (visual protagonista, poco
    texto). `word_timestamps` (relativos a la escena, en segundos) se pasan como frames
    para que la IA pueda sincronizar reveals con la voz.
    """
    use_model, provider, api_key = _resolve_codegen_target(user_id, model)
    if not api_key:
        raise ValueError("No hay API key de LLM configurada.")

    width, height = _parse_dims(aspect_ratio)
    duration_frames = int(duration_seconds * _FPS)

    timing = ""
    if word_timestamps:
        parts = []
        for w in word_timestamps[:40]:
            try:
                f0 = int(float(w.get("start", 0)) * _FPS)
                parts.append(f'"{w.get("word", "")}"@f{f0}')
            except (TypeError, ValueError):
                continue
        if parts:
            timing = (
                "(OPCIONAL — solo si decides mostrar palabras clave y quieres sincronizarlas con "
                "la voz, el frame de cada palabra es: " + ", ".join(parts) + ".)"
            )
    bg = f"Color de fondo sugerido (úsalo o uno coherente): {bg_hint}." if bg_hint else ""
    transitions = (
        "\nTRANSICIONES (es UNA escena de un VIDEO con otras): anima una ENTRADA al inicio "
        "(~primeros 10-15 frames) y una SALIDA al final (~últimos 10-15 frames), derivadas de "
        "useCurrentFrame(). VARÍA el estilo entre escenas (NO siempre el mismo): slide desde "
        "cualquier lado, fade, zoom in/out, desvanecer a negro o al color de fondo, wipe, escala, "
        "rotación, etc. — elige lo que combine. La salida puede terminar en negro/color para "
        "encadenar con la siguiente escena. Sé creativo, hay muchísimas transiciones posibles."
    )
    vary = (
        "\nIMPORTANTE: genera una versión con un ENFOQUE VISUAL CLARAMENTE DISTINTO al típico "
        "(otra composición, otros elementos/íconos, otra paleta dentro del mood). Sé creativo."
        if variation else ""
    )
    art = ""
    if art_direction:
        art = (
            "DIRECCIÓN DE ARTE (úsala como guía de mood/colores/movimiento, "
            "es la idea visual de la escena): "
            f"{art_direction}\n"
            "Ignora cualquier mención a 'transición' entre escenas: las transiciones "
            "entre escenas las maneja el sistema, tú solo animas DENTRO de esta escena.\n"
        )

    # Flywheel: ejemplos aprobados parecidos como few-shot (si hay; si no, el estático).
    from app.services.flywheel import get_flywheel_examples
    _examples = get_flywheel_examples(text, art_direction, k=2, api_key=api_key)
    fewshot = (
        "\n\n".join(
            "REFERENCIA DE CALIDAD (animación aprobada — inspírate en su NIVEL de pulido y técnica, "
            f"NO la copies ni repliques su diseño; crea algo distinto y propio):\n{ex}"
            for ex in _examples
        )
        if _examples
        else _FEWSHOT
    )

    full_prompt = (
        f"{_SYSTEM_RULES}\n\n{fewshot}\n\n"
        f"Lienzo {width}x{height} a {_FPS}fps (diseña RESPONSIVO con useVideoConfig), "
        f"duración EXACTA {duration_frames} frames (toda la animación debe ocurrir dentro de ese rango).\n"
        f'Esta es UNA escena de un video; el AUDIO YA narra esta frase, NO la repitas entera en pantalla: "{text}"\n'
        f"{art}{bg} {timing}{transitions}{vary}\n\n"
        "Crea una animación que ILUSTRE visualmente la idea de esa frase. El VISUAL es el "
        "PROTAGONISTA. El texto es OPCIONAL — decide según lo que quede mejor: "
        "(a) SIN texto (visual puro, ideal si la idea se ilustra sola, ej. una gráfica que sube), "
        "(b) 1–3 PALABRAS CLAVE, o (c) excepcionalmente una frase corta. NO pongas la narración "
        "completa como subtítulo salvo que de verdad aporte. Devuelve SOLO el código."
    )
    code, errors, tokens = _run_codegen(full_prompt, api_key, use_model, provider)
    return {
        "code": code,
        "valid": len(errors) == 0,
        "errors": errors,
        "model": use_model,
        "width": width,
        "height": height,
        "duration_frames": duration_frames,
        "tokens": tokens,
    }
