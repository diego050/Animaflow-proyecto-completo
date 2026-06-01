import json
import os
import subprocess
from typing import Optional
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir
from app.core.config import settings

logger = get_logger("remotion.scene_renderer")

SCENES_STORAGE = get_storage_dir("scenes")


def render_single_scene(
    job_id: str,
    scene_index: int,
    duration_seconds: float,
    scene_text: str,
    component_name: str,
    background_color: str = "#0f172a",
    text_color: str = "#38bdf8",
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    anima_composer: dict | None = None,
) -> str:
    """
    Renderiza una sola escena como MP4 usando Remotion CLI.

    Args:
        job_id: ID del job
        scene_index: Índice de la escena (0-based)
        duration_seconds: Duración en segundos (incluye entry/exit animations)
        scene_text: Texto de la escena para pasar como prop
        component_name: Nombre del componente TSX (ej: Scene_job123_0)
        background_color: Color de fondo para fallback
        text_color: Color de texto para fallback
        aspect_ratio: Relación de aspecto (9:16, 16:9, etc.)
        user_id: ID del usuario para encontrar el componente

    Returns:
        Path al MP4 generado
    """
    scene_dir = os.path.join(SCENES_STORAGE, job_id)
    os.makedirs(scene_dir, exist_ok=True)

    output_path = os.path.join(scene_dir, f"{scene_index}.mp4")

    # Si ya existe, borrarlo para regenerar
    if os.path.exists(output_path):
        os.remove(output_path)

    # Calcular dimensiones
    from typing import Tuple

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

    w, h = get_resolution(aspect_ratio)

    # Directorio del frontend
    frontend_dir = settings.frontend_path

    # Preparar props para SceneRoot.tsx
    props = {
        "type": component_name,
        "text": scene_text,
        "durationInFrames": int(duration_seconds * 30),
        "fallbackBg": background_color,
        "fallbackColor": text_color,
        "animaComposer": anima_composer,
    }

    # Escribir props a archivo temporal para evitar problemas de escape
    import tempfile

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as tmp:
        json.dump(props, tmp)
        props_file = tmp.name

    # Comando Remotion CLI
    npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
    cmd = [
        npx_cmd,
        "remotion",
        "render",
        "src/remotion/SceneRoot.tsx",  # Entry point para escenas individuales
        "SceneRenderer",  # Composition name (fijo en SceneRoot.tsx)
        output_path,
        f"--props={props_file}",
        "--width",
        str(w),
        "--height",
        str(h),
        "--frames-per-second",
        "30",
        "--crf",
        "28",     # Alta compresión para ahorrar espacio en las escenas previas
        "--log",
        "error",  # Solo errores, menos verbose
    ]

    logger.info(
        "Renderizando escena %d del job %s (%.1fs, %dx%d)...",
        scene_index,
        job_id,
        duration_seconds,
        w,
        h,
        extra={"job_id": job_id, "scene_index": scene_index},
    )

    try:
        result = subprocess.run(
            cmd,
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=os.environ.copy(),
            timeout=300,  # 5 minutos max por escena (primera vez tarda más por webpack)
        )
    finally:
        try:
            os.unlink(props_file)
        except OSError:
            pass

    if result.returncode != 0:
        logger.error(
            "Error renderizando escena %d: %s",
            scene_index,
            result.stderr,
            extra={"job_id": job_id, "scene_index": scene_index},
        )
        raise RuntimeError(f"Remotion render failed: {result.stderr}")

    logger.info(
        "Escena %d renderizada: %s",
        scene_index,
        output_path,
        extra={"job_id": job_id, "scene_index": scene_index},
    )
    return output_path
