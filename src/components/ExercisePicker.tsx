import { motion } from 'framer-motion';
import { Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EXERCISES } from '@/data/exercises';
import { CLASS_LABEL, MUSCLES, MUSCLE_LABEL } from '@/data/labels';
import { isAvailable } from '@/engine/plan';
import type { ExerciseClass, Muscle } from '@/engine/types';
import { useApp } from '@/store/app';
import { Sheet } from './ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  title: string;
  initialMuscle?: Muscle | 'todos';
  exclude?: string[];
  currentId?: string;
}

const CLASSES: ExerciseClass[] = ['C1', 'C2', 'A', 'P'];

export function ExercisePicker({ open, onClose, onSelect, title, initialMuscle = 'todos', exclude = [], currentId }: Props) {
  const profile = useApp((s) => s.profile);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'todos'>(initialMuscle);
  const [cls, setCls] = useState<ExerciseClass | 'todas'>('todas');
  const [onlyMine, setOnlyMine] = useState(true);
  const [lastKey, setLastKey] = useState('');
  const key = `${open}-${initialMuscle}`;
  if (key !== lastKey) {
    setLastKey(key);
    setMuscle(initialMuscle);
    setQ('');
    setCls('todas');
  }

  const current = EXERCISES.find((e) => e.id === currentId);
  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const nq = norm(q);
    return EXERCISES.filter((e) => (muscle === 'todos' || e.primary === muscle) && (cls === 'todas' || e.cls === cls))
      .filter((e) => !nq || norm(e.name).includes(nq))
      .filter((e) => !onlyMine || isAvailable(e, profile))
      .sort((a, b) => {
        const altA = current?.alternatives.includes(a.id) ? 0 : 1;
        const altB = current?.alternatives.includes(b.id) ? 0 : 1;
        return altA - altB || a.name.localeCompare(b.name);
      });
  }, [q, muscle, cls, onlyMine, profile, current]);

  return (
    <Sheet open={open} onClose={onClose} title={title} eyebrow="Catálogo" wide>
      <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-surface px-5 pb-3">
        <label className="relative block">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-11" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" />
        </label>
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
          {(['todos', ...MUSCLES] as const).map((m) => (
            <button key={m} className="chip shrink-0" data-on={muscle === m} onClick={() => setMuscle(m)}>
              {m === 'todos' ? 'Todos' : MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['todas', ...CLASSES] as const).map((c) => (
            <button key={c} className="chip" data-on={cls === c} onClick={() => setCls(c)}>
              {c === 'todas' ? 'Todas las clases' : `${c} · ${CLASS_LABEL[c]}`}
            </button>
          ))}
          <button className="chip ml-auto" data-on={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>
            Sólo mi equipo
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {list.map((e, i) => {
          const disabled = exclude.includes(e.id) && e.id !== currentId;
          const isAlt = current?.alternatives.includes(e.id);
          return (
            <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
              <button
                disabled={disabled}
                onClick={() => onSelect(e.id)}
                className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors disabled:opacity-35 ${
                  e.id === currentId ? 'border-ember bg-ember/10' : 'border-line bg-raised/40 hover:border-line2'
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line font-display text-sm font-bold">{e.cls}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block text-xs text-muted">
                    {MUSCLE_LABEL[e.primary]} · fatiga {e.fatigue}/5
                    {isAlt && <span className="text-ember"> · alternativa</span>}
                    {disabled && ' · ya está en tu rutina'}
                    {!isAvailable(e, profile) && ' · no disponible'}
                  </span>
                </span>
                {e.safeFailure && <ShieldCheck size={16} className="shrink-0 text-ok" aria-label="Fallo seguro" />}
              </button>
            </motion.li>
          );
        })}
        {list.length === 0 && <li className="py-8 text-center text-sm text-muted">Nada con esos filtros.</li>}
      </ul>
    </Sheet>
  );
}
