import React from 'react';
import { Animated, Move, Scale, Fade } from 'remotion-animated';
import { Easing } from 'remotion';

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

interface AnimatedWrapperProps {
  entry: EntryType;
  delay?: number; // in seconds
  children: React.ReactNode;
}

export const AnimatedWrapper: React.FC<AnimatedWrapperProps> = ({ entry, delay = 0, children }) => {
  if (!entry) return <>{children}</>;

  const delayFrames = Math.round(delay * 30); // Convert seconds to frames (30fps)
  const duration = 30; // 1 second animation

  let animations: any[] = [];

  switch (entry) {
    case 'fade-in':
      animations = [Fade({ to: 1, initial: 0, start: delayFrames, duration })];
      break;
    case 'slide-up':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Move({ y: 0, initialY: 50, start: delayFrames, duration, ease: Easing.out(Easing.sin) }),
      ];
      break;
    case 'slide-down':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Move({ y: 0, initialY: -50, start: delayFrames, duration, ease: Easing.out(Easing.sin) }),
      ];
      break;
    case 'slide-left':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Move({ x: 0, initialX: 50, start: delayFrames, duration, ease: Easing.out(Easing.sin) }),
      ];
      break;
    case 'slide-right':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Move({ x: 0, initialX: -50, start: delayFrames, duration, ease: Easing.out(Easing.sin) }),
      ];
      break;
    case 'scale-in':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Scale({ by: 1, initial: 0, start: delayFrames, duration, ease: Easing.out(Easing.back(1.7)) }),
      ];
      break;
    case 'spring-in':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Scale({ by: 1, initial: 0, start: delayFrames, duration, stiffness: 80, damping: 12 }),
      ];
      break;
    case 'bounce-in':
      animations = [
        Fade({ to: 1, initial: 0, start: delayFrames, duration }),
        Scale({ by: 1, initial: 0, start: delayFrames, duration, stiffness: 120, damping: 8 }),
      ];
      break;
    default:
      return <>{children}</>;
  }

  return (
    <Animated animations={animations}>
      {children}
    </Animated>
  );
};
