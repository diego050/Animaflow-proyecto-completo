"""
AnimaComposer → After Effects deterministic transformer.

Convierte JSON de escena AnimaComposer en ExtendScript (.jsx)
ejecutable en Adobe After Effects. 100% determinista, sin LLM.
"""
from .ae_transformer import anima_composer_to_aescript
from .utils import hex_to_rgb, hex_to_ae_array

__all__ = [
    "anima_composer_to_aescript",
    "hex_to_rgb",
    "hex_to_ae_array",
]
