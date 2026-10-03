import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { MUSCLES, MUSCLE_LABEL } from '@/data/labels';
import { BAND_LABEL, fmtSets } from '@/engine/validate';
import { SMALL } from '@/engine/rules';
import type { Muscle, MuscleVolume, PrescribedDay, Warning } from '@/engine/types';
import { mmss } from '@/lib/format';

/** Barra de tiempo disponible con marcas en −4, −2 y el tope. */
export function TimeBar({ seconds, budget = 2400 }: { seconds: number; budget?: number }) {
  const reduce = useReducedMotion();
  const max = budget * 1.1;
  const pct = Math.min(1, seconds / max);
  const over = seconds > budget;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="eyebrow">Tiempo estimado</span>
        <span className={`num text-sm font-semibold ${over ? 'text-ember' : 'text-fg'}`}>
          {mmss(seconds)} <span className="text-muted">/ {mmss(budget)}</span>
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-raised">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-ember-deep' : 'bg-ember'}`}
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 }}
        />
        {[budget - 240, budget - 120, budget].map((m) => (
          <span key={m} className={`absolute inset-y-0 w-px ${m === budget ? 'bg-fg/80' : 'bg-fg/25'}`} style={{ left: `${(m / max) * 100}%` }} />
        ))}
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-muted">
        <span className="num absolute -translate-x-1/2" style={{ left: `${((budget - 240) / max) * 100}%` }}>{Math.round(budget / 60) - 4}</span>
        <span className="num absolute -translate-x-1/2" style={{ left: `${(budget / max) * 100}%` }}>{Math.round(budget / 60)}</span>
      </div>
    </div>
  );
}

const BAND_TONE: Record<string, string> = {
  bajo: 'text-warn',
  minimo: 'text-fg',
  optimo: 'text-ok',
  excesivo: 'text-ember',
  ok: 'text-ok',
  alto: 'text-warn'
};

/** Barras de volumen "líquidas": el nivel sube con una ola en la superficie. */
export function VolumePanel({ weekly }: { weekly: MuscleVolume[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-5 gap-x-2 gap-y-5">
      {weekly.map((v, i) => {
        const scale = SMALL.includes(v.muscle) ? 10 : 18;
        const fill = Math.min(1, v.sets / scale);
        const bandLo = SMALL.includes(v.muscle) ? 4 / scale : 10 / scale;
        const bandHi = SMALL.includes(v.muscle) ? 8 / scale : 16 / scale;
        return (
          <div key={v.muscle} className="flex flex-col items-center gap-1.5">
            <div className="relative h-28 w-full max-w-[44px] overflow-hidden rounded-lg border border-line bg-raised/60" title={`${MUSCLE_LABEL[v.muscle]}: ${fmtSets(v.sets)} series · ${BAND_LABEL[v.band]}`}>
              <span className="absolute inset-x-0 border-y border-dashed border-ok/40 bg-ok/[0.06]" style={{ bottom: `${bandLo * 100}%`, height: `${(bandHi - bandLo) * 100}%` }} />
              <motion.div
                className="absolute inset-x-0 bottom-0"
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${fill * 100}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 16, delay: reduce ? 0 : i * 0.04 }}
              >
                <div className="absolute inset-0 top-1.5 bg-gradient-to-t from-ember-deep to-ember" />
                <svg className="absolute -top-0.5 left-0 h-2.5 w-[200%] animate-wave" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M0 5 Q 7.5 0 15 5 T 30 5 T 45 5 T 60 5 T 75 5 T 90 5 T 105 5 T 120 5 V10 H0 Z" fill="rgb(var(--ember))" />
                </svg>
              </motion.div>
            </div>
            <div className="num text-sm font-semibold">{fmtSets(v.sets)}</div>
            <div className="w-full truncate text-center text-[11px] leading-tight text-muted">{MUSCLE_LABEL[v.muscle]}</div>
            <div className={`text-[10px] font-medium uppercase tracking-wide ${BAND_TONE[v.band]}`}>{BAND_LABEL[v.band]}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Matriz músculo × día. ■ directo, ▣ indirecto. */
export function CoverageMatrix({ coverage, days }: { coverage: Record<Muscle, number[]>; days: PrescribedDay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="text-left font-normal text-muted" />
            {days.map((d, i) => (
              <th key={d.day.id} className="eyebrow pb-1 text-center !text-[10px]">
                Día {i + 1}
              </th>
            ))}
            <th className="eyebrow pb-1 text-center !text-[10px]">Sem</th>
          </tr>
        </thead>
        <tbody>
          {MUSCLES.map((m) => {
            const row = coverage[m];
            const total = row.reduce((a, b) => a + b, 0);
            return (
              <tr key={m}>
                <td className="pr-2 text-muted">{MUSCLE_LABEL[m]}</td>
                {row.map((v, i) => (
                  <td key={i} className="text-center">
                    <span
                      className={`mx-auto block h-6 w-full max-w-[56px] rounded-md border ${
                        v === 1 ? 'border-ember bg-ember' : v === 0.5 ? 'border-ember/60 bg-[repeating-linear-gradient(45deg,rgb(var(--ember)/.45)_0_3px,transparent_3px_6px)]' : 'border-line bg-raised/40'
                      }`}
                      aria-label={v === 1 ? 'directo' : v === 0.5 ? 'indirecto' : 'sin estímulo'}
                    />
                  </td>
                ))}
                <td className={`num text-center font-semibold ${['pecho', 'espalda', 'cuadriceps', 'femorales', 'hombros'].includes(m) && total < 2 ? 'text-warn' : ''}`}>
                  {String(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-ember" /> directo = 1</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-ember/60 bg-[repeating-linear-gradient(45deg,rgb(var(--ember)/.45)_0_2px,transparent_2px_4px)]" /> indirecto = 0.5</span>
      </div>
    </div>
  );
}

const SEV_ICON = { info: Info, aviso: AlertTriangle, critico: OctagonAlert } as const;
const SEV_TONE = { info: 'text-muted', aviso: 'text-warn', critico: 'text-ember' } as const;

export function WarningList({ warnings, max }: { warnings: Warning[]; max?: number }) {
  const list = [...warnings].sort((a, b) => ['critico', 'aviso', 'info'].indexOf(a.severity) - ['critico', 'aviso', 'info'].indexOf(b.severity)).slice(0, max);
  if (!list.length)
    return <p className="text-sm text-ok">Sin alertas: cobertura, fatiga, espaciado y tiempo en orden.</p>;
  return (
    <ul className="space-y-2">
      {list.map((w, i) => {
        const Icon = SEV_ICON[w.severity];
        return (
          <motion.li
            key={w.text + i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex gap-3 rounded-xl border border-line bg-raised/40 px-3 py-2.5 text-sm"
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${SEV_TONE[w.severity]}`} aria-label={w.severity} />
            <span>{w.text}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
