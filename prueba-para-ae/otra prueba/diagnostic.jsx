// ============================================
// ANIMAFLOW - DIAGNOSTIC SCRIPT
// Run this in AE to discover correct property indices
// ============================================

try {
    if (app.project == null) app.newProject();
    
    app.beginUndoGroup("AnimaFlow Diagnostic");
    var comp = app.project.items.addComp("Diagnostic", 1080, 1920, 1, 5, 30);
    
    // Create a shape layer to test effects
    var sl = comp.layers.addShape();
    sl.name = "TestLayer";
    var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vg = g.property("ADBE Vectors Group");
    var ps = vg.addProperty("ADBE Vector Shape - Rect");
    ps.property("ADBE Vector Rect Size").setValue([200, 200]);
    var f = vg.addProperty("ADBE Vector Graphic - Fill");
    f.property("ADBE Vector Fill Color").setValue([0.5, 0.5, 0.5]);
    
    // Add Gradient Ramp
    var ramp = sl.property("ADBE Effect Parade").addProperty("ADBE Ramp");
    
    var rampInfo = "=== GRADIENT RAMP (ADBE Ramp) ===\n";
    rampInfo += "numProperties: " + ramp.numProperties + "\n\n";
    for (var i = 1; i <= ramp.numProperties; i++) {
        var p = ramp.property(i);
        rampInfo += "property(" + i + ")\n";
        rampInfo += "  name: " + p.name + "\n";
        rampInfo += "  matchName: " + p.matchName + "\n";
        rampInfo += "  propertyValueType: " + p.propertyValueType + "\n";
        rampInfo += "\n";
    }
    
    // Add Drop Shadow
    var ds = sl.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
    
    var dsInfo = "=== DROP SHADOW (ADBE Drop Shadow) ===\n";
    dsInfo += "numProperties: " + ds.numProperties + "\n\n";
    for (var i = 1; i <= ds.numProperties; i++) {
        var p = ds.property(i);
        dsInfo += "property(" + i + ")\n";
        dsInfo += "  name: " + p.name + "\n";
        dsInfo += "  matchName: " + p.matchName + "\n";
        dsInfo += "  propertyValueType: " + p.propertyValueType + "\n";
        dsInfo += "\n";
    }
    
    // Add Glow
    var glow = sl.property("ADBE Effect Parade").addProperty("ADBE Glo2");
    
    var glowInfo = "=== GLOW (ADBE Glo2) ===\n";
    glowInfo += "numProperties: " + glow.numProperties + "\n\n";
    for (var i = 1; i <= glow.numProperties; i++) {
        var p = glow.property(i);
        glowInfo += "property(" + i + ")\n";
        glowInfo += "  name: " + p.name + "\n";
        glowInfo += "  matchName: " + p.matchName + "\n";
        glowInfo += "  propertyValueType: " + p.propertyValueType + "\n";
        glowInfo += "\n";
    }
    
    app.endUndoGroup();
    
    // Show all results
    alert(rampInfo);
    alert(dsInfo);
    alert(glowInfo);

} catch (e) {
    alert("Error: " + e.message + "\nLine: " + e.line);
}
