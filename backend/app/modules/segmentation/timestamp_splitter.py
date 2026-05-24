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
            if len(accumulated) >= len(norm_chunk) * 0.9:
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
            "start_time_seconds": round(scene_start, 3),
            "end_time_seconds": round(scene_end, 3),
            "duration_seconds": round(scene_end - scene_start, 3),
            "word_timestamps": chunk_wts
        })

    return scenes
