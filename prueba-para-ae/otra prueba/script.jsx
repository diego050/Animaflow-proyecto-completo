// ============================================
// ANIMAFLOW - After Effects Export Script
// Generado automáticamente
// Aspect Ratio: 9:16 (1080x1920)
// ============================================

// Safety wrapper
try {

// Verificar que hay un proyecto abierto
if (app.project == null) {
    app.newProject();
}

// Escena 1 - Generado por AnimaFlow
app.beginUndoGroup("AnimaFlow Scene 1");
var comp = app.project.items.addComp("Scene", 1080, 1920, 1, 3.3, 30);
comp.layers.addSolid([0.0588, 0.0902, 0.1647], "Background", 1080, 1920, 1, 3.3);

// Leaf_1
var sl1 = comp.layers.addShape(); 
sl1.name = "Leaf_1";
var g1 = sl1.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg1 = g1.property("ADBE Vectors Group");
var ps1 = vg1.addProperty("ADBE Vector Shape - Group");
var s1 = new Shape(); 
s1.vertices = [[0.0, 0.0], [240.0, 0.0], [0.0, 0.0]]; 
s1.inTangents = [[0.0, 0.0], [-60.0, -120.0], [60.0, 120.0]]; 
s1.outTangents = [[60.0, -120.0], [-60.0, 120.0], [0.0, 0.0]]; 
s1.closed = false;
ps1.property("ADBE Vector Shape").setValue(s1);
var f1 = vg1.addProperty("ADBE Vector Graphic - Fill"); 
f1.property("ADBE Vector Fill Color").setValue([0, 0, 0]);
sl1.property("ADBE Transform Group").property("ADBE Position").setValue([80, 0]);
var ds1 = sl1.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds1.property("ADBE Drop Shadow-0002").setValue(75); ds1.property("ADBE Drop Shadow-0005").setValue(20); ds1.property("ADBE Drop Shadow-0004").setValue(4);

// Leaf_Gradient
var sl2 = comp.layers.addShape(); 
sl2.name = "Leaf_Gradient";
var g2 = sl2.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg2 = g2.property("ADBE Vectors Group");
var ps2 = vg2.addProperty("ADBE Vector Shape - Group");
var s2 = new Shape(); 
s2.vertices = [[0.0, 0.0], [240.0, 0.0], [0.0, 0.0]]; 
s2.inTangents = [[0.0, 0.0], [-60.0, -120.0], [60.0, 120.0]]; 
s2.outTangents = [[60.0, -120.0], [-60.0, 120.0], [0.0, 0.0]]; 
s2.closed = false;
ps2.property("ADBE Vector Shape").setValue(s2);
var f2 = vg2.addProperty("ADBE Vector Graphic - Fill"); 
f2.property("ADBE Vector Fill Color").setValue([0.345, 0.839, 0.553]);
sl2.property("ADBE Transform Group").property("ADBE Position").setValue([80, 0]);
var ramp2 = sl2.property("ADBE Effect Parade").addProperty("ADBE Ramp");
ramp2.property("ADBE Ramp-0002").setValue([0.345, 0.839, 0.553]); 
ramp2.property("ADBE Ramp-0004").setValue([0.180, 0.800, 0.443]); 
ramp2.property("ADBE Ramp-0005").setValue(2);
var glow2 = sl2.property("ADBE Effect Parade").addProperty("ADBE Glo2");
glow2.property("ADBE Glo2-0003").setValue(8.0);
var ds2 = sl2.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds2.property("ADBE Drop Shadow-0002").setValue(75); ds2.property("ADBE Drop Shadow-0005").setValue(20); ds2.property("ADBE Drop Shadow-0004").setValue(4);

// Leaf_Stroke
var sl3 = comp.layers.addShape(); 
sl3.name = "Leaf_Stroke";
var g3 = sl3.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg3 = g3.property("ADBE Vectors Group");
var ps3 = vg3.addProperty("ADBE Vector Shape - Group");
var s3 = new Shape(); 
s3.vertices = [[-120.0, 0.0], [120.0, 0.0]]; 
s3.inTangents = [[0.0, 0.0], [0.0, 0.0]]; 
s3.outTangents = [[0.0, 0.0], [0.0, 0.0]]; 
s3.closed = false;
ps3.property("ADBE Vector Shape").setValue(s3);
var st3 = vg3.addProperty("ADBE Vector Graphic - Stroke"); 
st3.property("ADBE Vector Stroke Color").setValue([0.118, 0.518, 0.286]);
st3.property("ADBE Vector Stroke Width").setValue(1.0);
sl3.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
var ds3 = sl3.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds3.property("ADBE Drop Shadow-0002").setValue(75); ds3.property("ADBE Drop Shadow-0005").setValue(20); ds3.property("ADBE Drop Shadow-0004").setValue(4);

// Circle_1
var sl4 = comp.layers.addShape(); 
sl4.name = "Circle_1";
var g4 = sl4.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg4 = g4.property("ADBE Vectors Group");
var ps4 = vg4.addProperty("ADBE Vector Shape - Ellipse");
ps4.property("ADBE Vector Ellipse Size").setValue([50, 50]);
var st4 = vg4.addProperty("ADBE Vector Graphic - Stroke"); 
st4.property("ADBE Vector Stroke Color").setValue([0.635, 0.875, 0.969]);
st4.property("ADBE Vector Stroke Width").setValue(1.0);
sl4.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);
var glow4 = sl4.property("ADBE Effect Parade").addProperty("ADBE Glo2");
glow4.property("ADBE Glo2-0003").setValue(3.0);
var ds4 = sl4.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds4.property("ADBE Drop Shadow-0002").setValue(75); ds4.property("ADBE Drop Shadow-0005").setValue(20); ds4.property("ADBE Drop Shadow-0004").setValue(4);

