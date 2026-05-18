// ANIMAFLOW - Deterministic AE Export Script
// Generated without LLM

try {

if (app.project == null) {
    app.newProject();
}

app.beginUndoGroup("AnimaFlow Scene 1");
var comp = app.project.items.addComp("Scene", 1080, 1920, 1, 3.3, 30);
comp.layers.addSolid([0.059, 0.090, 0.165], "Background", 1080, 1920, 1, 3.3);

// --- Path_1 ---
var sl1 = comp.layers.addShape(); sl1.name = "Path_1";
var g1 = sl1.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg1 = g1.property("ADBE Vectors Group");
var ps1 = vg1.addProperty("ADBE Vector Shape - Group");
var s1 = new Shape();
s1.vertices = [[70.0, -70.0], [0.0, 0.0], [-70.0, 70.0]];
s1.inTangents = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]];
s1.outTangents = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]];
s1.closed = false;
ps1.property("ADBE Vector Shape").setValue(s1);
var st1 = vg1.addProperty("ADBE Vector Graphic - Stroke");
st1.property("ADBE Vector Stroke Color").setValue([1.000, 0.843, 0.000]);
st1.property("ADBE Vector Stroke Width").setValue(8.0);
sl1.property("ADBE Transform Group").property("ADBE Position").setValue([940.0, 2060.0]);
var glow1 = sl1.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
glow1.property(1).setValue([1.000, 0.843, 0.000]); // Color (inherits fill/stroke)
glow1.property(2).setValue(100); // Opacity
glow1.property(4).setValue(0); // Distance
glow1.property(5).setValue(40.0); // Softness

// --- Path_2 ---
var sl2 = comp.layers.addShape(); sl2.name = "Path_2";
var g2 = sl2.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg2 = g2.property("ADBE Vectors Group");
var ps2 = vg2.addProperty("ADBE Vector Shape - Group");
var s2 = new Shape();
s2.vertices = [[-70.0, -70.0], [0.0, 0.0], [70.0, 70.0]];
s2.inTangents = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]];
s2.outTangents = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0]];
s2.closed = false;
ps2.property("ADBE Vector Shape").setValue(s2);
var st2 = vg2.addProperty("ADBE Vector Graphic - Stroke");
st2.property("ADBE Vector Stroke Color").setValue([1.000, 0.843, 0.000]);
st2.property("ADBE Vector Stroke Width").setValue(8.0);
sl2.property("ADBE Transform Group").property("ADBE Position").setValue([1220.0, 2060.0]);
var glow2 = sl2.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
glow2.property(1).setValue([1.000, 0.843, 0.000]); // Color (inherits fill/stroke)
glow2.property(2).setValue(100); // Opacity
glow2.property(4).setValue(0); // Distance
glow2.property(5).setValue(40.0); // Softness

// --- Path_3 ---
var sl3 = comp.layers.addShape(); sl3.name = "Path_3";
var g3 = sl3.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg3 = g3.property("ADBE Vectors Group");
var ps3 = vg3.addProperty("ADBE Vector Shape - Group");
var s3 = new Shape();
s3.vertices = [[0.0, -120.0], [0.0, 120.0]];
s3.inTangents = [[0.0, 0.0], [0.0, 0.0]];
s3.outTangents = [[0.0, 0.0], [0.0, 0.0]];
s3.closed = false;
ps3.property("ADBE Vector Shape").setValue(s3);
var st3 = vg3.addProperty("ADBE Vector Graphic - Stroke");
st3.property("ADBE Vector Stroke Color").setValue([1.000, 0.843, 0.000]);
st3.property("ADBE Vector Stroke Width").setValue(8.0);
sl3.property("ADBE Transform Group").property("ADBE Position").setValue([1080.0, 2160.0]);
var glow3 = sl3.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
glow3.property(1).setValue([1.000, 0.843, 0.000]); // Color (inherits fill/stroke)
glow3.property(2).setValue(100); // Opacity
glow3.property(4).setValue(0); // Distance
glow3.property(5).setValue(40.0); // Softness

// --- Rect_4 ---
var sl4 = comp.layers.addShape(); sl4.name = "Rect_4";
var g4 = sl4.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg4 = g4.property("ADBE Vectors Group");
var ps4 = vg4.addProperty("ADBE Vector Shape - Rect");
ps4.property("ADBE Vector Rect Size").setValue([80.0, 60.0]);
ps4.property("ADBE Vector Rect Roundness").setValue(12.0);
var f4 = vg4.addProperty("ADBE Vector Graphic - Fill");
f4.property("ADBE Vector Fill Color").setValue([0.290, 0.871, 0.502]);
sl4.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1100.0]);

