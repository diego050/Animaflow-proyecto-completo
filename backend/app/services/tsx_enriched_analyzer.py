"""
TSX Enriched Analyzer for AnimaFlow AE Export Pipeline.

Extracts EXACT positions, sizes, timing, and element counts from TSX code.
Produces a deterministic element manifest that bypasses LLM guessing.

This is the core of Option C (Hybrid): deterministic structure + LLM animations.
"""
import re
import math
from typing import List, Dict, Any, Optional, Tuple


def analyze_tsx_for_ae(tsx_code: str, width: int = 1080, height: int = 1920, fps: int = 30) -> Dict[str, Any]:
    """
    Main entry: analyze TSX and produce a complete element manifest.
    
    Returns:
        {
            "elements": [...],        # All visual elements with exact properties
            "animations": [...],      # All animations with resolved keyframes
            "groups": [...],          # Group transforms (translate, scale)
            "map_expansions": [...],  # Expanded .map() elements
        }
    """
    result = {
        "elements": [],
        "animations": [],
        "groups": [],
        "map_expansions": [],
    }
    
    # 1. Extract group transforms (translate, scale, opacity)
    result["groups"] = _extract_group_transforms(tsx_code)
    
    # 2. Extract all interpolate/spring animations with variable resolution
    result["animations"] = _extract_all_animations(tsx_code, fps)
    
    # 3. Extract .map() expansions with computed per-element data
    result["map_expansions"] = _extract_map_expansions(tsx_code, fps, width, height)
    
    # 4. Build element manifest with resolved positions/sizes
    result["elements"] = _build_element_manifest(tsx_code, result, width, height, fps)
    
    return result


# =============================================================================
# GROUP TRANSFORM EXTRACTION
# =============================================================================

def _extract_group_transforms(tsx_code: str) -> List[Dict[str, Any]]:
    """Extract <g transform=...> with variable references resolved to animation data."""
    groups = []
    
    # Pattern: <g transform={`translate(${X}, ${Y}) scale(${S})`} style={{ opacity: O }}>
    pattern = r'<g\s+[^>]*transform=\{`([^`]+)`\}[^>]*(?:style=\{\{([^}]*)\}\})?[^>]*>'
    
    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        transform_expr = match.group(1)
        style_str = match.group(2) or ''
        
        group = {"transformExpression": transform_expr}
        
        # Extract translate variables
        tr_match = re.search(r'translate\(\$\{(\w+)\},\s*\$\{(\w+)\}\)', transform_expr)
        if tr_match:
            group["translateX_var"] = tr_match.group(1)
            group["translateY_var"] = tr_match.group(2)
            # Resolve static value if it's a number
            group["translateX"] = _try_resolve_static(tsx_code, tr_match.group(1))
            group["translateY"] = _try_resolve_static(tsx_code, tr_match.group(2))
        
        # Extract scale variable
        sc_match = re.search(r'scale\(\$\{(\w+)\}\)', transform_expr)
        if sc_match:
            group["scale_var"] = sc_match.group(1)
        
        # Extract opacity variable
        op_match = re.search(r'opacity:\s*(\w+)', style_str)
        if op_match:
            group["opacity_var"] = op_match.group(1)
        
        # Find children elements inside this <g>
        g_start = match.end()
        g_end = tsx_code.find('</g>', g_start)
        if g_end > g_start:
            group["children_block"] = tsx_code[g_start:g_end]
        
        groups.append(group)
    
    return groups


def _try_resolve_static(tsx_code: str, var_name: str) -> Optional[float]:
    """Try to resolve a variable to a static number (e.g., const x = 540)."""
    if var_name.isdigit():
        return float(var_name)
    # Check if it's a literal number in the template
    try:
        return float(var_name)
    except ValueError:
        pass
    # Look for const assignment
    pattern = rf'const\s+{re.escape(var_name)}\s*=\s*(\d+\.?\d*)\s*;'
    match = re.search(pattern, tsx_code)
    if match:
        return float(match.group(1))
    return None


# =============================================================================
# ANIMATION EXTRACTION WITH VARIABLE RESOLUTION
# =============================================================================

