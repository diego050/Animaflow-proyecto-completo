import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm")

LLM_TIMEOUT = 300  # 5 minutes max per LLM call


def _call_llm_sync(
    client, model: str, contents: str, config=None, label: str = "LLM"
):
    """
    Ejecuta una llamada síncrona a Gemini con timeout de 5 minutos.
    Si excede el timeout, lanza TimeoutError con info del label.
    """

    def _do_call():
        if config is not None:
            return client.models.generate_content(
                model=model, contents=contents, config=config
            )
        return client.models.generate_content(model=model, contents=contents)

    logger.info("Llamando a Gemini (model=%s, timeout=%ds)...", model, LLM_TIMEOUT, extra={"label": label})

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_do_call)
        try:
            response = future.result(timeout=LLM_TIMEOUT)
            logger.info(
                "Respuesta recibida (%d chars)",
                len(response.text) if response.text else 0,
                extra={"label": label},
            )
            return response
        except FuturesTimeout:
            logger.warning("TIMEOUT después de %ds — la llamada se colgó", LLM_TIMEOUT, extra={"label": label})
            future.cancel()
            raise TimeoutError(f"[{label}] LLM call timed out after {LLM_TIMEOUT}s")


async def _call_gemini_with_retry(
    client, prompt: str, max_retries: int = 3, model: str = None
):
    """
    Llama a Gemini API con reintentos automáticos para errores transitorios (429, 503).
    Usa backoff exponencial: 3s → 6s → 12s
    """
    from app.core.config import settings

    if model is None:
        model = settings.GEMINI_MODEL

    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
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