// --- Ellipse_5 ---
var sl5 = comp.layers.addShape(); sl5.name = "Ellipse_5";
var g5 = sl5.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg5 = g5.property("ADBE Vectors Group");
var ps5 = vg5.addProperty("ADBE Vector Shape - Ellipse");
ps5.property("ADBE Vector Ellipse Size").setValue([30.0, 60.0]);
var f5 = vg5.addProperty("ADBE Vector Graphic - Fill");
f5.property("ADBE Vector Fill Color").setValue([0.133, 0.773, 0.369]);
sl5.property("ADBE Transform Group").property("ADBE Position").setValue([540.0, 1080.0]);

// --- Ellipse_6 ---
var sl6 = comp.layers.addShape(); sl6.name = "Ellipse_6";
var g6 = sl6.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg6 = g6.property("ADBE Vectors Group");
var ps6 = vg6.addProperty("ADBE Vector Shape - Ellipse");
ps6.property("ADBE Vector Ellipse Size").setValue([30.0, 60.0]);
var f6 = vg6.addProperty("ADBE Vector Graphic - Fill");
f6.property("ADBE Vector Fill Color").setValue([0.133, 0.773, 0.369]);
sl6.property("ADBE Transform Group").property("ADBE Position").setValue([540.0, 1080.0]);

// --- Circle_7 ---
var sl7 = comp.layers.addShape(); sl7.name = "Circle_7";
var g7 = sl7.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg7 = g7.property("ADBE Vectors Group");
var ps7 = vg7.addProperty("ADBE Vector Shape - Ellipse");
ps7.property("ADBE Vector Ellipse Size").setValue([0.0, 0.0]);
var f7 = vg7.addProperty("ADBE Vector Graphic - Fill");
f7.property("ADBE Vector Fill Color").setValue([0.290, 0.871, 0.502]);
sl7.property("ADBE Transform Group").property("ADBE Position").setValue([540.0, 1100.0]);
var ds7 = sl7.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds7.property(2).setValue(50.0); // Opacity
ds7.property(5).setValue(40.0); // Softness

// --- Line_8 ---
var sl8 = comp.layers.addShape(); sl8.name = "Line_8";
var g8 = sl8.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg8 = g8.property("ADBE Vectors Group");
var ps8 = vg8.addProperty("ADBE Vector Shape - Group");
var s8 = new Shape();
s8.vertices = [[0.0, -45.0], [0.0, -65.0]];
s8.inTangents = [[0, 0], [0, 0]];
s8.outTangents = [[0, 0], [0, 0]];
s8.closed = false;
ps8.property("ADBE Vector Shape").setValue(s8);
var st8 = vg8.addProperty("ADBE Vector Graphic - Stroke");
st8.property("ADBE Vector Stroke Color").setValue([0.290, 0.871, 0.502]);
st8.property("ADBE Vector Stroke Width").setValue(1.0);
var trim8 = vg8.addProperty("ADBE Vector Filter - Trim");
trim8.property("ADBE Vector Trim Start").setValue(0);
trim8.property("ADBE Vector Trim End").setValue(100);
sl8.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1100.0]);

// --- Path_9 ---
var sl9 = comp.layers.addShape(); sl9.name = "Path_9";
var g9 = sl9.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg9 = g9.property("ADBE Vectors Group");
var ps9 = vg9.addProperty("ADBE Vector Shape - Group");
var s9 = new Shape();
s9.vertices = [[0.0, -30.0], [0.0, 30.0], [0.0, -30.0]];
s9.inTangents = [[0.0, 0.0], [25.0, -10.0], [-20.0, 30.0]];
s9.outTangents = [[20.0, 30.0], [-25.0, -10.0], [0.0, 0.0]];
s9.closed = false;
ps9.property("ADBE Vector Shape").setValue(s9);
var f9 = vg9.addProperty("ADBE Vector Graphic - Fill");
f9.property("ADBE Vector Fill Color").setValue([0.290, 0.871, 0.502]);
sl9.property("ADBE Transform Group").property("ADBE Position").setValue([540.0, 1190.0]);
var ds9 = sl9.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds9.property(2).setValue(50.0); // Opacity
ds9.property(5).setValue(40.0); // Softness

