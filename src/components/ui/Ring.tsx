import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface RingProps {
  value: number; // 0..1 (puede pasar de 1 → zona roja)
  size?: number;
  stroke?: number;
  children?: ReactNode;
  tone?: 'ember' | 'ok' | 'warn' | 'muted';
  ticks?: number;
  trackClass?: string;
  label?: string;
  instant?: boolean;
}

const TONE: Record<NonNullable<RingProps['tone']>, string> = {
  ember: 'rgb(var(--ember))',
  ok: 'rgb(var(--ok))',
  warn: 'rgb(var(--warn))',
  muted: 'rgb(var(--muted))'
};

/** Anillo SVG con stroke-dash animado. Marcas tipo cuadrante industrial. */
export function Ring({ value, size = 120, stroke = 10, children, tone = 'ember', ticks = 40, label, instant }: RingProps) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const over = value > 1;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {Array.from({ length: ticks }).map((_, i) => {
          const a = (i / ticks) * Math.PI * 2;
          const r1 = size / 2 - 1;
          const r2 = size / 2 - (i % 5 === 0 ? 5 : 3);
          return (
            <line
              key={i}
              x1={size / 2 + Math.cos(a) * r1}
              y1={size / 2 + Math.sin(a) * r1}
              x2={size / 2 + Math.cos(a) * r2}
              y2={size / 2 + Math.sin(a) * r2}
              stroke="rgb(var(--line2))"
              strokeWidth={i % 5 === 0 ? 1.4 : 0.8}
            />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'rgb(var(--ember-deep))' : TONE[tone]}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={reduce || instant ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }}
          style={{ filter: tone === 'ember' ? 'drop-shadow(0 0 6px rgb(var(--ember) / .45))' : undefined }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
