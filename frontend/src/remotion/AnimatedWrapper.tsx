import React from 'react';
import { Animated, Move, Scale, Fade } from 'remotion-animated';
import { generateSpringKeyframes, SPRING_PRESETS } from './utils/springPhysics';

export type EntryType =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'spring-in'
  | 'bounce-in'
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
  if (!entry && !exit) return <>{children}</>;

  const delayFrames = Math.round(delay * 30); // Convert seconds to frames (30fps)

  // Build entry animations
  let entryAnimations: any[] = [];

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
          Scale({ by: 1, initial: 0, start: delayFrames, duration: entryDuration }),
        ];
        break;
      case 'spring-in':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Scale({ by: 1, initial: 0, start: delayFrames, duration: entryDuration, stiffness: 80, damping: 12 }),
        ];
        break;
      case 'bounce-in':
        entryAnimations = [
          Fade({ to: 1, initial: 0, start: delayFrames, duration: entryDuration }),
          Scale({ by: 1, initial: 0, start: delayFrames, duration: entryDuration, stiffness: 120, damping: 8 }),
        ];
        break;
      default:
        break;
    }
  }

  // Build exit animations
  let exitAnimations: any[] = [];

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
      default:
        break;
    }
  }

  const allAnimations = [...entryAnimations, ...exitAnimations];

  if (allAnimations.length === 0) return <>{children}</>;

  return (
    <Animated animations={allAnimations}>
      {children}
    </Animated>
  );
};
