import re
from typing import Dict, Any, List

def validate_scene_tsx(tsx_code: str) -> Dict[str, Any]:
    """
    Analiza el código TSX generado por el LLM y valida reglas de calidad.
    """
    result = {
        "valid": True,
        "warnings": [],
        "errors": []
    }
    
    # 1. Verificar exportación principal
    if "export const SceneComponent" not in tsx_code:
        result["valid"] = False
        result["errors"].append("No exporta 'SceneComponent'.")

    # 2. Verificar uso de componentes de la librería
    # Buscar todos los imports del tipo: import { Componente } from '../../components/Componente'
    imports = re.findall(r"import\s+\{([^}]+)\}\s+from\s+['\"]../../components/[^'\"]+['\"]", tsx_code)
    imported_names = []
    for imp in imports:
        names = [n.strip() for n in imp.split(',')]
        imported_names.extend(names)

    # Buscar componentes usados
    component_count = 0
    used_components = set()
    for name in imported_names:
        count = len(re.findall(rf"<{name}\b", tsx_code))
        if count > 0:
            component_count += count
            used_components.add(name)

    if not used_components:
        result["valid"] = False
        result["errors"].append("No utiliza ningún componente de la librería. Usa solo JSX nativo.")

    # 3. Límite de componentes (Advertencia)
    if component_count > 6:
        result["warnings"].append(f"Usa demasiados componentes ({component_count}). El límite recomendado es 6.")

    # 4. Verificar etiquetas SVG crudas (prohibido)
    if re.search(r"<(svg|rect|circle|path|ellipse|polygon|line)\b", tsx_code, re.IGNORECASE):
        # Excepción: si están dentro de un string o comentario, podría dar falso positivo, pero el LLM no debería usarlos
        result["valid"] = False
        result["errors"].append("Utiliza etiquetas SVG crudas. Debe usar <AnimatedShape> u otros componentes de la librería.")

    # 5. Verificar validación de capa 3 (Background vs Foreground)
    # Background tipicos: KineticBackground, GridPerspective, ParticleField, RaysOfLight
    # Si solo hay fondo o solo hay texto, no es ideal
    background_components = {"KineticBackground", "GridPerspective", "ParticleField", "RaysOfLight", "AbstractWave", "FloatingBlobs"}
    text_components = {"TextReveal", "GlitchTitle", "HighlightText", "Typewriter", "StrikethroughText", "UnderlineReveal", "SplitText", "TextSwap"}
    
    has_bg = any(bg in used_components for bg in background_components)
    has_text = any(t in used_components for t in text_components)
    
    # Check if there are visual objects other than background and text
    has_visual_object = len(used_components - background_components - text_components) > 0
    
    if not has_visual_object and not has_bg:
        result["warnings"].append("Escena muy pobre visualmente: no tiene fondo ni objetos visuales.")
        # Make it invalid if it is extremely bare
        if len(used_components) <= 1:
            result["valid"] = False
            result["errors"].append("Escena vacía o solo texto. Requiere fondo u objeto visual en capa 3.")

    return result
