"""
Shape renderer registry for AE export.

Maps shape type strings to their renderer functions.
"""
from .rectangle import generate_ae_rectangle
from .circle import generate_ae_circle
from .flash import generate_ae_flash
from .calendar import generate_ae_calendar
from .line import generate_ae_line
from .particle import generate_ae_particle
from .generic import generate_ae_shape_generic

SHAPE_RENDERERS = {
    "rectangle": generate_ae_rectangle,
    "circle": generate_ae_circle,
    "flash": generate_ae_flash,
    "calendar": generate_ae_calendar,
    "line": generate_ae_line,
    "particle": generate_ae_particle,
}

__all__ = [
    "SHAPE_RENDERERS",
    "generate_ae_rectangle",
    "generate_ae_circle",
    "generate_ae_flash",
    "generate_ae_calendar",
    "generate_ae_line",
    "generate_ae_particle",
    "generate_ae_shape_generic",
]