// Circle_2
var sl5 = comp.layers.addShape(); 
sl5.name = "Circle_2";
var g5 = sl5.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg5 = g5.property("ADBE Vectors Group");
var ps5 = vg5.addProperty("ADBE Vector Shape - Ellipse");
ps5.property("ADBE Vector Ellipse Size").setValue([50, 50]);
var f5 = vg5.addProperty("ADBE Vector Graphic - Fill"); 
f5.property("ADBE Vector Fill Color").setValue([0.635, 0.875, 0.969]);
sl5.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
var ds5 = sl5.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds5.property("ADBE Drop Shadow-0002").setValue(75); ds5.property("ADBE Drop Shadow-0005").setValue(20); ds5.property("ADBE Drop Shadow-0004").setValue(4);

// Text Layer
var textLayer = comp.layers.addText("Tus plantas limpian el aire y reducen el estrés.");
var td = textLayer.property("Source Text").value;
td.resetCharStyle();
td.fontSize = 68; 
td.fauxBold = true;
td.fillColor = [0.180, 0.800, 0.443];
td.justification = ParagraphJustification.CENTER_JUSTIFY;
textLayer.property("Source Text").setValue(td);
textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1344]);

// === ANIMATIONS ===

// Animations for sl1
var sl1Pos = sl1.property("ADBE Transform Group").property("ADBE Position");
sl1Pos.setValueAtTime(0.0, [540, 1400]);
sl1Pos.setValueAtTime(2.0, [540, 960]);

var sl1Opac = sl1.property("ADBE Transform Group").property("ADBE Opacity");
sl1Opac.setValueAtTime(0.0, 0);
sl1Opac.setValueAtTime(0.667, 100);

var sl1Scale = sl1.property("ADBE Transform Group").property("ADBE Scale");
sl1Scale.setValueAtTime(0.0, [0, 0]);
sl1Scale.setValueAtTime(0.5, [120, 120]);
sl1Scale.setValueAtTime(0.8, [100, 100]);

// Animations for sl2
var sl2Pos = sl2.property("ADBE Transform Group").property("ADBE Position");
sl2Pos.setValueAtTime(0.0, [540, 1400]);
sl2Pos.setValueAtTime(2.0, [540, 960]);

var sl2Opac = sl2.property("ADBE Transform Group").property("ADBE Opacity");
sl2Opac.setValueAtTime(0.0, 0);
sl2Opac.setValueAtTime(0.667, 100);

var sl2Scale = sl2.property("ADBE Transform Group").property("ADBE Scale");
sl2Scale.setValueAtTime(0.0, [0, 0]);
sl2Scale.setValueAtTime(0.5, [120, 120]);
sl2Scale.setValueAtTime(0.8, [100, 100]);

