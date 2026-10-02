import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoggedSet } from '@/engine/progression';
import type { Effort, PrescribedDay, Technique, WarmupSet } from '@/engine/types';
import { executionOrder } from '@/engine/time';
import { getExercise } from '@/data/exercises';

/** Instantánea de cada ejercicio al iniciar: la sesión no cambia si editas la rutina a mitad. */
export interface LiveItem {
  uid: string;
  exerciseId: string;
  reps: [number, number];
  effort: Effort;
  rest: number;
  technique?: Technique;
  warmups: WarmupSet[];
  workSets: number;
  priority: number;
  isMain: boolean;
  pairWith?: string;
  tempo: string;
}

export interface LiveTask {
  id: string;
  uid: string;
  kind: 'warmup' | 'work';
  setIndex: number;
  seconds: number;
  restAfter: number;
  restLabel: string;
  expectedStart: number;
}

export interface LiveLog extends LoggedSet {
  taskId: string;
  at: number;
}

interface LiveState {
  active: boolean;
  dayId: string | null;
  dayName: string;
  startedAt: number;
  plannedSeconds: number;
  conservative: boolean;
  deload: boolean;
  readiness?: { sleep: number; energy: number; pain: number; score: number };
  items: LiveItem[];
  tasks: LiveTask[];
  index: number;
  logs: LiveLog[];
  restEndsAt: number | null;
  restTotal: number;
  restLabel: string;
  trimNotes: string[];
  /** Momento en que se terminó (resumen visible aunque recargues). */
  endedAt: number | null;

  start: (day: PrescribedDay, opts: { conservative: boolean; deload: boolean; readiness?: LiveState['readiness'] }) => void;
  log: (set: Omit<LiveLog, 'at' | 'taskId'>) => void;
  addTechnique: (technique: string) => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
  goto: (index: number) => void;
  trim: () => string[];
  finish: () => void;
  abort: () => void;
}

export function buildTasks(day: PrescribedDay, deload: boolean): { items: LiveItem[]; tasks: LiveTask[] } {
  const items: LiveItem[] = executionOrder(day.items).map((i) => ({
    uid: i.uid,
    exerciseId: i.exercise.id,
    reps: i.reps,
    effort: i.effort,
    rest: i.rest,
    technique: i.technique,
    warmups: i.warmups,
    workSets: deload ? Math.max(1, Math.round(i.workSets * 0.6)) : i.workSets,
    priority: i.priority,
    isMain: i.isMain,
    pairWith: i.pairWith,
    tempo: i.tempo
  }));
  const allowed = new Map(items.map((i) => [i.uid, i.workSets]));
  const tasks: LiveTask[] = [];
  let t = 0;
  for (const step of day.timeline) {
    if (step.kind === 'warmup' || step.kind === 'work') {
      const keep = step.kind === 'warmup' || (step.setIndex ?? 0) < (allowed.get(step.uid!) ?? 0);
      if (keep) {
        tasks.push({
          id: `${step.uid}-${step.kind}-${step.setIndex}`,
          uid: step.uid!,
          kind: step.kind,
          setIndex: step.setIndex ?? 0,
          seconds: step.seconds,
          restAfter: 0,
          restLabel: '',
          expectedStart: t
        });
        t += step.seconds;
      }
    } else if (step.kind === 'general') {
      t += step.seconds;
    } else {
      const last = tasks[tasks.length - 1];
      if (last) {
        last.restAfter += step.seconds;
        last.restLabel = step.label;
      }
      t += step.seconds;
    }
  }
  // Recalcular inicios esperados tras quitar series de descarga
  let acc = day.timeline[0]?.kind === 'general' ? day.timeline[0].seconds : 0;
  for (const task of tasks) {
    task.expectedStart = acc;
    acc += task.seconds + task.restAfter;
  }
  const lastTask = tasks[tasks.length - 1];
  if (lastTask) lastTask.restAfter = 0;
  return { items, tasks };
}

export function plannedEnd(tasks: LiveTask[], general: number): number {
  return tasks.reduce((a, t) => a + t.seconds + t.restAfter, general);
}

