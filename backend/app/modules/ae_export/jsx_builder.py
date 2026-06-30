"""Emisor de ExtendScript (.jsx) para After Effects — ETAPA 3 del traductor AE editable.

Consume un `aeScene` (lo produce el muestreo por-frame, Etapa 2) y emite un `.jsx` que, al
correrse en AE (Archivo > Scripts > Ejecutar archivo de script), crea una composición con UNA
capa editable por elemento (forma/texto nativos; footage para lo complejo) + sus keyframes de
transform. Determinista, sin IA. También incluye el simplificador de keyframes.

CONTRATO `aeScene` (lo que el muestreo debe entregar):
{
  "fps": 30, "width": 1080, "height": 1920, "durationInFrames": 180,
  "elements": [
    {
      "id": "el-1", "name": "Texto 1",
      "appearance": {"kind": "text",  "text": "VIBE", "color": "#ffffff", "fontSize": 120}
                  | {"kind": "shape", "shape": "ellipse"|"rect", "color": "#22c55e", "w": 50, "h": 50}
                  | {"kind": "footage", "file": "el-1.mov"},
      "tracks": {
        "position": [[frame, [x, y]], ...],   # centro del elemento, en px del lienzo
        "scale":    [[frame, pct], ...],        # 100 = tamaño normal
        "rotation": [[frame, deg], ...],
        "opacity":  [[frame, pct], ...]         # 0..100
      }
    }, ...
  ]
}
Cada track puede venir CRUDO (un valor por frame) → se simplifica aquí; o ya simplificado.
"""
import math
from typing import Any


def _approx_equal(a: Any, b: Any, tol: float) -> bool:
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(abs(x - y) <= tol for x, y in zip(a, b))
    return abs(a - b) <= tol


def simplify_track(track: list, tol: float = 0.5) -> list:
    """Reduce un track [(frame, valor), ...] quitando keyframes redundantes (valor casi igual al
    anterior y al siguiente). Siempre conserva el primero y el último. `valor` puede ser número
    o [x, y]. Menos keyframes = comp más liviana, igual de fiel."""
    if not track:
        return []
    if len(track) <= 2:
        return list(track)
    out = [track[0]]
    for i in range(1, len(track) - 1):
        prev_v = out[-1][1]
        cur_v = track[i][1]
        nxt_v = track[i + 1][1]
        # Si el valor actual es casi igual al anterior conservado Y al siguiente, es redundante
        # (un tramo plano o perfectamente lineal sin inflexión) → se omite.
        if _approx_equal(cur_v, prev_v, tol) and _approx_equal(cur_v, nxt_v, tol):
            continue
        out.append(track[i])
    out.append(track[-1])
    return out


def _js_str(s: str) -> str:
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ") + '"'


def _hex_to_rgb01(hex_color: str) -> tuple[float, float, float]:
    h = (hex_color or "#000000").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        r = int(h[0:2], 16) / 255.0
        g = int(h[2:4], 16) / 255.0
        b = int(h[4:6], 16) / 255.0
        return (round(r, 4), round(g, 4), round(b, 4))
    except (ValueError, IndexError):
        return (1.0, 1.0, 1.0)


def _emit_keyframes(prop_js: str, track: list, fps: int, is_xy: bool, tol: float) -> list[str]:
    """Líneas .jsx para fijar keyframes en una propiedad. `track` = [(frame, val), ...]."""
    simplified = simplify_track(track, tol)
    lines: list[str] = []
    for frame, val in simplified:
        t = round(frame / fps, 5)
        if is_xy:
            v = f"[{round(val[0], 2)}, {round(val[1], 2)}]"
        else:
            v = str(round(val, 3))
        lines.append(f"  {prop_js}.setValueAtTime({t}, {v});")
    return lines