// Animations for sl3
var sl3Pos = sl3.property("ADBE Transform Group").property("ADBE Position");
sl3Pos.setValueAtTime(0.0, [540, 1400]);
sl3Pos.setValueAtTime(2.0, [540, 960]);

var sl3Opac = sl3.property("ADBE Transform Group").property("ADBE Opacity");
sl3Opac.setValueAtTime(0.0, 0);
sl3Opac.setValueAtTime(0.667, 100);

var sl3Scale = sl3.property("ADBE Transform Group").property("ADBE Scale");
sl3Scale.setValueAtTime(0.0, [0, 0]);
sl3Scale.setValueAtTime(0.5, [120, 120]);
sl3Scale.setValueAtTime(0.8, [100, 100]);

// Animations for sl4
var sl4Scale = sl4.property("ADBE Transform Group").property("ADBE Scale");
sl4Scale.setValueAtTime(1.0, [0, 0]);
sl4Scale.setValueAtTime(3.0, [500, 500]);

var sl4Opac = sl4.property("ADBE Transform Group").property("ADBE Opacity");
sl4Opac.setValueAtTime(1.0, 0);
sl4Opac.setValueAtTime(2.0, 30);
sl4Opac.setValueAtTime(3.0, 0);

// Animations for sl5
var sl5Pos = sl5.property("ADBE Transform Group").property("ADBE Position");
sl5Pos.setValueAtTime(0.0, [540, 1600]);
sl5Pos.setValueAtTime(2.0, [540, 600]);

var sl5Opac = sl5.property("ADBE Transform Group").property("ADBE Opacity");
sl5Opac.setValueAtTime(0.0, 0);
sl5Opac.setValueAtTime(1.0, 80);
sl5Opac.setValueAtTime(2.0, 0);

// Animations for textLayer
var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");
textPos.setValueAtTime(1.333, [540, 1374]);
textPos.setValueAtTime(2.0, [540, 1344]);

var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(1.333, 0);
textOpac.setValueAtTime(2.0, 100);

var textScale = textLayer.property("ADBE Transform Group").property("ADBE Scale");
textScale.setValueAtTime(1.333, [0, 0]);
textScale.setValueAtTime(1.433, [120, 120]);
textScale.setValueAtTime(1.633, [100, 100]);
app.endUndoGroup();

// Escena 2 - Generado por AnimaFlow
app.beginUndoGroup("AnimaFlow Scene 2");
var comp = app.project.items.addComp("Scene", 1080, 1920, 1, 3.58, 30);
comp.layers.addSolid([0.059, 0.090, 0.165], "Background", 1080, 1920, 1, 3.58);

// Element_1: Path
var sl1 = comp.layers.addShape(); sl1.name = "Line_Left";
var g1 = sl1.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg1 = g1.property("ADBE Vectors Group");
var ps1 = vg1.addProperty("ADBE Vector Shape - Group");
var s1 = new Shape(); s1.vertices = [[540.0, 960.0], [470.0, 1030.0], [400.0, 1100.0]]; s1.inTangents = [[0,0],[0,0],[0,0]]; s1.outTangents = [[0,0],[0,0],[0,0]]; s1.closed = false;
ps1.property("ADBE Vector Shape").setValue(s1);
var st1 = vg1.addProperty("ADBE Vector Graphic - Stroke"); st1.property("ADBE Vector Stroke Color").setValue([0.294, 0.863, 0.502]);
var trim1 = vg1.addProperty("ADBE Vector Filter - Trim"); trim1.property("ADBE Vector Trim Start").setValue(0); trim1.property("ADBE Vector Trim End").setValue(100);
sl1.property("ADBE Transform Group").property("ADBE Position").setValue([470, 1030]);
var ds1 = sl1.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds1.property("ADBE Drop Shadow-0002").setValue(75); ds1.property("ADBE Drop Shadow-0005").setValue(20); ds1.property("ADBE Drop Shadow-0004").setValue(4);

