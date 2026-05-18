"""Test the enriched analyzer against the real TSX file."""
import sys
sys.path.insert(0, 'backend')

from app.services.tsx_enriched_analyzer import analyze_tsx_for_ae, generate_element_summary

# Read the actual TSX
with open('frontend/src/remotion/generated/Scene_fac4ceee-d353-4ba9-a612-fb7ee65f1013_0.tsx', 'r', encoding='utf-8') as f:
    tsx_code = f.read()

print("=" * 60)
print("ENRICHED ANALYSIS")
print("=" * 60)

result = analyze_tsx_for_ae(tsx_code, 1080, 1920, 30)

print(f"\nGroups: {len(result['groups'])}")
for g in result['groups']:
    print(f"  - translateX_var={g.get('translateX_var')}, translateY_var={g.get('translateY_var')}")
    print(f"    translateX={g.get('translateX')}, translateY={g.get('translateY')}")
    print(f"    scale_var={g.get('scale_var')}, opacity_var={g.get('opacity_var')}")

print(f"\nAnimations: {len(result['animations'])}")
for a in result['animations']:
    kf_str = ", ".join([f"t={k['time']}s={k['value']}" for k in a['keyframes']])
    print(f"  - {a['variable']} ({a['type']}): {kf_str}")

print(f"\nMap Expansions: {len(result['map_expansions'])}")
for exp in result['map_expansions']:
    print(f"  - {exp['arrayVariable']}: original={exp['originalCount']}, actual={exp['actualCount']}")
    print(f"    type={exp['elementType']}, fill={exp['fillColor']}")
    print(f"    delayMult={exp['delayMultiplier']}, xSpread={exp['xSpread']}")
    for elem in exp['elements'][:3]:  # Show first 3
        print(f"    elem[{elem['index']}]: pos=[{elem['x']}, {elem['y']}], size={elem['size']}, delay={elem['delaySeconds']}s")
    if len(exp['elements']) > 3:
        print(f"    ... and {len(exp['elements'])-3} more")

print(f"\nElements: {len(result['elements'])}")
for e in result['elements']:
    pos = e.get('position') or e.get('basePosition', [0, 0])
    print(f"  - {e.get('name')}: type={e['type']}, pos={pos}")
    if e.get('aeSize'):
        print(f"    aeSize={e['aeSize']}")
    if e.get('fromMapExpansion'):
        print(f"    delay={e['delaySeconds']}s, size={e['size']}")

print("\n" + "=" * 60)
print("ELEMENT SUMMARY (for LLM prompt)")
print("=" * 60)
summary = generate_element_summary(result)
print(summary)
