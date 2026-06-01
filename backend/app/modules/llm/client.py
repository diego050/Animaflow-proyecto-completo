import asyncio
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger("llm")

LLM_TIMEOUT = 580  # Justo debajo del timeout de RQ (600s)


def _call_llm_sync(
    client, model: str, contents: str, config=None, label: str = "LLM", max_retries: int = 3
):
    """
    Ejecuta una llamada síncrona a Gemini con reintentos automáticos para errores transitorios.
    Usa directamente el cliente sincrónico para evitar problemas de "Event loop is closed"
    al llamar varias veces en la misma función.
    """
    import time
    logger.info("Llamando a Gemini (model=%s)...", model, extra={"label": label})

    for attempt in range(max_retries):
        try:
            if config is not None:
                response = client.models.generate_content(
                    model=model, contents=contents, config=config
                )
            else:
                response = client.models.generate_content(
                    model=model, contents=contents
                )
                
            # WARNING: This may leak sensitive data in production logs
            if settings.ENV == "development":
                raw_text = response.text if response.text else "(empty)"
                logger.debug(
                    "LLM response (first 2000 chars): %s",
                    raw_text[:2000],
                    extra={"label": label},
                )

                # Log parsed response if available
                if hasattr(response, 'parsed') and response.parsed is not None:
                    parsed_str = str(response.parsed)
                    logger.debug(
                        "PARSED RESPONSE (first 2000 chars): %s",
                        parsed_str[:2000],
                        extra={"label": label},
                    )

            logger.info(
                "Respuesta recibida (%d chars)",
                len(response.text) if response.text else 0,
                extra={"label": label},
            )
            return response
        except Exception as e:
            error_str = str(e)
            is_retryable = any(
                code in error_str
                for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
            )

            if is_retryable and attempt < max_retries - 1:
                wait_time = 3 * (2**attempt)
                logger.warning(
                    "Error transitorio en llamada síncrona (%s...). Reintentando en %ds (intento %d/%d)",
                    error_str[:60],
                    wait_time,
                    attempt + 1,
                    max_retries,
                    extra={"label": label}
                )
                time.sleep(wait_time)
                continue

            logger.error(
                "Error en llamada síncrona a Gemini: %s | Full error: %s",
                str(e)[:200],
                str(e),
                extra={"label": label},
            )
            raise


async def _call_gemini_with_retry(
    client, prompt: str, max_retries: int = 3, model: str = None, system_instruction: str = None
):
    """
    Llama a Gemini API con reintentos automáticos para errores transitorios (429, 503).
    Usa backoff exponencial: 3s → 6s → 12s
    """
    from app.core.config import settings
    from google.genai import types

    if model is None:
        model = settings.GEMINI_MODEL

    for attempt in range(max_retries):
        try:
            config = None
            if system_instruction:
                config = types.GenerateContentConfig(system_instruction=system_instruction)
                
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            return response
        except Exception as e:
            error_str = str(e)
            is_retryable = any(
                code in error_str
                for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
            )

            if is_retryable and attempt < max_retries - 1:
                wait_time = 3 * (2**attempt)
                logger.warning(
                    "Error transitorio (%s...). Reintentando en %ds (intento %d/%d)",
                    error_str[:60],
                    wait_time,
                    attempt + 1,
                    max_retries,
                )
                await asyncio.sleep(wait_time)
                continue

            logger.exception("LLM call failed after %d attempts", attempt + 1)
            raise


async def _send_chat_message_with_retry(
    chat, prompt: str, max_retries: int = 3
):
    """
    Envía un mensaje a una sesión de chat de Gemini con reintentos automáticos para errores transitorios.
    """
    for attempt in range(max_retries):
        try:
            response = await chat.send_message(prompt)
            return response
        except Exception as e:
            error_str = str(e)
            is_retryable = any(
                code in error_str
                for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
            )

            if is_retryable and attempt < max_retries - 1:
                wait_time = 3 * (2**attempt)
                logger.warning(
                    "Error transitorio en chat (%s...). Reintentando en %ds (intento %d/%d)",
                    error_str[:60],
                    wait_time,
                    attempt + 1,
                    max_retries,
                )
                await asyncio.sleep(wait_time)
                continue

            logger.exception("LLM chat message failed after %d attempts", attempt + 1)
            raise
