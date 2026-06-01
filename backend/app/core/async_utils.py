"""Async utilities for AnimaFlow."""
import asyncio
from typing import Any


def run_async(coro) -> Any:
    """Run an async coroutine from sync code, handling existing event loops.
    
    First tries asyncio.run() (the modern approach). If an event loop is already
    running, creates a fresh event loop, runs the coroutine, and cleans up.
    """
    try:
        return asyncio.run(coro)
    except RuntimeError as e:
        if "cannot be called from a running event loop" in str(e) or "already running" in str(e):
            loop = asyncio.new_event_loop()
            try:
                asyncio.set_event_loop(loop)
                return loop.run_until_complete(coro)
            finally:
                asyncio.set_event_loop(None)
                loop.close()
        raise
