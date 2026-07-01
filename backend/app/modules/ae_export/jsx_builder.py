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


_WEIGHT_NAMES = {
    100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium",
    600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black",
}


def _postscript_font(family: str, weight: int) -> str:
    """Nombre PostScript de la fuente (lo que AE necesita), no la familia: 'Inter' + peso 900 →
    'Inter-Black'. AE muestra '[Inter/TrueType]' (corchetes) si se le da solo la familia → usa el
    peso Regular. Con el nombre exacto usa el peso correcto. PostScript = familia sin espacios."""
    fam = "".join((family or "Inter").split())
    w = min(_WEIGHT_NAMES, key=lambda k: abs(k - int(weight or 400)))
    return f"{fam}-{_WEIGHT_NAMES[w]}"


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


def _emit_stroke(
    lvar: str, group_var: str, r: float, g: float, b: float, width: int, dash: Any,
    fps: int = 30, color_track: Any = None,
) -> list[str]:
    """Líneas .jsx para un trazo (Stroke) en un grupo de forma: color (estático o animado por
    keyframes) + ancho + caps redondeados + dash opcional. matchNames (independientes del idioma)."""
    st = f"{lvar}_st"
    out = [f'var {st} = {group_var}.property("Contents").addProperty("ADBE Vector Graphic - Stroke");']
    if color_track and len(color_track) > 1:
        out += _emit_color_keyframes(f'{st}.property("ADBE Vector Stroke Color")', color_track, fps)
    else:
        out.append(f'{st}.property("ADBE Vector Stroke Color").setValue([{r}, {g}, {b}, 1]);')
    out += [
        f'{st}.property("ADBE Vector Stroke Width").setValue({max(1, int(width))});',
        f'try {{ {st}.property("ADBE Vector Stroke Line Cap").setValue(2); '
        f'{st}.property("ADBE Vector Stroke Line Join").setValue(2); }} catch (e) {{}}',
    ]
    if dash and len(dash) >= 1:
        d = max(1, int(dash[0]))
        gap = max(1, int(dash[1])) if len(dash) > 1 else d
        out.append(
            f'try {{ var {st}_d = {st}.property("ADBE Vector Stroke Dashes"); '
            f'{st}_d.addProperty("ADBE Vector Stroke Dash 1").setValue({d}); '
            f'{st}_d.addProperty("ADBE Vector Stroke Gap 1").setValue({gap}); }} catch (e) {{}}'
        )
    return out


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