def _extract_all_animations(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """Extract ALL interpolate() and spring() calls, including those with variables."""
    animations = []
    
    # 1. Standard interpolate calls (pure numeric)
    pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*(?:,\s*\{([^}]+)\})?\s*\)'
    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        input_str = match.group(2)
        output_str = match.group(3)
        
        try:
            input_frames = [float(x.strip()) for x in input_str.split(',')]
            output_values = [float(x.strip()) for x in output_str.split(',')]
        except ValueError:
            continue  # Has variables, handled separately by map expansion
        
        anim_type = _classify_animation(var_name, output_values)
        input_seconds = [f / fps for f in input_frames]
        
        animations.append({
            "variable": var_name,
            "type": anim_type,
            "keyframes": [{"time": round(t, 3), "value": v} for t, v in zip(input_seconds, output_values)],
            "maxValue": max(output_values),
            "minValue": min(output_values),
        })
    
    # 2. Spring calls
    spring_pattern = r'const\s+(\w+)\s*=\s*spring\(\s*\{\s*frame:\s*frame\s*(?:\s*-\s*(\d+))?\s*,\s*fps\s*,\s*config:\s*\{\s*damping:\s*(\d+)\s*,\s*stiffness:\s*(\d+)\s*\}'
    for match in re.finditer(spring_pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        offset = int(match.group(2)) if match.group(2) else 0
        damping = int(match.group(3))
        stiffness = int(match.group(4))
        
        t0 = offset / fps
        t1 = (offset + 5) / fps
        t2 = (offset + 15) / fps
        
        animations.append({
            "variable": var_name,
            "type": "spring",
            "keyframes": [
                {"time": round(t0, 3), "value": 0},
                {"time": round(t1, 3), "value": 1.2},
                {"time": round(t2, 3), "value": 1.0},
            ],
            "springConfig": {"damping": damping, "stiffness": stiffness},
            "maxValue": 1.2,
            "minValue": 0,
        })
    
    return animations


def _classify_animation(var_name: str, values: list) -> str:
    """Classify animation type from variable name."""
    name = var_name.lower()
    if 'opacity' in name or 'opac' in name:
        return 'opacity'
    elif 'scale' in name:
        return 'scale'
    elif 'y' in name and ('pos' in name or name.endswith('y')):
        return 'positionY'
    elif 'x' in name and ('pos' in name or name.endswith('x')):
        return 'positionX'
    elif 'rotat' in name:
        return 'rotation'
    elif any(v > 100 for v in values):
        return 'positionY'
    elif all(0 <= v <= 1 for v in values):
        return 'opacity'
    return 'unknown'


# =============================================================================
# MAP EXPANSION (PARTICLES, REPEATED ELEMENTS)
# =============================================================================

def _extract_map_expansions(tsx_code: str, fps: int, width: int, height: int) -> List[Dict[str, Any]]:
    """
    Extract .map() patterns and resolve per-element data.
    Handles: Array.from({length: N}).map((_, i) => {...})
    """
    expansions = []
    
    # Find the array definition block
    # Pattern: const varName = Array.from({ length: N }).map((_, i) => { ... return {...}; });
    map_block_pattern = r'const\s+(\w+)\s*=\s*Array\.from\(\{\s*length:\s*(\d+)\s*\}\)\.map\(\((_,?\s*\w*),\s*(\w+)\)\s*=>\s*\{(.*?)\breturn\s*\{([^}]+)\}'
    
    for match in re.finditer(map_block_pattern, tsx_code, re.DOTALL):
        array_var = match.group(1)
        count = int(match.group(2))
        iter_var = match.group(4)
        body = match.group(5)
        return_obj = match.group(6)
        
        # Cap at 8 for AE performance
        actual_count = min(count, 8)
        
        # Extract delay pattern: const delay = i * N
        delay_pattern = rf'const\s+(\w+)\s*=\s*{re.escape(iter_var)}\s*\*\s*(\d+)'
        delay_match = re.search(delay_pattern, body)
        delay_var = delay_match.group(1) if delay_match else None
        delay_multiplier = int(delay_match.group(2)) if delay_match else 0
        
        # Extract size pattern: const size = N + Math.random() * M
        size_pattern = r'const\s+(\w+)\s*=\s*(\d+\.?\d*)\s*\+\s*Math\.random\(\)\s*\*\s*(\d+\.?\d*)'
        size_match = re.search(size_pattern, body)
        base_size = float(size_match.group(2)) if size_match else 3
        size_range = float(size_match.group(3)) if size_match else 0
        
        # Extract x offset: const xOffset = (Math.random() - 0.5) * N
        xoff_pattern = r'const\s+(\w+)\s*=\s*\(Math\.random\(\)\s*-\s*0\.5\)\s*\*\s*(\d+)'
        xoff_match = re.search(xoff_pattern, body)
        x_spread = int(xoff_match.group(2)) if xoff_match else 100
        
        # Extract interpolate calls inside map body (with delay variable)
        map_interpolates = []
        interp_pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]'
        for ip_match in re.finditer(interp_pattern, body):
            ip_var = ip_match.group(1)
            ip_inputs = ip_match.group(2)
            ip_outputs = ip_match.group(3)
            
            # Try to resolve outputs (usually pure numbers)
            try:
                out_vals = [float(x.strip()) for x in ip_outputs.split(',')]
            except ValueError:
                out_vals = []
            
            # Check if inputs reference delay variable
            uses_delay = delay_var and delay_var in ip_inputs
            
            map_interpolates.append({
                "variable": ip_var,
                "type": _classify_animation(ip_var, out_vals),
                "inputExpression": ip_inputs,
                "outputValues": out_vals,
                "usesDelay": uses_delay,
            })
        
        # Find the SVG element this maps to
        svg_tag_pattern = rf'\{{{re.escape(array_var)}\.map\(\((\w+),\s*(\w+)\)\s*=>\s*\(\s*<(\w+)\b([^>]*)/?>'
        svg_match = re.search(svg_tag_pattern, tsx_code, re.DOTALL)
        element_type = svg_match.group(3) if svg_match else "circle"
        element_attrs = svg_match.group(4) if svg_match else ""
        
        # Extract fill color from the SVG element
        fill_match = re.search(r'fill="([^"]+)"', element_attrs)
        fill_color = fill_match.group(1) if fill_match else "#a2dff7"
        
        # Generate per-element computed data
        import random
        random.seed(42)  # Deterministic randomness
        
        elements = []
        for i in range(actual_count):
            delay_frames = i * delay_multiplier
            x_offset = (random.random() - 0.5) * x_spread
            size = base_size + random.random() * size_range
            
            elem = {
                "index": i,
                "x": round(width / 2 + x_offset),
                "y": height // 2,  # Will be animated
                "size": round(size, 1),
                "delayFrames": delay_frames,
                "delaySeconds": round(delay_frames / fps, 3),
            }
            
            # Resolve per-element keyframes
            for interp in map_interpolates:
                if interp["usesDelay"] and interp["outputValues"]:
                    # Resolve the input frames with this element's delay
                    resolved_inputs = []
                    for token in interp["inputExpression"].split(','):
                        token = token.strip()
                        if delay_var and delay_var in token:
                            expr = token.replace(delay_var, str(delay_frames))
                            try:
                                resolved_inputs.append(eval(expr))
                            except Exception:
                                resolved_inputs.append(delay_frames)
                        else:
                            try:
                                resolved_inputs.append(float(token))
                            except ValueError:
                                resolved_inputs.append(0)
                    
                    kf = []
                    for t_frame, val in zip(resolved_inputs, interp["outputValues"]):
                        kf.append({"time": round(t_frame / fps, 3), "value": val})
                    
                    elem[f"anim_{interp['type']}"] = kf
            
            elements.append(elem)
        
        expansions.append({
            "arrayVariable": array_var,
            "originalCount": count,
            "actualCount": actual_count,
            "elementType": element_type,
            "fillColor": fill_color,
            "delayMultiplier": delay_multiplier,
            "xSpread": x_spread,
            "baseSize": base_size,
            "sizeRange": size_range,
            "elements": elements,
            "interpolates": map_interpolates,
        })
    
    return expansions


