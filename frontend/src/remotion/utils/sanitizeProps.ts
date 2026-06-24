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

import { getAllowedProps, UNIVERSAL_PROPS } from '../manifest';

// Set to true to log every stripped prop (very noisy — per component, per frame).
const DEBUG_SANITIZE = false;

export function sanitizeComponentProps(
  componentName: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = getAllowedProps(componentName);
  if (allowed.size === 0) {
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

  // Debug-only: this runs per component, per frame, so leaving it on floods
  // the render logs with thousands of lines. Flip DEBUG_SANITIZE to true when
  // you actually need to inspect which props get stripped.
  if (DEBUG_SANITIZE && removed.length > 0 && typeof console !== 'undefined') {
    console.debug(
      `[sanitizeProps] ${componentName}: removed ${removed.length} props:`,
      removed,
    );
  }

  return sanitized;
}