// Element_2: Path
var sl2 = comp.layers.addShape(); sl2.name = "Line_Right";
var g2 = sl2.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg2 = g2.property("ADBE Vectors Group");
var ps2 = vg2.addProperty("ADBE Vector Shape - Group");
var s2 = new Shape(); s2.vertices = [[540.0, 960.0], [610.0, 1030.0], [680.0, 1100.0]]; s2.inTangents = [[0,0],[0,0],[0,0]]; s2.outTangents = [[0,0],[0,0],[0,0]]; s2.closed = false;
ps2.property("ADBE Vector Shape").setValue(s2);
var st2 = vg2.addProperty("ADBE Vector Graphic - Stroke"); st2.property("ADBE Vector Stroke Color").setValue([0.294, 0.863, 0.502]);
var trim2 = vg2.addProperty("ADBE Vector Filter - Trim"); trim2.property("ADBE Vector Trim Start").setValue(0); trim2.property("ADBE Vector Trim End").setValue(100);
sl2.property("ADBE Transform Group").property("ADBE Position").setValue([610, 1030]);
var ds2 = sl2.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds2.property("ADBE Drop Shadow-0002").setValue(75); ds2.property("ADBE Drop Shadow-0005").setValue(20); ds2.property("ADBE Drop Shadow-0004").setValue(4);

// Element_3: Path
var sl3 = comp.layers.addShape(); sl3.name = "Line_Center";
var g3 = sl3.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg3 = g3.property("ADBE Vectors Group");
var ps3 = vg3.addProperty("ADBE Vector Shape - Group");
var s3 = new Shape(); s3.vertices = [[540.0, 960.0], [540.0, 1200.0]]; s3.inTangents = [[0,0],[0,0]]; s3.outTangents = [[0,0],[0,0]]; s3.closed = false;
ps3.property("ADBE Vector Shape").setValue(s3);
var st3 = vg3.addProperty("ADBE Vector Graphic - Stroke"); st3.property("ADBE Vector Stroke Color").setValue([0.294, 0.863, 0.502]);
var trim3 = vg3.addProperty("ADBE Vector Filter - Trim"); trim3.property("ADBE Vector Trim Start").setValue(0); trim3.property("ADBE Vector Trim End").setValue(100);
sl3.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1080]);
var ds3 = sl3.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds3.property("ADBE Drop Shadow-0002").setValue(75); ds3.property("ADBE Drop Shadow-0005").setValue(20); ds3.property("ADBE Drop Shadow-0004").setValue(4);

// Element_4: Path (Leaf)
var sl4 = comp.layers.addShape(); sl4.name = "Leaf_1";
var g4 = sl4.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg4 = g4.property("ADBE Vectors Group");
var ps4 = vg4.addProperty("ADBE Vector Shape - Group");
var s4 = new Shape(); s4.vertices = [[0.0, -40.0], [0.0, 20.0], [0.0, -40.0]]; s4.inTangents = [[0,0],[25,-10],[-20,30]]; s4.outTangents = [[20,30],[-25,-10],[0,0]]; s4.closed = true;
ps4.property("ADBE Vector Shape").setValue(s4);
var f4 = vg4.addProperty("ADBE Vector Graphic - Fill"); f4.property("ADBE Vector Fill Color").setValue([0.294, 0.863, 0.502]);
sl4.property("ADBE Transform Group").property("ADBE Position").setValue([540, 950]);
var ds4 = sl4.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds4.property("ADBE Drop Shadow-0002").setValue(75); ds4.property("ADBE Drop Shadow-0005").setValue(20); ds4.property("ADBE Drop Shadow-0004").setValue(4);

