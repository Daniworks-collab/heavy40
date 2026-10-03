import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Lightbulb, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getExercise } from '@/data/exercises';
import { MUSCLE_LABEL } from '@/data/labels';
import { applyAdvice, optimalZone, volumeAdvice, type VolumeAdvice } from '@/engine/advisor';
import type { Muscle, PlanResult, VolumeBand } from '@/engine/types';
import { BAND_LABEL, fmtSets } from '@/engine/validate';
import { stateConfig, useApp } from '@/store/app';
import { Skeleton } from './ui/Skeleton';

const BAND_CHIP: Record<VolumeBand, string> = {
  bajo: 'border-warn/60 text-warn',
  minimo: 'border-line2 text-fg',
  optimo: 'border-ok/60 text-ok',
  excesivo: 'border-ember/60 text-ember',
  ok: 'border-ok/60 text-ok',
  alto: 'border-warn/60 text-warn'
};

function BandChip({ band }: { band: VolumeBand }) {
  return <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BAND_CHIP[band]}`}>{BAND_LABEL[band]}</span>;
}

/** Recomendaciones para llevar cada músculo a su zona óptima de volumen semanal. */
export function VolumeAdvicePanel({ plan, selected, onClear }: { plan: PlanResult; selected: Muscle | null; onClear: () => void }) {
  const s = useApp();
  const [advice, setAdvice] = useState<VolumeAdvice[] | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  // Se calcula fuera del render (simula decenas de rutinas) para no trabar la interfaz.
  useEffect(() => {
    setAdvice(null);
    const id = setTimeout(() => {
      setAdvice(volumeAdvice(s.routine, s.profile, stateConfig(s), plan));
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const outOfZone = plan.weekly.filter((w) => {
    if (w.muscle === 'core') return false;
    const [lo, hi] = optimalZone(w.muscle);
    return w.sets < lo || w.sets > hi;
  });
  const list = (advice ?? []).filter((a) => !selected || a.muscle === selected);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-ember" aria-hidden />
          <h3 className="font-display text-xl font-black uppercase">Recomendaciones</h3>
        </div>
        {selected && (
          <button onClick={onClear} className="chip min-h-[36px]">
            {MUSCLE_LABEL[selected]} · ver todos
          </button>
        )}
      </div>

      {advice === null ? (
        <div className="space-y-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : outOfZone.length === 0 ? (
        <p className="rounded-md border border-ok/40 bg-ok/[0.07] px-4 py-3 text-sm">Todos tus músculos están en su zona óptima.</p>
      ) : list.length === 0 ? (
        <p className="rounded-md border border-line px-4 py-3 text-sm text-muted">
          {selected
            ? `No encontré un cambio que mejore ${MUSCLE_LABEL[selected].toLowerCase()} sin pasarte de tu tiempo o romper la recuperación.`
            : 'No encontré cambios que mejoren sin pasarte de tu tiempo.'}{' '}
          Prueba subir tu tiempo disponible, agregar un día o elegir otro estilo.
        </p>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {list.map((a, i) => {
              const inEx = getExercise(a.inExerciseId);
              const outEx = a.outExerciseId ? getExercise(a.outExerciseId) : undefined;
              const [lo, hi] = optimalZone(a.muscle);
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="overflow-hidden rounded-md border border-line bg-bg/50"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                    <span className="font-display text-lg font-black uppercase">{MUSCLE_LABEL[a.muscle]}</span>
                    <span className="num text-sm">
                      {fmtSets(a.before)} <ArrowRight size={12} className="inline text-muted" aria-label="pasa a" /> <span className="font-semibold">{fmtSets(a.after)}</span>
                    </span>
                    <span className="text-[11px] text-muted">series/sem · zona {lo}-{hi}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <BandChip band={a.beforeBand} />
                      <ArrowRight size={11} className="text-muted" aria-hidden />
                      <BandChip band={a.afterBand} />
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="eyebrow mb-1 !text-[10px]">
                      Día {a.dayIndex + 1} · {a.dayName}
                    </div>
                    <div className="text-[15px] leading-snug">
                      {a.kind === 'swap' && outEx ? (
                        <>
                          Cambia <span className="text-muted line-through decoration-ember/70">{outEx.name}</span> por{' '}
                          <span className="font-semibold text-fg">{inEx.name}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} className="mr-1 inline text-ember" aria-hidden />
                          Agrega <span className="font-semibold text-fg">{inEx.name}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <span className="num rounded-sm bg-ember px-2 py-1 font-semibold text-onember">
                        {a.prescription.sets} {a.prescription.sets === 1 ? 'serie' : 'series'} × {a.prescription.reps[0]}-{a.prescription.reps[1]} reps
                      </span>
                      <span className="rounded-sm border border-line px-2 py-1">{a.prescription.effort === 'fallo' ? 'al fallo' : a.prescription.effort}</span>
                      <span className="num rounded-sm border border-line px-2 py-1">descanso {a.prescription.rest} s</span>
                      {a.prescription.warmups > 0 && (
                        <span className="rounded-sm border border-line px-2 py-1">
                          +{a.prescription.warmups} calentamiento{a.prescription.warmups > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {a.sideEffects.length > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        También cambia:{' '}
                        {a.sideEffects
                          .map((x) => `${MUSCLE_LABEL[x.muscle]} ${fmtSets(x.before)}→${fmtSets(x.after)}${x.afterBand !== x.beforeBand ? ` (${BAND_LABEL[x.afterBand].toLowerCase()})` : ''}`)
                          .join(' · ')}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="num text-xs text-muted">Día quedaría en {Math.round(a.daySecondsAfter / 60)} min</span>
                      <button
                        onClick={() => {
                          s.updateRoutine((r) => applyAdvice(r, a));
                          setApplied(a.id);
                          setTimeout(() => setApplied(null), 1800);
                        }}
                        className="press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-ember px-4 font-display text-sm font-bold uppercase tracking-wide text-onember"
                      >
                        {applied === a.id ? <Check size={16} /> : null} Aplicar cambio
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Cada recomendación se simula con tu rutina completa: respeta tu tiempo disponible, tu estilo, tu equipo y la recuperación de tu split. Las series y reps son
        las que el motor asignaría.
      </p>
    </div>
  );
}
