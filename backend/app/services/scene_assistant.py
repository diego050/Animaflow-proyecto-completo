"""Asistente de edición GLOBAL del video.

Parsea el pedido en lenguaje natural del usuario → (qué escena(s), qué acción, instrucción).
Así el chat entiende "escena 4", "la del corazón", "todas", "esta escena no me gusta, hazme
otra", etc. — sin que el usuario tenga que seleccionar la escena a mano.
"""
import json
import re
from typing import Optional

from app.core.logging import get_logger

logger = get_logger("scene_assistant")


def _resolve_key(user_id: Optional[str]):
    """(modelo, provider, api_key) del usuario para el parser de intención."""
    from app.modules.llm.resolver import resolve_llm_credentials
    from app.services.model_catalog import get_model_info

    creds = resolve_llm_credentials(user_id)
    use_model = creds.model
    info = get_model_info(use_model)
    provider = info.provider if info else creds.provider
    if provider == creds.provider:
        return use_model, provider, creds.api_key
    try:
        return use_model, provider, resolve_llm_credentials(user_id, provider_override=provider).api_key
    except Exception:  # noqa: BLE001
        return use_model, provider, creds.api_key


def parse_intent(prompt: str, scenes: list, focused_index: Optional[int], user_id: Optional[str]) -> dict:
    """Devuelve {scene_indices: [int], action: 'edit'|'regenerate'|'query', instruction: str}."""
    from app.modules.llm.router import call_text_llm

    # Listamos las escenas con su NÚMERO tal como las ve el usuario (desde 1) para que el LLM
    # solo tenga que ECHAR el número (no convertir a 0-based — flash-lite fallaba en eso).
    summary = "\n".join(f'Escena {i + 1}: "{(s.get("text") or "")[:90]}"' for i, s in enumerate(scenes))
    focus = str(focused_index + 1) if focused_index is not None else "ninguna"
    full = (
        "Eres el asistente de edición de un video con animaciones (UNA por escena). El usuario te "
        "pide algo en lenguaje natural; determina a qué ESCENA(S) se refiere y qué ACCIÓN quiere.\n\n"
        f"ESCENAS:\n{summary}\n\n"
        f"Escena enfocada ahora: {focus}\n\n"
        f'PEDIDO DEL USUARIO: "{prompt}"\n\n'
        "Devuelve SOLO JSON (sin markdown, sin explicación):\n"
        '{"scene_numbers": [<números de escena TAL CUAL dice el usuario, desde 1>], '
        '"action": "edit"|"regenerate"|"query", "instruction": "<el cambio concreto, o la pregunta>"}\n\n'
        "REGLAS:\n"
        "- Usa el MISMO número que el usuario: si dice 'escena 2' devuelve 2, si dice 'la 3 y la 4' devuelve [3,4]. NO restes ni sumes.\n"
        "- 'esta escena'/'la actual' = el número de la escena enfocada (si hay).\n"
        "- 'todas' = todos los números (1 hasta el total). 'la del corazón' = mapea por el texto a su número.\n"
        "- 'hazme otra'/'no me gusta, créala de nuevo'/'rehazla' = action 'regenerate'.\n"
        "- Cambios puntuales (color, posición, quitar/agregar algo) = action 'edit'.\n"
        "- Pregunta sobre el video = action 'query'.\n"
        "- Si no identificas la escena pero hay una enfocada, usa su número."
    )
    try:
        use_model, provider, api_key = _resolve_key(user_id)
        out = call_text_llm(
            prompt=full, api_key=api_key, model=use_model, provider=provider,
            temperature=0.1, max_tokens=400, label="LLM Assistant Intent",
        )
        text = out.get("text") or ""
    except Exception as e:  # noqa: BLE001
        logger.warning("parse_intent falló, fallback a edit sobre la enfocada: %s", e)
        return {"scene_indices": [], "action": "edit", "instruction": prompt}

    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {"scene_indices": [], "action": "edit", "instruction": prompt}
    try:
        data = json.loads(m.group(0))
    except Exception:  # noqa: BLE001
        return {"scene_indices": [], "action": "edit", "instruction": prompt}

    n = len(scenes)
    idxs = []
    # El LLM devuelve números 1-based (como el usuario) → convertimos a índice 0-based aquí.
    raw = data.get("scene_numbers")
    if raw is None:
        raw = data.get("scene_indices")  # compat por si el modelo usa la clave vieja
    for x in (raw or []):
        try:
            xi = int(x) - 1
        except (TypeError, ValueError):
            continue
        if 0 <= xi < n and xi not in idxs:
            idxs.append(xi)
    action = data.get("action") if data.get("action") in ("edit", "regenerate", "query") else "edit"
    instruction = (data.get("instruction") or prompt).strip() or prompt
    return {"scene_indices": idxs, "action": action, "instruction": instruction}
