"""
Fix ALL effect property references across the entire pipeline to use
language-independent matchNames (ADBE Ramp-0002, ADBE Drop Shadow-0002, etc.)

Verified matchNames from user's AE (Spanish locale):

GRADIENT RAMP (ADBE Ramp):
  ADBE Ramp-0001 = Start of Ramp (Point [x,y])
  ADBE Ramp-0002 = Start Color (Color [R,G,B])
  ADBE Ramp-0003 = End of Ramp (Point [x,y])
  ADBE Ramp-0004 = End Color (Color [R,G,B])
  ADBE Ramp-0005 = Ramp Shape (1=Linear, 2=Radial)

DROP SHADOW (ADBE Drop Shadow):
  ADBE Drop Shadow-0001 = Shadow Color (Color [R,G,B])
  ADBE Drop Shadow-0002 = Opacity (0-255)
  ADBE Drop Shadow-0003 = Direction (angle)
  ADBE Drop Shadow-0004 = Distance (px)
  ADBE Drop Shadow-0005 = Softness (px)

GLOW (ADBE Glo2):
  ADBE Glo2-0001 = Glow Based On (popup)
  ADBE Glo2-0002 = Glow Threshold (%)
  ADBE Glo2-0003 = Glow Radius (px)
  ADBE Glo2-0004 = Glow Intensity (multiplier)
"""
import re

# ============================================================
# FIX 1: prueba-para-ae/script.jsx (test script)
# ============================================================
print("=" * 60)
print("FIX 1: prueba-para-ae/script.jsx")
print("=" * 60)

with open('prueba-para-ae/script.jsx', 'r', encoding='utf-8') as f:
    script = f.read()

# --- RAMP fixes ---
# Find all ramp variables
ramp_vars = set()
for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Ramp"\)', script):
    ramp_vars.add(m.group(1))
print(f"Ramp vars: {ramp_vars}")

for rv in ramp_vars:
    rvesc = re.escape(rv)
    # English display names → matchNames
    script = re.sub(rf'{rvesc}\.property\("Start Color"\)', f'{rv}.property("ADBE Ramp-0002")', script)
    script = re.sub(rf'{rvesc}\.property\("End Color"\)', f'{rv}.property("ADBE Ramp-0004")', script)
    script = re.sub(rf'{rvesc}\.property\("Ramp Shape"\)', f'{rv}.property("ADBE Ramp-0005")', script)
    script = re.sub(rf'{rvesc}\.property\("Start of Ramp"\)', f'{rv}.property("ADBE Ramp-0001")', script)
    script = re.sub(rf'{rvesc}\.property\("End of Ramp"\)', f'{rv}.property("ADBE Ramp-0003")', script)
    # Numeric indices → matchNames (in case any remain)
    script = re.sub(rf'{rvesc}\.property\(2\)\.setValue', f'{rv}.property("ADBE Ramp-0002").setValue', script)
    script = re.sub(rf'{rvesc}\.property\(4\)\.setValue\(\[', f'{rv}.property("ADBE Ramp-0004").setValue([', script)
    script = re.sub(rf'{rvesc}\.property\(5\)\.setValue', f'{rv}.property("ADBE Ramp-0005").setValue', script)
    script = re.sub(rf'{rvesc}\.property\(1\)\.setValue', f'{rv}.property("ADBE Ramp-0001").setValue', script)
    # property(3) with array = misplaced Start Color
    script = re.sub(rf'{rvesc}\.property\(3\)\.setValue\(\[([^\]]+)\]\)', rf'{rv}.property("ADBE Ramp-0002").setValue([\1])', script)
    script = re.sub(rf'{rvesc}\.property\(4\)\.setValue\(([12])\)', rf'{rv}.property("ADBE Ramp-0005").setValue(\1)', script)

# --- DROP SHADOW fixes ---
ds_vars = set()
for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Drop Shadow"\)', script):
    ds_vars.add(m.group(1))
print(f"DS vars: {ds_vars}")

