"""Validación estática de animaciones generadas por IA (guardrails).

Prototipo de code-gen: la IA genera un componente Remotion (TSX). Antes de
previsualizarlo/usarlo, chequeamos que NO use cosas no deterministas o inseguras.
El determinismo es crítico: el preview debe verse IGUAL que el render final.
"""
import re

# (patrón, mensaje) — todo lo PROHIBIDO.
_FORBIDDEN = [
    (r'Math\.random', "Usa random('semilla') de remotion en vez de Math.random() (no determinista)."),
    (r'Date\.now', "Date.now() no es determinista — prohibido."),
    (r'new\s+Date\s*\(', "new Date() no es determinista — prohibido."),
    (r'performance\.now', "performance.now() no es determinista — prohibido."),
    (r'\bsetTimeout\b', "setTimeout no permitido (anima con useCurrentFrame)."),
    (r'\bsetInterval\b', "setInterval no permitido (anima con useCurrentFrame)."),
    (r'\bfetch\s*\(', "fetch / acceso a red no permitido."),
    (r'\beval\s*\(', "eval no permitido."),
    (r'\brequire\s*\(', "require no permitido."),
    (r'\bprocess\b', "Acceso a 'process' no permitido."),
    (r'while\s*\(\s*true\s*\)', "while(true) no permitido (riesgo de loop infinito)."),
    # imports que NO sean de react / remotion
    (r'import\b[^\n]*\bfrom\s+["\'](?!react["\']|remotion["\'])', "Solo se permiten imports de 'react' y 'remotion'."),
]


def validate_animation_code(code: str) -> tuple[bool, list[str]]:
    """Devuelve (es_valido, lista_de_errores)."""
    errors: list[str] = []
    if not code or len(code.strip()) < 30:
        return False, ["El código está vacío o es demasiado corto."]

    for pattern, msg in _FORBIDDEN:
        if re.search(pattern, code):
            errors.append(msg)

    if "export" not in code:
        errors.append("Falta exportar el componente (export const Animation...).")
    if "useCurrentFrame" not in code and "AbsoluteFill" not in code:
        errors.append("No parece un componente Remotion (falta useCurrentFrame/AbsoluteFill).")

    return (len(errors) == 0), errors
