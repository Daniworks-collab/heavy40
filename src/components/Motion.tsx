import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

/**
 * Inclinación ligera al interactuar (estilo "tilt card"). Sólo con puntero fino (mouse/trackpad);
 * en táctil se queda en la escala de presión para no pelear con el scroll.
 */
export function Tilt({ children, className = '', max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 300, damping: 30 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 300, damping: 30 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.12 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Texto que aparece palabra por palabra (desenfoque → nítido). Total < 300 ms. */
export function RevealText({ text, className = '' }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  if (reduce) return <span className={className}>{text}</span>;
  const step = Math.min(0.04, 0.18 / Math.max(1, words.length));
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: i * step, duration: 0.22, ease: EASE_OUT }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  );
}

/** Check que se dibuja al completar una serie (no bloquea: el registro ya ocurrió). */
export function SetCheck({ trigger, warmup }: { trigger: number; warmup?: boolean }) {
  const reduce = useReducedMotion();
  if (!trigger || reduce) return null;
  return (
    <motion.span
      key={trigger}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 0.22, duration: 0.18 }}
    >
      <motion.svg
        width="76"
        height="76"
        viewBox="0 0 52 52"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
      >
        <circle cx="26" cy="26" r="24" fill={warmup ? 'rgb(var(--raised))' : 'rgb(var(--onember))'} />
        <motion.path
          d="M15 27 L23 34 L38 18"
          fill="none"
          stroke={warmup ? 'rgb(var(--fg))' : 'rgb(var(--ember))'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.04 }}
        />
      </motion.svg>
    </motion.span>
  );
}
