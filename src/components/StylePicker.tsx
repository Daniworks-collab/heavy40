import { AnimatePresence, motion } from 'motion/react';
import { MODES, MODE_BLURB, MODE_LABEL } from '@/data/labels';
import type { Effort, Mode } from '@/engine/types';
import { useApp, withDefaults } from '@/store/app';
import { Stepper } from './ui/Stepper';
import { Toggle } from './ui/Toggle';

const SHORT: Record<Mode, string> = {
  adaptado: 'HD Adaptado',
  puro: 'HD Puro',
  fast40: 'Fast-40',
  clasico: 'Clásica',
  custom: 'Personalizado'
};

/** Selector de estilo de entrenamiento + editor del estilo personalizado. */
export function StylePicker({ onLines }: { onLines?: (l: string[]) => void }) {
  const mode = useApp((s) => s.settings.mode);
  const setMode = useApp((s) => s.setMode);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Estilo de entrenamiento">
        {MODES.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              const lines = setMode(m);
              onLines?.(lines);
            }}
            className={`press min-h-[52px] rounded-md border px-2 font-display text-[15px] font-bold uppercase leading-tight tracking-wide ${
              mode === m ? 'border-ember bg-ember text-onember' : 'border-line bg-raised/40 text-muted hover:text-fg'
            } ${m === 'custom' ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            {SHORT[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-fg">{MODE_LABEL[mode]}:</span> {MODE_BLURB[mode]}
      </p>
      <AnimatePresence initial={false}>
        {mode === 'custom' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <CustomStyleEditor onLines={onLines} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EFFORTS: { value: Effort; label: string }[] = [
  { value: 'fallo', label: 'Al fallo' },
  { value: '1 RIR', label: '1 RIR' },
  { value: '2 RIR', label: '2 RIR' },
  { value: '3 RIR', label: '3 RIR' }
];

export function CustomStyleEditor({ onLines }: { onLines?: (l: string[]) => void }) {
  const st = withDefaults(useApp((s) => s.settings));
  const update = useApp((s) => s.updateSettings);
  const c = st.custom;
  const set = (patch: Partial<typeof c>) => {
    const lines = update({ custom: { ...c, ...patch } });
    onLines?.(lines);
  };
  return (
    <div className="mt-4 space-y-4 rounded-md border border-ember/40 bg-ember/[0.05] p-4">
      <div className="eyebrow text-ember">Tu estilo</div>
      <Stepper label="Series por ejercicio" value={c.sets} min={1} max={8} step={1} onChange={(v) => set({ sets: Math.round(v) })} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stepper label="Reps mínimo" value={c.reps[0]} min={1} max={c.reps[1]} step={1} onChange={(v) => set({ reps: [Math.round(v), c.reps[1]] })} />
        <Stepper label="Reps máximo" value={c.reps[1]} min={c.reps[0]} max={40} step={1} onChange={(v) => set({ reps: [c.reps[0], Math.round(v)] })} />
      </div>
      <div>
        <div className="eyebrow mb-1.5">Esfuerzo objetivo</div>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Esfuerzo objetivo">
          {EFFORTS.map((e) => (
            <button
              key={e.value}
              role="radio"
              aria-checked={c.effort === e.value}
              onClick={() => set({ effort: e.value })}
              className={`press min-h-[48px] rounded-md border text-sm font-semibold ${c.effort === e.value ? 'border-ember bg-ember/15 text-fg' : 'border-line text-muted'}`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stepper label="Descanso compuestos" unit="segundos" value={c.restCompound} min={15} max={300} step={15} onChange={(v) => set({ restCompound: v })} />
        <Stepper label="Descanso aislamientos" unit="segundos" value={c.restIsolation} min={15} max={300} step={15} onChange={(v) => set({ restIsolation: v })} />
      </div>
      <Toggle label="Series de calentamiento" sub="Aproximaciones antes de los compuestos" on={c.warmups} onChange={(v) => set({ warmups: v })} />
      <p className="text-xs text-muted">Si no cabe en tu tiempo disponible, el motor recorta series de menor prioridad y te dice cuáles.</p>
    </div>
  );
}