// Element_5: Path (Heart)
var sl5 = comp.layers.addShape(); sl5.name = "Heart_Main";
var g5 = sl5.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg5 = g5.property("ADBE Vectors Group");
var ps5 = vg5.addProperty("ADBE Vector Shape - Group");
var s5 = new Shape(); s5.vertices = [[0.0, 30.0], [-30.0, -70.0], [0.0, -60.0], [30.0, -70.0], [0.0, 30.0]]; s5.inTangents = [[0,0],[-50,20],[0,0],[-20,-10],[60,-30]]; s5.outTangents = [[-60,-30],[20,-10],[0,0],[50,20],[0,0]]; s5.closed = true;
ps5.property("ADBE Vector Shape").setValue(s5);
var f5 = vg5.addProperty("ADBE Vector Graphic - Fill"); f5.property("ADBE Vector Fill Color").setValue([1.0, 0.376, 0.565]);
sl5.property("ADBE Transform Group").property("ADBE Position").setValue([540, 930]);
var ramp5 = sl5.property("ADBE Effect Parade").addProperty("ADBE Ramp");
ramp5.property("ADBE Ramp-0002").setValue([1.0, 0.376, 0.565]); ramp5.property("ADBE Ramp-0004").setValue([0.914, 0.118, 0.388]); ramp5.property("ADBE Ramp-0005").setValue(2);
var ds5 = sl5.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds5.property("ADBE Drop Shadow-0002").setValue(75); ds5.property("ADBE Drop Shadow-0005").setValue(20); ds5.property("ADBE Drop Shadow-0004").setValue(4);

// Element_6: Circle
var sl6 = comp.layers.addShape(); sl6.name = "Circle_1";
var g6 = sl6.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg6 = g6.property("ADBE Vectors Group");
var ps6 = vg6.addProperty("ADBE Vector Shape - Ellipse");
ps6.property("ADBE Vector Ellipse Size").setValue([50, 50]);
var f6 = vg6.addProperty("ADBE Vector Graphic - Fill"); f6.property("ADBE Vector Fill Color").setValue([0.294, 0.863, 0.502]);
sl6.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);
var ds6 = sl6.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds6.property("ADBE Drop Shadow-0002").setValue(75); ds6.property("ADBE Drop Shadow-0005").setValue(20); ds6.property("ADBE Drop Shadow-0004").setValue(4);

// Element_7: Rect
var sl7 = comp.layers.addShape(); sl7.name = "Rect_1";
var g7 = sl7.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg7 = g7.property("ADBE Vectors Group");
var ps7 = vg7.addProperty("ADBE Vector Shape - Rect");
ps7.property("ADBE Vector Rect Size").setValue([80, 60]);
var f7 = vg7.addProperty("ADBE Vector Graphic - Fill"); f7.property("ADBE Vector Fill Color").setValue([0.294, 0.863, 0.502]);
sl7.property("ADBE Transform Group").property("ADBE Position").setValue([540, 990]);
var ds7 = sl7.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds7.property("ADBE Drop Shadow-0002").setValue(75); ds7.property("ADBE Drop Shadow-0005").setValue(20); ds7.property("ADBE Drop Shadow-0004").setValue(4);

// Element_8: Line
var sl8 = comp.layers.addShape(); sl8.name = "Line_Detail";
var g8 = sl8.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg8 = g8.property("ADBE Vectors Group");
var ps8 = vg8.addProperty("ADBE Vector Shape - Group");
var s8 = new Shape(); s8.vertices = [[0.0, -45.0], [0.0, -65.0]]; s8.inTangents = [[0,0],[0,0]]; s8.outTangents = [[0,0],[0,0]]; s8.closed = false;
ps8.property("ADBE Vector Shape").setValue(s8);
var st8 = vg8.addProperty("ADBE Vector Graphic - Stroke"); st8.property("ADBE Vector Stroke Color").setValue([0.294, 0.863, 0.502]);
sl8.property("ADBE Transform Group").property("ADBE Position").setValue([540, 905]);
var ds8 = sl8.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds8.property("ADBE Drop Shadow-0002").setValue(75); ds8.property("ADBE Drop Shadow-0005").setValue(20); ds8.property("ADBE Drop Shadow-0004").setValue(4);

// Element_9: Ellipse
var sl9 = comp.layers.addShape(); sl9.name = "Ellipse_1";
var g9 = sl9.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg9 = g9.property("ADBE Vectors Group");
var ps9 = vg9.addProperty("ADBE Vector Shape - Ellipse");
ps9.property("ADBE Vector Ellipse Size").setValue([30, 60]);
var f9 = vg9.addProperty("ADBE Vector Graphic - Fill"); f9.property("ADBE Vector Fill Color").setValue([0.133, 0.773, 0.369]);
sl9.property("ADBE Transform Group").property("ADBE Position").setValue([540, 940]);
var ds9 = sl9.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds9.property("ADBE Drop Shadow-0002").setValue(75); ds9.property("ADBE Drop Shadow-0005").setValue(20); ds9.property("ADBE Drop Shadow-0004").setValue(4);