# =============================================================================
# ELEMENT MANIFEST BUILDER
# =============================================================================

def _build_element_manifest(tsx_code: str, analysis: Dict, width: int, height: int, fps: int) -> List[Dict[str, Any]]:
    """
    Build a complete element manifest with resolved positions/sizes.
    Each element has all the data needed for deterministic AE layer creation.
    """
    elements = []
    animations = analysis["animations"]
    groups = analysis["groups"]
    anim_by_var = {a["variable"]: a for a in animations}
    
    # Helper to find animation for a variable
    def get_anim(var_name):
        return anim_by_var.get(var_name)
    
    # 1. Process group-wrapped elements (like the leaf in <g transform=...>)
    for group in groups:
        tx_var = group.get("translateX_var")
        ty_var = group.get("translateY_var")
        sc_var = group.get("scale_var")
        op_var = group.get("opacity_var")
        
        # Resolve base position
        base_x = group.get("translateX") or width // 2
        base_y_anim = get_anim(ty_var) if ty_var else None
        base_y = base_y_anim["keyframes"][-1]["value"] if base_y_anim else (group.get("translateY") or height // 2)
        
        elements.append({
            "name": "GroupElement",
            "type": "group",
            "basePosition": [base_x, base_y],
            "positionY_animated": bool(base_y_anim),
            "positionY_var": ty_var,
            "scale_var": sc_var,
            "opacity_var": op_var,
            "animations": {
                "positionY": base_y_anim,
                "scale": get_anim(sc_var) if sc_var else None,
                "opacity": get_anim(op_var) if op_var else None,
            }
        })
    
    # 2. Process standalone circles (ripple, etc.)
    # Find circles NOT inside .map()
    circle_pattern = r'<circle\s+(?:(?!\.map).)*?cx="(\d+)"[^>]*cy="(\d+)"[^>]*r=\{([^}]+)\}'
    for match in re.finditer(circle_pattern, tsx_code, re.DOTALL):
        cx = int(match.group(1))
        cy = int(match.group(2))
        r_expr = match.group(3).strip()
        
        # Resolve r expression (e.g., Math.max(0, rippleScale))
        r_var = re.search(r'(\w+Scale|\w+Radius|\w+Size)', r_expr)
        if r_var:
            anim = get_anim(r_var.group(1))
            if anim:
                max_r = anim["maxValue"]
                elements.append({
                    "name": f"Circle_animated",
                    "type": "circle",
                    "position": [cx, cy],
                    "maxRadius": max_r,
                    "aeSize": [max_r * 2, max_r * 2],
                    "r_animated": True,
                    "r_var": r_var.group(1),
                    "animations": {"radius": anim},
                })
    
    # 3. Process standalone circles with static r
    static_circle = r'<circle\s+[^>]*cx="(\d+)"[^>]*cy="(\d+)"[^>]*r="(\d+\.?\d*)"'
    # (These are already handled by svg_parser, but we add position context)
    
    # 4. Process text block
    text_pattern = r'bottom:\s*[\'"](\d+)%[\'"]'
    text_match = re.search(text_pattern, tsx_code)
    if text_match:
        bottom_pct = int(text_match.group(1))
        text_y = int(height * (1 - bottom_pct / 100))
        elements.append({
            "name": "TextBlock",
            "type": "text",
            "position": [width // 2, text_y],
            "bottomPercent": bottom_pct,
        })
    
    # 5. Add map expansion elements
    for expansion in analysis["map_expansions"]:
        for elem in expansion["elements"]:
            elements.append({
                "name": f"Particle_{elem['index']}",
                "type": expansion["elementType"],
                "position": [elem["x"], elem["y"]],
                "size": elem["size"],
                "fillColor": expansion["fillColor"],
                "delaySeconds": elem["delaySeconds"],
                "perElementAnimations": {k: v for k, v in elem.items() if k.startswith("anim_")},
                "fromMapExpansion": True,
            })
    
    return elements


def generate_element_summary(analysis: Dict) -> str:
    """
    Generate a human-readable summary for LLM prompt injection.
    This tells the LLM EXACTLY what to create and where.
    """
    lines = ["MANIFEST DE ELEMENTOS (datos exactos del TSX, NO inventar):"]
    lines.append("")
    
    for elem in analysis["elements"]:
        name = elem.get("name", "Unknown")
        pos = elem.get("position") or elem.get("basePosition", [0, 0])
        
        if elem["type"] == "group":
            lines.append(f"## {name}")
            lines.append(f"  Posición base: [{pos[0]}, {pos[1]}]")
            if elem.get("positionY_animated"):
                anim = elem["animations"]["positionY"]
                kfs = ", ".join([f"t={k['time']}s->{k['value']}" for k in anim["keyframes"]])
                lines.append(f"  Position Y animada: {kfs}")
            if elem["animations"].get("scale"):
                lines.append(f"  Scale: spring (0->1.2->1.0)")
            if elem["animations"].get("opacity"):
                anim = elem["animations"]["opacity"]
                kfs = ", ".join([f"t={k['time']}s->{k['value']}" for k in anim["keyframes"]])
                lines.append(f"  Opacity: {kfs}")
        
        elif elem["type"] == "circle" and elem.get("r_animated"):
            lines.append(f"## {name}")
            lines.append(f"  Posición: [{pos[0]}, {pos[1]}]")
            lines.append(f"  Tamaño AE: [{elem['aeSize'][0]}, {elem['aeSize'][1]}] (radio max={elem['maxRadius']})")
            lines.append(f"  Animar SCALE de [0%,0%] a [100%,100%] (NO cambiar el size)")
        
        elif elem.get("fromMapExpansion"):
            lines.append(f"## {name}")
            lines.append(f"  Posición: [{pos[0]}, {pos[1]}]")
            lines.append(f"  Tamaño: [{elem['size']*2}, {elem['size']*2}]")
            lines.append(f"  Delay: {elem['delaySeconds']}s")
            for k, v in elem.get("perElementAnimations", {}).items():
                prop = k.replace("anim_", "")
                kfs = ", ".join([f"t={kf['time']}s->{kf['value']}" for kf in v])
                lines.append(f"  {prop}: {kfs}")
        
        elif elem["type"] == "text":
            lines.append(f"## {name}")
            lines.append(f"  Posición: [{pos[0]}, {pos[1]}] (bottom: {elem['bottomPercent']}%)")
    
    lines.append("")
    
    # Map expansion summary
    for exp in analysis.get("map_expansions", []):
        lines.append(f"NOTA: '{exp['arrayVariable']}' original={exp['originalCount']} elementos, generamos {exp['actualCount']} representativos con stagger.")
    
    return "\n".join(lines)
