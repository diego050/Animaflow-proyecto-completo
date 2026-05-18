import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
import re
from app.services.svg_parser import _extract_svg_block, _parse_attr

def _propagate_group_attributes(svg_block: str) -> str:
    g_pattern = r'<g\b([^>]*)>(.*?)</g>'
    
    def replace_group(match):
        g_attrs = match.group(1)
        g_content = match.group(2)
        
        g_stroke = _parse_attr(g_attrs, 'stroke')
        g_fill = _parse_attr(g_attrs, 'fill')
        g_filter = _parse_attr(g_attrs, 'filter')
        g_stroke_width = _parse_attr(g_attrs, 'stroke-width') or _parse_attr(g_attrs, 'strokeWidth')
        
        print(f"Matched group attributes: stroke={g_stroke}, fill={g_fill}, filter={g_filter}, stroke-width={g_stroke_width}")
        
        child_tags = ['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline']
        
        updated_content = g_content
        for tag in child_tags:
            tag_pattern = rf'<{tag}\b([^>/]*)(/?)>'
            
            def replace_child(tag_match):
                child_attrs = tag_match.group(1)
                is_self_closing = tag_match.group(2) == '/'
                
                new_attrs = child_attrs
                if g_stroke and 'stroke=' not in child_attrs:
                    new_attrs += f' stroke="{g_stroke}"'
                if g_fill and 'fill=' not in child_attrs:
                    new_attrs += f' fill="{g_fill}"'
                if g_filter and 'filter=' not in child_attrs:
                    new_attrs += f' filter="{g_filter}"'
                if g_stroke_width and 'stroke-width=' not in child_attrs and 'strokeWidth=' not in child_attrs:
                    new_attrs += f' stroke-width="{g_stroke_width}"'
                    
                if is_self_closing:
                    return f'<{tag}{new_attrs} />'
                else:
                    return f'<{tag}{new_attrs}>'
                    
            updated_content = re.sub(tag_pattern, replace_child, updated_content, flags=re.DOTALL)
            
        return f'<g{g_attrs}>{updated_content}</g>'
        
    prev_block = ""
    current_block = svg_block
    for _ in range(3):
        prev_block = current_block
        current_block = re.sub(g_pattern, replace_group, current_block, flags=re.DOTALL)
        if current_block == prev_block:
            break
            
    return current_block

with open("frontend/src/remotion/generated/Scene_fac4ceee-d353-4ba9-a612-fb7ee65f1013_1.tsx", "r", encoding="utf-8") as f:
    tsx_code = f.read()

svg_block = _extract_svg_block(tsx_code)
print("Extracting svg_block...")
res = _propagate_group_attributes(svg_block)
print("\nLook for '<g filter=\"url(#glow)\"' in preprocessed block:")
lines_index = res.find('<g filter="url(#glow)"')
if lines_index != -1:
    print(res[lines_index:lines_index+600])
else:
    print("Could not find connection lines block!")
