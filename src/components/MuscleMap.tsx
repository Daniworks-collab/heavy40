import { motion, useReducedMotion } from 'motion/react';
import { MUSCLE_LABEL } from '@/data/labels';
import type { Muscle } from '@/engine/types';

type Region = { muscle: Muscle | null; pts: string; both?: boolean };

const mirror = (pts: string) =>
  pts
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return `${200 - x},${y}`;
    })
    .join(' ');

// Figura facetada, estilo "forjado": polígonos, sin curvas orgánicas.
const FRONT: Region[] = [
  { muscle: null, pts: '93,44 107,44 109,56 91,56', both: false },
  { muscle: 'hombros', pts: '62,62 80,58 84,66 76,84 64,96 54,88 55,72' },
  { muscle: 'pecho', pts: '85,62 98,64 98,98 86,102 72,97 78,85' },
  { muscle: 'biceps', pts: '54,93 66,99 64,126 56,132 48,124 49,104' },
  { muscle: null, pts: '47,131 58,137 54,172 44,174 40,152' },
  { muscle: null, pts: '41,177 54,177 52,190 42,190' },
  { muscle: 'core', pts: '72,100 84,106 85,152 78,160 70,136 70,116' },
  { muscle: 'cuadriceps', pts: '70,166 86,170 99,196 96,252 86,266 74,262 66,232 64,194' },
  { muscle: null, pts: '75,268 94,265 92,279 77,281' },
  { muscle: 'gemelos', pts: '72,284 80,284 79,326 72,318' },
  { muscle: null, pts: '81,284 92,284 90,330 81,342' },
  { muscle: null, pts: '75,345 90,345 94,354 70,354' }
];
const FRONT_CENTER: Region[] = [
  { muscle: 'core', pts: '86,106 114,106 113,128 114,150 108,166 100,170 92,166 86,150 87,128' },
  { muscle: null, pts: '82,164 118,164 112,186 100,194 88,186' }
];

const BACK: Region[] = [
  { muscle: 'hombros', pts: '60,66 74,64 80,76 74,92 60,96 53,84 54,72' },
  { muscle: 'espalda', pts: '78,84 98,94 98,134 86,148 76,140 70,120 68,99' },
  { muscle: 'triceps', pts: '52,95 66,101 66,128 56,134 47,124 47,104' },
  { muscle: null, pts: '47,137 58,141 54,172 44,174 40,152' },
  { muscle: null, pts: '41,177 54,177 52,190 42,190' },
  { muscle: 'gluteos', pts: '72,166 99,168 99,202 86,210 70,200 66,182' },
  { muscle: 'femorales', pts: '67,208 86,214 98,210 96,258 86,270 74,266 66,238' },
  { muscle: null, pts: '74,272 94,268 92,282 75,282' },
  { muscle: 'gemelos', pts: '70,285 92,285 94,307 88,334 80,340 72,330 68,307' },
  { muscle: null, pts: '75,345 90,345 94,354 70,354' }
];
const BACK_CENTER: Region[] = [
  { muscle: 'espalda', pts: '88,48 112,48 128,66 116,80 100,90 84,80 72,66' },
  { muscle: 'espalda', pts: '91,140 109,140 114,162 86,162' }
];

function Figure({ regions, center, values, label, x }: { regions: Region[]; center: Region[]; values: Partial<Record<Muscle, number>>; label: string; x: number }) {
  const reduce = useReducedMotion();
  const all: { key: string; muscle: Muscle | null; pts: string }[] = [];
  regions.forEach((r, i) => {
    all.push({ key: `l${i}`, muscle: r.muscle, pts: r.pts });
    if (r.both !== false) all.push({ key: `r${i}`, muscle: r.muscle, pts: mirror(r.pts) });
  });
  center.forEach((r, i) => all.push({ key: `c${i}`, muscle: r.muscle, pts: r.pts }));
  return (
    <g transform={`translate(${x},0)`}>
      <ellipse cx="100" cy="27" rx="14" ry="17" fill="rgb(var(--raised))" stroke="rgb(var(--line2))" strokeWidth="1" />
      {all.map((r, idx) => {
        const v = r.muscle ? Math.max(0, Math.min(1, values[r.muscle] ?? 0)) : 0;
        const on = v > 0.001;
        return (
          <motion.polygon
            key={r.key}
            points={r.pts}
            stroke={on ? 'rgb(var(--ember-hot))' : 'rgb(var(--line2))'}
            strokeWidth={on ? 1 : 0.8}
            strokeLinejoin="round"
            initial={reduce ? false : { fill: 'rgb(var(--raised))', fillOpacity: 1 }}
            animate={{
              fill: on ? 'rgb(var(--ember))' : 'rgb(var(--raised))',
              fillOpacity: on ? 0.22 + 0.78 * v : 1
            }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, delay: 0.15 + idx * 0.012, ease: [0.16, 1, 0.3, 1] }}
            style={on && v > 0.55 ? { filter: 'drop-shadow(0 0 5px rgb(var(--ember) / .65))' } : undefined}
          >
            {r.muscle && <title>{`${MUSCLE_LABEL[r.muscle]}${on ? ` · ${Math.round(v * 100)}%` : ''}`}</title>}
          </motion.polygon>
        );
      })}
      <text x="100" y="372" textAnchor="middle" className="fill-muted font-mono" fontSize="10" letterSpacing="2">
        {label}
      </text>
    </g>
  );
}

/** Mapa muscular SVG frontal + posterior. `values` normalizados 0..1. */
export function MuscleMap({ values, className = '', side = 'both' }: { values: Partial<Record<Muscle, number>>; className?: string; side?: 'both' | 'front' | 'back' }) {
  const w = side === 'both' ? 400 : 200;
  const desc = Object.entries(values)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([m]) => MUSCLE_LABEL[m as Muscle])
    .join(', ');
  return (
    <svg viewBox={`0 0 ${w} 380`} className={className} role="img" aria-label={desc ? `Músculos trabajados: ${desc}` : 'Mapa muscular'}>
      {side !== 'back' && <Figure regions={FRONT} center={FRONT_CENTER} values={values} label="FRENTE" x={0} />}
      {side !== 'front' && <Figure regions={BACK} center={BACK_CENTER} values={values} label="ESPALDA" x={side === 'both' ? 200 : 0} />}
    </svg>
  );
}
