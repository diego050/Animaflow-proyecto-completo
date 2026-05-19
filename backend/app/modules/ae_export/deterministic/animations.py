"""
Animation generators for deterministic AE script generation.
"""


def _generate_animations(var: str, name: str, anim_data: dict, fps: int) -> str:
    """Generate setValueAtTime calls for a layer from enriched data."""
    lines = [f'// Animations for {name}']
    has_any = False
    
    # Position Y animation
    pos_y_anim = anim_data.get("positionY")
    base_pos = anim_data.get("basePosition", [540, 960])
    is_text = anim_data.get("isText", False)
    
    if pos_y_anim:
        base_x = base_pos[0]
        offset_x = anim_data.get("shape", {}).get("offsetX", 0)
        offset_y = anim_data.get("shape", {}).get("offsetY", 0)
        cx = anim_data.get("shape", {}).get("cx", 0)
        cy = anim_data.get("shape", {}).get("cy", 0)
        
        base_x += (offset_x + cx)
        
        lines.append(f'var {var}Pos = {var}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in pos_y_anim["keyframes"]:
            y_val = kf["value"]
            # If text and values are small offsets (< 200), add base Y position
            if is_text and abs(y_val) < 200:
                y_val = base_pos[1] + y_val
            
            if not is_text:
                y_val += (offset_y + cy)
                
            lines.append(f'{var}Pos.setValueAtTime({kf["time"]}, [{base_x}, {y_val}]);')
        has_any = True
    
    # Opacity animation
    opacity_anim = anim_data.get("opacity")
    if opacity_anim:
        lines.append(f'var {var}Opac = {var}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_anim["keyframes"]:
            # Convert 0-1 to 0-100 for AE
            val = kf["value"]
            if val <= 1.0 and opacity_anim.get("maxValue", 1) <= 1.0:
                val = val * 100
            lines.append(f'{var}Opac.setValueAtTime({kf["time"]}, {round(val, 1)});')
        has_any = True
    
    # Scale animation (from spring or direct)
    scale_anim = anim_data.get("scale")
    if scale_anim:
        lines.append(f'var {var}Scale = {var}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in scale_anim["keyframes"]:
            val = kf["value"]
            # Spring values are 0-1.2 range -> convert to 0-120%
            if scale_anim.get("type") == "spring" or (isinstance(val, (int, float)) and val <= 2.0):
                pct = round(val * 100)
            else:
                pct = round(val)
            lines.append(f'{var}Scale.setValueAtTime({kf["time"]}, [{pct}, {pct}]);')
        has_any = True
    
    # Scale from animated radius (ripple effect)
    radius_anim = anim_data.get("scale_from_radius")
    if radius_anim:
        max_r = anim_data.get("maxRadius", 100)
        lines.append(f'var {var}Scale = {var}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in radius_anim["keyframes"]:
            # Convert radius to scale percentage: (current_r / max_r) * 100
            pct = round((kf["value"] / max_r) * 100) if max_r > 0 else 0
            lines.append(f'{var}Scale.setValueAtTime({kf["time"]}, [{pct}, {pct}]);')
        has_any = True
    
    # Per-element animations (particles)
    per_anims = anim_data.get("perElementAnimations", {})
    if per_anims:
        for anim_key, keyframes in per_anims.items():
            prop_type = anim_key.replace("anim_", "")
            
            if prop_type == "positionY" and keyframes:
                base_x = anim_data.get("basePosition", [540, 960])[0]
                lines.append(f'var {var}Pos = {var}.property("ADBE Transform Group").property("ADBE Position");')
                for kf in keyframes:
                    lines.append(f'{var}Pos.setValueAtTime({kf["time"]}, [{base_x}, {kf["value"]}]);')
                has_any = True
            
            elif prop_type == "opacity" and keyframes:
                lines.append(f'var {var}Opac = {var}.property("ADBE Transform Group").property("ADBE Opacity");')
                for kf in keyframes:
                    val = kf["value"]
                    if val <= 1.0:
                        val = val * 100
                    lines.append(f'{var}Opac.setValueAtTime({kf["time"]}, {round(val, 1)});')
                has_any = True
    
    # Rotation animation
    rotation_anim = anim_data.get("rotation")
    if rotation_anim:
        lines.append(f'var {var}Rot = {var}.property("ADBE Transform Group").property("ADBE Rotate Z");')
        for kf in rotation_anim["keyframes"]:
            lines.append(f'{var}Rot.setValueAtTime({kf["time"]}, {round(kf["value"], 1)});')
        has_any = True
    
    # Trim Paths animation
    trim_kfs = anim_data.get("trim_keyframes")
    if trim_kfs:
        # Find the trim filter on this layer (we need to add it first if not present)
        # Trim End goes from 0 to 100
        lines.append(f'var trim{var[2:]} = {var}.property("ADBE Root Vectors Group").property("ADBE Vector Group").property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");')
        lines.append(f'trim{var[2:]}.property("ADBE Vector Trim Start").setValue(0);')
        lines.append(f'trim{var[2:]}.property("ADBE Vector Trim End").setValue(0);')
        for kf in trim_kfs:
            lines.append(f'trim{var[2:]}.property("ADBE Vector Trim End").setValueAtTime({kf["time"]}, {kf["value"]});')
        has_any = True
    
    # Morphing animation (path shape keyframes)
    if anim_data.get("isMorph"):
        morph_kfs = anim_data.get("morphKeyframes", [])
        path_vars = anim_data.get("pathVariables", [])
        path_elem = anim_data.get("pathElement")
        
        if path_elem and len(path_vars) >= 2 and len(morph_kfs) >= 2:
            idx = var[2:]
            # Get vertices for each path state
            # For MVP, we use the same vertices but animate them
            # In a full implementation, you'd parse each path string
            vertices = path_elem.get("vertices", [[0, 0]])
            
            # Animate the shape property
            lines.append(f'var shapeProp{idx} = {var}.property("ADBE Root Vectors Group").property("ADBE Vector Group").property("ADBE Vectors Group").property("ADBE Vector Shape - Group").property("ADBE Vector Shape");')
            
            # For now, create a simple scale animation as morph proxy
            # Full morph would require parsing each path string into vertices
            for i, kf in enumerate(morph_kfs):
                # Progressive scale to simulate morph
                progress = i / max(len(morph_kfs) - 1, 1)
                scale_val = 100 + (progress * 20)  # 100% -> 120%
                lines.append(f'{var}.property("ADBE Transform Group").property("ADBE Scale").setValueAtTime({kf["time"]}, [{scale_val}, {scale_val}]);')
            has_any = True
    
    # Text-specific animations
    if anim_data.get("isText"):
        # These are already handled by the generic positionY/opacity/scale above
        pass
    
    if not has_any:
        return ''
    
    lines.append('')
    return '\n'.join(lines)
