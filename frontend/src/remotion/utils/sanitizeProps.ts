/**
 * sanitizeComponentProps — Remove unknown/irrelevant props from components.
 *
 * Each component in the catalog has a defined set of valid props.
 * This utility strips any props that don't belong to prevent:
 * - React warnings about unknown DOM props
 * - Prop conflicts (e.g., 'duration' vs Remotion's durationInFrames)
 * - Memory waste from carrying garbage props through the render
 *
 * @param componentName - The resolved component name from the registry
 * @param props - The raw props object from the spec
 * @returns Sanitized props with only valid keys
 */

// Allowed props per component (whitelist approach)
const ALLOWED_PROPS: Record<string, Set<string>> = {
  'Typewriter': new Set([
    'text', 'color', 'x', 'y', 'fontSize', 'fontWeight',
    'width', 'speed', 'delay', 'durationInFrames',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
  ]),
  'TextReveal': new Set([
    'text', 'color', 'x', 'y', 'fontSize', 'fontWeight',
    'width', 'delay', 'animation', 'glowIntensity',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
  ]),
  'StyleTextBlock': new Set([
    'text', 'x', 'y', 'variant', 'align', 'maxLines',
    'width', 'style', 'delay', 'fontSize', 'color', 'fontWeight',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
  ]),
  'StyleScrambleText': new Set([
    'text', 'x', 'y', 'fontSize', 'color', 'fontWeight',
    'width', 'delay', 'speed',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
  ]),
  'IconifyIcon': new Set([
    'icon', 'x', 'y', 'size', 'color',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
    'scale', 'rotation', 'opacity',
  ]),
  'SubscribeButton': new Set([
    'text', 'x', 'y', 'color', 'width', 'fontSize',
    'entry', 'entryDelay', 'exit', 'exitDelay', 'exitDuration',
  ]),
  'KineticBackground': new Set([
    'variant', 'color', 'speed', 'intensity', 'x', 'y',
    'width', 'height',
  ]),
};

// Common props that are always allowed on any component
const UNIVERSAL_PROPS = new Set([
  'type', 'componentName', 'zIndex', 'filter', 'style',
  'scale', 'rotation', 'opacity',
]);

export function sanitizeComponentProps(
  componentName: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = ALLOWED_PROPS[componentName];
  if (!allowed) {
    // Unknown component — pass all props through (don't break anything)
    return props;
  }

  const sanitized: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (allowed.has(key) || UNIVERSAL_PROPS.has(key)) {
      sanitized[key] = value;
    } else {
      removed.push(key);
    }
  }

  if (removed.length > 0 && typeof console !== 'undefined') {
    console.debug(
      `[sanitizeProps] ${componentName}: removed ${removed.length} props:`,
      removed,
    );
  }

  return sanitized;
}
