/**
 * Layout Solver for AnimaFlow.
 *
 * Calculates absolute x, y, width, height coordinates for every layer
 * in a spec.json, supporting flex layouts, absolute positioning, and
 * default center-based coordinate conversion.
 *
 * This module is pure: no side effects, no DB calls, no external I/O.
 * Ported from backend/app/services/layout_solver.py
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SolvedLayer {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: SolvedLayer[];
  [key: string]: unknown;
}

export interface SpecInput {
  layers: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface SpecOutput {
  layers: SolvedLayer[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

const DEFAULT_GAP = 0;
const DEFAULT_DIRECTION: "row" | "column" = "column";
const DEFAULT_JUSTIFY = "flex-start";
const DEFAULT_ALIGN = "flex-start";
const DEFAULT_LAYER_HEIGHT = 100;
const DEFAULT_LAYER_WIDTH = 200;

/**
 * Resolve padding and margin from a layer's style.
 * Returns [paddingTop, paddingRight, paddingBottom, paddingLeft, marginTop, marginRight, marginBottom, marginLeft]
 */
function resolveSpacing(layer: Record<string, unknown>): [number, number, number, number, number, number, number, number] {
  const style = (layer.style as Record<string, unknown> | undefined) || {};

  function expandSpacing(value: unknown, defaultValue = 0): [number, number, number, number] {
    if (value === undefined || value === null) {
      return [defaultValue, defaultValue, defaultValue, defaultValue];
    }
    if (typeof value === 'number') {
      return [value, value, value, value];
    }
    if (Array.isArray(value)) {
      if (value.length === 1) return [value[0], value[0], value[0], value[0]];
      if (value.length === 2) return [value[0], value[1], value[0], value[1]];
      if (value.length === 4) return [value[0], value[1], value[2], value[3]];
    }
    return [defaultValue, defaultValue, defaultValue, defaultValue];
  }

  const padding = expandSpacing(style.padding);
  const margin = expandSpacing(style.margin);

  return [padding[0], padding[1], padding[2], padding[3], margin[0], margin[1], margin[2], margin[3]];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recursively solve layout positions for all layers in a spec.
 *
 * @param spec - The spec.json object with layers.
 * @param canvasWidth - Canvas width in pixels.
 * @param canvasHeight - Canvas height in pixels.
 * @returns A new spec object with absolute x, y, width, height added to
 *          each layer. The original spec is not mutated.
 */
export function solveLayout(
  spec: SpecInput,
  canvasWidth: number,
  canvasHeight: number
): SpecOutput {
  const result = structuredClone(spec) as SpecOutput;
  const layers = result.layers ?? [];
  solveLayers(
    layers,
    0,
    0,
    canvasWidth,
    canvasHeight,
    canvasWidth,
    canvasHeight
  );
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve coordinates for a flat list of sibling layers.
 */
function solveLayers(
  layers: Record<string, unknown>[],
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  for (const layer of layers) {
    resolveLayer(
      layer,
      parentX,
      parentY,
      parentWidth,
      parentHeight,
      canvasWidth,
      canvasHeight
    );
  }
}

/**
 * Resolve a single layer's absolute coordinates and recurse into children.
 */
function resolveLayer(
  layer: Record<string, unknown>,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const position = (layer.position ?? "") as string;
  const layout = (layer.layout ?? "") as string;

  // --- Absolute positioning (relative to parent) --------------------------
  if (position === "absolute") {
    applyAbsolute(layer, parentX, parentY, parentWidth, parentHeight);
    recurseChildren(layer, canvasWidth, canvasHeight);
    return;
  }

  // --- Flex layout --------------------------------------------------------
  if (layout === "flex") {
    applyFlex(
      layer,
      parentX,
      parentY,
      parentWidth,
      parentHeight,
      canvasWidth,
      canvasHeight
    );
    recurseChildren(layer, canvasWidth, canvasHeight);
    return;
  }

  // --- Already positioned by a flex parent --------------------------------
  // Flex distribution sets x, y, width, height relative to the container
  // and marks the layer with _flex_positioned. If present, offset the
  // relative coordinates by the parent's absolute position and recurse
  // into grandchildren without re-applying positioning.
  if (layer._flex_positioned === true) {
    layer.x = parentX + (layer.x as number);
    layer.y = parentY + (layer.y as number);
    delete layer._flex_positioned;
    recurseChildren(layer, canvasWidth, canvasHeight);
    return;
  }

  // --- Default: center-based coordinates ----------------------------------
  applyDefault(layer, parentX, parentY, parentWidth, parentHeight);
  recurseChildren(layer, canvasWidth, canvasHeight);
}

/**
 * Recurse into a layer's children, using the layer as the new parent context.
 */
function recurseChildren(
  layer: Record<string, unknown>,
  canvasWidth: number,
  canvasHeight: number
): void {
  const children = layer.children as Record<string, unknown>[] | undefined;
  if (children && children.length > 0) {
    solveLayers(
      children,
      layer.x as number,
      layer.y as number,
      layer.width as number,
      layer.height as number,
      canvasWidth,
      canvasHeight
    );
  }
}

// ---------------------------------------------------------------------------
// Positioning strategies
// ---------------------------------------------------------------------------

/**
 * Calculate absolute coordinates from top/right/bottom/left offsets.
 */
function applyAbsolute(
  layer: Record<string, unknown>,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number
): void {
  const width = getDimension(layer, "width", DEFAULT_LAYER_WIDTH);
  const height = getDimension(layer, "height", DEFAULT_LAYER_HEIGHT);

  const left = layer.left as number | undefined;
  const right = layer.right as number | undefined;
  const top = layer.top as number | undefined;
  const bottom = layer.bottom as number | undefined;

  // Resolve X
  let x: number;
  if (left !== undefined) {
    x = parentX + Math.floor(left);
  } else if (right !== undefined) {
    x = parentX + parentWidth - Math.floor(right) - width;
  } else {
    x = parentX; // fallback
  }

  // Resolve Y
  let y: number;
  if (top !== undefined) {
    y = parentY + Math.floor(top);
  } else if (bottom !== undefined) {
    y = parentY + parentHeight - Math.floor(bottom) - height;
  } else {
    y = parentY; // fallback
  }

  layer.x = x;
  layer.y = y;
  layer.width = width;
  layer.height = height;
}

/**
 * Convert center-based coordinates to absolute top-left.
 *
 * spec.json stores x/y as offsets from the parent center:
 *   abs_x = center_x + x
 *   abs_y = center_y + y
 * We then convert to top-left corner by subtracting half the dimension.
 */
function applyDefault(
  layer: Record<string, unknown>,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number
): void {
  const centerX = parentX + parentWidth / 2;
  const centerY = parentY + parentHeight / 2;

  const offsetX = (layer.x as number) ?? 0;
  const offsetY = (layer.y as number) ?? 0;
  const width = getDimension(layer, "width", DEFAULT_LAYER_WIDTH);
  const height = getDimension(layer, "height", DEFAULT_LAYER_HEIGHT);

  layer.x = Math.floor(centerX + offsetX - width / 2);
  layer.y = Math.floor(centerY + offsetY - height / 2);
  layer.width = width;
  layer.height = height;
}

/**
 * Resolve flex container dimensions and distribute children along
 * the main and cross axes.
 */
function applyFlex(
  layer: Record<string, unknown>,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const [paddingTop, paddingRight, paddingBottom, paddingLeft, , , ,] = resolveSpacing(layer);
  const paddingX = paddingLeft + paddingRight;
  const paddingY = paddingTop + paddingBottom;

  // Container fills available space by default
  const width = getDimension(layer, "width", parentWidth);
  const height = getDimension(layer, "height", parentHeight);

  layer.x = parentX;
  layer.y = parentY;
  layer.width = width;
  layer.height = height;

  const children = layer.children as Record<string, unknown>[] | undefined;
  if (!children || children.length === 0) {
    return;
  }

  // Available space for children (subtract padding)
  const availableWidth = Math.max(0, width - paddingX);
  const availableHeight = Math.max(0, height - paddingY);

  const direction = (layer.direction ?? DEFAULT_DIRECTION) as "row" | "column";
  const gap = (layer.gap ?? DEFAULT_GAP) as number;
  const justify = (layer.justifyContent ?? DEFAULT_JUSTIFY) as string;
  const align = (layer.alignItems ?? DEFAULT_ALIGN) as string;

  if (direction === "row") {
    distributeRow(children, availableWidth, availableHeight, gap, justify, align, paddingLeft, paddingTop);
  } else {
    distributeColumn(children, availableWidth, availableHeight, gap, justify, align, paddingLeft, paddingTop);
  }
}

// ---------------------------------------------------------------------------
// Flex distribution
// ---------------------------------------------------------------------------

/**
 * Distribute children horizontally (main axis = X).
 */
function distributeRow(
  children: Record<string, unknown>[],
  containerWidth: number,
  containerHeight: number,
  gap: number,
  justify: string,
  align: string,
  paddingX: number = 0,
  paddingY: number = 0
): void {
  if (children.length === 1) {
    sizeSingleChild(children[0], containerWidth, containerHeight, align);
    children[0].x = paddingX;
    children[0].y = paddingY + alignCross(
      children[0].height as number,
      containerHeight,
      align
    );
    children[0]._flex_positioned = true;
    return;
  }

  const flexChildren: { index: number; child: Record<string, unknown> }[] = [];
  let fixedTotal = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const w = child.width as number | undefined;
    if (w !== undefined) {
      fixedTotal += Math.floor(w);
    } else {
      flexChildren.push({ index: i, child });
    }
  }

  const remaining = Math.max(
    0,
    containerWidth - fixedTotal - gap * (children.length - 1)
  );
  const flexTotal =
    flexChildren.reduce((sum, { child }) => sum + getFlex(child), 0) || 1;

  for (const { child } of flexChildren) {
    const f = getFlex(child);
    child.width = Math.floor((remaining * f) / flexTotal);
  }

  for (const child of children) {
    if (child.height === undefined) {
      child.height = DEFAULT_LAYER_HEIGHT;
    }
  }

  const offsets = justifyPositions(
    children.map((c) => c.width as number),
    gap,
    containerWidth,
    justify
  );

  for (let i = 0; i < children.length; i++) {
    children[i].x = paddingX + offsets[i];
    children[i].y = paddingY + alignCross(
      children[i].height as number,
      containerHeight,
      align
    );
    children[i]._flex_positioned = true;
  }
}

/**
 * Distribute children vertically (main axis = Y).
 */
function distributeColumn(
  children: Record<string, unknown>[],
  containerWidth: number,
  containerHeight: number,
  gap: number,
  justify: string,
  align: string,
  paddingX: number = 0,
  paddingY: number = 0
): void {
  if (children.length === 1) {
    sizeSingleChild(children[0], containerWidth, containerHeight, align);
    children[0].y = paddingY;
    children[0].x = paddingX + alignCrossHorizontal(
      children[0].width as number,
      containerWidth,
      align
    );
    children[0]._flex_positioned = true;
    return;
  }

  const flexChildren: { index: number; child: Record<string, unknown> }[] = [];
  let fixedTotal = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const h = child.height as number | undefined;
    if (h !== undefined) {
      fixedTotal += Math.floor(h);
    } else {
      flexChildren.push({ index: i, child });
    }
  }

  const remaining = Math.max(
    0,
    containerHeight - fixedTotal - gap * (children.length - 1)
  );
  const flexTotal =
    flexChildren.reduce((sum, { child }) => sum + getFlex(child), 0) || 1;

  for (const { child } of flexChildren) {
    const f = getFlex(child);
    child.height = Math.floor((remaining * f) / flexTotal);
  }

  for (const child of children) {
    if (child.width === undefined) {
      child.width = DEFAULT_LAYER_WIDTH;
    }
  }

  const offsets = justifyPositions(
    children.map((c) => c.height as number),
    gap,
    containerHeight,
    justify
  );

  for (let i = 0; i < children.length; i++) {
    children[i].y = paddingY + offsets[i];
    children[i].x = paddingX + alignCrossHorizontal(
      children[i].width as number,
      containerWidth,
      align
    );
    children[i]._flex_positioned = true;
  }
}

