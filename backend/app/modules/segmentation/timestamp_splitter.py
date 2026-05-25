import re
from typing import List, Dict, Any
from app.modules.segmentation.service import split_text_into_chunks

def _normalize(text: str) -> str:
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

def split_by_timestamps(
    word_timestamps: List[Dict[str, Any]], 
    script_text: str = ""
) -> List[Dict[str, Any]]:
    """
    Segmenta un flujo de palabras basándose en la lógica clásica de split_text_into_chunks,
    pero mapeando los timestamps de Whisper para obtener las duraciones exactas.
    """
    if not word_timestamps:
        return []
        
    if not script_text:
        # Fallback reconstruyendo el script si no se pasó
        script_text = " ".join([w["word"] for w in word_timestamps])

    chunks = split_text_into_chunks(script_text)
    
    scenes = []
    wt_idx = 0
    total_wts = len(word_timestamps)
    
    for i, chunk in enumerate(chunks):
        norm_chunk = _normalize(chunk).replace(" ", "")
        
        chunk_wts = []
        accumulated = ""
        
        while wt_idx < total_wts:
            wt = word_timestamps[wt_idx]
            wt_word = _normalize(wt["word"])
            
            chunk_wts.append(wt)
            if wt_word:
                accumulated += wt_word
                
            wt_idx += 1
            
            # Cortamos cuando hayamos acumulado el texto de este chunk
            # Usamos 90% de coincidencia para tolerar que Whisper omita alguna palabra
            if len(accumulated) >= len(norm_chunk) * 0.95:
                break
                
        # Si es el último chunk, metemos cualquier timestamp sobrante por seguridad
        if i == len(chunks) - 1 and wt_idx < total_wts:
            while wt_idx < total_wts:
                chunk_wts.append(word_timestamps[wt_idx])
                wt_idx += 1
                
        if not chunk_wts:
            break
            
        scene_start = chunk_wts[0]["start"]
        scene_end = chunk_wts[-1]["end"]
        
        scenes.append({
            "text": chunk,
            "core_start": scene_start,
            "core_end": scene_end,
            "word_timestamps": chunk_wts
        })

    # Ahora hacemos una segunda pasada para asegurar que los tiempos sean contiguos 
    # y no se pierda el silencio entre escenas ni al principio/final.
    if not scenes:
        return []
        
    for i, scene in enumerate(scenes):
        if i == 0:
            start_time = 0.0
        else:
            # El inicio de esta escena es exactamente el final de la anterior
            start_time = scenes[i - 1]["end_time_seconds"]
            
        if i == len(scenes) - 1:
            # La última escena toma todo el silencio hasta el final del audio (le damos un margen generoso)
            end_time = scene["core_end"] + 1.5 
        else:
            # Use core_end + small buffer instead of midpoint to avoid cutting audio
            end_time = scene["core_end"] + 0.4
            
            # If next scene starts before our buffer, use the gap midpoint as fallback
            next_start = scenes[i + 1]["core_start"]
            if end_time > next_start:
                end_time = (scene["core_end"] + next_start) / 2.0
                
        scene["start_time_seconds"] = round(start_time, 3)
        scene["end_time_seconds"] = round(end_time, 3)
        scene["duration_seconds"] = round(end_time - start_time, 3)

    return scenes
