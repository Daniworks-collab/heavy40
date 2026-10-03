import { motion } from 'motion/react';
import { Check, Flame, History, Pause, Play, Target } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DayGoal, LoggedSet, WarmupStep } from '@/engine/progression';
import type { Effort } from '@/engine/types';
import { beep, vibrate } from '@/lib/feedback';
import { kg as fmtKg, mmss } from '@/lib/format';

// ───────────────────────── Meta del día + valores anteriores ─────────────────────────

export function PrevGoal({ goal, prevSets, current }: { goal: DayGoal; prevSets: LoggedSet[]; current: number }) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-bg/60">
      <div className="flex items-start gap-2 border-b border-line px-3 py-2.5">
        <Target size={16} className="mt-0.5 shrink-0 text-ember" aria-hidden />
        <div className="min-w-0 text-sm">
          {goal.lastText && (
            <div className="text-muted">
              La última vez: <span className="num font-semibold text-fg">{goal.lastText}</span>
            </div>
          )}
          <div className="font-semibold text-fg">{goal.goalText}</div>
        </div>
      </div>
      {prevSets.length > 0 && (
        <table className="w-full text-sm" aria-label="Valores de la sesión anterior">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-1.5 font-normal">
                <History size={11} className="mr-1 inline" aria-hidden />
                Serie
              </th>
              <th className="py-1.5 font-normal">La vez pasada</th>
              <th className="px-3 py-1.5 text-right font-normal">Esfuerzo</th>
            </tr>
          </thead>
          <tbody>
            {prevSets.map((s, i) => (
              <tr key={i} className={`border-t border-line ${i === current ? 'bg-ember/[0.09]' : ''}`}>
                <td className="px-3 py-1.5">
                  <span className={`num ${i === current ? 'font-semibold text-ember' : 'text-muted'}`}>{i + 1}</span>
                </td>
                <td className="num py-1.5 font-semibold">
                  {fmtKg(s.kg)} × {s.reps}
                  {s.tut ? <span className="ml-1 text-xs font-normal text-muted">TUT {s.tut}s</span> : null}
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-muted">{s.effort === 'fallo' ? 'fallo' : s.effort}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ───────────────────────── Calentamiento en kilos ─────────────────────────

export function WarmupLadder({ steps, current, workKg }: { steps: WarmupStep[]; current: number; workKg: number }) {
  return (
    <ol className="mt-3 grid gap-1.5" aria-label="Series de calentamiento">
      {steps.map((w, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 rounded-md border px-3 py-2 ${i === current ? 'border-ember bg-ember/10' : i < current ? 'border-line opacity-50' : 'border-line'}`}
        >
          <span className="num w-9 text-xs text-muted">{w.pct}%</span>
          <span className="num flex-1 font-semibold">
            {workKg > 0 ? `${fmtKg(w.kg)} kg` : `${w.pct}%`} <span className="font-normal text-muted">× {w.reps}</span>
          </span>
          {i < current && <Check size={14} className="text-ok" aria-label="hecha" />}
        </li>
      ))}
      <li className="flex items-center gap-3 rounded-md border border-dashed border-line2 px-3 py-2 text-sm text-muted">
        <span className="num w-9 text-xs">100%</span>
        <span className="num flex-1">{workKg > 0 ? `${fmtKg(workKg)} kg` : 'Peso de trabajo'} · serie efectiva</span>
      </li>
    </ol>
  );
}

// ───────────────────────── Fallo + RIR ─────────────────────────

export function FailToggle({ effort, onChange }: { effort: Effort; onChange: (e: Effort) => void }) {
  const fail = effort === 'fallo';
  return (
    <div className="mt-3 flex gap-2">
      <motion.button
        whileTap={{ scale: 0.97 }}
        role="switch"
        aria-checked={fail}
        onClick={() => onChange(fail ? '1 RIR' : 'fallo')}
        className={`flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-md border-2 font-display text-xl font-black uppercase tracking-wider transition-colors ${
          fail ? 'border-ember bg-ember/20 text-fg' : 'border-line text-muted'
        }`}
      >
        <span className={`grid h-7 w-7 place-items-center rounded-sm border-2 ${fail ? 'border-ember bg-ember text-onember' : 'border-line2'}`} aria-hidden>
          {fail && <Check size={18} strokeWidth={3.5} />}
        </span>
        Llegué al fallo
      </motion.button>
      {!fail && (
        <div className="flex gap-1.5" role="radiogroup" aria-label="Repeticiones en reserva">
          {(['1 RIR', '2 RIR'] as Effort[]).map((e) => (
            <button
              key={e}
              role="radio"
              aria-checked={effort === e}
              onClick={() => onChange(e)}
              className={`press min-h-[56px] min-w-[60px] rounded-md border font-display text-base font-bold uppercase ${effort === e ? 'border-ember bg-ember/15 text-fg' : 'border-line text-muted'}`}
            >
              {e === '2 RIR' ? '2+' : '1'}
              <span className="block text-[10px] font-medium">RIR</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Técnicas de intensidad ─────────────────────────

export const TECHNIQUES = ['negativas', 'forzadas', 'rest-pause', 'pre-fatiga', 'drop set'] as const;

export function TechniqueChips({ value, onChange, suggested }: { value: string[]; onChange: (v: string[]) => void; suggested?: string }) {
  return (
    <div className="mt-3">
      <div className="eyebrow mb-1.5 flex items-center gap-1.5">
        <Flame size={12} className="text-ember" aria-hidden /> Técnicas en esta serie
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TECHNIQUES.map((t) => {
          const on = value.includes(t);
          const sug = suggested === t || (suggested === 'pre-agotamiento' && t === 'pre-fatiga');
          return (
            <button
              key={t}
              aria-pressed={on}
              data-on={on}
              onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
              className={`chip min-h-[44px] capitalize ${sug && !on ? '!border-ember/50' : ''}`}
            >
              {t}
              {sug && !on && <span className="text-[10px] text-ember">sugerida</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Tempo + tiempo bajo tensión ─────────────────────────

export interface Cadence {
  up: number;
  pause: number;
  down: number;
}

/** Metrónomo de cadencia: avisa en cada cambio de fase y mide el tiempo bajo tensión. */
export function useTempo(cadence: Cadence, opts: { sound: boolean; vibration: boolean }) {
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastPhase = useRef<string>('');
  const cycle = Math.max(1, cadence.up + cadence.pause + cadence.down);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = running && startedAt ? (now - startedAt) / 1000 : 0;
  const t = elapsed % cycle;
  const phase: 'sube' | 'pausa' | 'baja' = t < cadence.up ? 'sube' : t < cadence.up + cadence.pause ? 'pausa' : 'baja';
  const phaseLeft = phase === 'sube' ? cadence.up - t : phase === 'pausa' ? cadence.up + cadence.pause - t : cycle - t;
  const reps = Math.floor(elapsed / cycle);

  useEffect(() => {
    if (!running) return;
    const key = `${reps}-${phase}`;
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (opts.sound) beep(phase === 'sube' ? 1250 : phase === 'baja' ? 700 : 950, 70, 0.16, 'sine');
    if (opts.vibration) vibrate(phase === 'sube' ? 25 : 12);
  }, [running, reps, phase, opts.sound, opts.vibration]);

  const start = useCallback(() => {
    lastPhase.current = '';
    setStartedAt(Date.now());
    setNow(Date.now());
    setRunning(true);
  }, []);
  /** Detiene y devuelve el tiempo bajo tensión (s). */
  const stop = useCallback((): number => {
    const tut = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    setRunning(false);
    setStartedAt(null);
    return tut;
  }, [startedAt]);

  return { running, elapsed, phase, phaseLeft, reps, start, stop };
}

export function TempoPanel({ tempo, cadence }: { tempo: ReturnType<typeof useTempo>; cadence: Cadence }) {
  const label = `${cadence.up}-${cadence.pause}-${cadence.down}`;
  if (!tempo.running) {
    return (
      <button onClick={tempo.start} className="press mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-md border border-line bg-raised/50 text-sm">
        <Play size={16} className="text-ember" aria-hidden />
        <span>
          Iniciar serie con metrónomo <span className="num text-muted">· tempo {label}</span>
        </span>
      </button>
    );
  }
  const phaseTotal = tempo.phase === 'sube' ? cadence.up : tempo.phase === 'pausa' ? cadence.pause : cadence.down;
  return (
    <div className="mt-3 rounded-md border border-ember/60 bg-ember/[0.07] p-3" role="timer" aria-live="off">
      <div className="flex items-center justify-between">
        <span className={`font-display text-3xl font-black uppercase leading-none ${tempo.phase === 'sube' ? 'text-ember' : 'text-fg'}`}>
          {tempo.phase === 'sube' ? '▲ Sube' : tempo.phase === 'baja' ? '▼ Baja' : '■ Pausa'}
        </span>
        <span className="text-right">
          <span className="num block text-2xl font-semibold leading-none">{mmss(tempo.elapsed)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">bajo tensión · rep {tempo.reps + 1}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden bg-raised" aria-hidden>
        <div className="h-full bg-ember transition-[width] duration-100 ease-linear" style={{ width: `${(1 - tempo.phaseLeft / Math.max(0.1, phaseTotal)) * 100}%` }} />
      </div>
      <button onClick={() => tempo.stop()} className="press mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-xs text-muted">
        <Pause size={13} aria-hidden /> Detener metrónomo
      </button>
    </div>
  );
}
