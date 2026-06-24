"""Async utilities for AnimaFlow."""
import asyncio
from typing import Any


def run_async(coro) -> Any:
    """Run an async coroutine from sync code.
    
    This function is designed to be called from synchronous context only,
    typically from a thread pool executor (e.g., scheduler.run_in_executor).
    Thread pool workers have no event loop, so asyncio.run() works correctly.
    
    If called from within an existing event loop (e.g., directly from a
    FastAPI endpoint), it will raise a RuntimeError with a clear message.
    In that case, use 'await coro' directly instead.
    """
    return asyncio.run(coro)
