"""
Intent Router — Classifies user messages to optimize LLM token usage.

Routes messages into three categories:
- "query": User is asking a question (no spec needed)
- "edit": User wants to modify the scene (full spec needed)
- "recommend": User wants suggestions (spec needed for context)

Uses the same LLM model as editing, but with a much shorter prompt for queries.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

INTENT_SYSTEM_PROMPT = """You are a message classifier for a video animation editing assistant.
Classify the user's message into exactly one category:

- "query": User asks about capabilities, options, or how things work. No scene modification needed.
  Examples: "What animations are available?", "How do I change colors?", "What does bounce-in do?", "Tell me about exit animations"

- "edit": User wants to modify the scene (change values, add/remove elements, apply animations).
  Examples: "Make it bigger", "Change to blue", "Add a box", "Remove that layer", "Apply bounce", "Move it right"

- "recommend": User asks for suggestions or recommendations about the scene.
  Examples: "What would look better?", "Recommend an animation", "How can I improve this?"

Respond ONLY with a JSON object: {"intent": "query" | "edit" | "recommend"}"""

QUERY_SYSTEM_PROMPT = """You are a helpful assistant for a video animation editor.
Answer questions about available animation options and editing capabilities.

Available entry animations: fade-in, slide-up, slide-down, slide-left, slide-right, scale-in, spring-in, bounce-in
Available exit animations: fade-out, slide-up-out, slide-down-out, slide-left-out, slide-right-out, scale-out, spring-out, bounce-out
Editable properties: x, y, scale, rotation, opacity, fill, stroke, fontSize, fontWeight, letterSpacing, entry, exit, entryDelay, exitDelay, entryDuration, exitDuration
Layer types: rect, circle, path, text, image, group, particles, component
Background types: solid, linear-gradient, radial-gradient

Keep answers concise and in Spanish. Do not mention technical details like JSON or field paths."""


async def classify_intent(user_message: str, llm_service: Any = None, history: list[dict] | None = None) -> str:
    """
    Classify user message intent using LLM.
    
    Returns: 'query', 'edit', or 'recommend'
    """
    if history is None:
        history = []
    try:
        from app.services.llm_service import generate_json

        # Format conversation history
        history_text = ""
        if history:
            history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-5:]])
            history_text = f"\nConversation History:\n{history_text}\n"

        user_message = f"{history_text}Current User Request: \"{user_message}\""

        response = await generate_json(
            system_prompt=INTENT_SYSTEM_PROMPT,
            user_message=user_message,
            temperature=0.0,
        )
        intent = response.get("intent", "query")
        if intent not in ("query", "edit", "recommend"):
            intent = "query"
        logger.info(f"Intent classified as '{intent}' for message: {user_message[:50]}...")
        return intent
    except ImportError:
        logger.warning("LLM service not available, defaulting to 'edit' intent")
        return "edit"
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return "edit"


async def answer_query(user_message: str, llm_service: Any = None, history: list[dict] | None = None) -> str:
    """
    Answer user questions without needing the scene spec.
    Uses a lightweight prompt with general animation info.
    """
    if history is None:
        history = []
    try:
        from app.services.llm_service import generate_text

        # Format conversation history
        history_text = ""
        if history:
            history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-5:]])
            history_text = f"\nConversation History:\n{history_text}\n"

        user_message = f"{history_text}Current User Question: \"{user_message}\""

        response = await generate_text(
            system_prompt=QUERY_SYSTEM_PROMPT,
            user_message=user_message,
            temperature=0.3,
        )
        return response
    except ImportError:
        return "No se pudo procesar la consulta. El servicio de IA no está disponible."
    except Exception as e:
        logger.error(f"Query answering failed: {e}")
        return "Ocurrió un error al procesar tu consulta."
