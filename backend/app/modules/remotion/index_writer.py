import os
from typing import Optional
from app.core.logging import get_logger

logger = get_logger("remotion")


def _get_generated_dir() -> str:
    from app.core.config import settings
    return os.path.join(settings.frontend_path, "src", "remotion", "generated")


def write_user_index_ts(job_id: str, timeline_scenes: list[dict], user_id: Optional[str] = None):
    """Escribe index.ts dentro del subdirectorio del usuario."""
    generated_dir = _get_generated_dir()
    user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
    os.makedirs(user_dir, exist_ok=True)

    index_path = os.path.join(user_dir, "index.ts")

    imports = []
    exports = []
    for i, s in enumerate(timeline_scenes):
        type_name = s["type"]
        if type_name not in ("FadeText", "Fade Text", "pending", ""):
            var_name = f"SceneMod_{i}"
            imports.append(f"import * as {var_name} from './{type_name}';")
            exports.append(f"  '{type_name}': {var_name},")

    content = (
        "\n".join(imports)
        + "\n\nexport const userModules: Record<string, any> = {\n"
        + "\n".join(exports)
        + "\n};\n"
    )

    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("Generado index.ts para usuario %s", user_id or 'anonymous', extra={"job_id": job_id})
    except (OSError, IOError) as e:
        logger.error("Error escribiendo index.ts de usuario: %s", e, extra={"job_id": job_id})


def write_global_index_ts():
    """Escanea todos los subdirectorios user_* y genera un index.ts global
    que re-exporta estáticamente todos los módulos (compatible con Remotion/Webpack).
    """
    generated_dir = _get_generated_dir()
    os.makedirs(generated_dir, exist_ok=True)

    imports: list[str] = []
    exports: list[str] = []

    if not os.path.isdir(generated_dir):
        logger.warning("Directorio generated/ no existe aún, saltando index global.")
        return

    for entry in sorted(os.listdir(generated_dir)):
        user_path = os.path.join(generated_dir, entry)
        if os.path.isdir(user_path) and entry.startswith("user_"):
            user_label = entry  # e.g. "user_83438828"
            # Recorrer archivos .tsx del usuario (excluyendo index.ts)
            for fname in sorted(os.listdir(user_path)):
                if fname.endswith(".tsx") and not fname.startswith("index"):
                    base = fname[:-4]  # quitar .tsx
                    # Evitar nombres que empiecen con número (no válidos como identificadores JS)
                    safe_base = base
                    if base[0].isdigit():
                        safe_base = f"_{base}"
                    imports.append(f"import * as {safe_base} from './{entry}/{base}';")
                    exports.append(f"  '{base}': {safe_base},")

    content_lines = [
        "// AUTO-GENERADO: re-exporta todos los componentes de todos los usuarios",
        "// NO MODIFICAR MANUALMENTE — se regenera automáticamente al crear escenas",
        "",
    ]
    content_lines.extend(imports)
    content_lines.extend([
        "",
        "export const generatedModules: Record<string, any> = {",
    ])
    content_lines.extend(exports)
    content_lines.extend([
        "};",
        "",
    ])

    index_path = os.path.join(generated_dir, "index.ts")
    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write("\n".join(content_lines))
        logger.info("Regenerado index.ts global con %d módulos.", len(exports))
    except (OSError, IOError) as e:
        logger.error("Error escribiendo index.ts global: %s", e)


def write_index_ts(job_id: str, timeline_scenes: list[dict], user_id: Optional[str] = None):
    """Escribe index.ts por usuario Y regenera el index.ts global.
    Este es el entrypoint principal que deben llamar orchestrator y scene_manager.
    """
    write_user_index_ts(job_id, timeline_scenes, user_id)
    write_global_index_ts()