def build_jsx(scene: dict, tol: float = 0.5) -> str:
    """Genera el ExtendScript completo para recrear `scene` como una comp con capas + keyframes."""
    fps = int(scene.get("fps", 30))
    width = int(scene.get("width", 1080))
    height = int(scene.get("height", 1920))
    dur_frames = int(scene.get("durationInFrames", 1))
    duration_s = round(max(1, dur_frames) / fps, 5)
    elements = scene.get("elements", [])

    out: list[str] = []
    out.append("// Generado por AnimaFlow — Export AE editable (beta). Correr en AE: Archivo > Scripts.")
    out.append("app.beginUndoGroup(\"AnimaFlow Import\");")
    out.append("var fps = " + str(fps) + ";")
    out.append(
        f'var comp = app.project.items.addComp("AnimaFlow Scene", {width}, {height}, 1, {duration_s}, {fps});'
    )
    out.append("comp.openInViewer();")

    # Fondo (AbsoluteFill): capa Solid al FONDO (se agrega PRIMERO → queda abajo del stack) con
    # color sólido o efecto Gradient Ramp (lineal/radial). Estático, sin keyframes.
    bg = scene.get("background")
    if bg:
        out.append("")
        out.append("// --- Fondo ---")
        if bg.get("kind") == "solid":
            r, g, b = _hex_to_rgb01(bg.get("color", "#000000"))
            out.append(f'var LB = comp.layers.addSolid([{r}, {g}, {b}], "Fondo", {width}, {height}, 1);')
        else:
            r1, g1, b1 = _hex_to_rgb01(bg.get("start", "#000000"))
            r2, g2, b2 = _hex_to_rgb01(bg.get("end", "#000000"))
            out.append(f'var LB = comp.layers.addSolid([{r1}, {g1}, {b1}], "Fondo", {width}, {height}, 1);')
            out.append('var LB_e = LB.property("ADBE Effect Parade").addProperty("ADBE Ramp");')
            if bg.get("shape") == "linear":
                ang = math.radians(float(bg.get("angle", 180)))
                dx, dy = math.sin(ang), -math.cos(ang)
                half = max(width, height) / 2.0
                sx, sy = width / 2 - dx * half, height / 2 - dy * half
                ex, ey = width / 2 + dx * half, height / 2 + dy * half
                ramp_shape = 1  # Linear Ramp
            else:  # radial: centro → esquina (radio = farthest-corner)
                sx = width * float(bg.get("cx", 50)) / 100.0
                sy = height * float(bg.get("cy", 50)) / 100.0
                ex, ey = float(width), float(height)
                ramp_shape = 2  # Radial Ramp
            out.append(f'LB_e.property("ADBE Ramp-0001").setValue([{round(sx, 1)}, {round(sy, 1)}]);')
            out.append(f'LB_e.property("ADBE Ramp-0002").setValue([{r1}, {g1}, {b1}, 1]);')
            out.append(f'LB_e.property("ADBE Ramp-0003").setValue([{round(ex, 1)}, {round(ey, 1)}]);')
            out.append(f'LB_e.property("ADBE Ramp-0004").setValue([{r2}, {g2}, {b2}, 1]);')
            out.append(f'LB_e.property("ADBE Ramp-0005").setValue({ramp_shape});')

    # AE pone cada capa nueva ARRIBA del stack → agregamos en el MISMO orden del código para que
    # el último elemento (el que en HTML se dibuja encima) quede arriba en AE. Orden directo.
    for idx, el in enumerate(elements):
        ap = el.get("appearance") or {}
        kind = ap.get("kind", "shape")
        name = el.get("name") or el.get("id") or f"Capa {idx}"
        lvar = f"L{idx}"
        out.append("")
        out.append(f"// --- {name} ---")

        if kind == "text":
            out.append(f"var {lvar} = comp.layers.addText({_js_str(ap.get('text', ''))});")
            r, g, b = _hex_to_rgb01(ap.get("color", "#ffffff"))
            fsize = max(1.0, float(ap.get("fontSize", 80) or 80))
            out.append(f"var {lvar}_td = {lvar}.property(\"Source Text\").value;")
            out.append(f"{lvar}_td.fillColor = [{r}, {g}, {b}];")
            out.append(f"{lvar}_td.fontSize = {round(fsize, 1)};")
            out.append(f"{lvar}_td.justification = ParagraphJustification.CENTER_JUSTIFY;")
            out.append(f"{lvar}.property(\"Source Text\").setValue({lvar}_td);")
            # AE ancla el texto en la base-izquierda → centramos el anchor en su bounding box
            # para que Position quede en el CENTRO del texto (si no, sale corrido/cortado).
            out.append(f"var {lvar}_r = {lvar}.sourceRectAtTime(0, false);")
            out.append(
                f"{lvar}.property(\"Transform\").property(\"Anchor Point\").setValue("
                f"[{lvar}_r.left + {lvar}_r.width / 2, {lvar}_r.top + {lvar}_r.height / 2]);"
            )
        elif kind == "footage":
            # Footage: se importa por nombre de archivo (el zip lo trae junto). Placeholder seguro.
            out.append(f"// (footage) importar {_js_str(ap.get('file', ''))} y añadir como capa — Fase B")
            r, g, b = _hex_to_rgb01(ap.get("color", "#808080"))
            out.append(
                f'var {lvar} = comp.layers.addSolid([{r}, {g}, {b}], {_js_str(name)}, '
                f'{max(1, int(ap.get("w", 100) or 100))}, {max(1, int(ap.get("h", 100) or 100))}, 1);'
            )
        elif kind == "path":
            # Trazo nativo: shape layer con uno o más paths (vértices) + stroke (o fill).
            r, g, b = _hex_to_rgb01(ap.get("color", "#ffffff"))
            out.append(f"var {lvar} = comp.layers.addShape();")
            out.append(f"{lvar}.name = {_js_str(name)};")
            out.append(f'var {lvar}_g = {lvar}.property("Contents").addProperty("ADBE Vector Group");')
            for si, sp in enumerate(ap.get("paths", [])):
                pts = sp.get("points", [])
                if len(pts) < 2:
                    continue
                verts = "[" + ",".join(f"[{round(p[0], 2)}, {round(p[1], 2)}]" for p in pts) + "]"
                zeros = "[" + ",".join("[0,0]" for _ in pts) + "]"
                sv = f"{lvar}_sh{si}"
                out.append(f'var {sv} = {lvar}_g.property("Contents").addProperty("ADBE Vector Shape - Group");')
                out.append(f"var {sv}_p = new Shape();")
                out.append(f"{sv}_p.vertices = {verts};")
                out.append(f"{sv}_p.inTangents = {zeros};")
                out.append(f"{sv}_p.outTangents = {zeros};")
                out.append(f"{sv}_p.closed = {'true' if sp.get('closed') else 'false'};")
                out.append(f'{sv}.property("Path").setValue({sv}_p);')
            if ap.get("filled"):
                out.append(f'var {lvar}_f = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - Fill");')
                out.append(f'{lvar}_f.property("Color").setValue([{r}, {g}, {b}, 1]);')
            else:
                sw = max(1, int(ap.get("strokeWidth", 2) or 2))
                out.append(f'var {lvar}_st = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - Stroke");')
                out.append(f'{lvar}_st.property("ADBE Vector Stroke Color").setValue([{r}, {g}, {b}, 1]);')
                out.append(f'{lvar}_st.property("ADBE Vector Stroke Width").setValue({sw});')
                # Caps/joins redondeados (como strokeLinecap/Linejoin="round"); opcional → try/catch.
                out.append(
                    f'try {{ {lvar}_st.property("ADBE Vector Stroke Line Cap").setValue(2); '
                    f'{lvar}_st.property("ADBE Vector Stroke Line Join").setValue(2); }} catch (e) {{}}'
                )
        else:  # shape (rect/ellipse) nativo
            w = max(1.0, float(ap.get("w", 100) or 100))
            h = max(1.0, float(ap.get("h", 100) or 100))
            r, g, b = _hex_to_rgb01(ap.get("color", "#22c55e"))
            shape_type = "ellipse" if ap.get("shape") == "ellipse" else "rect"
            out.append(f"var {lvar} = comp.layers.addShape();")
            out.append(f"{lvar}.name = {_js_str(name)};")
            out.append(f"var {lvar}_g = {lvar}.property(\"Contents\").addProperty(\"ADBE Vector Group\");")
            out.append(
                f"var {lvar}_s = {lvar}_g.property(\"Contents\").addProperty("
                + ('"ADBE Vector Shape - Ellipse"' if shape_type == "ellipse" else '"ADBE Vector Shape - Rect"')
                + ");"
            )
            out.append(f"{lvar}_s.property(\"Size\").setValue([{w}, {h}]);")
            out.append(f"var {lvar}_f = {lvar}_g.property(\"Contents\").addProperty(\"ADBE Vector Graphic - Fill\");")
            out.append(f"{lvar}_f.property(\"Color\").setValue([{r}, {g}, {b}, 1]);")

        # Keyframes de transform
        tracks = el.get("tracks") or {}
        tr = f"{lvar}.property(\"Transform\")"
        if tracks.get("position"):
            out += _emit_keyframes(f'{tr}.property("Position")', tracks["position"], fps, True, tol)
        if tracks.get("scale"):
            # scale como [pct, pct]
            sc = [[f, [v, v]] for f, v in tracks["scale"]]
            out += _emit_keyframes(f'{tr}.property("Scale")', sc, fps, True, tol)
        if tracks.get("rotation"):
            out += _emit_keyframes(f'{tr}.property("Rotation")', tracks["rotation"], fps, False, tol)
        if tracks.get("opacity"):
            out += _emit_keyframes(f'{tr}.property("Opacity")', tracks["opacity"], fps, False, tol)

    out.append("")
    out.append("app.endUndoGroup();")
    return "\n".join(out)