def _emit_color_keyframes(prop_js: str, track: list, fps: int, tol: float = 0.012) -> list[str]:
    """Keyframes de COLOR: track = [(frame, '#hex'), ...] → [r,g,b,1] por keyframe, simplificado
    (tol pequeño porque el rango es 0..1). Para rellenos/colores animados en el tiempo."""
    rgb = [[f, list(_hex_to_rgb01(c))] for f, c in track]
    lines: list[str] = []
    for frame, val in simplify_track(rgb, tol):
        t = round(frame / fps, 5)
        lines.append(f"  {prop_js}.setValueAtTime({t}, [{val[0]}, {val[1]}, {val[2]}, 1]);")
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
            # Fuente (best-effort: si no está instalada AE la ignora), peso (fauxBold), tracking
            # (letter-spacing: AE usa 1/1000 em), interlineado (leading).
            fam = ap.get("fontFamily")
            weight = int(ap.get("fontWeight", 400) or 400)
            if fam:
                # Nombre PostScript con el peso (ej. Inter-Black) → AE usa el peso correcto. Si no
                # existe ese peso instalado, intenta la familia sola como respaldo.
                ps = _postscript_font(fam, weight)
                out.append(
                    f'try {{ {lvar}_td.font = {_js_str(ps)}; }} catch (e1) {{ '
                    f'try {{ {lvar}_td.font = {_js_str("".join(fam.split()))}; }} catch (e2) {{}} }}'
                )
            ls = float(ap.get("letterSpacing", 0) or 0)
            if ls:
                # AE exige que tracking sea ENTERO (si no: "no es un número entero").
                out.append(f"{lvar}_td.tracking = {int(round(ls / fsize * 1000))};")
            lh = float(ap.get("lineHeight", 0) or 0)
            if lh:
                out.append(f"{lvar}_td.leading = {round(lh, 1)};")
            out.append(f"{lvar}.property(\"Source Text\").setValue({lvar}_td);")
            # AE ancla el texto en la base-izquierda → centramos el anchor en su bounding box
            # para que Position quede en el CENTRO del texto (si no, sale corrido/cortado).
            out.append(f"var {lvar}_r = {lvar}.sourceRectAtTime(0, false);")
            out.append(
                f"{lvar}.property(\"Transform\").property(\"Anchor Point\").setValue("
                f"[{lvar}_r.left + {lvar}_r.width / 2, {lvar}_r.top + {lvar}_r.height / 2]);"
            )
            # Color de texto ANIMADO → animador "Fill Color" (selector 0-100% afecta todo el texto;
            # la fillColor base queda de fallback). Todo en try/catch por si los matchNames fallan.
            ct = ap.get("colorTrack")
            if ct and len(ct) > 1:
                out.append(
                    f'try {{ var {lvar}_an = {lvar}.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); '
                    f'{lvar}_an.property("ADBE Text Selectors").addProperty("ADBE Text Selector"); '
                    f'var {lvar}_fc = {lvar}_an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");'
                )
                out += _emit_color_keyframes(f"{lvar}_fc", ct, fps)
                out.append("} catch (e) {}")
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
                zeros = [[0, 0] for _ in pts]
                ins = sp.get("inTangents") or zeros
                outs = sp.get("outTangents") or zeros
                # Alinear longitudes por seguridad (deben coincidir con #vértices).
                if len(ins) != len(pts):
                    ins = zeros
                if len(outs) != len(pts):
                    outs = zeros
                fmt = lambda arr: "[" + ",".join(f"[{round(p[0], 2)}, {round(p[1], 2)}]" for p in arr) + "]"
                sv = f"{lvar}_sh{si}"
                out.append(f'var {sv} = {lvar}_g.property("Contents").addProperty("ADBE Vector Shape - Group");')
                out.append(f"var {sv}_p = new Shape();")
                out.append(f"{sv}_p.vertices = {fmt(pts)};")
                out.append(f"{sv}_p.inTangents = {fmt(ins)};")
                out.append(f"{sv}_p.outTangents = {fmt(outs)};")
                out.append(f"{sv}_p.closed = {'true' if sp.get('closed') else 'false'};")
                out.append(f'{sv}.property("Path").setValue({sv}_p);')
            if ap.get("filled"):
                out.append(f'var {lvar}_f = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - Fill");')
                out.append(f'{lvar}_f.property("Color").setValue([{r}, {g}, {b}, 1]);')
            else:
                sw = max(1, int(ap.get("strokeWidth", 2) or 2))
                out += _emit_stroke(lvar, f"{lvar}_g", r, g, b, sw, ap.get("dash"), fps, ap.get("colorTrack"))
        else:  # shape (rect/ellipse) nativo
            w = max(1.0, float(ap.get("w", 100) or 100))
            h = max(1.0, float(ap.get("h", 100) or 100))
            r, g, b = _hex_to_rgb01(ap.get("color", "#22c55e"))
            shape_type = "ellipse" if ap.get("shape") == "ellipse" else "rect"
            bdr = ap.get("border")
            sides = bdr.get("sides") if bdr else None
            partial = bool(sides) and not all(sides)  # marco abierto (ej. arco con borderBottom:none)
            out.append(f"var {lvar} = comp.layers.addShape();")
            out.append(f"{lvar}.name = {_js_str(name)};")
            out.append(f"var {lvar}_g = {lvar}.property(\"Contents\").addProperty(\"ADBE Vector Group\");")
            if partial:
                # Solo líneas de los lados presentes (no el rect completo) + el trazo del borde.
                hw, hh = w / 2, h / 2
                pts = {"TL": (-hw, -hh), "TR": (hw, -hh), "BR": (hw, hh), "BL": (-hw, hh)}
                edges = [("TL", "TR"), ("TR", "BR"), ("BR", "BL"), ("BL", "TL")]  # top, right, bottom, left
                for i, (a, c) in enumerate(edges):
                    if not sides[i]:
                        continue
                    pa, pc = pts[a], pts[c]
                    sv = f"{lvar}_bd{i}"
                    out.append(f'var {sv} = {lvar}_g.property("Contents").addProperty("ADBE Vector Shape - Group");')
                    out.append(f"var {sv}_p = new Shape();")
                    out.append(f"{sv}_p.vertices = [[{round(pa[0], 1)}, {round(pa[1], 1)}], [{round(pc[0], 1)}, {round(pc[1], 1)}]];")
                    out.append(f"{sv}_p.inTangents = [[0,0],[0,0]];")
                    out.append(f"{sv}_p.outTangents = [[0,0],[0,0]];")
                    out.append(f"{sv}_p.closed = false;")
                    out.append(f'{sv}.property("Path").setValue({sv}_p);')
                br_, bg_, bb_ = _hex_to_rgb01(bdr.get("color", "#ffffff"))
                out += _emit_stroke(lvar, f"{lvar}_g", br_, bg_, bb_, int(bdr.get("width", 1) or 1), None)
            else:
                out.append(
                    f'var {lvar}_s = {lvar}_g.property("Contents").addProperty('
                    + ('"ADBE Vector Shape - Ellipse"' if shape_type == "ellipse" else '"ADBE Vector Shape - Rect"')
                    + ");"
                )
                out.append(f'{lvar}_s.property("Size").setValue([{w}, {h}]);')
                if shape_type == "rect" and float(ap.get("roundness", 0) or 0) > 0:
                    out.append(f'try {{ {lvar}_s.property("ADBE Vector Rect Roundness").setValue({round(float(ap["roundness"]), 1)}); }} catch (e) {{}}')
                grad = ap.get("grad") if ap.get("filled", True) else None
                if grad:
                    # Gradient Fill nativo (2 paradas); el "blob" de AE es delicado → try/catch que cae a sólido.
                    gr1, gg1, gb1 = _hex_to_rgb01(grad.get("start", ap.get("color", "#000000")))
                    gr2, gg2, gb2 = _hex_to_rgb01(grad.get("end", ap.get("color", "#000000")))
                    if grad.get("shape") == "radial":
                        gtype, sx, sy, ex, ey = 2, 0.0, 0.0, w / 2, h / 2
                    else:
                        ang = math.radians(float(grad.get("angle", 180)))
                        dx, dy = math.sin(ang), -math.cos(ang)
                        gtype, sx, sy, ex, ey = 1, -dx * w / 2, -dy * h / 2, dx * w / 2, dy * h / 2
                    blob = f"[0, {gr1}, {gg1}, {gb1}, 1, {gr2}, {gg2}, {gb2}, 0, 1, 1, 1]"
                    out.append(f'var {lvar}_gf = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - G-Fill");')
                    out.append(
                        f'try {{ {lvar}_gf.property("ADBE Vector Grad Type").setValue({gtype}); '
                        f'{lvar}_gf.property("ADBE Vector Grad Start Pt").setValue([{round(sx, 1)}, {round(sy, 1)}]); '
                        f'{lvar}_gf.property("ADBE Vector Grad End Pt").setValue([{round(ex, 1)}, {round(ey, 1)}]); '
                        f'{lvar}_gf.property("ADBE Vector Grad Colors").setValue({blob}); }} '
                        f'catch (e) {{ {lvar}_gf.remove(); '
                        f'var {lvar}_f = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - Fill"); '
                        f'{lvar}_f.property("Color").setValue([{r}, {g}, {b}, 1]); }}'
                    )
                elif ap.get("filled", True):
                    out.append(f'var {lvar}_f = {lvar}_g.property("Contents").addProperty("ADBE Vector Graphic - Fill");')
                    ct = ap.get("colorTrack")
                    if ct and len(ct) > 1:
                        out += _emit_color_keyframes(f'{lvar}_f.property("Color")', ct, fps)
                    else:
                        out.append(f'{lvar}_f.property("Color").setValue([{r}, {g}, {b}, 1]);')
                # Borde (gana sobre el relleno) o, si no hay relleno, el trazo svg.
                if bdr:
                    br_, bg_, bb_ = _hex_to_rgb01(bdr.get("color", "#000000"))
                    out += _emit_stroke(lvar, f"{lvar}_g", br_, bg_, bb_, int(bdr.get("width", 1) or 1), None)
                elif not ap.get("filled", True):
                    out += _emit_stroke(lvar, f"{lvar}_g", r, g, b, int(ap.get("strokeWidth", 2) or 2), ap.get("dash"), fps, ap.get("colorTrack"))

        # Efectos nativos de AE (Nivel 2): Drop Shadow (sombra/glow) + Gaussian Blur. La capa sigue
        # siendo nativa/editable. matchNames (independientes del idioma).
        fx = el.get("effects") or {}
        sh = fx.get("shadow")
        if sh:
            sr, sg, sb = _hex_to_rgb01(sh.get("color", "#000000"))
            sx, sy, sblur = float(sh.get("x", 0)), float(sh.get("y", 0)), float(sh.get("blur", 0))
            dist = math.hypot(sx, sy)
            direction = math.degrees(math.atan2(sx, -sy)) % 360 if dist else 0.0
            out.append(f'var {lvar}_ds = {lvar}.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");')
            out.append(f'{lvar}_ds.property("ADBE Drop Shadow-0001").setValue([{sr}, {sg}, {sb}, 1]);')
            out.append(f'{lvar}_ds.property("ADBE Drop Shadow-0002").setValue({max(0, min(255, int(sh.get("opacity", 178))))});')
            out.append(f'{lvar}_ds.property("ADBE Drop Shadow-0003").setValue({round(direction, 1)});')
            out.append(f'{lvar}_ds.property("ADBE Drop Shadow-0004").setValue({round(dist, 1)});')
            out.append(f'{lvar}_ds.property("ADBE Drop Shadow-0005").setValue({round(sblur, 1)});')
        if fx.get("blur"):
            out.append(f'var {lvar}_gb = {lvar}.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");')
            out.append(f'{lvar}_gb.property("ADBE Gaussian Blur 2-0001").setValue({round(float(fx["blur"]), 1)});')
            out.append(f'try {{ {lvar}_gb.property("ADBE Gaussian Blur 2-0002").setValue(1); }} catch (e) {{}}')

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
