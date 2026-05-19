import re


def fix_drop_shadow_properties(script_text: str) -> str:
    """Convert Drop Shadow numeric indices to match names."""
    ds_vars = set()
    for m in re.finditer(
        r'var\s+(\w+)\s*=.*addProperty\("ADBE Drop Shadow"\)', script_text
    ):
        ds_vars.add(m.group(1))

    for dvar in ds_vars:
        dv = re.escape(dvar)
        script_text = re.sub(
            rf'{dv}\.property\(1\)\.setValue',
            f'{dvar}.property("ADBE Drop Shadow-0002").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{dv}\.property\(2\)\.setValue',
            f'{dvar}.property("ADBE Drop Shadow-0005").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{dv}\.property\(3\)\.setValue',
            f'{dvar}.property("ADBE Drop Shadow-0001").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{dv}\.property\(4\)\.setValue',
            f'{dvar}.property("ADBE Drop Shadow-0004").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{dv}\.property\(5\)\.setValue',
            f'{dvar}.property("ADBE Drop Shadow-0003").setValue',
            script_text,
        )

    return script_text


def fix_glow_properties(script_text: str) -> str:
    """Convert Glow numeric indices to match names."""
    glow_vars = set()
    for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Glo2"\)', script_text):
        glow_vars.add(m.group(1))

    for gvar in glow_vars:
        gv = re.escape(gvar)
        script_text = re.sub(
            rf'{gv}\.property\(1\)\.setValue',
            f'{gvar}.property("ADBE Glo2-0002").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{gv}\.property\(2\)\.setValue',
            f'{gvar}.property("ADBE Glo2-0003").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{gv}\.property\(3\)\.setValue',
            f'{gvar}.property("ADBE Glo2-0003").setValue',
            script_text,
        )
        script_text = re.sub(
            rf'{gv}\.property\(4\)\.setValue',
            f'{gvar}.property("ADBE Glo2-0004").setValue',
            script_text,
        )

    return script_text


def remove_orphan_drop_shadows(script_text: str) -> str:
    """Remove orphan Drop Shadow access blocks (property without addProperty)."""
    has_add = (
        'addProperty("ADBE Drop Shadow")' in script_text
        or "addProperty('ADBE Drop Shadow')" in script_text
    )
    if has_add:
        return script_text

    lines = script_text.split("\n")
    filtered = []
    skip_next = False
    for line in lines:
        if "ADBE Drop Shadow" in line and "addProperty" not in line:
            skip_next = True
            continue
        if skip_next and (line.strip().startswith("ds.") or line.strip() == ""):
            if line.strip().startswith("ds."):
                continue
            skip_next = False
        if "// Visual Effects" in line:
            continue
        filtered.append(line)
    return "\n".join(filtered)
