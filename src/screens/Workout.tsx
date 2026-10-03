import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { Calculator, Check, ChevronLeft, ChevronRight, Info, Replace, Scissors, ShieldAlert, SkipForward, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shockwave, Sparks } from '@/components/Fx';
import { SetCheck } from '@/components/Motion';
import { MuscleMap } from '@/components/MuscleMap';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Ring } from '@/components/ui/Ring';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { getExercise } from '@/data/exercises';
import { MUSCLES } from '@/data/labels';
import { db, type SessionRecord } from '@/db';
import { bestE1rm, dayGoal, detectPRs, epley, loadStep, roundLoad, suggestLoad, usesBar, warmupLoad, warmupPlan, type ExerciseSession, type LoggedSet, type PR } from '@/engine/progression';
import { classRule, softenEffort } from '@/engine/rules';
import { ExercisePicker } from '@/components/ExercisePicker';
import { PlateStack, ToolsSheet } from '@/components/Calculators';
import { FailToggle, PrevGoal, TechniqueChips, TempoPanel, WarmupLadder, useTempo } from '@/components/workout/SetControls';
import type { Effort, Muscle } from '@/engine/types';
import { useNow } from '@/hooks/useNow';
import { useSessions } from '@/hooks/useSessions';
import { useWakeLock } from '@/hooks/useWakeLock';
import { anvil, beep, vibrate } from '@/lib/feedback';
import { kg as fmtKg, int, mmss } from '@/lib/format';
import { rankFor, totalXp } from '@/lib/rank';
import { RankBadge } from '@/components/Rank';
import { useApp, withDefaults } from '@/store/app';
import { useLive, type LiveItem, type LiveTask } from '@/store/live';

interface PostFail {
  techniques: string[];
  suggested?: string;
  /** Rest-pause en curso: fin de la pausa de 15 s y mini-series hechas */
  rp?: { endsAt: number | null; done: number };
}

function historyFor(sessions: SessionRecord[] | undefined, exerciseId: string): ExerciseSession[] {
  return (sessions ?? [])
    .map((s) => ({ date: s.date, sets: s.sets.filter((x) => x.exerciseId === exerciseId) }))
    .filter((s) => s.sets.length > 0);
}