// ---------------------------------------------------------------------------
// Flex helpers
// ---------------------------------------------------------------------------

/**
 * Size a single child to fill the container (stretch behavior).
 */
function sizeSingleChild(
  child: Record<string, unknown>,
  containerWidth: number,
  containerHeight: number,
  _align: string
): void {
  if (child.width === undefined) {
    child.width = containerWidth;
  }
  if (child.height === undefined) {
    child.height = containerHeight;
  }
}

/**
 * Return the flex factor for a child (default 1).
 */
function getFlex(child: Record<string, unknown>): number {
  const f = child.flex as number | undefined;
  if (f === undefined) {
    return 1.0;
  }
  return Number(f);
}

/**
 * Calculate the starting position for each item along the main axis.
 *
 * @param sizes - Width (row) or height (column) of each item.
 * @param gap - Gap between items.
 * @param totalSize - Container dimension.
 * @param justify - justify-content value.
 * @returns List of starting positions for each item.
 */
function justifyPositions(
  sizes: number[],
  gap: number,
  totalSize: number,
  justify: string
): number[] {
  const count = sizes.length;
  if (count === 0) {
    return [];
  }

  const usedSize =
    sizes.reduce((sum, s) => sum + s, 0) + gap * Math.max(count - 1, 0);
  const freeSpace = totalSize - usedSize;

  // Calculate per-item spacing contribution based on justify mode
  let spacingPerItem: number[];
  if (justify === "flex-start") {
    spacingPerItem = new Array(count).fill(0);
  } else if (justify === "center") {
    const offset = Math.floor(freeSpace / 2);
    spacingPerItem = new Array(count).fill(offset);
  } else if (justify === "space-between") {
    if (count <= 1) {
      spacingPerItem = new Array(count).fill(0);
    } else {
      const step = Math.floor(freeSpace / (count - 1));
      spacingPerItem = Array.from({ length: count }, (_, i) => i * step);
    }
  } else if (justify === "space-around") {
    const unit = Math.floor(freeSpace / count);
    spacingPerItem = Array.from(
      { length: count },
      (_, i) => unit * i + Math.floor(unit / 2)
    );
  } else if (justify === "space-evenly") {
    const unit = Math.floor(freeSpace / (count + 1));
    spacingPerItem = Array.from({ length: count }, (_, i) => unit * (i + 1));
  } else {
    spacingPerItem = new Array(count).fill(0);
  }

  // Build positions: cumulative sizes + gaps + justify spacing
  const positions: number[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    positions.push(cursor + spacingPerItem[i]);
    cursor += sizes[i] + gap;
  }

  return positions;
}

/**
 * Align a child along the cross axis (vertical for row layout).
 */
function alignCross(
  childSize: number,
  containerSize: number,
  align: string
): number {
  if (align === "center") {
    return Math.floor((containerSize - childSize) / 2);
  }
  if (align === "stretch") {
    return 0; // child will be sized to container separately
  }
  // flex-start or unknown
  return 0;
}

/**
 * Align a child along the cross axis (horizontal for column layout).
 */
function alignCrossHorizontal(
  childSize: number,
  containerSize: number,
  align: string
): number {
  if (align === "center") {
    return Math.floor((containerSize - childSize) / 2);
  }
  if (align === "stretch") {
    return 0;
  }
  return 0;
}

/**
 * Safely retrieve a dimension value, falling back to default.
 */
function getDimension(
  layer: Record<string, unknown>,
  key: string,
  defaultValue: number
): number {
  const val = layer[key] as number | undefined;
  if (val === undefined) {
    return defaultValue;
  }
  return Math.floor(val);
}