// --- Path_10 ---
var sl10 = comp.layers.addShape(); sl10.name = "Path_10";
var g10 = sl10.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg10 = g10.property("ADBE Vectors Group");
var ps10 = vg10.addProperty("ADBE Vector Shape - Group");
var s10 = new Shape();
s10.vertices = [[0.0, 50.0], [-30.0, -50.0], [0.0, -40.0], [30.0, -50.0], [0.0, 50.0]];
s10.inTangents = [[0.0, 0.0], [-50.0, 20.0], [0.0, 0.0], [-20.0, -10.0], [60.0, -30.0]];
s10.outTangents = [[-60.0, -30.0], [20.0, -10.0], [0.0, 0.0], [50.0, 20.0], [0.0, 0.0]];
s10.closed = false;
ps10.property("ADBE Vector Shape").setValue(s10);
var f10 = vg10.addProperty("ADBE Vector Graphic - Fill");
f10.property("ADBE Vector Fill Color").setValue([1.000, 0.376, 0.565]);
sl10.property("ADBE Transform Group").property("ADBE Position").setValue([540.0, 940.0]);
var ramp10 = sl10.property("ADBE Effect Parade").addProperty("ADBE Ramp");
ramp10.property(1).setValue([540.0, 940.0]); // Start Point (center)
ramp10.property(2).setValue([1.000, 0.376, 0.565]); // Start Color
ramp10.property(3).setValue([540.0, 1140.0]); // End Point (radius border)
ramp10.property(4).setValue([0.914, 0.118, 0.388]); // End Color
ramp10.property(5).setValue(2); // Ramp Shape (1=Linear, 2=Radial)
ramp10.property(7).setValue(0); // Blend with Original (0 = completely replace fill but keep alpha)
var ds10 = sl10.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds10.property(2).setValue(50.0); // Opacity
ds10.property(5).setValue(40.0); // Softness

// --- Text Layer ---
var textLayer = comp.layers.addBoxText([972, 300], "Tus plantas limpian el aire y reducen el estres.");
var td = textLayer.property("Source Text").value;
td.resetCharStyle();
td.font = "Arial-BoldMT";
td.fontSize = 68;
td.fauxBold = true;
td.applyFill = true;
td.fillColor = [0.180, 0.800, 0.443];
td.justification = ParagraphJustification.CENTER_JUSTIFY;
textLayer.property("Source Text").setValue(td);
textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1574]);


// === ANIMATIONS ===
// Animations for Rect_4
var sl4Pos = sl4.property("ADBE Transform Group").property("ADBE Position");
sl4Pos.setValueAtTime(0.0, [540, 1200.0]);
sl4Pos.setValueAtTime(0.8, [540, 1085.0]);
sl4Pos.setValueAtTime(1.0, [540, 1100.0]);

// Animations for Ellipse_5
var sl5Pos = sl5.property("ADBE Transform Group").property("ADBE Position");
sl5Pos.setValueAtTime(0.0, [540.0, 1180.0]);
sl5Pos.setValueAtTime(0.8, [540.0, 1065.0]);
sl5Pos.setValueAtTime(1.0, [540.0, 1080.0]);

// Animations for Ellipse_6
var sl6Pos = sl6.property("ADBE Transform Group").property("ADBE Position");
sl6Pos.setValueAtTime(0.0, [540.0, 1180.0]);
sl6Pos.setValueAtTime(0.8, [540.0, 1065.0]);
sl6Pos.setValueAtTime(1.0, [540.0, 1080.0]);

// Animations for Circle_7
var sl7Pos = sl7.property("ADBE Transform Group").property("ADBE Position");
sl7Pos.setValueAtTime(0.0, [540.0, 1200.0]);
sl7Pos.setValueAtTime(0.8, [540.0, 1085.0]);
sl7Pos.setValueAtTime(1.0, [540.0, 1100.0]);

// Animations for Line_8
var sl8Pos = sl8.property("ADBE Transform Group").property("ADBE Position");
sl8Pos.setValueAtTime(0.0, [540, 1200.0]);
sl8Pos.setValueAtTime(0.8, [540, 1085.0]);
sl8Pos.setValueAtTime(1.0, [540, 1100.0]);

// Animations for Path_9
var sl9Pos = sl9.property("ADBE Transform Group").property("ADBE Position");
sl9Pos.setValueAtTime(0.0, [540.0, 1390.0]);
sl9Pos.setValueAtTime(0.8, [540.0, 1160.0]);
sl9Pos.setValueAtTime(1.0, [540.0, 1190.0]);

// Animations for textLayer
var textLayerScale = textLayer.property("ADBE Transform Group").property("ADBE Scale");
textLayerScale.setValueAtTime(1.333, [70, 70]);
textLayerScale.setValueAtTime(2.133, [104, 104]);
textLayerScale.setValueAtTime(2.333, [100, 100]);

app.endUndoGroup();

} catch (e) {
    alert("AnimaFlow Script Error: " + e.message + "\nLine: " + $.line);
}
