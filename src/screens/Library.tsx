import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { AlertOctagon, ArrowLeft, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MuscleMap } from '@/components/MuscleMap';
import { Page, PageTitle, Rise } from '@/components/ui/Page';
import { EXERCISES, EXERCISE_BY_ID } from '@/data/exercises';
import { CLASS_LABEL, EQUIPMENT, EQUIPMENT_LABEL, MUSCLES, MUSCLE_LABEL, PATTERN_LABEL } from '@/data/labels';
import { isAvailable } from '@/engine/plan';
import { classRule } from '@/engine/rules';
import type { Equipment, Exercise, ExerciseClass, Muscle } from '@/engine/types';
import { useApp } from '@/store/app';

const CLASSES: ExerciseClass[] = ['C1', 'C2', 'A', 'P'];

export default function Library() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'todos'>('todos');
  const [cls, setCls] = useState<ExerciseClass | 'todas'>('todas');
  const [equip, setEquip] = useState<Equipment | 'todo'>('todo');
  const [safeOnly, setSafeOnly] = useState(false);

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const nq = norm(q);
    return EXERCISES.filter(
      (e) =>
        (muscle === 'todos' || e.primary === muscle) &&
        (cls === 'todas' || e.cls === cls) &&
        (equip === 'todo' || e.equipment.includes(equip)) &&
        (!safeOnly || e.safeFailure) &&
        (!nq || norm(e.name).includes(nq) || norm(MUSCLE_LABEL[e.primary]).includes(nq))
    );
  }, [q, muscle, cls, equip, safeOnly]);

  const selected = id ? EXERCISE_BY_ID[id] : undefined;

  return (
    <Page>
      <PageTitle eyebrow={`${EXERCISES.length} ejercicios · técnica primero`} title="Biblioteca" />
      <Rise className="space-y-3">
        <label className="relative block">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-11" placeholder="Buscar por nombre o músculo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </label>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {(['todos', ...MUSCLES] as const).map((m) => (
            <button key={m} className="chip shrink-0" data-on={muscle === m} onClick={() => setMuscle(m)}>
              {m === 'todos' ? 'Todos' : MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['todas', ...CLASSES] as const).map((c) => (
            <button key={c} className="chip" data-on={cls === c} onClick={() => setCls(c)}>
              {c === 'todas' ? 'Clase' : c}
            </button>
          ))}
          <select
            aria-label="Equipo"
            className="chip appearance-none bg-transparent pr-3"
            value={equip}
            onChange={(e) => setEquip(e.target.value as Equipment | 'todo')}
          >
            <option value="todo">Todo el equipo</option>
            {EQUIPMENT.map((e) => (
              <option key={e} value={e}>
                {EQUIPMENT_LABEL[e]}
              </option>
            ))}
          </select>
          <button className="chip" data-on={safeOnly} onClick={() => setSafeOnly(!safeOnly)}>
            <ShieldCheck size={13} /> Fallo seguro
          </button>
        </div>
      </Rise>

      <LayoutGroup>
        <motion.ul layout className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {list.map((e) => (
              <motion.li key={e.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <Link to={`/biblioteca/${e.id}`} className="block">
                  <motion.div layoutId={`ex-card-${e.id}`} className="card flex min-h-[88px] items-center gap-3 p-4 hover:border-line2">
                    <div className="w-16 shrink-0">
                      <MuscleMap values={{ [e.primary]: 1, ...Object.fromEntries(e.secondary.map((m) => [m, 0.35])) }} side={['espalda', 'femorales', 'gluteos', 'triceps', 'gemelos'].includes(e.primary) ? 'back' : 'front'} className="h-20 w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <motion.div layoutId={`ex-title-${e.id}`} className="font-display text-xl font-bold uppercase leading-tight">
                        {e.name}
                      </motion.div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span>{MUSCLE_LABEL[e.primary]}</span>·<span>{e.cls}</span>·<span>fatiga {e.fatigue}</span>
                        {e.safeFailure && <ShieldCheck size={13} className="text-ok" aria-label="Fallo seguro" />}
                        {!isAvailable(e, profile) && <span className="text-warn">no disponible</span>}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {list.length === 0 && <p className="py-10 text-center text-muted">Nada con esos filtros.</p>}

        <AnimatePresence>{selected && <Detail key={selected.id} ex={selected} onClose={() => navigate('/biblioteca')} />}</AnimatePresence>
      </LayoutGroup>
    </Page>
  );
}

function Detail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const mode = useApp((s) => s.settings.mode);
  const profile = useApp((s) => s.profile);
  const rule = classRule(ex, mode);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const values = { [ex.primary]: 1, ...Object.fromEntries(ex.secondary.map((m) => [m, 0.4])) } as Partial<Record<Muscle, number>>;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={ex.name}>
      <motion.div className="absolute inset-0 bg-black/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.article
        layoutId={`ex-card-${ex.id}`}
        className="card relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none bg-surface p-5 lg:max-w-3xl lg:rounded-2xl lg:p-8"
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      >
        <button onClick={onClose} className="mb-3 inline-flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft size={16} /> Biblioteca
        </button>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="eyebrow">
              {MUSCLE_LABEL[ex.primary]} · {CLASS_LABEL[ex.cls]} · {PATTERN_LABEL[ex.pattern]}
            </div>
            <motion.h2 layoutId={`ex-title-${ex.id}`} className="h-display mt-2 text-5xl">
              {ex.name}
            </motion.h2>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`chip ${ex.safeFailure ? '!border-ok/50 !text-ok' : '!border-warn/50 !text-warn'}`}>
                  {ex.safeFailure ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {ex.safeFailure ? 'Fallo seguro' : 'Fallo sólo con seguros/ayudante'}
                </span>
                <span className="chip">Fatiga {ex.fatigue}/5</span>
                {ex.unilateral && <span className="chip">Unilateral</span>}
                {ex.level === 'avanzado' && <span className="chip !text-warn">Sólo avanzado</span>}
                {!isAvailable(ex, profile) && <span className="chip !text-warn">No disponible con tu perfil</span>}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Fact label="Reps" value={`${rule.reps[0]}-${rule.reps[1]}`} />
                <Fact label="Esfuerzo" value={rule.effort === 'fallo' ? 'Fallo' : rule.effort} />
                <Fact label="Descanso" value={`${rule.rest} s`} />
              </div>
              <h3 className="h-display mt-6 text-2xl">Cues técnicos</h3>
              <ol className="mt-2 space-y-2">
                {ex.cues.map((c, i) => (
                  <li key={c} className="flex gap-3">
                    <span className="num mt-0.5 text-sm text-ember">0{i + 1}</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex gap-3 rounded-xl border border-ember/40 bg-ember/[0.07] p-4">
                <AlertOctagon size={18} className="mt-0.5 shrink-0 text-ember" />
                <div>
                  <div className="eyebrow mb-1 text-ember">Error común</div>
                  <p className="text-sm">{ex.commonError}</p>
                </div>
              </div>
              <div className="mt-5 text-sm text-muted">Equipo: {ex.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ')}</div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <MuscleMap values={values} className="mx-auto h-64 w-full" />
            <div className="mt-2 text-center text-xs text-muted">
              Primario: {MUSCLE_LABEL[ex.primary]}
              {ex.secondary.length > 0 && ` · Secundarios: ${ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}`}
            </div>
          </motion.div>
        </div>
        {ex.alternatives.length > 0 && (
          <>
            <h3 className="h-display mt-7 text-2xl">Alternativas</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ex.alternatives.map((a) => {
                const alt = EXERCISE_BY_ID[a];
                if (!alt) return null;
                return (
                  <Link key={a} to={`/biblioteca/${a}`} replace className="flex min-h-[52px] items-center justify-between rounded-xl border border-line px-4 hover:border-line2">
                    <span className="font-medium">{alt.name}</span>
                    <span className="text-xs text-muted">{alt.cls}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </motion.article>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 px-3 py-2.5">
      <div className="num text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
