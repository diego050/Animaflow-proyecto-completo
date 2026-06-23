/**
 * StyleProgressSteps — Animated progress timeline with sequential step fill,
 * connecting lines, and configurable direction (horizontal or vertical).
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas() — no hardcoded px.
 * Deterministic: all animations from useCurrentFrame() and spring().
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepItem {
  label: string;
  color?: string;
}

interface StyleProgressStepsProps extends UniversalProps {
  steps?: string[] | StepItem[];
  framesPerStep?: number;
  direction?: 'horizontal' | 'vertical';
  showTitle?: boolean;
  title?: string;
  circleSize?: number;
  lineLength?: number;
  activeColor?: string;
  inactiveColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  springDamping?: number;
  springStiffness?: number;
  springMass?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleProgressSteps: React.FC<StyleProgressStepsProps> = ({
  x = 540,
  y = 960,
  steps = ['Research', 'Design', 'Build', 'Launch'],
  framesPerStep = 24,
  direction = 'horizontal',
  showTitle = false,
  title = 'Project Timeline',
  circleSize,
  lineLength,
  activeColor = '#3b82f6',
  inactiveColor = '#4b5563',
  gradientStart = '#3b82f6',
  gradientEnd = '#7209b7',
  springDamping = 8,
  springStiffness = 150,
  springMass = 0.4,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // Normalize steps to StepItem[]
  const normalizedSteps: StepItem[] = steps.map((s) =>
    typeof s === 'string' ? { label: s } : s
  );

  // Layout sizing via canvas
  const computedCircleSize = circleSize ?? c.vmin(5);
  const computedLineLength = lineLength ?? c.vmin(8);
  const lineThickness = c.vmin(0.3);
  const labelFontSize = c.vmin(2);
  const titleFontSize = c.vmin(3.2);
  const numberFontSize = c.vmin(2.2);
  const labelGap = direction === 'horizontal' ? c.vmin(1) : c.vmin(1.5);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style,
      }}
    >
      {/* Optional title */}
      {showTitle && (
        <span
          style={{
            color: '#ffffff',
            fontSize: `${titleFontSize}px`,
            fontWeight: 700,
            marginBottom: `${c.vmin(3)}px`,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {title}
        </span>
      )}

      {/* Steps container */}
      <div
        style={{
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {normalizedSteps.map((step, i) => {
          const stepStart = i * framesPerStep;
          const fillProgress = interpolate(
            frame,
            [stepStart, stepStart + framesPerStep * 0.6],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const isActive = frame >= stepStart && frame < stepStart + framesPerStep;
          const isComplete = frame >= stepStart + framesPerStep * 0.6;

          // Spring pulse on active step
          const pulse = isActive
            ? spring({
                frame: frame - stepStart,
                fps,
                config: { damping: springDamping, stiffness: springStiffness, mass: springMass },
              })
            : 1;
          const circleScale = isActive ? 0.9 + pulse * 0.2 : isComplete ? 1.1 : 1;

          // Line progress (between this step and next)
          const lineProgress =
            i < normalizedSteps.length - 1
              ? interpolate(
                  frame,
                  [stepStart + framesPerStep * 0.5, stepStart + framesPerStep],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )
              : 0;

          const isFilled = fillProgress > 0;
          const stepColor = step.color ?? (isFilled ? activeColor : inactiveColor);

          return (
            <React.Fragment key={i}>
              {/* Step circle + label */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: direction === 'horizontal' ? 'column' : 'row',
                  alignItems: 'center',
                  gap: `${labelGap}px`,
                }}
              >
                {/* Circle */}
                <div
                  style={{
                    width: `${computedCircleSize}px`,
                    height: `${computedCircleSize}px`,
                    borderRadius: '50%',
                    border: `3px solid ${stepColor}`,
                    background: isFilled
                      ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                      : 'transparent',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `scale(${circleScale})`,
                    transition: 'border-color 0.1s',
                  }}
                >
                  <span
                    style={{
                      color: isFilled ? '#ffffff' : '#6b7280',
                      fontSize: `${numberFontSize}px`,
                      fontWeight: 700,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Label */}
                <span
                  style={{
                    color: isFilled ? '#93c5fd' : '#6b7280',
                    fontSize: `${labelFontSize}px`,
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {i < normalizedSteps.length - 1 && (
                <div
                  style={{
                    width:
                      direction === 'horizontal'
                        ? `${computedLineLength}px`
                        : `${lineThickness}px`,
                    height:
                      direction === 'horizontal'
                        ? `${lineThickness}px`
                        : `${computedLineLength}px`,
                    background: '#374151',
                    borderRadius: `${lineThickness}px`,
                    position: 'relative',
                    overflow: 'hidden',
                    margin:
                      direction === 'horizontal'
                        ? `0 0 ${c.vmin(2.5)}px 0`
                        : `0 ${c.vmin(2.5)}px 0 0`,
                  }}
                >
                  <div
                    style={{
                      width:
                        direction === 'horizontal'
                          ? `${lineProgress * 100}%`
                          : '100%',
                      height:
                        direction === 'horizontal'
                          ? '100%'
                          : `${lineProgress * 100}%`,
                      background: `linear-gradient(${direction === 'horizontal' ? '90' : '180'}deg, ${gradientStart}, ${gradientEnd})`,
                      borderRadius: `${lineThickness}px`,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
