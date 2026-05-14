// ============================================
// ANIMAFLOW - After Effects Export Script
// Generado automáticamente
// Aspect Ratio: 9:16 (1080x1920)
// ============================================

// Verificar que hay un proyecto abierto
if (app.project == null) {
    app.newProject();
}

// Escena 1 - Generado por AnimaFlow
function generateRandomNumber() {
    return Math.random();
}

var comp = app.project.items.addComp("Scene", 1080, 1920, 1, 3.3, 30);

// 1. FONDO
var bgLayer = comp.layers.addSolid([0.059, 0.090, 0.165], "Fondo", 1080, 1920, 1);

// 2. AURA PULSING
var auraLayer = comp.layers.addShape();
auraLayer.name = "Aura";
var auraGroup = auraLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var auraEllipse = auraGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
auraEllipse.property("ADBE Vector Ellipse Size").setValue([400, 400]);
var auraFill = auraGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
auraFill.property("ADBE Vector Fill Color").setValue([0.133, 0.773, 0.361]);
auraFill.property("ADBE Vector Fill Opacity").setValue(60);

var auraPos = auraLayer.property("ADBE Transform Group").property("ADBE Position");
auraPos.setValue([540, 960]);
var auraScale = auraLayer.property("ADBE Transform Group").property("ADBE Scale");
var auraOpac = auraLayer.property("ADBE Transform Group").property("ADBE Opacity");

// Aura Animation (Pulse)
auraOpac.setValueAtTime(0, 20);
auraOpac.setValueAtTime(1, 80);
auraOpac.setValueAtTime(2, 20);
auraOpac.setValueAtTime(3, 80);

auraScale.setValueAtTime(0, [100, 100]);
auraScale.setValueAtTime(1, [120, 120]);
auraScale.setValueAtTime(2, [100, 100]);
auraScale.setValueAtTime(3, [120, 120]);

// 3. PARTICLES
for (var i = 0; i < 12; i++) {
    var pLayer = comp.layers.addShape();
    pLayer.name = "Particle_" + i;
    var pGroup = pLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var pEllipse = pGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
    pEllipse.property("ADBE Vector Ellipse Size").setValue([20, 20]);
    var pFill = pGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    pFill.property("ADBE Vector Fill Color").setValue([0.294, 0.871, 0.502]);

    var pPos = pLayer.property("ADBE Transform Group").property("ADBE Position");
    var pOpac = pLayer.property("ADBE Transform Group").property("ADBE Opacity");

    var startT = (20 + (i * 4)) / 30;
    var endT = startT + (60 / 30);
    var midT = startT + (20 / 30);
    var fadeOutT = endT - (20 / 30);

    var xOffset = (i % 2 === 0 ? 40 : -40);

    pPos.setValueAtTime(startT, [540, 960]);
    pPos.setValueAtTime(endT, [540 + xOffset, 400]);

    pOpac.setValueAtTime(startT, 0);
    pOpac.setValueAtTime(midT, 100);
    pOpac.setValueAtTime(fadeOutT, 100);
    pOpac.setValueAtTime(endT, 0);
}

// 4. THE LEAF
var leafLayer = comp.layers.addShape();
leafLayer.name = "Leaf";
leafLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([540, 960]);
leafLayer.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);

var leafGroup = leafLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var leafPathProp = leafGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
var leafShape = new Shape();
leafShape.vertices = [[540, 820], [540, 1180]];
leafShape.outTangents = [[120, 60], [-120, -130]];
leafShape.inTangents = [[-120, 60], [120, -130]];
leafShape.closed = true;
leafPathProp.property("ADBE Vector Shape").setValue(leafShape);

var leafFill = leafGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
leafFill.property("ADBE Vector Fill Color").setValue([0.294, 0.871, 0.502]);

var leafStroke = leafGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
leafStroke.property("ADBE Vector Stroke Color").setValue([0.294, 0.871, 0.502]);
leafStroke.property("ADBE Vector Stroke Width").setValue(4);

// Leaf Vein
var veinGroup = leafLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var veinPathProp = veinGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
var veinShape = new Shape();
veinShape.vertices = [[540, 820], [540, 1180]];
veinShape.closed = false;
veinPathProp.property("ADBE Vector Shape").setValue(veinShape);
var veinStroke = veinGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
veinStroke.property("ADBE Vector Stroke Color").setValue([0.294, 0.871, 0.502]);
veinStroke.property("ADBE Vector Stroke Width").setValue(6);

