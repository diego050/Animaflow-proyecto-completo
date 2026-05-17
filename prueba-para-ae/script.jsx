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
app.beginUndoGroup("AnimaFlow Scene 1");
var comp = app.project.items.addComp("Scene", 1080, 1920, 1, 3.3, 30);

// --- HELPER FUNCTIONS ---
function hex_to_rgb_array(hex) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;
    return [r, g, b];
}

function randomRange(min, max) {
    return min + (Math.random() * (max - min));
}

// 1. FONDO
comp.layers.addSolid([0.059, 0.090, 0.165], "Fondo", 1080, 1920, 1);

// --- GEOMETRY DATA ---
var geometry = [
    {
        "type": "path",
        "name": "Leaf_Shadow",
        "vertices": [[0.0, 0.0], [240.0, 0.0], [0.0, 0.0]],
        "inTangents": [[0.0, 0.0], [-60.0, -120.0], [60.0, 120.0]],
        "outTangents": [[60.0, -120.0], [-60.0, 120.0], [0.0, 0.0]],
        "closed": false,
        "fill": "#000000"
    },
    {
        "type": "path",
        "name": "Leaf_Main",
        "vertices": [[0.0, 0.0], [240.0, 0.0], [0.0, 0.0]],
        "inTangents": [[0.0, 0.0], [-60.0, -120.0], [60.0, 120.0]],
        "outTangents": [[60.0, -120.0], [-60.0, 120.0], [0.0, 0.0]],
        "closed": false,
        "fill": "#2ecc71" // Using primary color for gradient approximation
    },
    {
        "type": "path",
        "name": "Leaf_Vein",
        "vertices": [[-120.0, 0.0], [120.0, 0.0]],
        "inTangents": [[0.0, 0.0], [0.0, 0.0]],
        "outTangents": [[0.0, 0.0], [0.0, 0.0]],
        "closed": false,
        "stroke": "#1e8449",
        "strokeWidth": 1.0
    },
    {
        "type": "circle",
        "name": "Ripple",
        "cx": 540.0,
        "cy": 960.0,
        "r": 0.0,
        "stroke": "#a2dff7",
        "strokeWidth": 1.0
    },
    {
        "type": "circle",
        "name": "Particle_Base",
        "cx": 0.0,
        "cy": 0.0,
        "r": 3.0,
        "fill": "#a2dff7"
    }
];

// --- CREATE ELEMENTS ---

// Leaf Grouping logic: First 3 elements are the leaf
var leafLayers = [];

for (var i = 0; i < geometry.length; i++) {
    var item = geometry[i];
    var sl = comp.layers.addShape();
    sl.name = item.name;
    
    var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vg = g.property("ADBE Vectors Group");
    
    if (item.type === "path") {
        var ps = vg.addProperty("ADBE Vector Shape - Group");
        var s = new Shape();
        s.vertices = item.vertices;
        s.inTangents = item.inTangents;
        s.outTangents = item.outTangents;
        s.closed = item.closed !== undefined ? item.closed : false;
        ps.property("ADBE Vector Shape").setValue(s);
        
        if (item.fill) {
            var f = vg.addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue(hex_to_rgb_array(item.fill));
        }
        if (item.stroke) {
            var st = vg.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(hex_to_rgb_array(item.stroke));
            st.property("ADBE Vector Stroke Width").setValue(item.strokeWidth);
        }
    } else if (item.type === "circle") {
        var e = vg.addProperty("ADBE Vector Shape - Ellipse");
        e.property("ADBE Vector Ellipse Size").setValue([item.r * 2, item.r * 2]);
        
        if (item.fill) {
            var f = vg.addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue(hex_to_rgb_array(item.fill));
        }
        if (item.stroke) {
            var st = vg.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(hex_to_rgb_array(item.stroke));
            st.property("ADBE Vector Stroke Width").setValue(item.strokeWidth);
        }
    }
    
    // Initial Position
    if (item.name.indexOf("Leaf") !== -1) {
        sl.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);
        leafLayers.push(sl);
    } else if (item.name === "Ripple") {
        sl.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);
    }
}

// --- ANIMATIONS ---

// 1. Leaf Animations
for (var j = 0; j < leafLayers.length; j++) {
    var layer = leafLayers[j];
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    var opac = layer.property("ADBE Transform Group").property("ADBE Opacity");
    var scale = layer.property("ADBE Transform Group").property("ADBE Scale");
    
    // Position Y: 1400 -> 960
    pos.setValueAtTime(0, [540, 1400]);
    pos.setValueAtTime(2, [540, 960]);
    
    // Opacity: 0 -> 100
    opac.setValueAtTime(0, 0);
    opac.setValueAtTime(0.667, 100);
    
    // Spring Scale: 0 -> 120 -> 100
    scale.setValueAtTime(0, [0, 0]);
    scale.setValueAtTime(0.1, [120, 120]);
    scale.setValueAtTime(0.3, [100, 100]);
}

