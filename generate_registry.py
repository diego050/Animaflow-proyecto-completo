import os

components_dir = "frontend/src/remotion/components"
registry_file = "frontend/src/remotion/registry.ts"

components = []
for file in os.listdir(components_dir):
    if file.endswith(".tsx") and file != "index.tsx":
        components.append(file[:-4])

components.sort()

with open(registry_file, "w", encoding="utf-8") as f:
    for c in components:
        f.write(f"import {{ {c} }} from './components/{c}';\n")
    
    f.write("\n")
    
    f.write("export const COMPONENT_NAMES = [\n")
    for c in components:
        f.write(f"  '{c}',\n")
    f.write("];\n\n")

    f.write("export const COMPONENT_REGISTRY: Record<string, React.FC<any>> = {\n")
    for c in components:
        f.write(f"  {c},\n")
    f.write("};\n")