export default function Workout() {
  const live = useLive();
  const sessions = useSessions();
  const settings = withDefaults(useApp((s) => s.settings));
  const routineUpdate = useApp((s) => s.updateRoutine);
  const loads = useApp((s) => s.loads);
  const navigate = useNavigate();
  const finished = live.endedAt != null;
  const now = useNow(200, live.active && !finished);
  const [exitOpen, setExitOpen] = useState(false);
  const [shock, setShock] = useState(0);
  const [spark, setSpark] = useState(0);
  const [postFail, setPostFail] = useState<PostFail | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [lastKind, setLastKind] = useState<'warmup' | 'work'>('work');
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapUndo, setSwapUndo] = useState<{ uid: string; from: string; to: string } | null>(null);
  const [techs, setTechs] = useState<string[]>([]);

  useWakeLock(live.active && !finished);

  const task: LiveTask | undefined = live.tasks[live.index];
  const itemBy = useMemo(() => new Map(live.items.map((i) => [i.uid, i])), [live.items]);
  const item = task ? itemBy.get(task.uid) : undefined;
  const ex = item ? getExercise(item.exerciseId) : undefined;

  const elapsed = Math.max(0, (now - live.startedAt) / 1000);
  const restLeft = live.restEndsAt ? Math.max(0, (live.restEndsAt - now) / 1000) : 0;
  const resting = !!live.restEndsAt && restLeft > 0;
  const remainingPlanned = live.tasks.slice(live.index).reduce((a, t) => a + t.seconds + t.restAfter, 0);
  const projectedEnd = elapsed + (resting ? restLeft : 0) + remainingPlanned;
  const behind = projectedEnd - live.plannedSeconds;
  const done = live.active && live.index >= live.tasks.length;

  // ───── avisos de descanso (10 s y 0 s) ─────
  const warned = useRef<{ at: number | null; ten: boolean; zero: boolean }>({ at: null, ten: false, zero: false });
  useEffect(() => {
    if (warned.current.at !== live.restEndsAt) warned.current = { at: live.restEndsAt, ten: false, zero: false };
    if (!live.restEndsAt) return;
    if (restLeft <= 10 && restLeft > 0 && !warned.current.ten && live.restTotal > 15) {
      warned.current.ten = true;
      if (settings.sound) beep(660, 110, 0.15);
      if (settings.vibration) vibrate(80);
    }
    if (restLeft <= 0 && !warned.current.zero) {
      warned.current.zero = true;
      if (settings.sound) {
        beep(990, 160, 0.2);
        setTimeout(() => beep(1320, 260, 0.2), 180);
      }
      if (settings.vibration) vibrate([120, 60, 120]);
      useLive.getState().skipRest();
    }
  }, [restLeft, live.restEndsAt, live.restTotal, settings.sound, settings.vibration]);

  // ───── cadencia configurable + tiempo bajo tensión ─────
  const tempo = useTempo(settings.cadence, { sound: settings.sound, vibration: settings.vibration });

  // ───── valores de la serie actual ─────
  const suggestion = useMemo(() => {
    if (!item || !ex) return undefined;
    const hist = historyFor(sessions, ex.id);
    return suggestLoad(ex, item.reps, item.effort, hist.at(-1), loads[ex.id], settings.increments);
  }, [item, ex, sessions, loads, settings.increments]);

  const lastSession = useMemo(() => (ex ? historyFor(sessions, ex.id).at(-1) : undefined), [ex, sessions]);
  const goal = useMemo(
    () => (item && ex ? dayGoal(ex, item.reps, item.effort, lastSession, loads[ex.id], settings.increments) : undefined),
    [item, ex, lastSession, loads, settings.increments]
  );

  const workKg = useMemo(() => {
    if (!item || !ex) return 0;
    const loggedWork = live.logs.filter((l) => l.exerciseId === ex.id && l.kind === 'work');
    if (loggedWork.length) return loggedWork[loggedWork.length - 1].kg;
    const base = suggestion?.kg ?? 0;
    return live.deload ? roundLoad(ex, base * 0.9) : base;
  }, [item, ex, live.logs, suggestion, live.deload]);

  const [kgVal, setKg] = useState(0);
  const [repsVal, setReps] = useState(8);
  const [effort, setEffort] = useState<Effort>('fallo');
  useEffect(() => {
    if (!task || !item || !ex) return;
    if (task.kind === 'warmup') {
      const w = item.warmups[task.setIndex];
      setKg(warmupLoad(ex, workKg || 0, w?.pct ?? 60));
      setReps(parseInt(w?.reps ?? '6', 10));
    } else {
      const prevLog = live.logs.filter((l) => l.exerciseId === ex.id && l.kind === 'work').at(-1);
      setKg(workKg);
      setReps(prevLog ? prevLog.reps : goal && goal.action !== 'calibrar' ? goal.reps : Math.ceil((item.reps[0] + item.reps[1]) / 2));
      setEffort(item.effort === '3 RIR' ? '2 RIR' : item.effort);
    }
    setTechs([]);
    if (tempo.running) tempo.stop();
    // workKg cambia cuando termina de cargar el historial: re-sugerir la carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, workKg]);

  if (!live.active) return <Navigate to="/" replace />;

  const onDone = () => {
    if (!task || !item || !ex) return;
    setPostFail(null);
    const measured = tempo.running ? tempo.stop() : 0;
    const cad = settings.cadence.up + settings.cadence.pause + settings.cadence.down;
    const set: LoggedSet = {
      exerciseId: ex.id,
      kind: task.kind,
      kg: kgVal,
      reps: repsVal,
      effort: task.kind === 'warmup' ? '3 RIR' : effort,
      technique: task.kind === 'work' && techs.length ? techs.join(', ') : undefined,
      tut: task.kind === 'work' ? measured || repsVal * cad : undefined
    };
    // ¿PR en vivo?
    if (task.kind === 'work') {
      const hist = historyFor(sessions, ex.id).flatMap((h) => h.sets);
      const prevBest = Math.max(bestE1rm(hist), bestE1rm(live.logs.filter((l) => l.exerciseId === ex.id)));
      if (hist.length && epley(kgVal, repsVal) > prevBest + 0.01) {
        setSpark((s) => s + 1);
        setToast(`PR · e1RM ${fmtKg(Math.round(epley(kgVal, repsVal) * 10) / 10)} kg`);
        setTimeout(() => setToast(null), 2600);
      }
    }
    setLastKind(task.kind);
    setShock((s) => s + 1);
    if (settings.sound) anvil();
    if (settings.vibration) vibrate(task.kind === 'work' ? [40, 30, 70] : 30);
    live.log(set);
    // Rest-pause marcado: cuenta de 15 s y mini-series al fallo
    if (task.kind === 'work' && techs.includes('rest-pause')) {
      setPostFail({ techniques: [], rp: { endsAt: Date.now() + 15000, done: 0 } });
    }
  };

  const gotoExercise = (dir: 1 | -1) => {
    const order = [...new Set(live.tasks.map((t) => t.uid))];
    const cur = task ? order.indexOf(task.uid) : order.length - 1;
    const target = order[cur + dir];
    if (!target) return;
    const loggedIds = new Set(live.logs.map((l) => l.taskId));
    const idx = live.tasks.findIndex((t) => t.uid === target && !loggedIds.has(t.id));
    const first = live.tasks.findIndex((t) => t.uid === target);
    live.goto(idx >= 0 ? idx : first);
    useLive.getState().skipRest();
  };

  const onSwipe = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -90) gotoExercise(1);
    else if (info.offset.x > 90) gotoExercise(-1);
  };

  if (done || finished) {
    return <Summary onExit={() => navigate('/')} />;
  }

  const exIndex = task ? [...new Set(live.tasks.map((t) => t.uid))].indexOf(task.uid) : 0;
  const exTotal = new Set(live.tasks.map((t) => t.uid)).size;
  const warmIdx = task?.kind === 'warmup' ? task.setIndex : -1;
  const progress = live.index / Math.max(1, live.tasks.length);
  const budget = live.budget || 2400;
  const remaining = budget - elapsed;
  const sessionVolume = live.logs.filter((l) => l.kind === 'work').reduce((a, l) => a + l.kg * l.reps, 0);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-[max(env(safe-area-inset-top),12px)]">
      {/* ───── Barra superior: reloj global ───── */}
      <header className="flex items-center gap-3">
        <button onClick={() => setExitOpen(true)} className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted" aria-label="Salir de la sesión">
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className={`num text-[34px] font-semibold leading-none tracking-tight ${remaining < 0 ? 'text-ember' : ''}`} aria-label={`Tiempo restante de ${Math.round(budget / 60)} minutos`}>
            {mmss(remaining)}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-[11px]">
            <span className="text-muted">transcurrido {mmss(elapsed)}</span>
            {sessionVolume > 0 && (
              <span className="num text-muted">
                · <NumberTicker value={sessionVolume} duration={0.5} className="text-fg" /> kg
              </span>
            )}
            <span
              className={`num rounded-full px-2 py-0.5 font-semibold ${
                behind > 60 ? 'bg-ember/15 text-ember' : behind < -30 ? 'bg-ok/15 text-ok' : 'bg-raised text-muted'
              }`}
            >
              {behind > 30 ? `+${mmss(behind)} atrasado` : behind < -30 ? `${mmss(-behind)} adelantado` : 'en ritmo'}
            </span>
          </div>
        </div>
        <button onClick={() => setToolsOpen(true)} className="press grid h-12 w-12 place-items-center rounded-full border border-line text-muted" aria-label="Calculadoras de discos y calentamiento">
          <Calculator size={20} />
        </button>
      </header>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised">
        <motion.div className="h-full bg-ember" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
      </div>

      <AnimatePresence>
        {behind > 120 && projectedEnd > budget && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => {
              const notes = live.trim();
              setToast(notes.length ? `Recorté: ${notes.join(', ')}` : 'No queda nada que recortar sin tocar lo esencial');
              setTimeout(() => setToast(null), 4000);
            }}
            className="mt-3 flex min-h-[52px] items-center gap-3 rounded-xl border border-ember/50 bg-ember/10 px-4 text-left text-sm"
          >
            <Scissors size={18} className="shrink-0 text-ember" />
            <span className="flex-1">
              Vas <span className="num font-semibold">{mmss(behind)}</span> atrasado. Toca para recortar y terminar a tiempo.
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ───── Cuerpo ───── */}
      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {resting || postFail?.rp ? (
            <RestView
              key="rest"
              left={restLeft}
              total={live.restTotal}
              label={live.restLabel}
              nextTask={task}
              nextItem={item}
              nextKg={kgVal}
              postFail={postFail}
              now={now}
              onTechnique={(t) => {
                if (t === 'rest-pause') {
                  live.addTechnique('rest-pause');
                  setPostFail((p) => (p ? { ...p, rp: { endsAt: Date.now() + 15000, done: 0 } } : p));
                  return;
                }
                live.addTechnique(t);
                setPostFail(null);
              }}
              onMini={() => {
                if (!postFail?.rp) return;
                const done = postFail.rp.done + 1;
                live.addTechnique(`rest-pause ×${done}`);
                if (settings.vibration) vibrate(40);
                setPostFail(done >= 3 ? null : { ...postFail, rp: { endsAt: Date.now() + 15000, done } });
              }}
              onDismissPost={() => setPostFail(null)}
            />
          ) : task && item && ex ? (
            <motion.section
              key={task.id}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, x: -32, transition: { duration: 0.12 } }}
              className="flex flex-1 flex-col pt-4"
            >
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.35} onDragEnd={onSwipe} className="card-forge touch-pan-y overflow-hidden p-5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">
                    Ejercicio {exIndex + 1}/{exTotal}
                    {item.pairWith && ' · en par'}
                  </span>
                  <span className="flex gap-1">
                    <button onClick={() => setSwapOpen(true)} className="press inline-flex h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs text-muted" aria-label={`Sustituir ${ex.name}`}>
                      <Replace size={14} aria-hidden /> Sustituir
                    </button>
                    <button onClick={() => gotoExercise(-1)} className="grid h-9 w-9 place-items-center rounded-full text-muted" aria-label="Ejercicio anterior">
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => gotoExercise(1)} className="grid h-9 w-9 place-items-center rounded-full text-muted" aria-label="Ejercicio siguiente">
                      <ChevronRight size={18} />
                    </button>
                  </span>
                </div>
                <h1 className="h-display mt-1 text-[44px] leading-[0.88]">{ex.name}</h1>
                {task.kind === 'work' && (
                  <div className="mt-3 inline-flex items-stretch overflow-hidden rounded-md border border-ember/60 font-display font-black uppercase">
                    <span className="bg-ember px-2.5 py-1 text-lg leading-none tracking-wider text-onember">Serie</span>
                    <span className="num px-2.5 py-1 text-lg leading-none">
                      {task.setIndex + 1}
                      <span className="text-muted">/{item.workSets}</span>
                    </span>
                  </div>
                )}
                <SetDots item={item} task={task} logs={live.logs} tasks={live.tasks} />
                {task.kind === 'warmup' ? (
                  <div className="mt-3">
                    <span className="font-display text-base font-bold uppercase tracking-wide text-muted">
                      Calentamiento {warmIdx + 1}/{item.warmups.length} · sin fatiga
                    </span>
                    <WarmupLadder steps={warmupPlan(ex, workKg, item.warmups)} current={warmIdx} workKg={workKg} />
                    {workKg === 0 && <div className="mt-1.5 text-xs text-muted">Sin carga de referencia todavía: usa un peso cómodo; la primera serie efectiva calibra el resto.</div>}
                  </div>
                ) : (
                  <div className="mt-3 text-[15px]">
                    <span className="font-semibold text-fg">
                      {item.reps[0]}-{item.reps[1]} reps
                    </span>
                    <span className="text-muted"> · </span>
                    <span className={item.effort === 'fallo' ? 'font-semibold text-ember' : 'font-semibold'}>{item.effort === 'fallo' ? 'al fallo' : item.effort}</span>
                    <span className="text-muted"> · tempo {item.tempo}</span>
                    {item.technique && item.technique !== 'pre-agotamiento' && task.setIndex === item.workSets - 1 && (
                      <span className="text-ember"> · {item.technique}</span>
                    )}
                    {item.technique === 'pre-agotamiento' && <span className="text-ember"> · pre-agotamiento: 15 s al siguiente</span>}
                  </div>
                )}
                {task.kind === 'work' && goal && (
                  <PrevGoal
                    goal={live.deload ? { ...goal, goalText: `${goal.goalText} · descarga −10 %` } : goal}
                    prevSets={lastSession?.sets.filter((x) => x.kind === 'work') ?? []}
                    current={task.setIndex}
                  />
                )}
                {task.kind === 'work' && !ex.safeFailure && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-warn">
                    <ShieldAlert size={14} /> Peso libre: seguros puestos o ayudante. Técnica antes que carga.
                  </div>
                )}
                <details className="mt-3 text-sm text-muted">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Info size={13} /> Técnica
                  </summary>
                  <ul className="mt-2 space-y-1 pl-1">
                    {ex.cues.map((c) => (
                      <li key={c}>— {c}</li>
                    ))}
                  </ul>
                </details>
              </motion.div>

              {task.kind === 'work' && <TempoPanel tempo={tempo} cadence={settings.cadence} />}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Stepper label="Carga" unit="kg" value={kgVal} onChange={setKg} step={loadStep(ex)} big format={fmtKg} />
                  {usesBar(ex) && kgVal > 0 && (
                    <button onClick={() => setToolsOpen(true)} className="mt-1 block w-full text-center">
                      <PlateStack total={kgVal} compact />
                    </button>
                  )}
                </div>
                <Stepper label="Reps" value={repsVal} onChange={setReps} step={1} min={0} max={50} big />
              </div>
              {task.kind === 'work' && (
                <>
                  <FailToggle effort={effort} onChange={setEffort} />
                  <TechniqueChips value={techs} onChange={setTechs} suggested={task.setIndex === item.workSets - 1 ? item.technique : undefined} />
                </>
              )}

              <div className="sticky bottom-0 z-20 -mx-4 mt-auto bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-6">
                <div className="relative" style={{ filter: 'drop-shadow(0 10px 28px rgb(var(--ember) / 0.35))' }}>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    onClick={onDone}
                    className="btn-ember relative min-h-[88px] w-full gap-3 font-black"
                  >
                    <Check size={30} strokeWidth={3} aria-hidden />
                    <span className={task.kind === 'warmup' ? 'text-2xl' : 'text-[34px] tracking-[0.06em]'}>{task.kind === 'warmup' ? 'Calentamiento hecho' : 'Serie hecha'}</span>
                  </motion.button>
                </div>
                <p className="mt-1.5 text-center text-[11px] text-muted">Desliza la tarjeta para cambiar de ejercicio</p>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Feedback de "serie hecha": capa fija sobre el botón, sobrevive al cambio a descanso */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),12px)] z-40 mx-auto h-[88px] max-w-xl px-4" aria-hidden>
        <div className="relative h-full w-full">
          <Shockwave trigger={shock} />
          <Sparks trigger={spark} />
          <SetCheck trigger={shock} warmup={lastKind === 'warmup'} />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-ember/50 bg-surface px-4 py-3 text-sm shadow-2xl"
            role="status"
          >
            <Trophy size={16} className="shrink-0 text-ember" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <ToolsSheet open={toolsOpen} onClose={() => setToolsOpen(false)} initialKg={kgVal || workKg} />

      {item && ex && (
        <ExercisePicker
          open={swapOpen}
          onClose={() => setSwapOpen(false)}
          title="Sustituir ejercicio"
          initialMuscle={ex.primary}
          currentId={ex.id}
          exclude={live.items.map((i) => i.exerciseId)}
          onSelect={(id) => {
            const nx = getExercise(id);
            const rule = classRule(nx, settings.mode, { restOverrides: settings.restOverrides, repRange: settings.repRange, custom: settings.custom });
            live.swapExercise(item.uid, {
              exerciseId: id,
              reps: rule.reps,
              effort: live.conservative ? softenEffort(rule.effort) : rule.effort,
              rest: rule.rest,
              technique: undefined
            });
            setSwapOpen(false);
            setToast(`Hoy: ${nx.name} en lugar de ${ex.name}`);
            setSwapUndo({ uid: item.uid, from: ex.id, to: id });
            setTimeout(() => setToast(null), 3500);
          }}
        />
      )}

      <AnimatePresence>
        {swapUndo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm shadow-2xl"
          >
            <span className="flex-1">¿Guardar el cambio también en tu rutina?</span>
            <button
              className="press min-h-[44px] rounded-md bg-ember px-3 font-display font-bold uppercase text-onember"
              onClick={() => {
                routineUpdate((r) => ({
                  days: r.days.map((d) => ({ ...d, slots: d.slots.map((sl) => (sl.uid === swapUndo.uid ? { ...sl, exerciseId: swapUndo.to, lockedSets: undefined } : sl)) }))
                }));
                setSwapUndo(null);
              }}
            >
              Guardar
            </button>
            <button className="press min-h-[44px] px-2 text-muted" onClick={() => setSwapUndo(null)} aria-label="Sólo hoy">
              Sólo hoy
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="¿Salir?" eyebrow="Sesión en curso">
        <p className="mb-4 text-sm text-muted">Puedes terminar ahora y guardar lo hecho, o descartar la sesión. Si sólo quieres ver otra pantalla, vuelve atrás: la sesión sigue corriendo.</p>
        <div className="grid gap-2">
          <button className="btn-ghost" onClick={() => navigate('/')}>
            Dejarla en segundo plano
          </button>
          <button
            className="btn-ember"
            onClick={() => {
              setExitOpen(false);
              live.finish();
            }}
            disabled={live.logs.filter((l) => l.kind === 'work').length === 0}
          >
            Terminar y guardar
          </button>
          <button
            className="btn-ghost !border-ember/40 text-ember"
            onClick={() => {
              live.abort();
              navigate('/');
            }}
          >
            Descartar sesión
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function SetDots({ item, task, logs, tasks }: { item: LiveItem; task: LiveTask; logs: { taskId: string }[]; tasks: LiveTask[] }) {
  const mine = tasks.filter((t) => t.uid === item.uid);
  const logged = new Set(logs.map((l) => l.taskId));
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label="Series del ejercicio">
      {mine.map((t) => {
        const isCur = t.id === task.id;
        const isDone = logged.has(t.id);
        const warm = t.kind === 'warmup';
        return (
          <motion.span
            key={t.id}
            layout
            className={`rounded-full ${warm ? 'h-2.5 w-2.5 border' : 'h-3 w-7'} ${
              isDone ? (warm ? 'border-fg/60 bg-fg/60' : 'bg-ember') : isCur ? (warm ? 'border-ember' : 'bg-ember/40 ring-1 ring-ember') : warm ? 'border-line2' : 'bg-line'
            }`}
            animate={isCur ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={isCur ? { repeat: Infinity, duration: 1.6 } : undefined}
          />
        );
      })}
    </div>
  );
}

function RestView({
  left,
  total,
  label,
  nextTask,
  nextItem,
  nextKg,
  postFail,
  now,
  onTechnique,
  onMini,
  onDismissPost
}: {
  left: number;
  total: number;
  label: string;
  nextTask?: LiveTask;
  nextItem?: LiveItem;
  nextKg: number;
  postFail: PostFail | null;
  now: number;
  onTechnique: (t: string) => void;
  onMini: () => void;
  onDismissPost: () => void;
}) {
  const rpLeft = postFail?.rp?.endsAt ? Math.max(0, (postFail.rp.endsAt - now) / 1000) : 0;
  const rpBeeped = useRef<number | null>(null);
  useEffect(() => {
    if (postFail?.rp?.endsAt && rpLeft <= 0 && rpBeeped.current !== postFail.rp.endsAt) {
      rpBeeped.current = postFail.rp.endsAt;
      beep(1100, 160, 0.2);
      vibrate([80, 40, 80]);
    }
  }, [rpLeft, postFail?.rp?.endsAt]);
  const adjust = useLive((s) => s.adjustRest);
  const skip = useLive((s) => s.skipRest);
  const nextEx = nextItem ? getExercise(nextItem.exerciseId) : undefined;
  const warn = left <= 10;
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      className="flex flex-1 flex-col items-center pt-6"
    >
      <AnimatePresence>
        {postFail && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card mb-5 w-full p-4"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow text-ember">{postFail.rp ? 'Rest-pause · 15 s' : 'Post-fallo · opcional'}</span>
              <button onClick={onDismissPost} className="text-xs text-muted">
                No, gracias
              </button>
            </div>
            {postFail.rp ? (
              <div className="mt-3 flex items-center gap-4">
                <Ring value={rpLeft / 15} size={76} stroke={6} ticks={15} instant label={`Rest-pause: ${Math.ceil(rpLeft)} s`}>
                  <span className="num text-xl font-semibold">{Math.ceil(rpLeft)}</span>
                </Ring>
                <div className="flex-1">
                  <div className="text-sm">
                    {rpLeft > 0 ? 'Respira. Misma carga en…' : '¡Ya! Mini-serie al fallo.'}
                  </div>
                  <div className="num text-xs text-muted">Mini-series: {postFail.rp.done}/3</div>
                  <button onClick={onMini} disabled={rpLeft > 0} className="btn-ember mt-2 w-full !min-h-[44px] !text-base">
                    Mini-serie hecha
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {postFail.techniques.map((t) => (
                  <button key={t} onClick={() => onTechnique(t)} data-on={t === postFail.suggested} className="chip min-h-[48px] justify-center text-sm capitalize">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="eyebrow mb-3">{label || 'Descanso'}</div>
      <Ring value={total > 0 ? left / total : 0} size={260} stroke={14} ticks={60} tone={warn ? 'warn' : 'ember'} label={`Descanso: quedan ${Math.ceil(left)} segundos`} instant>
        <div className="text-center">
          <div className={`num text-7xl font-semibold leading-none ${warn ? 'text-warn' : ''}`}>{mmss(left)}</div>
          <div className="mt-2 text-xs text-muted">de {mmss(total)}</div>
        </div>
      </Ring>
      <div className="mt-6 grid w-full grid-cols-3 gap-2">
        <button className="btn-ghost num !font-mono !text-base normal-case" onClick={() => adjust(-15)}>
          −15 s
        </button>
        <button className="btn-ghost" onClick={skip}>
          <SkipForward size={18} /> Saltar
        </button>
        <button className="btn-ghost num !font-mono !text-base normal-case" onClick={() => adjust(15)}>
          +15 s
        </button>
      </div>
      {nextEx && nextTask && nextItem && (
        <div className="mt-auto w-full rounded-xl border border-line bg-raised/40 p-4">
          <div className="eyebrow mb-1">A continuación</div>
          <div className="font-display text-2xl font-bold uppercase leading-tight">{nextEx.name}</div>
          <div className="mt-1 text-sm text-muted">
            {nextTask.kind === 'warmup'
              ? `Calentamiento ${nextItem.warmups[nextTask.setIndex]?.pct}% × ${nextItem.warmups[nextTask.setIndex]?.reps}`
              : `Serie efectiva ${nextTask.setIndex + 1}/${nextItem.workSets} · ${nextItem.reps[0]}-${nextItem.reps[1]} reps`}
            {nextKg > 0 && <span className="num text-fg"> · {fmtKg(nextKg)} kg</span>}
          </div>
        </div>
      )}
    </motion.section>
  );
}

// ───────────────────────── Resumen ─────────────────────────

function Summary({ onExit }: { onExit: () => void }) {
  const live = useLive();
  const sessions = useSessions();
  const mode = useApp((s) => s.settings.mode);
  const [saved, setSaved] = useState(false);
  const [spark, setSpark] = useState(0);
  const [notes, setNotes] = useState('');
  const budget = live.budget || 2400;
  useEffect(() => {
    if (live.endedAt == null) live.finish();
  }, [live]);

  const duration = Math.round(((live.endedAt ?? Date.now()) - live.startedAt) / 1000);
  const work = live.logs.filter((l) => l.kind === 'work');
  const volume = work.reduce((a, s) => a + s.kg * s.reps, 0);
  const muscles: Partial<Record<Muscle, number>> = {};
  for (const s of work) {
    const ex = getExercise(s.exerciseId);
    muscles[ex.primary] = (muscles[ex.primary] ?? 0) + 1;
    for (const m of ex.secondary) muscles[m] = (muscles[m] ?? 0) + 0.5;
  }
  const maxM = Math.max(1, ...Object.values(muscles).map((v) => v ?? 0));
  const norm = Object.fromEntries(MUSCLES.map((m) => [m, (muscles[m] ?? 0) / maxM]));

  const prs: PR[] = useMemo(() => {
    if (!sessions) return [];
    const ids = [...new Set(work.map((w) => w.exerciseId))];
    return ids.flatMap((id) => detectPRs(getExercise(id), work, historyFor(sessions, id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // ───── XP y rango ─────
  const perWeek = useApp((s) => s.routine.days.length);
  const xpBefore = useMemo(() => totalXp(sessions ?? [], perWeek), [sessions, perWeek]);
  const xpAfter = useMemo(() => {
    const fake = { date: new Date(live.startedAt).toISOString(), sets: work, prs, durationSec: duration, budgetSec: budget } as unknown as SessionRecord;
    return totalXp([...(sessions ?? []), fake], perWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, prs, duration]);
  const before = rankFor(xpBefore);
  const after = rankFor(xpAfter);
  const rankUp = after.index > before.index;

  useEffect(() => {
    if (prs.length || rankUp) {
      const t = setTimeout(() => setSpark(1), 700);
      return () => clearTimeout(t);
    }
  }, [prs.length, rankUp]);

  const save = async () => {
    if (saved) return;
    setSaved(true);
    await db.sessions.add({
      date: new Date(live.startedAt).toISOString(),
      dayId: live.dayId ?? '',
      dayName: live.dayName,
      mode,
      durationSec: duration,
      plannedSec: live.plannedSeconds,
      conservative: live.conservative,
      deload: live.deload,
      readiness: live.readiness,
      sets: live.logs.map(({ exerciseId, kind, kg, reps, effort, technique }) => ({ exerciseId, kind, kg, reps, effort, technique })),
      prs,
      volumeKg: volume,
      muscles,
      budgetSec: budget,
      notes: notes.trim() || undefined
    });
    live.abort();
    onExit();
  };

  const under = duration <= budget;
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-8 pt-[max(env(safe-area-inset-top),20px)]"
    >
      <motion.div variants={rise} className="eyebrow">Sesión terminada · {live.dayName}</motion.div>
      <motion.h1 variants={rise} className="h-display mt-2 text-6xl">
        {under ? 'Forjado.' : 'Hecho.'}
      </motion.h1>

      <motion.div variants={rise} className={`card-forge relative mt-6 overflow-hidden p-5 ${rankUp ? 'border-ember' : ''}`}>
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        {rankUp && <Sparks trigger={spark} count={30} />}
        <div className="relative flex items-center gap-4">
          <RankBadge index={after.index} size={58} />
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{rankUp ? '¡Subiste de rango!' : `Rango · ${after.rank.name}`}</div>
            <div className="h-display text-[40px] leading-none text-ember">
              +<NumberTicker value={xpAfter - xpBefore} /> XP
            </div>
            {rankUp && <div className="font-display text-xl font-bold uppercase">Ahora eres {after.rank.name}</div>}
          </div>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden bg-raised" aria-hidden>
          <motion.div
            className="absolute inset-y-0 left-0 bg-ember"
            initial={{ width: `${(rankUp ? 0 : before.progress) * 100}%` }}
            animate={{ width: `${after.progress * 100}%` }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="relative mt-1.5 flex justify-between text-[11px] text-muted">
          <span className="num">{int(xpAfter)} XP</span>
          <span>{after.next ? `${int(after.toNext)} para ${after.next.name}` : 'Rango máximo'}</span>
        </div>
      </motion.div>

      <motion.div variants={rise} className="card mt-4 flex items-center gap-5 p-5">
        <Ring value={duration / budget} size={132} stroke={10} tone={under ? 'ember' : 'warn'} label={`Duración ${mmss(duration)} de ${Math.round(budget / 60)} minutos`}>
          <div className="text-center leading-none">
            <div className="num text-3xl font-semibold">{mmss(duration)}</div>
            <div className="eyebrow mt-1 !text-[10px]">de {mmss(budget)}</div>
          </div>
        </Ring>
        <div className="grid flex-1 gap-3">
          <div>
            <div className="num text-3xl font-semibold">
              <NumberTicker value={volume} /> <span className="text-base text-muted">kg</span>
            </div>
            <div className="text-xs text-muted">Volumen (kg × reps)</div>
          </div>
          <div>
            <div className="num text-3xl font-semibold">
              <NumberTicker value={work.length} />
            </div>
            <div className="text-xs text-muted">Series efectivas</div>
          </div>
        </div>
      </motion.div>

      {prs.length > 0 && (
        <motion.div variants={rise} className="card relative mt-4 overflow-hidden border-ember/50 p-5">
          <Sparks trigger={spark} count={28} />
          <div className="eyebrow mb-2 flex items-center gap-2 text-ember">
            <Trophy size={14} /> Récords personales
          </div>
          <ul className="space-y-1.5">
            {prs.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{getExercise(p.exerciseId).name}</span>
                <span className="num shrink-0 text-ember">{p.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div variants={rise} className="card mt-4 p-5">
        <div className="eyebrow mb-2">Músculos trabajados</div>
        <MuscleMap values={norm} className="mx-auto h-72 w-full" />
      </motion.div>

      {live.trimNotes.length > 0 && (
        <motion.p variants={rise} className="mt-4 text-sm text-muted">
          Recortado en vivo: {live.trimNotes.join(', ')}.
        </motion.p>
      )}

      <motion.label variants={rise} className="mt-4 block">
        <span className="eyebrow mb-1.5 block">Nota de la sesión (opcional)</span>
        <textarea
          className="field min-h-[88px] resize-none py-3"
          placeholder="Ej.: dormí mal, molestia leve en hombro izquierdo, gran bomba en pecho…"
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
        />
      </motion.label>

      <motion.div variants={rise} className="mt-6 grid gap-2">
        <button className="btn-ember min-h-[60px] text-xl" onClick={save} disabled={saved}>
          Guardar sesión
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            live.abort();
            onExit();
          }}
        >
          Descartar
        </button>
      </motion.div>
    </motion.div>
  );
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } }
};
