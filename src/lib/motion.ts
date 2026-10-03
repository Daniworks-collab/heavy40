import type { Transition } from 'motion/react';

/**
 * Tokens de movimiento. Regla: toda animación de INTERACCIÓN dura < 300 ms
 * y nunca retrasa el registro de una serie (el estado se guarda antes de animar).
 */
export const DUR = { tap: 0.12, quick: 0.18, base: 0.24, exit: 0.14 } as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const T: Record<'tap' | 'quick' | 'base' | 'exit', Transition> = {
  tap: { duration: DUR.tap, ease: EASE_OUT },
  quick: { duration: DUR.quick, ease: EASE_OUT },
  base: { duration: DUR.base, ease: EASE_OUT },
  exit: { duration: DUR.exit, ease: 'easeIn' }
};

/** Resorte rápido (asienta en ~250 ms) para botones y selectores. */
export const SPRING: Transition = { type: 'spring', stiffness: 600, damping: 40, mass: 0.8 };
