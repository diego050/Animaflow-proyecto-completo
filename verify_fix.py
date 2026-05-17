import re

with open('prueba-para-ae/script.jsx', 'r', encoding='utf-8') as f:
    script = f.read()

bad = re.findall(r'(?:ds|ramp|glow)\d+\.property\(\d+\)', script)
print("Numeric effect indices:", len(bad))

english = re.findall(r'\.property\("(Start Color|End Color|Opacity|Softness|Distance|Direction|Shadow Color|Glow Radius|Glow Intensity|Glow Threshold|Ramp Shape|Start of Ramp|End of Ramp)"\)', script)
print("English-only names:", len(english))

calls = re.findall(r'\.property\("(ADBE [^"]+)"\)', script)
unique = sorted(set(calls))
print("\nAll ADBE matchName calls:")
for u in unique:
    print("  %s (x%d)" % (u, calls.count(u)))

print("\nSyntax check:")
import py_compile
try:
    py_compile.compile('backend/app/services/pipeline.py', doraise=True)
    print("  pipeline.py: OK")
except:
    print("  pipeline.py: ERROR")
try:
    py_compile.compile('backend/app/services/ae_export.py', doraise=True)
    print("  ae_export.py: OK")
except:
    print("  ae_export.py: ERROR")
