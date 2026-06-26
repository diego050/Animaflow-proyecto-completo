"""Catálogo central de modelos LLM (multi-proveedor).

FUENTE ÚNICA DE VERDAD de qué modelos soportamos, de qué proveedor son y su "tier"
de capacidad. Evita hardcodear strings sueltos (`if "lite" in model`) repartidos por
el código — eso solo funcionaba para Gemini y se rompe con Claude/OpenAI/otros.

Para AGREGAR un modelo nuevo: añade una línea en MODEL_CATALOG con su `provider` y `tier`.
Nada más en el código necesita cambiar.

`tier` = capacidad/creatividad del modelo (agnóstico del proveedor, NO "flash"/"haiku"
que son nombres de marca). De ahí sale, por ejemplo, cuántos componentes le mostramos:
un modelo débil decide peor con demasiadas opciones; uno fuerte aprovecha más paleta.
"""
from dataclasses import dataclass
from typing import Optional

# ── Tiers (agnósticos del proveedor) ─────────────────────────────────────────
TIER_LITE = "lite"
TIER_STANDARD = "standard"
TIER_PRO = "pro"


@dataclass(frozen=True)
class ModelInfo:
    id: str
    provider: str   # "gemini" | "anthropic" | "openai" | ...
    tier: str       # TIER_LITE | TIER_STANDARD | TIER_PRO
    # ¿Soporta el parámetro thinking_config de la API de Gemini? Los modelos abiertos
    # (Gemma) y algunos viejos NO → mandárselo da 400 INVALID_ARGUMENT.
    supports_thinking: bool = True
    # ¿Soporta el modo JSON estricto (response_mime_type=application/json + response_schema)?
    # Gemma/abiertos NO → se omite y el JSON sale del prompt + extractor de respaldo.
    supports_structured_output: bool = True


# ── Registro explícito de modelos ────────────────────────────────────────────
# (Hoy usamos Gemini; los demás quedan listos para cuando se enchufen sus APIs.)
_MODELS = [
    # Gemini (Google)
    ModelInfo("gemini-3.1-flash-lite", "gemini", TIER_LITE),
    ModelInfo("gemini-3.1-flash-lite-preview", "gemini", TIER_LITE),
    ModelInfo("gemini-2.0-flash", "gemini", TIER_STANDARD),
    ModelInfo("gemini-3.1-flash", "gemini", TIER_STANDARD),
    ModelInfo("gemini-3.5-flash", "gemini", TIER_STANDARD),
    ModelInfo("gemini-2.5-pro", "gemini", TIER_PRO),
    ModelInfo("gemini-3-pro", "gemini", TIER_PRO),
    # Gemma (modelo abierto, vía API de Gemini). Más chico → tier lite (ajustable).
    # Solo se OFRECE al admin (ADMIN_ONLY_MODELS). NO soporta thinking ni JSON estricto.
    ModelInfo("gemma-4-31b-it", "gemini", TIER_LITE,
              supports_thinking=False, supports_structured_output=False),

    # Anthropic (Claude)
    ModelInfo("claude-haiku-4-5-20251001", "anthropic", TIER_LITE),
    ModelInfo("claude-sonnet-4-6", "anthropic", TIER_STANDARD),
    ModelInfo("claude-opus-4-8", "anthropic", TIER_PRO),

    # OpenAI (ChatGPT) — añade aquí los IDs reales que vayas a usar, p.ej.:
    # ModelInfo("gpt-mini", "openai", TIER_LITE),
    # ModelInfo("gpt-standard", "openai", TIER_STANDARD),
    # ModelInfo("gpt-pro", "openai", TIER_PRO),
]

MODEL_CATALOG: dict[str, ModelInfo] = {m.id: m for m in _MODELS}

# ── KNOB: tamaño del shortlist de componentes por tier ───────────────────────
# No es límite de COSTO (son centavos por video); es límite de ATENCIÓN del modelo.
# Si el catálogo de componentes tiene MENOS que esto, se manda entero.
SHORTLIST_BY_TIER = {TIER_LITE: 70, TIER_STANDARD: 110, TIER_PRO: 170}
DEFAULT_TIER = TIER_STANDARD


def get_model_info(model: Optional[str]) -> Optional[ModelInfo]:
    """Busca el modelo en el catálogo. Tolera prefijos ('models/<id>') y sufijos
    de versión/fecha ('claude-opus-4-8-20260101'). Devuelve None si no se conoce."""
    if not model:
        return None
    key = model.strip()
    if key in MODEL_CATALOG:
        return MODEL_CATALOG[key]
    key = key.split("/")[-1]
    if key in MODEL_CATALOG:
        return MODEL_CATALOG[key]
    # match por prefijo (variantes con fecha/sufijo)
    for mid, info in MODEL_CATALOG.items():
        if key.startswith(mid):
            return info
    return None


def tier_for_model(model: Optional[str]) -> str:
    """Tier del modelo; DEFAULT_TIER (standard) si no está en el catálogo."""
    info = get_model_info(model)
    return info.tier if info else DEFAULT_TIER


def shortlist_size_for_model(model: Optional[str]) -> int:
    """Tamaño del shortlist de componentes a mostrar al LLM, según su tier."""
    return SHORTLIST_BY_TIER[tier_for_model(model)]


def supports_thinking(model: Optional[str]) -> bool:
    """¿El modelo acepta thinking_config? (Gemma/abiertos NO.) Desconocido → True."""
    info = get_model_info(model)
    return info.supports_thinking if info else True


def supports_structured_output(model: Optional[str]) -> bool:
    """¿El modelo acepta response_schema / JSON estricto? (Gemma NO.) Desconocido → True."""
    info = get_model_info(model)
    return info.supports_structured_output if info else True


# ── Precios (USD por 1M tokens: entrada, salida) ─────────────────────────────
# APROXIMADOS y CONFIGURABLES (cambian con el tiempo / proveedor). Sirven para
# observabilidad de COSTO estimado, NO para facturación exacta. Si un modelo no está
# aquí, se usa el precio por tier.
PRICE_PER_1M: dict[str, tuple[float, float]] = {
    "gemini-3.1-flash-lite": (0.10, 0.40),
    "gemini-3.1-flash-lite-preview": (0.10, 0.40),
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-3.1-flash": (0.30, 2.50),
    "gemini-3.5-flash": (0.30, 2.50),
    "gemini-2.5-pro": (1.25, 10.0),
    "gemini-3-pro": (1.25, 10.0),
    "gemma-4-31b-it": (0.0, 0.0),
    "claude-haiku-4-5-20251001": (0.80, 4.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-opus-4-8": (15.0, 75.0),
}
_PRICE_BY_TIER = {
    TIER_LITE: (0.10, 0.40),
    TIER_STANDARD: (0.30, 2.50),
    TIER_PRO: (1.25, 10.0),
}


def price_for_model(model: Optional[str]) -> tuple[float, float]:
    """(precio_in, precio_out) USD por 1M tokens. Cae al precio por tier si no se conoce."""
    info = get_model_info(model)
    key = info.id if info else (model or "")
    if key in PRICE_PER_1M:
        return PRICE_PER_1M[key]
    return _PRICE_BY_TIER.get(tier_for_model(model), _PRICE_BY_TIER[DEFAULT_TIER])


def estimate_cost_usd(model: Optional[str], tokens_in: int, tokens_out: int) -> float:
    """Costo estimado en USD de una generación (in/out tokens × precio del modelo)."""
    pin, pout = price_for_model(model)
    return round((tokens_in or 0) / 1_000_000 * pin + (tokens_out or 0) / 1_000_000 * pout, 6)
