"""
v7: Garantiza que AVAILABLE_COMPONENTS (backend) coincide EXACTAMENTE con
COMPONENT_NAMES del registry del frontend.

Si divergen, los componentes que falten en el backend se BORRAN del spec en la
Fase 4.1 de component_strategy aunque existan en el frontend — que es justo lo
que hacía desaparecer texto e íconos en producción (Causa #1, job 5f7396ef).

Este test es la red de seguridad: si alguien añade un componente al registry
pero olvida el backend (o viceversa), CI falla.
"""
import ast
import re
from pathlib import Path

from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS

REGISTRY_TS = (
    Path(__file__).resolve().parents[2]
    / "frontend" / "src" / "remotion" / "registry.ts"
)


def _parse_registry_names() -> set[str]:
    text = REGISTRY_TS.read_text(encoding="utf-8")
    block = re.search(r"COMPONENT_NAMES\s*=\s*\[(.*?)\]", text, re.S)
    assert block, "No se encontró COMPONENT_NAMES en registry.ts"
    return set(re.findall(r"'([^']+)'", block.group(1)))


def test_available_components_matches_registry():
    if not REGISTRY_TS.exists():
        # En entornos sin el frontend montado (algunos CI del backend), no falla.
        import pytest
        pytest.skip(f"registry.ts no disponible en {REGISTRY_TS}")

    frontend = _parse_registry_names()
    backend = set(AVAILABLE_COMPONENTS)

    missing_in_backend = frontend - backend
    extra_in_backend = backend - frontend

    assert not missing_in_backend, (
        "Componentes en registry.ts que faltan en AVAILABLE_COMPONENTS "
        f"(se BORRARÍAN del spec): {sorted(missing_in_backend)}"
    )
    assert not extra_in_backend, (
        "Componentes en AVAILABLE_COMPONENTS que NO existen en registry.ts "
        f"(la IA los usaría y el frontend no los renderizaría): {sorted(extra_in_backend)}"
    )


def test_critical_components_present():
    """Los componentes cuya ausencia causó el incidente de producción."""
    backend = set(AVAILABLE_COMPONENTS)
    for name in ("IconifyIcon", "StyleTextBlock", "StyleButton", "StyleBadge", "StyleCard"):
        assert name in backend, f"{name} debe estar en AVAILABLE_COMPONENTS"


def test_no_unused_list_duplicates():
    assert len(AVAILABLE_COMPONENTS) == len(set(AVAILABLE_COMPONENTS)), (
        "AVAILABLE_COMPONENTS tiene nombres duplicados"
    )
