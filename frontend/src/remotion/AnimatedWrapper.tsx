import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Animated, Move, Scale, Fade } from 'remotion-animated';
import { generateSpringKeyframes, SPRING_PRESETS } from './utils/springPhysics';
import { SPRING } from './utils/tokens';

export type EntryType =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'spring-in'
  | 'bounce-in'
  | 'blur-in'
  | null;

export type ExitType =
  | 'fade-out'
  | 'slide-up-out'
  | 'slide-down-out'
  | 'slide-left-out'
  | 'slide-right-out'
  | 'scale-out'
  | 'spring-out'
  | 'bounce-out'
  | 'blur-out'
  | null;

interface AnimatedWrapperProps {
  entry: EntryType;
  exit?: ExitType;
  delay?: number; // in seconds
  entryDuration?: number; // in frames (default: 30)
  exitDuration?: number; // in frames (default: 30)
  durationInFrames?: number;
  children: React.ReactNode;
}

export const AnimatedWrapper: React.FC<AnimatedWrapperProps> = ({
  entry,
  exit,
  delay = 0,
  entryDuration = 30,
  exitDuration = 30,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  if (!entry && !exit) return <>{children}</>;

  const delayFrames = Math.round(delay * 30); // Convert seconds to frames (30fps)

  // Build entry animations
  let entryAnimations: ReturnType<typeof Fade>[] = [];
  let blurEntryStyle: React.CSSProperties | undefined;

  if (entry) {
    switch (entry) {
      case 'fade-in':
        entryAnimations = [Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration })];
        break;
      case 'slide-up':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Move({ y: 0, initialY: 50, start: delayFrames, duration: entryDuration }),
        ];
        break;
      case 'slide-down':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Move({ y: 0, initialY: -50, start: delayFrames, duration: entryDuration }),
        ];
        break;
      case 'slide-left':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Move({ x: 0, initialX: 50, start: delayFrames, duration: entryDuration }),
        ];
        break;
      case 'slide-right':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Move({ x: 0, initialX: -50, start: delayFrames, duration: entryDuration }),
        ];
        break;
      case 'scale-in':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          // v8 (Fase 4): entrada con leve overshoot (antes lineal, se sentía plano).
          Scale({ by: 1, initial: 0.85, start: delayFrames, duration: entryDuration, stiffness: SPRING.soft.stiffness, damping: SPRING.soft.damping }),
        ];
        break;
      case 'spring-in':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Scale({ by: 1, initial: 0, start: delayFrames, duration: entryDuration, stiffness: SPRING.pop.stiffness, damping: SPRING.pop.damping }),
        ];
        break;
      case 'bounce-in':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Scale({ by: 1, initial: 0, start: delayFrames, duration: entryDuration, stiffness: SPRING.bouncy.stiffness, damping: SPRING.bouncy.damping }),
        ];
        break;
      case 'blur-in': {
        const blurAmount = interpolate(frame, [delayFrames, delayFrames + entryDuration], [20, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const blurOpacity = interpolate(frame, [delayFrames, delayFrames + entryDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        blurEntryStyle = { filter: `blur(${blurAmount}px)`, opacity: blurOpacity };
        break;
      }
      default:
        break;
    }
  }

  // Build exit animations
  let exitAnimations: ReturnType<typeof Fade>[] = [];
  let blurExitStyle: React.CSSProperties | undefined;

  if (exit) {
    // v7.1: la salida debe TERMINAR justo en el corte de escena, ocupando solo
    // los últimos `exitDuration` frames. Antes empezaba al 75% de la escena, lo
    // que hacía desaparecer el contenido ~1.7s antes de que terminara la voz
    // (la escena dura audio + 0.3s padding tras la Fase A).
    const exitStart = durationInFrames
      ? Math.max(0, durationInFrames - exitDuration)
      : 999999; // fallback if no duration provided

    switch (exit) {
      case 'fade-out':
        exitAnimations = [Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration })];
        break;
      case 'slide-up-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Move({ y: -50, initialY: 0, start: exitStart, duration: exitDuration }),
        ];
        break;
      case 'slide-down-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Move({ y: 50, initialY: 0, start: exitStart, duration: exitDuration }),
        ];
        break;
      case 'slide-left-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Move({ x: -50, initialX: 0, start: exitStart, duration: exitDuration }),
        ];
        break;
      case 'slide-right-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Move({ x: 50, initialX: 0, start: exitStart, duration: exitDuration }),
        ];
        break;
      case 'scale-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Scale({ by: 0, initial: 1, start: exitStart, duration: exitDuration }),
        ];
        break;
      case 'spring-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Scale({ by: 0, initial: 1, start: exitStart, duration: exitDuration, stiffness: 80, damping: 12 }),
        ];
        break;
      case 'bounce-out':
        exitAnimations = [
          Fade({ to: 0, initial: 1, start: exitStart, duration: exitDuration }),
          Scale({ by: 0, initial: 1, start: exitStart, duration: exitDuration, stiffness: 120, damping: 8 }),
        ];
        break;
      case 'blur-out': {
        const blurAmount = interpolate(frame, [exitStart, exitStart + exitDuration], [0, 20], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const blurOpacity = interpolate(frame, [exitStart, exitStart + exitDuration], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        blurExitStyle = { filter: `blur(${blurAmount}px)`, opacity: blurOpacity };
        break;
      }
      default:
        break;
    }
  }

  const allAnimations = [...entryAnimations, ...exitAnimations];
  const blurStyle = blurEntryStyle || blurExitStyle;

  if (allAnimations.length === 0 && !blurStyle) return <>{children}</>;

  // v8 (Fase 4): ocultar el elemento ANTES de que empiece su entrada. Sin esto,
  // con entryDelay > 0 el elemento se mostraba a opacidad plena, luego saltaba a 0
  // y recién animaba (el "aparece → desaparece → entra" que se veía en los iconos).
  const hiddenBeforeEntry = !!entry && frame < delayFrames;

  // For blur animations, we apply the CSS filter + opacity directly on a wrapper div
  // instead of using remotion-animated's Fade (which would conflict with our manual opacity).
  if (blurStyle) {
    return (
      <div style={hiddenBeforeEntry ? { opacity: 0 } : blurStyle}>
        {children}
      </div>
    );
  }

  return (
    <div style={hiddenBeforeEntry ? { opacity: 0 } : undefined}>
      <Animated animations={allAnimations}>
        {children}
      </Animated>
    </div>
  );
};
