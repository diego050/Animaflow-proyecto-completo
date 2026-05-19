# After Effects ExtendScript API verification:
# comp.layers.addShape() - EXISTS in AE CC 2015+
# Returns a new shape layer
# Alternative: app.project.items.addShapeLayer() for older versions
# 
# The correct pattern is:
# var shapeLayer = comp.layers.addShape();
# shapeLayer.name = "MyShape";
# var shapeGroup = shapeLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vectors Group");
# var ellipse = shapeGroup.addProperty("ADBE Vector Shape - Ellipse");
# ellipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
