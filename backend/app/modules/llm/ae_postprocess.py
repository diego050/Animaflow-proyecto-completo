import re
from .ae_postprocess_ramp import (
    fix_gradient_to_ramp,
    fix_ramp_properties,
    ensure_ramp_interpolation,
)
from .ae_postprocess_effects import (
    fix_drop_shadow_properties,
    fix_glow_properties,
    remove_orphan_drop_shadows,
)
from .ae_postprocess_advanced import (
    inject_trim_paths,
    fix_absurd_text_positions,
    fix_absurd_scale,
)


def _extract_layer_names(structure_script: str) -> list:
    """Extrae nombres de layers del script de estructura Fase 1.

    Detecta layers creados de 3 formas:
    1. var NAME = comp.layers.addShape()
    2. var NAME = comp.layers.addText()
    3. Array geo con { name: "...", type: "..." } (cuando LLM usa helper functions)
    """
    layers = []

    # Pattern: var NAME = comp.layers.addShape()
    shape_pattern = r"var\s+(\w+)\s*=\s*comp\.layers\.addShape\(\)"
    for match in re.finditer(shape_pattern, structure_script):
        layers.append(match.group(1))

    # Pattern: var NAME = comp.layers.addText()
    text_pattern = r"var\s+(\w+)\s*=\s*comp\.layers\.addText\("
    for match in re.finditer(text_pattern, structure_script):
        layers.append(match.group(1))

    # Pattern: var NAME = comp.layers.addSolid()
    solid_pattern = r"var\s+(\w+)\s*=\s*comp\.layers\.addSolid\("
    for match in re.finditer(solid_pattern, structure_script):
        layers.append(match.group(1))

    # Also look for .name = "..." assignments
    name_pattern = r'(\w+)\.name\s*=\s*"([^"]+)"'
    for match in re.finditer(name_pattern, structure_script):
        var_name = match.group(1)
        layer_name = match.group(2)
        if var_name not in layers and layer_name not in ["Background", "Fondo", "BG"]:
            layers.append(var_name)

    # CRITICAL: Extract layer names from geo arrays (when LLM uses helper functions)
    # Pattern: { name: "Branch_L", type: "path", ... }
    geo_name_pattern = r'\{\s*name:\s*"([^"]+)"\s*,\s*type:'
    for match in re.finditer(geo_name_pattern, structure_script):
        geo_name = match.group(1)
        if geo_name not in layers:
            layers.append(geo_name)

    return layers if layers else ["textLayer"]


def _post_process_script(script: str) -> str:
    """Aplica todas las reglas de post-processing al script ensamblado."""
    # a) Remove duplicate randomRange
    def remove_duplicate_generate_random(script_text):
        pattern = r"(function (?:randomRange|generateRandomNumber)\([^)]*\)\s*\{[^}]*\})"
        matches = list(re.finditer(pattern, script_text))
        if len(matches) > 1:
            for m in matches[1:]:
                script_text = script_text[: m.start()] + script_text[m.end() :]
        return script_text

    script = remove_duplicate_generate_random(script)

    # b) layers.length → layers.numLayers
    script = re.sub(r"\.layers\.length", ".layers.numLayers", script)

    # c) ADBE Rotation → ADBE Rotate Z
    script = re.sub(r"\bADBE Rotation\b", "ADBE Rotate Z", script)

    # d) Remove createPath
    if "createPath(" in script:
        script = script.replace("createPath(", "// REMOVED: createPath(")

    # e) Fix unclosed quotes
    script = re.sub(r'\.property\("([^"]+)\)\)', r'.property("\1"))', script)

    # f) generateRandomNumber → randomRange
    script = script.replace("generateRandomNumber", "randomRange")

    # g) Normalize randomRange
    script = re.sub(
        r"function randomRange\([^)]*\)\s*\{[^}]*\}",
        "function randomRange(min, max) {\n    return min + (Math.random() * (max - min));\n}",
        script,
    )

    # h) Fix undefined closed
    script = script.replace(
        "s.closed = item.closed;",
        "s.closed = item.closed !== undefined ? item.closed : false;",
    )

    # i) Fix layer.property("Effects") → layer.property("ADBE Effect Parade")
    script = re.sub(
        r'(\w+)\.Effects\.addProperty',
        r'\1.property("ADBE Effect Parade").addProperty',
        script,
    )

    # j) Fix ADBE Glow → ADBE Glo2 (AE uses ADBE Glo2 for glow effect)
    script = script.replace('"ADBE Glow"', '"ADBE Glo2"')
    script = script.replace("'ADBE Glow'", "'ADBE Glo2'")
    # Also fix bare "Glo2" without ADBE prefix
    script = script.replace('"Glo2"', '"ADBE Glo2"')
    script = script.replace("'Glo2'", "'ADBE Glo2'")

    # k) Fix Glow Radius property number (Glo2 property 3 is radius)
    script = re.sub(r'\.property\("Glow Radius"\)', ".property(3)", script)

    # l) Fix Gradient Fill → Fill + ADBE Ramp
    script = fix_gradient_to_ramp(script)

    # m-1) Normalize Ramp properties
    script = fix_ramp_properties(script)

    # m-0.6) Ensure Ramp has Ramp Shape set
    script = ensure_ramp_interpolation(script)

    # m) Fix Drop Shadow: convert numeric indices to match names
    script = fix_drop_shadow_properties(script)

    # m-2) Fix Glow: convert numeric indices to match names
    script = fix_glow_properties(script)

    # n) Clean up any remaining gradient property references
    script = re.sub(
        r'\w+\.property\(["\']ADBE Vector Grad[^"\']+["\']\)\.setValue\([^)]*\);?\s*',
        "",
        script,
    )
    script = re.sub(
        r'\w+\.property\(["\']ADBE Vector Gradient[^"\']+["\']\)\.setValue\([^)]*\);?\s*',
        "",
        script,
    )

    # n-0.5) Guard Ramp color properties
    ramp_vars = set()
    for m in re.finditer(
        r'var\s+(\w+)\s*=.*addProperty\("ADBE Ramp"\)', script
    ):
        ramp_vars.add(m.group(1))

    for rvar in ramp_vars:
        rv = re.escape(rvar)
        script = re.sub(
            rf'{rv}\.property\("ADBE Ramp-0002"\)\.setValue\(\d+\);?\s*',
            "",
            script,
        )
        script = re.sub(
            rf'{rv}\.property\("ADBE Ramp-0004"\)\.setValue\(\d+\);?\s*',
            "",
            script,
        )

    # n-1) Inject Trim Paths where animations reference them
    script = inject_trim_paths(script)

    # o) Remove orphan Drop Shadow access blocks
    script = remove_orphan_drop_shadows(script)

    # p) Fix absurd text position values
    script = fix_absurd_text_positions(script)

    # q) Fix absurd scale values > 2000%
    script = fix_absurd_scale(script)

    return script
