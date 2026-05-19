"""
Deterministic AE Script Generator for AnimaFlow.

Generates ExtendScript (.jsx) code WITHOUT using LLM.
Uses enriched TSX analysis + SVG parser data to produce exact code.

Replaces LLM Phase 1 (structure) + Phase 2 (animations) entirely.
"""
from app.core.logging import get_logger

logger = get_logger("ae_export")

from .utils import hex_to_rgb_array, _find_shapes_in_block, _find_circle_color, _calc_center, _validate_ae_script, _generate_layer_name
from .shapes import _generate_shape_layer, _generate_ellipse_layer
from .text import _generate_text_layer
from .animations import _generate_animations
from .morphing import _generate_morphing_paths


def generate_deterministic_script(
    svg_elements: list,
    enriched: dict,
    text: str,
    duration: float,
    bg_color: str,
    text_color: str,
    width: int = 1080,
    height: int = 1920,
    fps: int = 30,
) -> str:
    """
    Generate a complete AE ExtendScript from parsed data.
    No LLM involved — 100% deterministic.
    """
    parts = []
    layer_idx = 0
    layer_vars = []  # Track (var_name, element_data) for animation phase
    
    # === HEADER ===
    parts.append(f'var comp = app.project.items.addComp("Scene", {width}, {height}, 1, {duration}, {fps});')
    parts.append(f'comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Background", {width}, {height}, 1, {duration});')
    parts.append('')
    
    # Build animation lookup from enriched data
    anim_by_var = {a["variable"]: a for a in enriched.get("animations", [])}
    groups = enriched.get("groups", [])
    enriched_elements = enriched.get("elements", [])
    map_expansions = enriched.get("map_expansions", [])
    
    # Separate SVG elements into group children vs standalone
    group_svg_indices = set()
    
    # === GENERATE ANIMATED CIRCLES (ripple, etc.) ===
    for elem in enriched_elements:
        if elem.get("type") == "circle" and elem.get("r_animated"):
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = elem.get("name", f"Circle_{layer_idx}")
            ae_size = elem.get("aeSize", [100, 100])
            pos = elem.get("position", [width // 2, height // 2])
            
            # Find matching circle color from SVG
            circle_color = _find_circle_color(svg_elements, pos)
            
            code = _generate_ellipse_layer(var, name, ae_size, pos, circle_color, stroke_only=True)
            parts.append(code)
            
            r_anim = elem.get("animations", {}).get("radius")
            # For animated radius, we animate Scale (not size)
            # rippleScale goes 0->1400, AE size is 2800, so Scale 0%->100%
            opacity_var = None
            for a in enriched.get("animations", []):
                if "opacity" in a["variable"].lower() and "ripple" in a["variable"].lower():
                    opacity_var = a
                    break
            
            layer_vars.append((var, name, {
                "scale_from_radius": r_anim,
                "opacity": opacity_var,
                "basePosition": pos,
                "maxRadius": elem.get("maxRadius", 100),
            }))
            
    # === IDENTIFY GROUP SHAPES FIRST ===
    matched_svg_ids = set()
    for group in groups:
        children_block = group.get("children_block", "")
        group_shapes = _find_shapes_in_block(children_block, svg_elements)
        for shape in group_shapes:
            matched_svg_ids.add(id(shape))
            
    # === GENERATE STANDALONE SVG ELEMENTS (not in groups, not already used) ===
    for svg_elem in svg_elements:
        if id(svg_elem) in matched_svg_ids:
            continue
        if svg_elem.get("type") in ("circle", "glow", "dropShadow", "gradient", "linearGradient", "radialGradient"):
            continue  # Handled by enriched or are effects/gradients
            
        layer_idx += 1
        var = f"sl{layer_idx}"
        name = _generate_layer_name(svg_elem, layer_idx)
        pos = _calc_center(svg_elem, width, height)
        
        code = _generate_shape_layer(var, name, svg_elem, pos, width, height, svg_elements, is_group_child=False)
        parts.append(code)
        
        # Standalone elements may have opacity animations like lineOpacity or similar variables
        elem_opacity_anim = None
        for a in enriched.get("animations", []):
            vname = a["variable"].lower()
            if "opacity" in vname and "line" in vname and svg_elem.get("type") == "path":
                elem_opacity_anim = a
                break
                
        layer_vars.append((var, name, {
            "basePosition": pos,
            "opacity": elem_opacity_anim,
        }))
            
    # === GENERATE PARTICLES ===
    for expansion in map_expansions:
        for elem_data in expansion["elements"]:
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = f"Particle_{elem_data['index']}"
            pos = [elem_data["x"], elem_data["y"]]
            size = [elem_data["size"] * 2, elem_data["size"] * 2]
            fill = expansion.get("fillColor", "#a2dff7")
            
            code = _generate_ellipse_layer(var, name, size, pos, fill, add_glow=True)
            parts.append(code)
            
            layer_vars.append((var, name, {
                "basePosition": pos,
                "perElementAnimations": {k: v for k, v in elem_data.items() if k.startswith("anim_")},
                "isParticle": True,
            }))

    # === GENERATE GROUP ELEMENTS (like the leaf) ===
    for group in groups:
        tx = group.get("translateX") or width // 2
        ty_var = group.get("translateY_var")
        sc_var = group.get("scale_var")
        op_var = group.get("opacity_var")
        
        # Resolve final position for static setValue
        ty_anim = anim_by_var.get(ty_var)
        ty = ty_anim["keyframes"][-1]["value"] if ty_anim else (group.get("translateY") or height // 2)
        
        children_block = group.get("children_block", "")
        
        # Find SVG elements that belong to this group
        group_shapes = _find_shapes_in_block(children_block, svg_elements)
        
        for shape in group_shapes:
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = _generate_layer_name(shape, layer_idx)
            
            code = _generate_shape_layer(var, name, shape, [tx, ty], width, height, svg_elements, is_group_child=True)
            parts.append(code)
            
            # Collect animation data for this layer
            layer_vars.append((var, name, {
                "positionY": ty_anim,
                "scale": anim_by_var.get(sc_var) if sc_var else None,
                "opacity": anim_by_var.get(op_var) if op_var else None,
                "basePosition": [tx, ty],
                "shape": shape,
            }))
    
    # === GENERATE TEXT LAYER ===
    text_elem = next((e for e in enriched_elements if e.get("type") == "text"), None)
    text_pos = text_elem["position"] if text_elem else [width // 2, int(height * 0.82)]
    
    parts.append(_generate_text_layer(text, text_color, text_pos, width, height))
    
    # Text animations
    text_anims = {}
    for a in enriched.get("animations", []):
        vname = a["variable"].lower()
        if "textopacity" in vname or "textopac" in vname:
            text_anims["opacity"] = a
        elif "texty" in vname:
            text_anims["positionY"] = a
        elif "textscale" in vname:
            text_anims["scale"] = a
    
    layer_vars.append(("textLayer", "textLayer", {
        "basePosition": text_pos,
        "isText": True,
        **text_anims,
    }))
    
    # === GENERATE TRIM PATHS ON SHAPE LAYERS ===
    # Trim paths are added to existing shape layers, not new layers
    trim_elements = [e for e in enriched_elements if e.get("type") == "trim"]
    for trim_elem in trim_elements:
        # Find the corresponding shape layer by tag type
        tag = trim_elem.get("tag", "path")
        # Trim paths are applied via the shape layer's vector group
        # We'll add them in the animation section since they need the layer variable
        pass  # Handled in animation phase via layer_vars
    
    # === GENERATE MORPHING PATHS ===
    layer_idx = _generate_morphing_paths(enriched_elements, svg_elements, layer_idx, parts, layer_vars, width, height)
    
    # === ANIMATIONS ===
    parts.append('')
    parts.append('// === ANIMATIONS ===')
    
    for var, name, anim_data in layer_vars:
        anim_code = _generate_animations(var, name, anim_data, fps)
        if anim_code:
            parts.append(anim_code)
    
    # === VALIDATION ===
    full_script = '\n'.join(parts)
    is_valid, errors = _validate_ae_script(full_script)
    if not is_valid:
        logger.warning("Validation warnings: %s", errors)
        # Don't fail, just log — the script may still work
    
    return full_script
