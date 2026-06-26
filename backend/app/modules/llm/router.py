"""Router LLM multi-proveedor.

Dado un `provider` (del catálogo de modelos), llama al SDK correcto (Gemini / Anthropic /
OpenAI) y NORMALIZA la respuesta a `{text, tokens:{in,out,total}}`. Así el code-gen (y
cualquier llamada) funciona con Claude/GPT, no solo Gemini.

Los SDKs se importan de forma PEREZOSA dentro de cada adaptador: un deploy que solo use
Gemini no necesita tener instalados anthropic/openai.
"""
from typing import Optional

from app.core.logging import get_logger

logger = get_logger("llm.router")


def _tokens(tin, tout) -> dict:
    tin = int(tin or 0)
    tout = int(tout or 0)
    return {"in": tin, "out": tout, "total": tin + tout}


def call_text_llm(
    prompt: str,
    api_key: str,
    model: str,
    provider: str,
    temperature: float = 0.4,
    max_tokens: int = 12000,
    label: str = "LLM",
) -> dict:
    """Llama al LLM del `provider` indicado. Devuelve {text, tokens}. Lanza si el proveedor
    no se soporta o el SDK no está instalado."""
    p = (provider or "gemini").lower()
    if p in ("gemini", "google"):
        return _call_gemini(prompt, api_key, model, temperature, max_tokens, label)
    if p == "anthropic":
        return _call_anthropic(prompt, api_key, model, temperature, max_tokens, label)
    if p == "openai":
        return _call_openai(prompt, api_key, model, temperature, max_tokens, label)
    raise ValueError(f"Proveedor LLM no soportado: {provider}")


def _call_gemini(prompt, api_key, model, temperature, max_tokens, label) -> dict:
    from google import genai
    from google.genai import types
    from app.modules.llm.client import _call_llm_sync  # reusa retries + logging

    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(temperature=temperature, max_output_tokens=max_tokens)
    resp = _call_llm_sync(client=client, model=model, contents=prompt, config=config, label=label)
    um = getattr(resp, "usage_metadata", None)
    tin = getattr(um, "prompt_token_count", 0) if um else 0
    tout = getattr(um, "candidates_token_count", 0) if um else 0
    return {"text": resp.text or "", "tokens": _tokens(tin, tout)}


def _call_anthropic(prompt, api_key, model, temperature, max_tokens, label) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    logger.info("Llamando a Anthropic (model=%s)...", model, extra={"label": label})
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}],
    )
    text = "".join(
        getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text"
    )
    u = getattr(resp, "usage", None)
    tin = getattr(u, "input_tokens", 0) if u else 0
    tout = getattr(u, "output_tokens", 0) if u else 0
    logger.info("Tokens [%s]: in=%d out=%d total=%d", label, int(tin or 0), int(tout or 0), int(tin or 0) + int(tout or 0))
    return {"text": text, "tokens": _tokens(tin, tout)}


def _call_openai(prompt, api_key, model, temperature, max_tokens, label) -> dict:
    import openai

    client = openai.OpenAI(api_key=api_key)
    logger.info("Llamando a OpenAI (model=%s)...", model, extra={"label": label})
    resp = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = (resp.choices[0].message.content or "") if resp.choices else ""
    u = getattr(resp, "usage", None)
    tin = getattr(u, "prompt_tokens", 0) if u else 0
    tout = getattr(u, "completion_tokens", 0) if u else 0
    logger.info("Tokens [%s]: in=%d out=%d total=%d", label, int(tin or 0), int(tout or 0), int(tin or 0) + int(tout or 0))
    return {"text": text, "tokens": _tokens(tin, tout)}
