"""
LLM Service — Thin async wrapper for conversational chat features.

Provides `generate_json` and `generate_text` functions used by
scene_editor.py and intent_router.py for the conversational editing flow.

Uses the existing app.modules.llm client and resolver infrastructure.
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.llm.client import _call_gemini_with_retry

logger = get_logger("llm_service")


def _strip_markdown_json(raw: str) -> str:
    """Extract JSON from a markdown code block if present."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        json_lines: list[str] = []
        in_json = False
        for line in lines:
            if line.startswith("```json") or line.startswith("```"):
                in_json = not in_json
                continue
            if in_json:
                json_lines.append(line)
        text = "\n".join(json_lines)
    return text


async def generate_json(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.0,
) -> dict[str, Any]:
    """Call the LLM and return a parsed JSON dict.

    Args:
        system_prompt: System instruction for the model.
        user_message: The user's prompt / context.
        temperature: Sampling temperature (0.0 for deterministic).

    Returns:
        Parsed JSON response as a dict.

    Raises:
        RuntimeError: If the API key is not configured.
        ValueError: If the response cannot be parsed as JSON.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")

    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=temperature,
    )

    response = await _call_gemini_with_retry(
        client,
        prompt=user_message,
        model=model,
        system_instruction=system_prompt,
    )

    raw_text = response.text if response.text else ""
    cleaned = _strip_markdown_json(raw_text)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error(
            "Failed to parse LLM JSON response: %s | Raw (first 500): %s",
            exc,
            raw_text[:500],
        )
        raise ValueError(f"LLM returned invalid JSON: {exc}") from exc


async def generate_text(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.3,
) -> str:
    """Call the LLM and return the raw text response.

    Args:
        system_prompt: System instruction for the model.
        user_message: The user's prompt / context.
        temperature: Sampling temperature.

    Returns:
        The LLM's text response (stripped).

    Raises:
        RuntimeError: If the API key is not configured.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")

    client = genai.Client(api_key=api_key)

    response = await _call_gemini_with_retry(
        client,
        prompt=user_message,
        model=model,
        system_instruction=system_prompt,
    )

    return (response.text or "").strip()
