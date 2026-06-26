"""
Utility helpers for AnimaComposer → AE transformation.

Conversion de colores y helpers reutilizables.
Sin dependencias externas (solo Python stdlib).
"""


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """
    Convierte un color HEX (#RRGGBB o #RGB) a tupla (R, G, B) en 0-255.
    """
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return (0, 0, 0)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except ValueError:
        return (0, 0, 0)


def hex_to_ae_array(hex_color: str) -> str:
    """
    Convierte #RRGGBB a string '[R, G, B, 255]' para AE ExtendScript.
    Si el color es 'none' o 'transparent', retorna '[0, 0, 0, 0]'.
    """
    normalized = hex_color.lower().strip()
    if normalized in ("none", "transparent", ""):
        return "[0, 0, 0, 0]"
    r, g, b = hex_to_rgb(hex_color)
    return f"[{r}, {g}, {b}, 255]"
