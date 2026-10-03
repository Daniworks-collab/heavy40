import { EXERCISES, EXERCISE_BY_ID } from '@/data/exercises';
import { isAvailable } from './plan';
import { computePlan } from './recalc';
import { SMALL } from './rules';
import { bandFor } from './validate';
import type { Effort, EngineConfig, Exercise, Muscle, MuscleVolume, PlanResult, Profile, Routine, VolumeBand } from './types';

/**
 * Asesor de volumen: para cada músculo fuera de su zona óptima propone el cambio de ejercicio
 * (o el ejercicio a agregar) que mejor acerca TODOS los músculos a su zona, simulando la rutina
 * completa con el motor (tiempo, relleno, recortes y recuperación incluidos).
 */

export interface VolumeAdvice {
  id: string;
  muscle: Muscle;
  direction: 'subir' | 'bajar';
  kind: 'swap' | 'add';
  dayId: string;
  dayIndex: number;
  dayName: string;
  outUid?: string;
  outExerciseId?: string;
  inExerciseId: string;
  /** uid del slot nuevo (sólo kind = 'add') */
  newUid?: string;
  prescription: { sets: number; reps: [number, number]; effort: Effort; rest: number; warmups: number };
  before: number;
  after: number;
  beforeBand: VolumeBand;
  afterBand: VolumeBand;
  /** Otros músculos que cambian de forma notable */
  sideEffects: { muscle: Muscle; before: number; after: number; beforeBand: VolumeBand; afterBand: VolumeBand }[];
  daySecondsAfter: number;
  score: number;
}

/** Zona óptima de series semanales. */
export function optimalZone(m: Muscle): [number, number] {
  return SMALL.includes(m) ? [4, 8] : [10, 16];
}

function dist(m: Muscle, sets: number): number {
  const [lo, hi] = optimalZone(m);
  if (sets < lo) return (lo - sets) / lo;
  if (sets > hi) return (sets - hi) / hi;
  return 0;
}

const IGNORE: Muscle[] = ['core'];

function weeklyMap(plan: PlanResult): Record<Muscle, number> {
  return Object.fromEntries(plan.weekly.map((w) => [w.muscle, w.sets])) as Record<Muscle, number>;
}

/** Peso de cada músculo en el objetivo: grandes 1, glúteo (mucho trabajo indirecto) y pequeños 0.6. */
const weight = (m: Muscle) => (SMALL.includes(m) || m === 'gluteos' ? 0.6 : 1);

function totalDistance(w: Record<Muscle, number>): number {
  return (Object.keys(w) as Muscle[]).filter((m) => !IGNORE.includes(m)).reduce((a, m) => a + dist(m, w[m]) * weight(m), 0);
}

/** Ejercicios candidatos para entrenar `m` en un día concreto. */
function candidatesFor(m: Muscle, dayExerciseIds: string[], usedIds: Set<string>, profile: Profile, distinct: boolean): Exercise[] {
  const dayHasCompound = dayExerciseIds.some((id) => {
    const e = EXERCISE_BY_ID[id];
    return e && e.primary === m && (e.cls === 'C1' || e.cls === 'C2');
  });
  const rank = (e: Exercise) => {
    const compound = e.cls === 'C1' || e.cls === 'C2';
    // Si el día ya tiene un compuesto del músculo, mejor un aislamiento; si no, un compuesto guiado.
    const clsScore = dayHasCompound ? (compound ? 2 : 0) : e.cls === 'C2' ? 0 : e.cls === 'C1' ? 1 : 2;
    return clsScore * 10 + e.fatigue + (e.safeFailure ? 0 : 2) + (usedIds.has(e.id) ? 20 : 0);
  };
  return EXERCISES.filter(
    (e) => e.primary === m && isAvailable(e, profile) && !dayExerciseIds.includes(e.id) && !(distinct && usedIds.has(e.id))
  )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 2);
}

let uidSeq = 0;

