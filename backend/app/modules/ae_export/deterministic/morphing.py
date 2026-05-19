"""
Morphing path generation for deterministic AE script.
"""
from .utils import hex_to_rgb_array, _calc_center, _format_points


def _generate_morphing_paths(enriched_elements, svg_elements, layer_idx, parts, layer_vars, width, height):
    """Generate morphing path layers and append to parts/layer_vars."""
    morph_elements = [e for e in enriched_elements if e.get("type") == "morph"]
    for morph_elem in morph_elements:
        var_name = morph_elem.get("variable", "morphPath")
        path_vars = morph_elem.get("pathVariables", [])
        
        if len(path_vars) >= 2:
            # Create a shape layer with the first path state
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = f"Morph_{layer_idx}"
            
            # Get the first path's vertices from SVG elements
            path_elem = None
            for svg_elem in svg_elements:
                if svg_elem.get("type") == "path":
                    path_elem = svg_elem
                    break
            
            if path_elem:
                vertices = path_elem.get("vertices", [[0, 0]])
                in_tangents = path_elem.get("inTangents", [[0, 0]] * len(vertices))
                out_tangents = path_elem.get("outTangents", [[0, 0]] * len(vertices))
                closed = path_elem.get("closed", True)
                
                # Center vertices
                if vertices:
                    min_x = min(v[0] for v in vertices)
                    max_x = max(v[0] for v in vertices)
                    min_y = min(v[1] for v in vertices)
                    max_y = max(v[1] for v in vertices)
                    cx = (min_x + max_x) / 2
                    cy = (min_y + max_y) / 2
                    vertices = [[v[0] - cx, v[1] - cy] for v in vertices]
                
                idx = var[2:]
                code = f'// --- {name} ---\n'
                code += f'var {var} = comp.layers.addShape(); {var}.name = "{name}";\n'
                code += f'var g{idx} = {var}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");\n'
                code += f'var vg{idx} = g{idx}.property("ADBE Vectors Group");\n'
                code += f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Group");\n'
                code += f'var s{idx} = new Shape();\n'
                code += f's{idx}.vertices = {_format_points(vertices)};\n'
                code += f's{idx}.inTangents = {_format_points(in_tangents)};\n'
                code += f's{idx}.outTangents = {_format_points(out_tangents)};\n'
                code += f's{idx}.closed = {"true" if closed else "false"};\n'
                code += f'ps{idx}.property("ADBE Vector Shape").setValue(s{idx});\n'
                
                # Add fill
                fill = path_elem.get("fill")
                if fill and fill != 'none':
                    code += f'var f{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Fill");\n'
                    code += f'f{idx}.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(fill)});\n'
                
                # Position
                pos = _calc_center(path_elem, width, height)
                code += f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{pos[0]}, {pos[1]}]);\n'
                
                parts.append(code)
                
                layer_vars.append((var, name, {
                    "basePosition": pos,
                    "isMorph": True,
                    "morphVariable": var_name,
                    "morphKeyframes": morph_elem.get("keyframes", []),
                    "pathVariables": path_vars,
                    "pathElement": path_elem,
                }))
    return layer_idx
