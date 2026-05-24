import re
from typing import List, Dict, Any

def split_by_timestamps(
    word_timestamps: List[Dict[str, Any]], 
    target_duration: float = 7.0,
    min_duration: float = 3.0,
    max_duration: float = 12.0,
    silence_threshold: float = 0.3
) -> List[Dict[str, Any]]:
    """
    Segmenta un flujo de palabras con timestamps en escenas lógicas.
    Busca pausas naturales (puntos, comas, o silencios) cerca del target_duration.
    
    word_timestamps: [{"word": "Hola,", "start": 0.0, "end": 0.5}, ...]
    """
    if not word_timestamps:
        return []

    scenes = []
    current_scene_words = []
    current_start = word_timestamps[0]["start"]
    
    # Expresiones regulares para finales lógicos
    end_of_sentence = re.compile(r'[.!?:]$')
    end_of_clause = re.compile(r'[,;]$')

    for i, wt in enumerate(word_timestamps):
        current_scene_words.append(wt)
        current_duration = wt["end"] - current_start
        
        is_last_word = (i == len(word_timestamps) - 1)
        next_word = word_timestamps[i + 1] if not is_last_word else None
        
        silence_after = (next_word["start"] - wt["end"]) if next_word else 0.0
        
        # Condiciones para cortar la escena:
        # 1. Si llegamos a la última palabra, cortamos sí o sí.
        # 2. Si excedemos el max_duration, cortamos forzosamente.
        # 3. Si pasamos el target_duration, cortamos en el primer silencio o puntuación.
        # 4. Si pasamos min_duration y hay un silencio muy largo o un fin de oración claro.
        
        cut_scene = False
        
        if is_last_word:
            cut_scene = True
        elif current_duration >= max_duration:
            cut_scene = True
        elif current_duration >= target_duration:
            if silence_after > silence_threshold or end_of_sentence.search(wt["word"]) or end_of_clause.search(wt["word"]):
                cut_scene = True
        elif current_duration >= min_duration:
            if end_of_sentence.search(wt["word"]) or silence_after > (silence_threshold * 2):
                cut_scene = True

        if cut_scene:
            scene_text = " ".join([w["word"] for w in current_scene_words])
            scene_end = wt["end"]
            
            scenes.append({
                "text": scene_text,
                "start_time_seconds": round(current_start, 3),
                "end_time_seconds": round(scene_end, 3),
                "duration_seconds": round(scene_end - current_start, 3),
                "word_timestamps": current_scene_words
            })
            
            # Reset para la siguiente escena
            if not is_last_word:
                current_scene_words = []
                current_start = next_word["start"]

    return scenes