for dv in ds_vars:
    dvesc = re.escape(dv)
    # English display names → matchNames
    script = re.sub(rf'{dvesc}\.property\("Opacity"\)', f'{dv}.property("ADBE Drop Shadow-0002")', script)
    script = re.sub(rf'{dvesc}\.property\("Softness"\)', f'{dv}.property("ADBE Drop Shadow-0005")', script)
    script = re.sub(rf'{dvesc}\.property\("Distance"\)', f'{dv}.property("ADBE Drop Shadow-0004")', script)
    script = re.sub(rf'{dvesc}\.property\("Shadow Color"\)', f'{dv}.property("ADBE Drop Shadow-0001")', script)
    script = re.sub(rf'{dvesc}\.property\("Direction"\)', f'{dv}.property("ADBE Drop Shadow-0003")', script)
    # WRONG numeric indices → correct matchNames
    # OLD: property(1)=Opacity → WRONG! property(1)=Shadow Color
    # Must fix: property(1).setValue(75) was meant for Opacity → ADBE Drop Shadow-0002
    script = re.sub(rf'{dvesc}\.property\(1\)\.setValue\((\d+)\)', rf'{dv}.property("ADBE Drop Shadow-0002").setValue(\1)', script)
    # property(2).setValue(20) was meant for Softness → ADBE Drop Shadow-0005
    script = re.sub(rf'{dvesc}\.property\(2\)\.setValue\((\d+)\)', rf'{dv}.property("ADBE Drop Shadow-0005").setValue(\1)', script)
    # property(4).setValue(4) was meant for Distance → ADBE Drop Shadow-0004 (correct index!)
    script = re.sub(rf'{dvesc}\.property\(4\)\.setValue\((\d+)\)', rf'{dv}.property("ADBE Drop Shadow-0004").setValue(\1)', script)

# --- GLOW fixes ---
glow_vars = set()
for m in re.finditer(r'var\s+(\w+)\s*=.*addProperty\("ADBE Glo2"\)', script):
    glow_vars.add(m.group(1))
print(f"Glow vars: {glow_vars}")

for gv in glow_vars:
    gvesc = re.escape(gv)
    # English display names → matchNames
    script = re.sub(rf'{gvesc}\.property\("Glow Radius"\)', f'{gv}.property("ADBE Glo2-0003")', script)
    script = re.sub(rf'{gvesc}\.property\("Glow Intensity"\)', f'{gv}.property("ADBE Glo2-0004")', script)
    script = re.sub(rf'{gvesc}\.property\("Glow Threshold"\)', f'{gv}.property("ADBE Glo2-0002")', script)
    # Numeric indices
    script = re.sub(rf'{gvesc}\.property\(3\)\.setValue', f'{gv}.property("ADBE Glo2-0003").setValue', script)
    script = re.sub(rf'{gvesc}\.property\(4\)\.setValue', f'{gv}.property("ADBE Glo2-0004").setValue', script)
    script = re.sub(rf'{gvesc}\.property\(2\)\.setValue', f'{gv}.property("ADBE Glo2-0002").setValue', script)

with open('prueba-para-ae/script.jsx', 'w', encoding='utf-8') as f:
    f.write(script)

# Verify no numeric property indices remain for effects
remaining = len(re.findall(r'(ds\d+|ramp\d+|glow\d+)\.property\(\d\)', script))
print(f"Remaining numeric effect indices: {remaining}")
print("script.jsx FIXED\n")


# ============================================================
# FIX 2: backend/app/services/ae_export.py (fallback path)
# ============================================================
print("=" * 60)
print("FIX 2: backend/app/services/ae_export.py")
print("=" * 60)

with open('backend/app/services/ae_export.py', 'r', encoding='utf-8') as f:
    ae = f.read()

# Glow: English names → matchNames
ae = ae.replace('glow.property("Glow Radius").setValue', 'glow.property("ADBE Glo2-0003").setValue')
ae = ae.replace('glow.property("Glow Intensity").setValue', 'glow.property("ADBE Glo2-0004").setValue')
ae = ae.replace('glow.property("Glow Threshold").setValue', 'glow.property("ADBE Glo2-0002").setValue')