export const useLive = create<LiveState>()(
  persist(
    (set, get) => ({
      active: false,
      dayId: null,
      dayName: '',
      startedAt: 0,
      plannedSeconds: 0,
      conservative: false,
      deload: false,
      items: [],
      tasks: [],
      index: 0,
      logs: [],
      restEndsAt: null,
      restTotal: 0,
      restLabel: '',
      trimNotes: [],
      endedAt: null,

      start: (day, opts) => {
        const { items, tasks } = buildTasks(day, opts.deload);
        const general = day.timeline[0]?.kind === 'general' ? day.timeline[0].seconds : 0;
        set({
          active: true,
          dayId: day.day.id,
          dayName: day.name,
          startedAt: Date.now(),
          plannedSeconds: plannedEnd(tasks, general),
          conservative: opts.conservative,
          deload: opts.deload,
          readiness: opts.readiness,
          items,
          tasks,
          index: 0,
          logs: [],
          restEndsAt: general > 0 ? Date.now() + general * 1000 : null,
          restTotal: general,
          restLabel: general > 0 ? 'Calentamiento general' : '',
          trimNotes: [],
          endedAt: null
        });
      },
      log: (s) => {
        const st = get();
        const task = st.tasks[st.index];
        if (!task) return;
        const logs = [...st.logs.filter((l) => l.taskId !== task.id), { ...s, taskId: task.id, at: Date.now() }];
        const rest = task.restAfter;
        set({
          logs,
          index: Math.min(st.index + 1, st.tasks.length),
          restEndsAt: rest > 0 ? Date.now() + rest * 1000 : null,
          restTotal: rest,
          restLabel: task.restLabel
        });
      },
      addTechnique: (technique) => {
        const st = get();
        const last = st.logs[st.logs.length - 1];
        if (!last) return;
        set({ logs: [...st.logs.slice(0, -1), { ...last, technique }] });
      },
      adjustRest: (delta) => {
        const st = get();
        if (!st.restEndsAt) return;
        const ends = Math.max(Date.now(), st.restEndsAt + delta * 1000);
        set({ restEndsAt: ends, restTotal: Math.max(1, st.restTotal + delta) });
      },
      skipRest: () => set({ restEndsAt: null }),
      goto: (index) => set({ index: Math.max(0, Math.min(index, get().tasks.length - 1)) }),
      /**
       * Recorte de un toque cuando vas >2 min atrasado. Orden: calentamientos de ejercicios
       * secundarios → series extra de menor prioridad. Nunca toca la serie ya en curso.
       */
      trim: () => {
        const st = get();
        const elapsed = (Date.now() - st.startedAt) / 1000;
        const done = st.tasks.slice(0, st.index);
        let remaining = st.tasks.slice(st.index);
        const itemBy = new Map(st.items.map((i) => [i.uid, i]));
        const ex = (uid: string) => itemBy.get(uid)!;
        const projected = () => elapsed + remaining.reduce((a, t) => a + t.seconds + t.restAfter, 0);
        const notes: string[] = [];
        const removeWhere = (pred: (t: LiveTask) => boolean, label: (t: LiveTask) => string, order: (a: LiveTask, b: LiveTask) => number) => {
          const cands = remaining.slice(1).filter(pred).sort(order);
          for (const c of cands) {
            if (projected() <= 2400) break;
            remaining = remaining.filter((t) => t.id !== c.id);
            notes.push(label(c));
          }
        };
        removeWhere(
          (t) => t.kind === 'warmup' && !ex(t.uid).isMain,
          (t) => `calentamiento de ${getExercise(ex(t.uid).exerciseId).name}`,
          (a, b) => ex(a.uid).priority - ex(b.uid).priority
        );
        removeWhere(
          (t) => t.kind === 'work' && t.setIndex >= 1,
          (t) => `${t.setIndex + 1}ª serie de ${getExercise(ex(t.uid).exerciseId).name}`,
          (a, b) => ex(a.uid).priority - ex(b.uid).priority || b.expectedStart - a.expectedStart
        );
        set({ tasks: [...done, ...remaining], trimNotes: [...st.trimNotes, ...notes] });
        return notes;
      },
      finish: () => set({ endedAt: get().endedAt ?? Date.now(), restEndsAt: null }),
      abort: () => set({ active: false, dayId: null, tasks: [], items: [], logs: [], index: 0, restEndsAt: null, trimNotes: [], endedAt: null })
    }),
    { name: 'heavy40-live', version: 1 }
  )
);
