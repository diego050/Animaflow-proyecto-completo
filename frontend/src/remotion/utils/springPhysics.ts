/**
 * Improved Spring Physics for AnimaFlow.
 *
 * Based on Framer Motion's spring implementation but adapted for
 * Remotion's frame-based rendering. Uses the differential equation:
 * F = -kx - cv (Hooke's Law + Damping)
 *
 * This produces more natural, organic movement compared to basic
 * Remotion springs.
 */

export interface SpringConfig {
  stiffness: number;    // Spring stiffness (default: 100)
  damping: number;      // Damping coefficient (default: 10)
  mass: number;         // Mass of the object (default: 1)
  velocity?: number;    // Initial velocity (default: 0)
  restSpeed?: number;   // Speed at which spring is considered at rest (default: 0.01)
  restDelta?: number;   // Distance at which spring is considered at rest (default: 0.01)
}

export interface SpringResult {
  value: number;
  velocity: number;
  isComplete: boolean;
}

// Preset spring configurations
export const SPRING_PRESETS: Record<string, SpringConfig> = {
  gentle: { stiffness: 80, damping: 12, mass: 1.2 },
  default: { stiffness: 100, damping: 10, mass: 1 },
  snappy: { stiffness: 180, damping: 12, mass: 0.8 },
  bouncy: { stiffness: 120, damping: 6, mass: 0.6 },
  stiff: { stiffness: 260, damping: 20, mass: 0.9 },
  slow: { stiffness: 60, damping: 15, mass: 1.5 },
};

/**
 * Calculate the next state of a spring given the current state and config.
 *
 * Uses the differential equation: F = -kx - cv
 * Where:
 * - F = force
 * - k = stiffness
 * - x = displacement from target
 * - c = damping
 * - v = velocity
 *
 * @param currentValue - Current value of the spring
 * @param targetValue - Target value the spring is moving towards
 * @param currentVelocity - Current velocity
 * @param config - Spring configuration
 * @param dt - Time delta (in seconds, typically 1/30 for 30fps)
 * @returns Next state of the spring
 */
export function calculateSpring(
  currentValue: number,
  targetValue: number,
  currentVelocity: number,
  config: SpringConfig = SPRING_PRESETS.default,
  dt: number = 1 / 30
): SpringResult {
  const { stiffness, damping, mass, restSpeed = 0.01, restDelta = 0.01 } = config;

  const displacement = currentValue - targetValue;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * currentVelocity;
  const acceleration = (springForce + dampingForce) / mass;

  const newVelocity = currentVelocity + acceleration * dt;
  const newValue = currentValue + newVelocity * dt;

  const isComplete =
    Math.abs(newValue - targetValue) < restDelta &&
    Math.abs(newVelocity) < restSpeed;

  return {
    value: isComplete ? targetValue : newValue,
    velocity: isComplete ? 0 : newVelocity,
    isComplete,
  };
}

/**
 * Generate spring keyframes for Remotion interpolation.
 *
 * Pre-calculates spring values for each frame, allowing Remotion
 * to render them deterministically.
 *
 * @param from - Starting value
 * @param to - Target value
 * @param totalFrames - Total number of frames to animate
 * @param config - Spring configuration or preset name
 * @param fps - Frames per second (default: 30)
 * @returns Array of values for each frame
 */
export function generateSpringKeyframes(
  from: number,
  to: number,
  totalFrames: number = 60,
  config: SpringConfig | string = 'default',
  fps: number = 30
): number[] {
  const springConfig = typeof config === 'string'
    ? SPRING_PRESETS[config] || SPRING_PRESETS.default
    : config;
  const dt = 1 / fps;

  const keyframes: number[] = [];
  let currentValue = from;
  let currentVelocity = springConfig.velocity ?? 0;

  for (let i = 0; i < totalFrames; i++) {
    const result = calculateSpring(currentValue, to, currentVelocity, springConfig, dt);
    currentValue = result.value;
    currentVelocity = result.velocity;
    keyframes.push(currentValue);

    if (result.isComplete) {
      // Fill remaining frames with target value
      while (keyframes.length < totalFrames) {
        keyframes.push(to);
      }
      break;
    }
  }

  return keyframes;
}

/**
 * Create a spring easing function for use with Remotion's interpolate().
 *
 * Returns a function that maps progress (0-1) to a spring-eased value.
 *
 * @param config - Spring configuration or preset name
 * @returns Easing function
 */
export function createSpringEasing(
  config: SpringConfig | string = 'default'
): (progress: number) => number {
  const springConfig = typeof config === 'string'
    ? SPRING_PRESETS[config] || SPRING_PRESETS.default
    : config;

  // Pre-calculate spring curve
  const steps = 100;
  const keyframes = generateSpringKeyframes(0, 1, steps, springConfig);

  return (progress: number) => {
    const index = Math.min(Math.floor(progress * (steps - 1)), steps - 1);
    return keyframes[index];
  };
}
