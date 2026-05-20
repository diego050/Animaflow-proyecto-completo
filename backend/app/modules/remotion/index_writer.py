import os
from app.core.logging import get_logger

logger = get_logger("remotion")


def write_index_ts(job_id: str, timeline_scenes: list[dict]):
    """Escribe index.ts para exportar módulos explícitamente (compatible con Remotion Webpack CLI)."""
    from app.core.config import settings
    generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
    index_path = os.path.join(generated_dir, "index.ts")

    imports = []
    exports = []
    for i, s in enumerate(timeline_scenes):
        type_name = s["type"]
        if type_name not in ("FadeText", "Fade Text"):
            var_name = f"SceneMod_{i}"
            imports.append(f"import * as {var_name} from './{type_name}';")
            exports.append(f"  '{type_name}': {var_name},")

    content = (
        "\n".join(imports)
        + "\n\nexport const generatedModules: Record<string, any> = {\n"
        + "\n".join(exports)
        + "\n};\n"
    )

    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("Generado index.ts para componentes dinámicos.", extra={"job_id": job_id})
    except (OSError, IOError) as e:
        logger.error("Error escribiendo index.ts: %s", e, extra={"job_id": job_id})
