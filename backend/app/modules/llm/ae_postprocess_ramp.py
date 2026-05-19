import re


def fix_gradient_to_ramp(script_text: str) -> str:
    """Remove G-Fill/Grd Fill lines and replace with Fill."""
    script_text = script_text.replace(
        '"ADBE Vector Graphic - G-Fill"', '"ADBE Vector Graphic - Fill"'
    )
    script_text = script_text.replace(
        "'ADBE Vector Graphic - G-Fill'", "'ADBE Vector Graphic - Fill'"
    )
    script_text = script_text.replace(
        '"ADBE Vector Graphic - Grd Fill"', '"ADBE Vector Graphic - Fill"'
    )
    script_text = script_text.replace(
        "'ADBE Vector Graphic - Grd Fill'", "'ADBE Vector Graphic - Fill'"
    )

    # Remove Grad Colors property lines (they cause crashes)
    script_text = re.sub(
        r'\w+\.property\(["\']ADBE Vector Grad Colors["\']\)\.setValue\([^)]+\);?\s*',
        "",
        script_text,
    )
    script_text = re.sub(
        r'\w+\.property\(["\']ADBE Vector Grad Start Pt["\']\)\.setValue\([^)]+\);?\s*',
        "",
        script_text,
    )
    script_text = re.sub(
        r'\w+\.property\(["\']ADBE Vector Grad End Pt["\']\)\.setValue\([^)]+\);?\s*',
        "",
        script_text,
    )
    script_text = re.sub(
        r'\w+\.property\(["\']ADBE Vector Grad Type["\']\)\.setValue\([^)]+\);?\s*',
        "",
        script_text,
    )

    return script_text


def fix_ramp_properties(script_text: str) -> str:
    """Convert Ramp numeric indices to match names and fix wrong index mappings."""
    ramp_vars = set()
    for m in re.finditer(
        r'var\s+(\w+)\s*=.*addProperty\("ADBE Ramp"\)', script_text
    ):
        ramp_vars.add(m.group(1))

    for rvar in ramp_vars:
        rv = re.escape(rvar)
        # property(1) → Start of Ramp (point)
        script_text = re.sub(
            rf'{rv}\.property\(1\)\.setValue',
            f'{rvar}.property("ADBE Ramp-0001").setValue',
            script_text,
        )
        # property(2) → Start Color (RGB array)
        script_text = re.sub(
            rf'{rv}\.property\(2\)\.setValue',
            f'{rvar}.property("ADBE Ramp-0002").setValue',
            script_text,
        )
        # property(3) with array → WRONG (was being used as Start Color but 3=End of Ramp=point)
        script_text = re.sub(
            rf'{rv}\.property\(3\)\.setValue\(\[([^\]]+)\]\)',
            rf'{rvar}.property("ADBE Ramp-0002").setValue([\1])',
            script_text,
        )
        # property(4) with array → End Color (correct)
        script_text = re.sub(
            rf'{rv}\.property\(4\)\.setValue\(\[([^\]]+)\]\)',
            rf'{rvar}.property("ADBE Ramp-0004").setValue([\1])',
            script_text,
        )
        # property(4) with scalar → was misplaced Ramp Shape → fix to "Ramp Shape"
        script_text = re.sub(
            rf'{rv}\.property\(4\)\.setValue\(([12])\)',
            rf'{rvar}.property("ADBE Ramp-0005").setValue(\1)',
            script_text,
        )
        # property(5) → Ramp Shape
        script_text = re.sub(
            rf'{rv}\.property\(5\)\.setValue',
            f'{rvar}.property("ADBE Ramp-0005").setValue',
            script_text,
        )

        # Also fix if LLM used string names (normalize casing)
        script_text = re.sub(
            rf'{rv}\.property\(["\']Interpolation["\']\)',
            f'{rvar}.property("ADBE Ramp-0005")',
            script_text,
        )
        script_text = re.sub(
            rf'{rv}\.property\(["\']Start Point["\']\)',
            f'{rvar}.property("ADBE Ramp-0001")',
            script_text,
        )
        script_text = re.sub(
            rf'{rv}\.property\(["\']End Point["\']\)',
            f'{rvar}.property("ADBE Ramp-0003")',
            script_text,
        )

    return script_text


def ensure_ramp_interpolation(script_text: str) -> str:
    """Ensure Ramp has Ramp Shape set (default to Linear=1 if not set)."""
    ramp_pattern = r'(\w+)\s*=\s*\w+\.property\("ADBE Effect Parade"\)\.addProperty\("ADBE Ramp"\);'
    for match in re.finditer(ramp_pattern, script_text):
        ramp_var = match.group(1)
        if not re.search(
            rf'{re.escape(ramp_var)}\.property\("ADBE Ramp-0005"\)\.setValue',
            script_text,
        ):
            insert_pos = match.end()
            script_text = (
                script_text[:insert_pos]
                + f'\n{ramp_var}.property("ADBE Ramp-0005").setValue(1);'
                + script_text[insert_pos:]
            )
    return script_text