// Element_10: Ellipse
var sl10 = comp.layers.addShape(); sl10.name = "Ellipse_2";
var g10 = sl10.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg10 = g10.property("ADBE Vectors Group");
var ps10 = vg10.addProperty("ADBE Vector Shape - Ellipse");
ps10.property("ADBE Vector Ellipse Size").setValue([30, 60]);
var f10 = vg10.addProperty("ADBE Vector Graphic - Fill"); f10.property("ADBE Vector Fill Color").setValue([0.133, 0.773, 0.369]);
sl10.property("ADBE Transform Group").property("ADBE Position").setValue([541, 940]);
var ds10 = sl10.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
ds10.property("ADBE Drop Shadow-0002").setValue(75); ds10.property("ADBE Drop Shadow-0005").setValue(20); ds10.property("ADBE Drop Shadow-0004").setValue(4);

// Text Layer
var textLayer = comp.layers.addText("Cuidarlas es invertir en tu bienestar y tu entorno.");
var td = textLayer.property("Source Text").value;
td.resetCharStyle();
td.fontSize = 68; td.fauxBold = true;
td.fillColor = [1.000, 0.843, 0.000];
td.justification = ParagraphJustification.CENTER_JUSTIFY;
textLayer.property("Source Text").setValue(td);
textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([540, 1574]);

// === ANIMATIONS ===

// Animations for sl1 (Line_Left)
var sl1Pos = sl1.property("ADBE Transform Group").property("ADBE Position");
var sl1Opac = sl1.property("ADBE Transform Group").property("ADBE Opacity");
var sl1Trim = trim1.property("ADBE Vector Trim End");
sl1Opac.setValueAtTime(0.667, 0);
sl1Opac.setValueAtTime(1.333, 100);
sl1Opac.setValueAtTime(3.28, 100);
sl1Opac.setValueAtTime(3.58, 0);
sl1Trim.setValueAtTime(0.667, 0);
sl1Trim.setValueAtTime(2.0, 100);

// Animations for sl2 (Line_Right)
var sl2Pos = sl2.property("ADBE Transform Group").property("ADBE Position");
var sl2Opac = sl2.property("ADBE Transform Group").property("ADBE Opacity");
var sl2Trim = trim2.property("ADBE Vector Trim End");
sl2Opac.setValueAtTime(0.667, 0);
sl2Opac.setValueAtTime(1.333, 100);
sl2Opac.setValueAtTime(3.28, 100);
sl2Opac.setValueAtTime(3.58, 0);
sl2Trim.setValueAtTime(0.667, 0);
sl2Trim.setValueAtTime(2.0, 100);

// Animations for sl3 (Line_Center)
var sl3Pos = sl3.property("ADBE Transform Group").property("ADBE Position");
var sl3Opac = sl3.property("ADBE Transform Group").property("ADBE Opacity");
var sl3Trim = trim3.property("ADBE Vector Trim End");
sl3Opac.setValueAtTime(0.667, 0);
sl3Opac.setValueAtTime(1.333, 100);
sl3Opac.setValueAtTime(3.28, 100);
sl3Opac.setValueAtTime(3.58, 0);
sl3Trim.setValueAtTime(0.667, 0);
sl3Trim.setValueAtTime(2.0, 100);

// Animations for sl4 (Leaf_1)
var sl4Pos = sl4.property("ADBE Transform Group").property("ADBE Position");
var sl4Opac = sl4.property("ADBE Transform Group").property("ADBE Opacity");
sl4Pos.setValueAtTime(0, [540, 1400]);
sl4Pos.setValueAtTime(1.0, [540, 1200]);
sl4Opac.setValueAtTime(0, 0);
sl4Opac.setValueAtTime(0.5, 100);
sl4Opac.setValueAtTime(3.28, 100);
sl4Opac.setValueAtTime(3.58, 0);