export function volumeAdvice(routine: Routine, profile: Profile, config: EngineConfig, base?: PlanResult, opts: { perMuscle?: number } = {}): VolumeAdvice[] {
  const plan = base ?? computePlan(routine, profile, config);
  const w0 = weeklyMap(plan);
  const D0 = totalDistance(w0);
  const usedIds = new Set(routine.days.flatMap((d) => d.slots.map((s) => s.exerciseId)));
  const distinct = config.distinctDays !== false;
  const targets = plan.weekly
    .filter((v) => !IGNORE.includes(v.muscle) && dist(v.muscle, v.sets) > 0)
    .sort((a, b) => dist(b.muscle, b.sets) * weight(b.muscle) - dist(a.muscle, a.sets) * weight(a.muscle));

  const results: VolumeAdvice[] = [];

  // Días donde el músculo puede entrar sin romper la recuperación por músculo (≥48 h).
  const allowedDays = (m: Muscle) =>
    routine.days
      .map((d, i) => ({ d, i, pd: plan.days[i] }))
      .filter(({ d }) => {
        if (config.restRule !== 'musculo') return true;
        const others = routine.days.filter((o) => o.id !== d.id && o.slots.some((s) => EXERCISE_BY_ID[s.exerciseId]?.primary === m)).map((o) => o.weekday);
        return others.every((wd) => {
          const gap = Math.min((wd - d.weekday + 7) % 7, (d.weekday - wd + 7) % 7);
          return gap >= 2;
        });
      });

  const evaluate = (next: Routine) => {
    const p = computePlan(next, profile, config);
    return { p, w: weeklyMap(p) };
  };

  const pushResult = (
    m: Muscle,
    direction: VolumeAdvice['direction'],
    kind: VolumeAdvice['kind'],
    i: number,
    inEx: Exercise,
    uid: string,
    p: PlanResult,
    w: Record<Muscle, number>,
    out?: { uid: string; exerciseId: string }
  ) => {
    const D1 = totalDistance(w);
    const day = p.days[i];
    if (day.overBudget && !plan.days[i].overBudget) return;
    const item = day.items.find((it) => it.uid === uid);
    if (!item) return; // no entró (sin tiempo)
    const gainM = dist(m, w0[m]) - dist(m, w[m]);
    if (D1 >= D0 - 1e-6 || gainM <= 0) return;
    // Nunca empeorar la zona de otro músculo (p. ej. dejar femorales en "bajo" para subir gemelos)
    const worse = (Object.keys(w) as Muscle[]).some((x) => {
      if (x === m || IGNORE.includes(x)) return false;
      const b0 = bandFor(x, w0[x]);
      const b1 = bandFor(x, w[x]);
      return (b1 === 'bajo' && b0 !== 'bajo') || (b0 === 'optimo' && b1 === 'minimo');
    });
    if (worse) return;
    const sideEffects = (Object.keys(w) as Muscle[])
      .filter((x) => x !== m && !IGNORE.includes(x) && Math.abs(w[x] - w0[x]) >= 0.5)
      .map((x) => ({ muscle: x, before: w0[x], after: w[x], beforeBand: bandFor(x, w0[x]), afterBand: bandFor(x, w[x]) }));
    results.push({
      id: `${m}-${kind}-${routine.days[i].id}-${out?.uid ?? 'new'}-${inEx.id}`,
      muscle: m,
      direction,
      kind,
      dayId: routine.days[i].id,
      dayIndex: i,
      dayName: plan.days[i].name || `Día ${i + 1}`,
      outUid: out?.uid,
      outExerciseId: out?.exerciseId,
      inExerciseId: inEx.id,
      newUid: kind === 'add' ? uid : undefined,
      prescription: { sets: item.workSets, reps: item.reps, effort: item.effort, rest: item.rest, warmups: item.warmups.length },
      before: w0[m],
      after: w[m],
      beforeBand: bandFor(m, w0[m]),
      afterBand: bandFor(m, w[m]),
      sideEffects,
      daySecondsAfter: day.seconds,
      score: D0 - D1 + gainM * 0.5
    });
  };

  const tryFor = (m: Muscle, direction: VolumeAdvice['direction'], gainMuscle: Muscle) => {
    for (const { d, i, pd } of allowedDays(gainMuscle).slice(0, 7)) {
      const dayIds = d.slots.map((s) => s.exerciseId);
      const ins = candidatesFor(gainMuscle, dayIds, usedIds, profile, distinct);
      if (!ins.length) continue;
      // Slots que se pueden ceder: músculos con margen sobre su zona, sin tocar pre-agotamientos.
      const fixed = new Set(d.slots.flatMap((s) => (s.preExhaustFor ? [s.uid, s.preExhaustFor] : [])));
      const surplus = (mm: Muscle) => (IGNORE.includes(mm) ? 99 : (w0[mm] - optimalZone(mm)[0]) / optimalZone(mm)[0]);
      const swappable = pd.items
        .filter((it) => !fixed.has(it.uid) && it.exercise.primary !== gainMuscle)
        .filter((it) => (direction === 'bajar' ? it.exercise.primary === m : it.priority < 4))
        .sort((a, b) => surplus(b.exercise.primary) - surplus(a.exercise.primary) || a.priority - b.priority)
        .slice(0, 3);
      for (const it of swappable) {
        for (const inEx of ins) {
          const next: Routine = {
            days: routine.days.map((dd, j) => (j !== i ? dd : { ...dd, slots: dd.slots.map((s) => (s.uid === it.uid ? { ...s, exerciseId: inEx.id, lockedSets: undefined, optional: false } : s)) }))
          };
          const { p, w } = evaluate(next);
          pushResult(m, direction, 'swap', i, inEx, it.uid, p, w, { uid: it.uid, exerciseId: it.exercise.id });
        }
      }
      // Agregar si el día tiene tiempo libre (≥ 3 min)
      if (direction === 'subir' && config.budget - pd.seconds >= 180) {
        for (const inEx of ins.slice(0, 1)) {
          const uid = `adv-${Date.now().toString(36)}-${uidSeq++}`;
          const next: Routine = { days: routine.days.map((dd, j) => (j !== i ? dd : { ...dd, slots: [...dd.slots, { uid, exerciseId: inEx.id }] })) };
          const { p, w } = evaluate(next);
          pushResult(m, direction, 'add', i, inEx, uid, p, w);
        }
      }
    }
  };

  for (const v of targets) {
    const [lo] = optimalZone(v.muscle);
    if (v.sets < lo) {
      tryFor(v.muscle, 'subir', v.muscle);
    } else {
      // Exceso: ceder un ejercicio de este músculo al músculo con más déficit relativo
      const receiver = plan.weekly
        .filter((x) => !IGNORE.includes(x.muscle) && x.muscle !== v.muscle)
        .sort((a, b) => a.sets / optimalZone(a.muscle)[0] - b.sets / optimalZone(b.muscle)[0])[0];
      if (receiver) tryFor(v.muscle, 'bajar', receiver.muscle);
    }
  }

  // Mejores opciones por músculo, sin repetir el mismo cambio
  const perMuscle = opts.perMuscle ?? 2;
  const out: VolumeAdvice[] = [];
  const seen = new Set<string>();
  for (const r of results.sort((a, b) => b.score - a.score)) {
    const key = `${r.dayId}-${r.outUid ?? r.inExerciseId}`;
    if (seen.has(key)) continue;
    if (out.filter((x) => x.muscle === r.muscle).length >= perMuscle) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((a, b) => dist(b.muscle, b.before) * weight(b.muscle) - dist(a.muscle, a.before) * weight(a.muscle) || b.score - a.score);
}

/** Aplica una recomendación a la rutina (no muta). */
export function applyAdvice(routine: Routine, a: VolumeAdvice): Routine {
  return {
    days: routine.days.map((d) => {
      if (d.id !== a.dayId) return d;
      if (a.kind === 'swap' && a.outUid) {
        return { ...d, slots: d.slots.map((s) => (s.uid === a.outUid ? { ...s, exerciseId: a.inExerciseId, lockedSets: undefined, optional: false } : s)) };
      }
      return { ...d, slots: [...d.slots, { uid: a.newUid ?? `adv-${Date.now().toString(36)}`, exerciseId: a.inExerciseId }] };
    })
  };
}

export type { MuscleVolume };
