import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/** Onda de choque: anillos concéntricos que se expanden desde el centro del botón. */
export function Shockwave({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <span key={trigger} className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible" aria-hidden>
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute aspect-square w-24 rounded-full border-2 border-ember"
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.75, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
          <motion.span
            className="absolute inset-0 rounded-[inherit] bg-ember-hot"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        </span>
      )}
    </AnimatePresence>
  );
}

/** Chispas contenidas: sólo al romper un PR. */
export function Sparks({ trigger, count = 22 }: { trigger: number; count?: number }) {
  const reduce = useReducedMotion();
  const parts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const d = 50 + Math.random() * 70;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d - 20, s: 2 + Math.random() * 3, delay: Math.random() * 0.08, rot: Math.random() * 180 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger, count]
  );
  if (reduce || trigger === 0) return null;
  return (
    <span key={trigger} className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bg-ember-hot"
          style={{ width: p.s, height: p.s * 3, borderRadius: 1, boxShadow: '0 0 6px rgb(var(--ember))' }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: p.rot, scale: 1 }}
          animate={{ x: p.x, y: p.y + 40, opacity: 0, rotate: p.rot + 90, scale: 0.4 }}
          transition={{ duration: 1.1, delay: p.delay, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </span>
  );
}