// Animations for sl5 (Heart_Main)
var sl5Scale = sl5.property("ADBE Transform Group").property("ADBE Scale");
var sl5Opac = sl5.property("ADBE Transform Group").property("ADBE Opacity");
sl5Scale.setValueAtTime(0, [0, 0]);
sl5Scale.setValueAtTime(0.5, [110, 110]);
sl5Scale.setValueAtTime(1.0, [100, 100]);
sl5Scale.setValueAtTime(1.5, [105, 105]);
sl5Scale.setValueAtTime(2.0, [100, 100]);
sl5Scale.setValueAtTime(2.5, [105, 105]);
sl5Scale.setValueAtTime(3.0, [100, 100]);
sl5Opac.setValueAtTime(0, 0);
sl5Opac.setValueAtTime(0.5, 100);
sl5Opac.setValueAtTime(3.28, 100);
sl5Opac.setValueAtTime(3.58, 0);

// Animations for sl6 (Circle_1)
var sl6Pos = sl6.property("ADBE Transform Group").property("ADBE Position");
var sl6Opac = sl6.property("ADBE Transform Group").property("ADBE Opacity");
sl6Pos.setValueAtTime(0, [1380, 1200]);
sl6Pos.setValueAtTime(1.0, [680, 1100]);
sl6Opac.setValueAtTime(0, 0);
sl6Opac.setValueAtTime(0.5, 100);
sl6Opac.setValueAtTime(3.28, 100);
sl6Opac.setValueAtTime(3.58, 0);

// Animations for sl7 (Rect_1)
var sl7Pos = sl7.property("ADBE Transform Group").property("ADBE Position");
var sl7Opac = sl7.property("ADBE Transform Group").property("ADBE Opacity");
sl7Pos.setValueAtTime(0, [-300, 1200]);
sl7Pos.setValueAtTime(1.0, [400, 1100]);
sl7Opac.setValueAtTime(0, 0);
sl7Opac.setValueAtTime(0.5, 100);
sl7Opac.setValueAtTime(3.28, 100);
sl7Opac.setValueAtTime(3.58, 0);

// Animations for sl8 (Ellipse_1)
var sl8Pos = sl8.property("ADBE Transform Group").property("ADBE Position");
var sl8Opac = sl8.property("ADBE Transform Group").property("ADBE Opacity");
sl8Pos.setValueAtTime(0, [-300, 1200]);
sl8Pos.setValueAtTime(1.0, [400, 1100]);
sl8Opac.setValueAtTime(0, 0);
sl8Opac.setValueAtTime(0.5, 100);
sl8Opac.setValueAtTime(3.28, 100);
sl8Opac.setValueAtTime(3.58, 0);

// Animations for sl9 (Ellipse_2)
var sl9Pos = sl9.property("ADBE Transform Group").property("ADBE Position");
var sl9Opac = sl9.property("ADBE Transform Group").property("ADBE Opacity");
sl9Pos.setValueAtTime(0, [-300, 1200]);
sl9Pos.setValueAtTime(1.0, [400, 1100]);
sl9Opac.setValueAtTime(0, 0);
sl9Opac.setValueAtTime(0.5, 100);
sl9Opac.setValueAtTime(3.28, 100);
sl9Opac.setValueAtTime(3.58, 0);

// Animations for sl10 (SunRay)
var sl10Pos = sl10.property("ADBE Transform Group").property("ADBE Position");
var sl10Opac = sl10.property("ADBE Transform Group").property("ADBE Opacity");
sl10Pos.setValueAtTime(0, [1380, 1200]);
sl10Pos.setValueAtTime(1.0, [680, 1100]);
sl10Opac.setValueAtTime(0, 0);
sl10Opac.setValueAtTime(0.5, 100);
sl10Opac.setValueAtTime(3.28, 100);
sl10Opac.setValueAtTime(3.58, 0);

// Animations for textLayer
var textScale = textLayer.property("ADBE Transform Group").property("ADBE Scale");
var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textScale.setValueAtTime(1.333, [70, 70]);
textScale.setValueAtTime(2.333, [100, 100]);
textOpac.setValueAtTime(1.333, 0);
textOpac.setValueAtTime(2.0, 100);
textOpac.setValueAtTime(3.38, 100);
textOpac.setValueAtTime(3.58, 0);
app.endUndoGroup();

// ============================================
// FIN DEL SCRIPT
// ============================================

} catch (e) {
    alert("AnimaFlow Script Error: " + e.message + "\nLine: " + $.line);
}
