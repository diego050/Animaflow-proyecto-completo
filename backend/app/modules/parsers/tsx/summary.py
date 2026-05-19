"""TSX element summary generator for LLM prompt injection."""
from typing import Dict, Any


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
            lines.append(f"  Posicion base: [{pos[0]}, {pos[1]}]")
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
            lines.append(f"  Posicion: [{pos[0]}, {pos[1]}]")
            lines.append(f"  Tamaño AE: [{elem['aeSize'][0]}, {elem['aeSize'][1]}] (radio max={elem['maxRadius']})")
            lines.append(f"  Animar SCALE de [0%,0%] a [100%,100%] (NO cambiar el size)")

        elif elem.get("fromMapExpansion"):
            lines.append(f"## {name}")
            lines.append(f"  Posicion: [{pos[0]}, {pos[1]}]")
            lines.append(f"  Tamaño: [{elem['size']*2}, {elem['size']*2}]")
            lines.append(f"  Delay: {elem['delaySeconds']}s")
            for k, v in elem.get("perElementAnimations", {}).items():
                prop = k.replace("anim_", "")
                kfs = ", ".join([f"t={kf['time']}s->{kf['value']}" for kf in v])
                lines.append(f"  {prop}: {kfs}")

        elif elem["type"] == "text":
            lines.append(f"## {name}")
            lines.append(f"  Posicion: [{pos[0]}, {pos[1]}] (bottom: {elem['bottomPercent']}%)")

    lines.append("")

    # Map expansion summary
    for exp in analysis.get("map_expansions", []):
        lines.append(f"NOTA: '{exp['arrayVariable']}' original={exp['originalCount']} elementos, generamos {exp['actualCount']} representativos con stagger.")

    # Transform animations
    for elem in analysis["elements"]:
        if elem.get("type") in ("rotation", "scale_transform", "translate"):
            lines.append(f"## {elem['name']}")
            lines.append(f"  Tipo: {elem['type']}")
            if elem.get("animations"):
                for anim_type, anim in elem["animations"].items():
                    if anim:
                        kfs = ", ".join([f"t={k['time']}s->{k['value']}" for k in anim["keyframes"]])
                        lines.append(f"  {anim_type}: {kfs}")

    # Trim paths
    for elem in analysis["elements"]:
        if elem.get("type") == "trim":
            lines.append(f"## {elem['name']}")
            lines.append(f"  Tag: {elem['tag']}")
            kfs = ", ".join([f"t={k['time']}s->{k['value']}%" for k in elem.get("trim_keyframes", [])])
            lines.append(f"  Trim End: {kfs}")

    # Morphing
    for elem in analysis["elements"]:
        if elem.get("type") == "morph":
            lines.append(f"## {elem['name']}")
            lines.append(f"  Variable: {elem['variable']}")
            lines.append(f"  Path states: {len(elem.get('pathVariables', []))}")

    return "\n".join(lines)
