import re


def split_text_into_chunks(text: str, target_duration_seconds: float = 7.0) -> list[str]:
    """Divide el texto en segmentos de aproximadamente target_duration_seconds.

    Asume velocidad de habla de ~130 palabras/minuto (~2.17 palabras/segundo).
    Cada palabra ≈ 0.46 segundos.
    """
    words_per_second = 2.17
    target_words = int(target_duration_seconds * words_per_second)

    # Primero dividir en oraciones
    sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return [text] if text.strip() else []

    chunks = []
    current_chunk = []
    current_word_count = 0

    for sentence in sentences:
        sentence_word_count = len(sentence.split())

        # Si una sola oración ya es muy larga (más del doble del target), dividirla
        if sentence_word_count > target_words * 2 and len(sentence) > 100:
            # Guardar chunk actual si existe
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_word_count = 0

            # Dividir oración larga en fragmentos
            words = sentence.split()
            sub_chunk = []
            sub_count = 0
            for word in words:
                sub_chunk.append(word)
                sub_count += 1
                if sub_count >= target_words:
                    chunks.append(" ".join(sub_chunk))
                    sub_chunk = []
                    sub_count = 0
            if sub_chunk:
                chunks.append(" ".join(sub_chunk))
        else:
            # Intentar agregar al chunk actual
            if current_word_count + sentence_word_count <= target_words * 1.3:  # 30% de tolerancia
                current_chunk.append(sentence)
                current_word_count += sentence_word_count
            else:
                # Guardar chunk actual y empezar nuevo
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_word_count = sentence_word_count

    # No olvidar el último chunk
    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks if chunks else [text]