// Leaf Animations
var leafScale = leafLayer.property("ADBE Transform Group").property("ADBE Scale");
var leafRot = leafLayer.property("ADBE Transform Group").property("ADBE Rotation");

leafScale.setValueAtTime(0, [0, 0]);
leafScale.setValueAtTime(1, [100, 100]);

leafRot.setValueAtTime(1, -2);
leafRot.setValueAtTime(2, 2);
leafRot.setValueAtTime(3, -2);

// Glow Effect
var leafEffects = leafLayer.property("ADBE Effect Parade");
var leafGlow = leafEffects.addProperty("ADBE Glo2");
leafGlow.property(3).setValue(50);
leafGlow.property(4).setValue(1);

// 5. TEXT
var textLayer = comp.layers.addText("Tus plantas limpian el aire y reducen el estrés.");
textLayer.name = "Text Reveal";
textLayer.property("ADBE Text Properties").property("ADBE Text Fill Color").setValue([0.294, 0.871, 0.502]);
var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");
textPos.setValue([540, 1500]);

var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(20/30, 0);
textOpac.setValueAtTime(50/30, 100);

// Escena 2 - Generado por AnimaFlow
function generateRandomNumber() {
    return Math.random();
}

var proj = app.project;
var comp = proj.items.addComp("Scene", 1080, 1920, 1, 3.575, 30);

// 1. FONDO
var bgLayer = comp.layers.addSolid([0.059, 0.090, 0.165], "Fondo", 1080, 1920, 1);

// --- CONSTANTS ---
var centerX = 540;
var heartY = 960;
var potY = 1200;
var mainColor = [0.525, 0.937, 0.675];
var duration = 3.575;

// 2. CONNECTION LINE
var lineLayer = comp.layers.addShape();
lineLayer.name = "ConnectionLine";
var lineGroup = lineLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var linePathProp = lineGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
var lineShape = new Shape();
lineShape.vertices = [[centerX, heartY], [centerX, potY]];
lineShape.outTangents = [[50, 120], [0, 0]];
lineShape.inTangents = [[0, 0], [50, -120]];
lineShape.closed = false;
linePathProp.property("ADBE Vector Shape").setValue(lineShape);

var lineStroke = lineGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
lineStroke.property("ADBE Vector Stroke Color").setValue(mainColor);
lineStroke.property("ADBE Vector Stroke Width").setValue(4);

var lineOpac = lineLayer.property("ADBE Transform Group").property("ADBE Opacity");
lineOpac.setValueAtTime(0, 0);
lineOpac.setValueAtTime(1, 50);
lineOpac.setValueAtTime(duration - 0.3, 50);
lineOpac.setValueAtTime(duration, 0);

var lineEffects = lineLayer.property("ADBE Effect Parade");
var lineGlow = lineEffects.addProperty("ADBE Glo2");
lineGlow.property(3).setValue(50);

// 3. RIPPLE EFFECT
var rippleLayer = comp.layers.addShape();
rippleLayer.name = "Ripple";
var rippleGroup = rippleLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var rippleEllipse = rippleGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
rippleEllipse.property("ADBE Vector Ellipse Size").setValue([150, 150]);

var rippleStroke = rippleGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
rippleStroke.property("ADBE Vector Stroke Color").setValue(mainColor);
rippleStroke.property("ADBE Vector Stroke Width").setValue(8);
var rippleFill = rippleGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
rippleFill.property("ADBE Vector Fill Color").setValue([0,0,0]);
rippleFill.property("ADBE Vector Fill Opacity").setValue(0);

var ripplePos = rippleLayer.property("ADBE Transform Group").property("ADBE Position");
ripplePos.setValue([centerX, heartY]);

var rippleScale = rippleLayer.property("ADBE Transform Group").property("ADBE Scale");
rippleScale.setValueAtTime(1, [0, 0]);
rippleScale.setValueAtTime(2.6, [100, 100]);

var rippleOpac = rippleLayer.property("ADBE Transform Group").property("ADBE Opacity");
rippleOpac.setValueAtTime(1, 0);
rippleOpac.setValueAtTime(2, 60);
rippleOpac.setValueAtTime(2.6, 0);