// 2. Ripple Animation
var ripple = comp.layer("Ripple");
var rScale = ripple.property("ADBE Transform Group").property("ADBE Scale");
var rOpac = ripple.property("ADBE Transform Group").property("ADBE Opacity");

rScale.setValueAtTime(1, [0, 0]);
rScale.setValueAtTime(3, [1400, 1400]);

rOpac.setValueAtTime(1, 0);
rOpac.setValueAtTime(2, 30);
rOpac.setValueAtTime(3, 0);

// 3. Particles Animation (20 particles)
var particleBase = comp.layer("Particle_Base");
particleBase.enabled = false; // Use as template

for (var p = 0; p < 20; p++) {
    var part = comp.layers.addShape();
    part.name = "Particle_" + p;
    
    // Copy geometry from base
    var g = part.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vg = g.property("ADBE Vectors Group");
    var e = vg.addProperty("ADBE Vector Shape - Ellipse");
    e.property("ADBE Vector Ellipse Size").setValue([6, 6]);
    vg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(hex_to_rgb_array("#a2dff7"));
    
    var delay = p * 0.1;
    var xOff = randomRange(-100, 100);
    var pPos = part.property("ADBE Transform Group").property("ADBE Position");
    var pOpac = part.property("ADBE Transform Group").property("ADBE Opacity");
    
    pPos.setValueAtTime(delay, [540 + xOff, 1600]);
    pPos.setValueAtTime(delay + 2, [540 + xOff, 600]);
    
    pOpac.setValueAtTime(delay, 0);
    pOpac.setValueAtTime(delay + 0.66, 80);
    pOpac.setValueAtTime(delay + 1.66, 0);
}

// 4. Premium Text Animation
var txt = comp.layers.addText("Tus plantas limpian el aire\ny reducen el estrés.");
var td = txt.property("Source Text").value;
td.fontSize = 64;
td.fauxBold = true;
td.fillColor = hex_to_rgb_array("#2ecc71");
td.justification = ParagraphJustification.CENTER_JUSTIFY;
txt.property("Source Text").setValue(td);

var tPos = txt.property("ADBE Transform Group").property("ADBE Position");
var tOpac = txt.property("ADBE Transform Group").property("ADBE Opacity");
var tScale = txt.property("ADBE Transform Group").property("ADBE Scale");

tPos.setValue([540, 1500]);
tPos.setValueAtTime(1.333, [540, 1530]);
tPos.setValueAtTime(2, [540, 1500]);

tOpac.setValueAtTime(1.333, 0);
tOpac.setValueAtTime(2, 100);

tScale.setValueAtTime(1.333, [0, 0]);
tScale.setValueAtTime(1.433, [120, 120]);
tScale.setValueAtTime(1.633, [100, 100]);
app.endUndoGroup();

// Escena 2 - Generado por AnimaFlow
var comp = app.project.items.addComp("AnimaFlow_Scene_2", 1080, 1920, 1, 3.58, 30);

// ====================================
// FONDO
// ====================================
var bgLayer = comp.layers.addSolid([0.059, 0.090, 0.165], "Fondo", 1080, 1920, 1);
bgLayer.inPoint = 0;
bgLayer.outPoint = comp.duration;

// ====================================
// ELEMENTOS SVG
// ====================================

// ====================================
// TEXTO
// ====================================
var textLayer = comp.layers.addText("Cuidarlas es invertir en tu bienestar y tu entorno.");
textLayer.name = "Texto_Principal";
textLayer.inPoint = 0;
textLayer.outPoint = 3.58;

// Color del texto (via TextDocument)
var textDoc = textLayer.property("Source Text").value;
textDoc.fillColor = [1.000, 0.843, 0.000];
textDoc.applyFill = true;
textLayer.property("Source Text").setValue(textDoc);

// Posición: centrado en X, Y según análisis de colisión con animación
var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");
textPos.setValue([540, 1536]);

// Animación de texto: fade-in entrada, fade-out salida
var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(0, 0);
textOpac.setValueAtTime(0.8, 100);
textOpac.setValueAtTime(3.2800000000000002, 100);
textOpac.setValueAtTime(3.58, 0);

// ====================================
// FIN ESCENA
// ====================================
// ============================================
// FIN DEL SCRIPT
// ============================================
