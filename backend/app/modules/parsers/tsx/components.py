import re
from typing import Dict, Any

def parse_components_from_tsx(tsx_code: str) -> Dict[str, Any]:
    """
    Parses Remotion components from TSX to be used by the AE Deterministic Generator.
    """
    components = {}
    
    # KineticBackground
    bg_match = re.search(r'<KineticBackground\s+([^>]+)/>', tsx_code)
    if bg_match:
        props_str = bg_match.group(1)
        color1_m = re.search(r'color1="([^"]+)"', props_str)
        color2_m = re.search(r'color2="([^"]+)"', props_str)
        theme_m = re.search(r'theme="([^"]+)"', props_str)
        
        components['KineticBackground'] = {
            'color1': color1_m.group(1) if color1_m else '#0f172a',
            'color2': color2_m.group(1) if color2_m else '#312e81',
            'theme': theme_m.group(1) if theme_m else 'default',
        }
        
    # TextReveal
    tr_match = re.search(r'<TextReveal\s+([^>]+)/>', tsx_code)
    if tr_match:
        props_str = tr_match.group(1)
        color_m = re.search(r'color="([^"]+)"', props_str)
        anim_m = re.search(r'animation="([^"]+)"', props_str)
        x_m = re.search(r'x=\{([0-9.]+)\}', props_str)
        y_m = re.search(r'y=\{([0-9.]+)\}', props_str)
        fs_m = re.search(r'fontSize=\{([0-9.]+)\}', props_str)
        
        components['TextReveal'] = {
            'color': color_m.group(1) if color_m else '#ffffff',
            'animation': anim_m.group(1) if anim_m else 'slide_up',
            'x': float(x_m.group(1)) if x_m else 540,
            'y': float(y_m.group(1)) if y_m else 960,
            'fontSize': float(fs_m.group(1)) if fs_m else 80,
        }
        
    return components