# Drop Shadow: English names → matchNames  
# CRITICAL: OLD code had property(1)=Opacity which is WRONG (1=Shadow Color)
# The replace already changed to English names, now fix to matchNames
ae = ae.replace('shadow.property("Opacity").setValue', 'shadow.property("ADBE Drop Shadow-0002").setValue')
ae = ae.replace('shadow.property("Softness").setValue', 'shadow.property("ADBE Drop Shadow-0005").setValue')
ae = ae.replace('shadow.property("Distance").setValue', 'shadow.property("ADBE Drop Shadow-0004").setValue')
ae = ae.replace('shadow.property("Shadow Color").setValue', 'shadow.property("ADBE Drop Shadow-0001").setValue')
ae = ae.replace('shadow.property("Direction").setValue', 'shadow.property("ADBE Drop Shadow-0003").setValue')

with open('backend/app/services/ae_export.py', 'w', encoding='utf-8') as f:
    f.write(ae)
print("ae_export.py FIXED\n")


# ============================================================
# FIX 3: backend/app/services/pipeline.py (LLM post-processing)
# ============================================================
print("=" * 60)
print("FIX 3: backend/app/services/pipeline.py")
print("=" * 60)

with open('backend/app/services/pipeline.py', 'r', encoding='utf-8') as f:
    pipe = f.read()

# Replace all English display names with matchNames in the post-processing functions

# Ramp properties
pipe = pipe.replace('.property("Start of Ramp")', '.property("ADBE Ramp-0001")')
pipe = pipe.replace('.property("Start Color")', '.property("ADBE Ramp-0002")')
pipe = pipe.replace('.property("End of Ramp")', '.property("ADBE Ramp-0003")')
pipe = pipe.replace('.property("End Color")', '.property("ADBE Ramp-0004")')
pipe = pipe.replace('.property("Ramp Shape")', '.property("ADBE Ramp-0005")')

# Drop Shadow properties
pipe = pipe.replace('.property("Opacity")', '.property("ADBE Drop Shadow-0002")')
pipe = pipe.replace('.property("Softness")', '.property("ADBE Drop Shadow-0005")')
pipe = pipe.replace('.property("Shadow Color")', '.property("ADBE Drop Shadow-0001")')
pipe = pipe.replace('.property("Distance")', '.property("ADBE Drop Shadow-0004")')
pipe = pipe.replace('.property("Direction")', '.property("ADBE Drop Shadow-0003")')

# Glow properties
pipe = pipe.replace('.property("Glow Threshold")', '.property("ADBE Glo2-0002")')
pipe = pipe.replace('.property("Glow Radius")', '.property("ADBE Glo2-0003")')
pipe = pipe.replace('.property("Glow Intensity")', '.property("ADBE Glo2-0004")')

with open('backend/app/services/pipeline.py', 'w', encoding='utf-8') as f:
    f.write(pipe)
print("pipeline.py FIXED\n")

# ============================================================
# VERIFY
# ============================================================
print("=" * 60)
print("VERIFICATION")
print("=" * 60)

# Check script.jsx
with open('prueba-para-ae/script.jsx', 'r', encoding='utf-8') as f:
    script = f.read()

# Find all effect property accesses
effect_props = re.findall(r'(?:ds|ramp|glow)\d+\.property\(([^)]+)\)', script)
print(f"\nscript.jsx effect property calls ({len(effect_props)} total):")
for p in sorted(set(effect_props)):
    count = effect_props.count(p)
    print(f"  {p} (x{count})")

# Check for any remaining numeric indices
bad = re.findall(r'(?:ds|ramp|glow)\d+\.property\(\d+\)', script)
if bad:
    print(f"\n⚠️ REMAINING NUMERIC INDICES: {bad}")
else:
    print(f"\n✅ No numeric effect property indices remaining")

# Check for English display names that won't work in Spanish AE
english_names = re.findall(r'\.property\("(Start Color|End Color|Opacity|Softness|Distance|Direction|Shadow Color|Glow Radius|Glow Intensity|Glow Threshold|Ramp Shape|Start of Ramp|End of Ramp)"\)', script)
if english_names:
    print(f"⚠️ REMAINING ENGLISH NAMES: {english_names}")
else:
    print(f"✅ No English-only effect property names remaining")

print("\nDONE!")
