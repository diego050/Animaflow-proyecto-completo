import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
log_path = r'C:\Users\Usuario\.gemini\antigravity\brain\676fb74b-f2c7-49c3-8534-8a3e400e5b11\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace escaped characters
text = text.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n').replace('\\r', '\r')

# Search for the user message containing ADBE Ramp
idx = text.find('=== GRADIENT RAMP')
if idx != -1:
    print("Found === GRADIENT RAMP:")
    print(text[idx:idx+2500])
else:
    print("=== GRADIENT RAMP not found in logs")
