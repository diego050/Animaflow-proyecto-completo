"""
AE export zip creation and audio file management.
"""
import json
import os
import shutil
import zipfile
import tempfile
from typing import List, Tuple

import httpx
from sqlalchemy.orm import Session

from app.db.models import JobModel
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir

logger = get_logger("ae_export")

ASPECT_RATIOS = {
    "9:16": (1080, 1920),
    "4:5": (1080, 1350),
    "3:4": (1080, 1440),
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}
DEFAULT_ASPECT_RATIO = "9:16"


def get_resolution(aspect_ratio: str) -> Tuple[int, int]:
    return ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS[DEFAULT_ASPECT_RATIO])


def download_audio_files(job: JobModel, audio_dir: str) -> List[str]:
    """
    Descarga los archivos de audio cacheados localmente para el job.
    Usa el cache local en storage/audio/ en vez de descargar de Voicebox.
    """
    if not job.result_spec:
        return []

    scenes = job.result_spec.get('scenes', [])
    downloaded_files = []

    # Local cache directory
    cache_dir = get_storage_dir("audio")
    
    for i, scene in enumerate(scenes):
        audio_url = scene.get('audio_url')
        if audio_url:
            try:
                # Try to find cached file locally
                local_path = os.path.join(cache_dir, f"{job.id}_{i}.mp3")
                if os.path.exists(local_path):
                    audio_filename = f"escena_{i + 1}.mp3"
                    audio_path = os.path.join(audio_dir, audio_filename)
                    shutil.copy(local_path, audio_path)
                    downloaded_files.append(audio_filename)
                    logger.info("Audio copied from cache: %s", audio_filename)
                else:
                    # Fallback: try to download from URL (if it's a remote URL)
                    try:
                        response = httpx.get(audio_url, timeout=10)
                        response.raise_for_status()
                        audio_filename = f"escena_{i + 1}.mp3"
                        audio_path = os.path.join(audio_dir, audio_filename)
                        with open(audio_path, 'wb') as f:
                            f.write(response.content)
                        downloaded_files.append(audio_filename)
                        logger.info("Audio downloaded from URL: %s", audio_filename)
                    except (httpx.HTTPError, httpx.TimeoutException) as e:
                        logger.error("Failed to download audio %d: %s", i + 1, e)
            except (OSError, IOError, shutil.Error) as e:
                logger.error("Error getting audio %d: %s", i + 1, e)
            except Exception as e:
                # Fallback: log unexpected error and continue with next audio
                logger.exception("Error getting audio %d: %s", i + 1, e)
    
    return downloaded_files


def create_export_zip(job_id: str, db: Session) -> tuple:
    """
    Crea un archivo .zip con todo lo necesario para After Effects.
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        return None, "Job no encontrado"
    
    if not job.result_spec:
        return None, "Job no tiene spec.json generado"
    
    # Crear directorio temporal
    temp_dir = tempfile.mkdtemp(prefix=f"animaflow_ae_{job_id}_")
    
    try:
        # 1. Generar script.jsx
        from .script_builder import create_ae_full_script
        script_content = create_ae_full_script(job)
        script_path = os.path.join(temp_dir, "script.jsx")
        
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        # 2. Descargar audios
        audio_dir = os.path.join(temp_dir, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        download_audio_files(job, audio_dir)
        
        # 3. Guardar spec.json
        spec_path = os.path.join(temp_dir, "spec.json")
        
        with open(spec_path, 'w', encoding='utf-8') as f:
            json.dump(job.result_spec, f, indent=2)
        
        aspect_ratio = job.result_spec.get('aspect_ratio', job.aspect_ratio or "9:16")
        width, height = get_resolution(aspect_ratio)
        
        # 4. Crear README.md
        readme_content = f"""# AnimaFlow Project - {job_id}

## Instrucciones para After Effects

1. Abre Adobe After Effects
2. Ve a `File > Scripts > Run Script File...`
3. Selecciona el archivo `script.jsx`
4. El script creará automáticamente:
   - Composición {width}x{height} a 30fps
   - Capa de fondo con color del spec
   - Capas de texto con timing y color
   - Formas SVG animadas
   - Capa de audio

## Estructura del proyecto

- `script.jsx`: Script principal de After Effects
- `audio/`: Archivos de audio TTS
- `spec.json`: Metadatos completos del proyecto

## Notas

- Asegúrate de que los archivos de audio estén en la carpeta `audio/`
- El script creará una nueva composición en tu proyecto actual
- Para editar: busca las capas en el timeline y modifica keyframes

Generado por AnimaFlow
"""
        
        readme_path = os.path.join(temp_dir, "README.md")
        
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        # 5. Crear .zip
        zip_filename = f"animaflow_{job_id}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    if file != zip_filename:  # No incluir el zip dentro de sí mismo
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zipf.write(file_path, arcname)
        
        return zip_path, zip_filename

    except (OSError, IOError, zipfile.BadZipFile, ValueError) as e:
        logger.error("Error creando zip: %s", e)
        return None, str(e)
    except Exception as e:
        # Fallback: return None on any unexpected error
        logger.exception("Error creando zip: %s", e)
        return None, str(e)
    
    finally:
        # Limpiar directorio temporal (pero no el zip)
        # El zip se devuelve, así que el caller es responsable de moverlo/copiarlo
        pass
