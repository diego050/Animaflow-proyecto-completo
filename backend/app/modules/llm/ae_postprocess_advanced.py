import re


def inject_trim_paths(script_text: str) -> str:
    """Inject Trim Paths where animations reference them but structure doesn't have them."""
    has_trim_anim = "ADBE Vector Trim" in script_text or "Vector Trim" in script_text
    if not has_trim_anim:
        return script_text

    trim_layers = set()
    # Pattern 1: varTrim = var.property("ADBE Root Vectors Group")
    for match in re.finditer(
        r'(\w+)Trim\s*=\s*\1\.property\("ADBE Root Vectors Group"\)',
        script_text,
    ):
        trim_layers.add(match.group(1))
    # Pattern 2: var.property(...).property("ADBE Vector Trim")
    for match in re.finditer(
        r'(sl\d+)\.property\([^)]+\)(?:\.property\([^)]+\))*\.property\("ADBE Vector Trim',
        script_text,
    ):
        trim_layers.add(match.group(1))
    # Pattern 3: varTrim = var.property("ADBE Root Vectors Group").property(1)
    for match in re.finditer(
        r'var\s+(\w+)Trim\s*=\s*(\w+)\.property', script_text
    ):
        layer_var = match.group(2)
        if layer_var.startswith("sl"):
            trim_layers.add(layer_var)

    if not trim_layers:
        return script_text

    # Check which layers already have Trim Paths in structure
    for layer_var in list(trim_layers):
        has_trim_structure = re.search(
            rf'{re.escape(layer_var)}\.property.*addProperty\("ADBE Vector Filter - Trim"\)',
            script_text,
        )
        if has_trim_structure:
            trim_layers.discard(layer_var)

    # For each layer, find where the stroke is defined and add Trim Paths after it
    for layer_var in trim_layers:
        stroke_pattern = rf'(var\s+st\w+\s*=\s*vg\w+\.addProperty\("ADBE Vector Graphic - Stroke"\);[^\n]*(?:\n[^\n]*st\w+\.property[^\n]*)*?)'
        stroke_match = re.search(stroke_pattern, script_text)

        if not stroke_match:
            stroke_pattern = rf'({re.escape(layer_var)}[^\n]*addProperty\("ADBE Vector Graphic - Stroke"\);)'
            stroke_match = re.search(stroke_pattern, script_text)

        if stroke_match:
            insert_pos = stroke_match.end()
            next_lines = script_text[insert_pos : insert_pos + 500]
            width_match = re.search(r'(Stroke Width[^\n]*\n)', next_lines)
            if width_match:
                insert_pos += width_match.end()

            trim_code = (
                f'\nvar trim_{layer_var} = vg1.addProperty("ADBE Vector Filter - Trim");'
                f'\ntrim_{layer_var}.property("ADBE Vector Trim Start").setValue(0);'
                f'\ntrim_{layer_var}.property("ADBE Vector Trim End").setValue(100);'
            )
            script_text = script_text[:insert_pos] + trim_code + script_text[insert_pos:]

    # Fix Trim Paths animation references to use the injected trim variable
    for layer_var in trim_layers:
        old_pattern = rf'{re.escape(layer_var)}Trim\s*=\s*{re.escape(layer_var)}\.property\("ADBE Root Vectors Group"\)\.property\(1\)\.property\("ADBE Vector Trim"\)\.property\("ADBE Vector Trim End"\)'
        new_code = f'{layer_var}Trim = trim_{layer_var}.property("ADBE Vector Trim End")'
        script_text = re.sub(old_pattern, new_code, script_text)

        old_pattern2 = rf'{re.escape(layer_var)}Trim\s*=\s*{re.escape(layer_var)}\.property\("ADBE Root Vectors Group"\)\.property\("ADBE Vectors Group"\)\.property\("ADBE Vector Trim"\)\.property\("ADBE Vector Trim End"\)'
        script_text = re.sub(old_pattern2, new_code, script_text)

    return script_text


def fix_absurd_text_positions(script_text: str, base_y: int = 1344) -> str:
    """Fix absurd text position values (offsets used as absolute positions)."""
    pattern = r"(textPos\.setValueAtTime\([^,]+,\s*\[(\d+),\s*)(\d+\.?\d*)(\]\))"

    def fix(m):
        x = m.group(2)
        y = float(m.group(3))
        suffix = m.group(4)
        if y < 100:
            corrected_y = base_y + y
            return f"{m.group(1)}{corrected_y}{suffix}"
        return m.group(0)

    return re.sub(pattern, fix, script_text)


def fix_absurd_scale(script_text: str) -> str:
    """Fix absurd scale values > 2000% (likely pixel-to-percentage conversion errors)."""
    pattern = r"\.setValueAtTime\(([^,]+),\s*\[(\d{4,}),\s*(\d{4,})\]\)"

    def fix(m):
        time_val = m.group(1)
        x = int(m.group(2))
        y = int(m.group(3))
        if x > 2000:
            x = min(x // 10, 500)
        if y > 2000:
            y = min(y // 10, 500)
        return f".setValueAtTime({time_val}, [{x}, {y}])"

    return re.sub(pattern, fix, script_text)
