import re


def split_text_into_chunks(text: str) -> list[str]:
    """Divide el texto en oraciones lógicas basadas en puntuación."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]
