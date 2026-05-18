"""Test the deterministic AE generator with the fac4ceee scene."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Read the scene TSX
scene_path = os.path.join('frontend', 'src', 'remotion', 'generated', 'Scene_fac4ceee-d353-4ba9-a612-fb7ee65f1013_1.tsx')
with open(scene_path, 'r', encoding='utf-8') as f:
    tsx_code = f.read()

# Run parsers
from app.services.svg_parser import parse_svg_from_tsx
from app.services.tsx_enriched_analyzer import analyze_tsx_for_ae
from app.services.ae_deterministic_generator import generate_deterministic_script

svg_elements = parse_svg_from_tsx(tsx_code)
enriched = analyze_tsx_for_ae(tsx_code, 1080, 1920, 30)

print(f"SVG elements: {len(svg_elements)}")
for e in svg_elements:
    print(f"  - type={e.get('type')}, fill={e.get('fill', 'none')}, vertices={len(e.get('vertices', []))}")

print(f"\nEnriched elements: {len(enriched.get('elements', []))}")
print(f"Enriched animations: {len(enriched.get('animations', []))}")
print(f"Map expansions: {len(enriched.get('map_expansions', []))}")

# Check group matches
from app.services.ae_deterministic_generator import _find_shapes_in_block
for group in enriched.get("groups", []):
    children_block = group.get("children_block", "")
    group_shapes = _find_shapes_in_block(children_block, svg_elements)
    print(f"\nGroup translation: {group.get('translateX')}, {group.get('translateY')}")
    print(f"Group children_block:\n{children_block}")
    print(f"Group matched shapes: {len(group_shapes)}")
    for s in group_shapes:
        print(f"  - shape type={s.get('type')}, fill={s.get('fill')}, stroke={s.get('stroke')}")

# Generate script
script = generate_deterministic_script(
    svg_elements=svg_elements,
    enriched=enriched,
    text="Tus plantas limpian el aire y reducen el estres.",
    duration=3.3,
    bg_color="#0f172a",
    text_color="#2ECC71",
    width=1080,
    height=1920,
    fps=30,
)

# Save diagnostics to debug file
with open('prueba-para-ae/debug_output.txt', 'w', encoding='utf-8') as f_debug:
    f_debug.write(f"SVG elements: {len(svg_elements)}\n")
    for e in svg_elements:
        f_debug.write(f"  - type={e.get('type')}, fill={e.get('fill', 'none')}, stroke={e.get('stroke', 'none')}, vertices={len(e.get('vertices', []))}\n")
    
    f_debug.write(f"\nEnriched elements: {len(enriched.get('elements', []))}\n")
    f_debug.write(f"Enriched animations: {len(enriched.get('animations', []))}\n")
    f_debug.write(f"Map expansions: {len(enriched.get('map_expansions', []))}\n")
    
    for group in enriched.get("groups", []):
        children_block = group.get("children_block", "")
        group_shapes = _find_shapes_in_block(children_block, svg_elements)
        f_debug.write(f"\nGroup translation: {group.get('translateX')}, {group.get('translateY')}\n")
        f_debug.write(f"Group children_block:\n{children_block}\n")
        f_debug.write(f"Group matched shapes: {len(group_shapes)}\n")
        for s in group_shapes:
            f_debug.write(f"  - shape type={s.get('type')}, fill={s.get('fill')}, stroke={s.get('stroke')}\n")


# Save to file for inspection
with open('prueba-para-ae/test_deterministic.jsx', 'w', encoding='utf-8') as f:
    f.write(f"""// ANIMAFLOW - Deterministic AE Export Script
// Generated without LLM

try {{

if (app.project == null) {{
    app.newProject();
}}

app.beginUndoGroup("AnimaFlow Scene 1");
{script}
app.endUndoGroup();

}} catch (e) {{
    alert("AnimaFlow Script Error: " + e.message + "\\nLine: " + $.line);
}}
""")
print(f"\nSaved to prueba-para-ae/test_deterministic.jsx")