// 4. HEART SHAPE
var heartLayer = comp.layers.addShape();
heartLayer.name = "Heart";
var heartGroup = heartLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var heartPathProp = heartGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
var heartShape = new Shape();
heartShape.vertices = [[centerX, heartY + 30], [centerX - 110, heartY + 70], [centerX, heartY + 150], [centerX + 110, heartY + 70], [centerX, heartY + 30]];
heartShape.outTangents = [[-50, -50], [-20, 20], [0, 0], [50, -50], [0, 0]];
heartShape.inTangents = [[0, 0], [-20, -20], [0, 0], [20, 20], [50, -50]];
heartShape.closed = true;
heartPathProp.property("ADBE Vector Shape").setValue(heartShape);

var heartFill = heartGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
heartFill.property("ADBE Vector Fill Color").setValue(mainColor);

var heartPos = heartLayer.property("ADBE Transform Group").property("ADBE Position");
heartPos.setValue([0, 0]); // Relative to path

var heartScale = heartLayer.property("ADBE Transform Group").property("ADBE Scale");
heartScale.setValueAtTime(0, [80, 80]);
heartScale.setValueAtTime(0.5, [100, 100]);
heartScale.setValueAtTime(1, [80, 80]);
heartScale.setValueAtTime(1.5, [100, 100]);
heartScale.setValueAtTime(2, [80, 80]);
heartScale.setValueAtTime(2.5, [100, 100]);
heartScale.setValueAtTime(3, [80, 80]);

var heartOpac = heartLayer.property("ADBE Transform Group").property("ADBE Opacity");
heartOpac.setValueAtTime(0, 0);
heartOpac.setValueAtTime(1, 100);
heartOpac.setValueAtTime(duration - 0.3, 100);
heartOpac.setValueAtTime(duration, 0);

var heartEffects = heartLayer.property("ADBE Effect Parade");
var heartGlow = heartEffects.addProperty("ADBE Glo2");
heartGlow.property(3).setValue(40);

// 5. PARTICLES
for (var i = 0; i < 12; i++) {
    var pLayer = comp.layers.addShape();
    pLayer.name = "Particle_" + i;
    var pGroup = pLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var pEllipse = pGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
    pEllipse.property("ADBE Vector Ellipse Size").setValue([10, 10]);
    var pFill = pGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    pFill.property("ADBE Vector Fill Color").setValue(mainColor);

    var angleStart = (i / 12) * Math.PI * 2;
    var orbitRadiusX = 220;
    var orbitRadiusY = 110;
    var centerY = (heartY + potY) / 2;

    var pPos = pLayer.property("ADBE Transform Group").property("ADBE Position");
    pPos.setValueAtTime(0, [centerX + Math.cos(angleStart) * orbitRadiusX, centerY + Math.sin(angleStart) * orbitRadiusY]);
    pPos.setValueAtTime(duration, [centerX + Math.cos(angleStart + 1) * orbitRadiusX, centerY + Math.sin(angleStart + 1) * orbitRadiusY]);

    var pOpac = pLayer.property("ADBE Transform Group").property("ADBE Opacity");
    var startT = i * 0.1;
    pOpac.setValueAtTime(startT, 0);
    pOpac.setValueAtTime(startT + 0.3, 100);
    pOpac.setValueAtTime(startT + 0.6, 0);
    pOpac.setValueAtTime(duration - 0.3, 0);
    pOpac.setValueAtTime(duration, 0);
}

// 6. TEXT
var textLayer = comp.layers.addText("Cuidarlas es invertir en tu bienestar y tu entorno.");
textLayer.name = "MainText";
var textProp = textLayer.property("ADBE Text Properties");
textProp.property("ADBE Text Fill Color").setValue(mainColor);

var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");
textPos.setValue([centerX, 1400]);

var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(0, 0);
textOpac.setValueAtTime(1.5, 100);
textOpac.setValueAtTime(duration - 0.3, 100);
textOpac.setValueAtTime(duration, 0);

// Final Global Exit
var layers = comp.layers;
for (var j = 1; j < layers.length; j++) {
    var l = layers[j];
    var op = l.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(duration - 0.3, op.valueAtTime(duration - 0.3));
    op.setValueAtTime(duration, 0);
}

// ============================================
// FIN DEL SCRIPT
// ============================================
app.beginUndoGroup("AnimaFlow Import Complete");
app.endUndoGroup();
