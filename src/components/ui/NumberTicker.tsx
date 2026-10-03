import { animate, useMotionValue, useReducedMotion, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';

/** Contador numérico animado. */
export function NumberTicker({ value, decimals = 0, className = '', duration = 0.9 }: { value: number; decimals?: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const fmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const text = useTransform(mv, (v) => fmt.format(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, reduce, mv, duration]);
  return <motion.span className={`num ${className}`}>{text}</motion.span>;
}
