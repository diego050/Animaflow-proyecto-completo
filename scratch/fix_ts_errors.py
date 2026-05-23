import os
import re

components_dir = 'frontend/src/remotion/components'

for root, _, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix UniversalProps import
            content = re.sub(r'import\s+\{\s*UniversalProps\s*\}\s+from\s+[\'"](.*?)[\'"];?', r'import type { UniversalProps } from "\1";', content)
            
            # Remove unused variables by suppressing TS errors, or just fixing them.
            # But the most robust way to fix all these unused vars quickly is by using regex or just TS ignore on the file
            # Wait, no, we can easily strip out the unused destructured props.
            
            # Since the user wants to compile, let's remove unused destructured props.
            unused = ['textColor', 'interpolate', 'useVideoConfig', 'spring', 'Easing', 'durationInFrames', 'fps', 'pulseScale', 'stepX', 'width', 'height', 'x', 'y', 'color', 'bgColor']
            
            # Actually, doing this via regex for every unused prop is error prone.
            # A much better approach is to configure tsconfig to not fail on unused locals during build.
            # Or add /* eslint-disable @typescript-eslint/no-unused-vars */ ? No, tsc fails on unused locals if "noUnusedLocals": true is set in tsconfig.json.
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print("Done fixing UniversalProps imports.")
