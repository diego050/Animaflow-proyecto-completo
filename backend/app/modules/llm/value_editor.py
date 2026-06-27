"""Editor MANUAL de valores del código generado (SIN LLM, instantáneo).

Extrae las constantes LITERALES editables (`const NAME = <literal>`: número, string, color
hex, o array de números) y aplica cambios por reemplazo exacto del valor de esa const.
Para colores/números/textos/posiciones/rotaciones declaradas como const. La LÓGICA y la
forma del movimiento se editan con IA (no aquí).
"""
import re
from typing import Any

_NAME = r'[A-Za-z_$][\w$]*'
_NUM_RE = re.compile(rf'^\s*const\s+({_NAME})\s*=\s*(-?\d+(?:\.\d+)?)\s*;', re.M)
_STR_RE = re.compile(rf'^\s*const\s+({_NAME})\s*=\s*"([^"\n]*)"\s*;', re.M)
_ARR_RE = re.compile(rf'^\s*const\s+({_NAME})\s*=\s*\[([\-\d.,\s]+)\]\s*;', re.M)
_HEX_RE = re.compile(r'^#[0-9a-fA-F]{3,8}$')


def _to_num(s: str):
    return float(s) if '.' in s else int(s)


def _fmt_num(x) -> str:
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    return str(x)


def extract_editable_values(code: str) -> list[dict]:
    """Lista de {name, type, value} de las constantes literales editables del código."""
    code = code or ""
    out: list[dict] = []
    seen: set[str] = set()
    for m in _NUM_RE.finditer(code):
        name = m.group(1)
        if name in seen:
            continue
        seen.add(name)
        out.append({"name": name, "type": "number", "value": _to_num(m.group(2))})
    for m in _STR_RE.finditer(code):
        name, val = m.group(1), m.group(2)
        if name in seen:
            continue
        seen.add(name)
        out.append({"name": name, "type": "color" if _HEX_RE.match(val) else "string", "value": val})
    for m in _ARR_RE.finditer(code):
        name, raw = m.group(1), m.group(2)
        if name in seen:
            continue
        try:
            arr = [_to_num(x.strip()) for x in raw.split(",") if x.strip()]
        except ValueError:
            continue
        seen.add(name)
        out.append({"name": name, "type": "number[]", "value": arr})
    return out


def apply_value_changes(code: str, changes: dict[str, Any]) -> str:
    """Aplica {name: nuevo_valor} reemplazando el valor literal de cada const. Find-replace
    exacto por nombre (único), sin LLM."""
    for name, value in (changes or {}).items():
        if not re.match(rf'^{_NAME}$', str(name)):
            continue
        n = re.escape(str(name))
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            code = re.sub(
                rf'(const\s+{n}\s*=\s*)(-?\d+(?:\.\d+)?)(\s*;)',
                lambda mm, v=value: mm.group(1) + _fmt_num(v) + mm.group(3),
                code, count=1,
            )
        elif isinstance(value, str):
            safe = value.replace('"', "'").replace("\n", " ")
            code = re.sub(
                rf'(const\s+{n}\s*=\s*")([^"\n]*)(")',
                lambda mm, v=safe: mm.group(1) + v + mm.group(3),
                code, count=1,
            )
        elif isinstance(value, list):
            arr_str = ", ".join(_fmt_num(x) for x in value if isinstance(x, (int, float)))
            code = re.sub(
                rf'(const\s+{n}\s*=\s*\[)([\-\d.,\s]+)(\]\s*;)',
                lambda mm, a=arr_str: mm.group(1) + a + mm.group(3),
                code, count=1,
            )
    return code
