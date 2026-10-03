import { EXERCISES, EXERCISE_BY_ID } from '@/data/exercises';
import { MUSCLE_LABEL } from '@/data/labels';
import { ANTAGONISTS, BIG, TEMPO, classRule, priorityFor, softenEffort, techniqueFor, volumeTarget, warmupsFor } from './rules';
import { buildTimeline, sumSeconds } from './time';
import type {
  Adjustment,
  DayPlan,
  EngineConfig,
  Exercise,
  Muscle,
  PrescribedDay,
  PrescribedExercise,
  Profile,
  Slot
} from './types';

export const DEFAULT_CONFIG: EngineConfig = {
  mode: 'adaptado',
  generalWarmup: 180,
  budget: 2400,
  target: 2280,
  secPerRep: 6,
  tempo: '2-0-4',
  repRange: null,
  fatigueLimit: 24,
  conservative: false
};

export interface DayContext {
  profile: Profile;
  config: EngineConfig;
  /** Series semanales por músculo (de una pasada previa) para priorizar relleno. */
  weekly?: Partial<Record<Muscle, number>>;
  /** Ejercicios usados en otros días: se evitan al sustituir. */
  usedElsewhere?: Set<string>;
}

// ───────────────────────── Disponibilidad ─────────────────────────

export function isAvailable(ex: Exercise, profile: Profile): boolean {
  if (ex.level === 'avanzado' && profile.level !== 'avanzado') return false;
  if (ex.joints.some((j) => profile.injuries.includes(j))) return false;
  return ex.equipment.every((eq) => eq === 'peso-corporal' || profile.equipment.includes(eq));
}

const CLASS_FAMILY: Record<string, number> = { C1: 0, C2: 0, A: 1, P: 2 };

export function findSubstitute(ex: Exercise, profile: Profile, avoid: Set<string>): Exercise | undefined {
  const pool: Exercise[] = [];
  const alts = ex.alternatives.map((id) => EXERCISE_BY_ID[id]).filter(Boolean);
  // Primero alternativas del mismo músculo, luego las demás.
  pool.push(...alts.filter((a) => a.primary === ex.primary), ...alts.filter((a) => a.primary !== ex.primary));
  const sameMuscle = EXERCISES.filter((e) => e.primary === ex.primary && e.id !== ex.id && !ex.alternatives.includes(e.id)).sort(
    (a, b) =>
      Math.abs(CLASS_FAMILY[a.cls] - CLASS_FAMILY[ex.cls]) - Math.abs(CLASS_FAMILY[b.cls] - CLASS_FAMILY[ex.cls]) ||
      Number(a.pattern !== ex.pattern) - Number(b.pattern !== ex.pattern)
  );
  pool.splice(alts.filter((a) => a.primary === ex.primary).length, 0, ...sameMuscle);
  return pool.find((c) => isAvailable(c, profile) && !avoid.has(c.id));
}

// ───────────────────────── Estado interno ─────────────────────────

interface Entry {
  slot: Slot;
  ex: Exercise;
  sets: number;
  included: boolean;
  locked: boolean;
  /** Pareja de pre-agotamiento: 1+1 fijo. */
  fixed: boolean;
  warmupCut: boolean;
  restShort: boolean;
}

function computePairs(entries: Entry[], mode: EngineConfig['mode']): Map<string, string> {
  const pairs = new Map<string, string>();
  if (mode !== 'fast40') return pairs;
  const inc = entries.filter((e) => e.included && !e.fixed && e.ex.fatigue < 5);
  for (let i = 0; i < inc.length; i++) {
    const a = inc[i];
    if (pairs.has(a.slot.uid)) continue;
    const antag = ANTAGONISTS.find(([x, y]) => x === a.ex.primary || y === a.ex.primary);
    if (!antag) continue;
    const want = antag[0] === a.ex.primary ? antag[1] : antag[0];
    const b = inc.slice(i + 1).find((e) => !pairs.has(e.slot.uid) && e.ex.primary === want);
    if (b) {
      pairs.set(a.slot.uid, b.slot.uid);
      pairs.set(b.slot.uid, a.slot.uid);
    }
  }
  return pairs;
}

function derive(entries: Entry[], ctx: DayContext): PrescribedExercise[] {
  const { config, profile } = ctx;
  const inc = entries.filter((e) => e.included);
  const pairs = computePairs(entries, config.mode);
  const seenMuscle = new Set<Muscle>();
  const seenCompound = new Set<Muscle>();
  const items: PrescribedExercise[] = [];
  inc.forEach((e, i) => {
    const ex = e.ex;
    const firstOfMuscle = !seenMuscle.has(ex.primary);
    const compound = ex.cls === 'C1' || ex.cls === 'C2';
    const isMain = compound && !seenCompound.has(ex.primary);
    seenMuscle.add(ex.primary);
    if (compound) seenCompound.add(ex.primary);
    const prev = inc[i - 1];
    const preExhausted = !!prev && prev.slot.preExhaustFor === e.slot.uid;
    const preExhaust = !!e.slot.preExhaustFor && inc[i + 1]?.slot.uid === e.slot.preExhaustFor;
    const rule = classRule(ex, config.mode, config);
    const effort = config.conservative ? softenEffort(rule.effort) : rule.effort;
    const rest = e.restShort && ex.cls === 'A' ? Math.min(60, rule.rest) : rule.rest;
    const paired = pairs.has(e.slot.uid);
    const tech = techniqueFor(ex, config.mode, { conservative: !!config.conservative, preExhaust, paired });
    const warmups = e.warmupCut ? [] : warmupsFor(ex, { isMain, firstOfMuscle, preExhausted, yates: config.mode === 'puro' });
    items.push({
      uid: e.slot.uid,
      slot: e.slot,
      exercise: ex,
      workSets: e.sets,
      warmups,
      reps: rule.reps,
      effort,
      rest,
      technique: tech.technique,
      techniqueMini: tech.mini,
      tempo: config.tempo ?? TEMPO,
      priority: priorityFor(ex, isMain, profile.priorities),
      isMain,
      pairWith: pairs.get(e.slot.uid),
      seconds: 0,
      optional: !!e.slot.optional
    });
  });
  return items;
}

function evaluate(entries: Entry[], ctx: DayContext) {
  const items = derive(entries, ctx);
  const timeline = buildTimeline(items, ctx.config.generalWarmup, ctx.config.mode, ctx.config.secPerRep);
  const perUid = new Map<string, number>();
  for (const s of timeline) if (s.uid) perUid.set(s.uid, (perUid.get(s.uid) ?? 0) + s.seconds);
  for (const it of items) it.seconds = perUid.get(it.uid) ?? 0;
  return { items, timeline, seconds: sumSeconds(timeline) };
}

function ordinal(n: number): string {
  return `${n}ª`;
}

export function autoDayName(items: PrescribedExercise[]): string {
  const score = new Map<Muscle, { sets: number; first: number }>();
  items.forEach((it, i) => {
    const m = it.exercise.primary;
    const cur = score.get(m) ?? { sets: 0, first: i };
    cur.sets += it.workSets + (BIG.includes(m) ? 0.5 : 0);
    score.set(m, cur);
  });
  return [...score.entries()]
    .sort((a, b) => b[1].sets - a[1].sets || a[1].first - b[1].first)
    .slice(0, 3)
    .map(([m]) => MUSCLE_LABEL[m])
    .join(' · ');
}

// ───────────────────────── Planificación de un día ─────────────────────────

export function planDay(day: DayPlan, ctx: DayContext): PrescribedDay {
  const { config, profile } = ctx;
  const adjustments: Adjustment[] = [];
  const mode = config.mode;
  const used = new Set<string>(ctx.usedElsewhere ?? []);
  day.slots.forEach((s) => used.add(s.exerciseId));

  // 1. Resolver disponibilidad (equipo, lesiones, nivel)
  const entries: Entry[] = [];
  for (const slot of day.slots) {
    let ex = EXERCISE_BY_ID[slot.exerciseId];
    if (!ex) continue;
    if (!isAvailable(ex, profile)) {
      const sub = findSubstitute(ex, profile, used);
      if (sub) {
        adjustments.push({ kind: 'substitute', uid: slot.uid, exerciseId: sub.id, text: `${ex.name} → ${sub.name} (equipo, nivel o lesión)` });
        used.add(sub.id);
        ex = sub;
      } else {
        adjustments.push({ kind: 'drop-unavailable', uid: slot.uid, exerciseId: ex.id, text: `${ex.name} fuera: no hay alternativa con tu equipo` });
        continue;
      }
    }
    entries.push({
      slot,
      ex,
      sets: 1,
      included: !slot.optional,
      locked: mode !== 'puro' && slot.lockedSets != null,
      fixed: false,
      warmupCut: false,
      restShort: false
    });
  }

  // Pre-agotamiento sólo es válido si el compuesto va inmediatamente después.
  entries.forEach((e, i) => {
    const next = entries[i + 1];
    if (e.slot.preExhaustFor && next && next.slot.uid === e.slot.preExhaustFor) {
      e.fixed = true;
      next.fixed = true;
    }
  });

  const included = () => entries.filter((e) => e.included);
  const cap = () => (included().length <= 4 ? 3 : 2);
  for (const e of entries) {
    if (e.locked) e.sets = Math.max(1, Math.min(e.slot.lockedSets ?? 1, cap()));
  }

  let state = evaluate(entries, ctx);
  const reval = () => (state = evaluate(entries, ctx));
  const muscleSets = (m: Muscle) => included().reduce((a, e) => a + (e.ex.primary === m ? e.sets : 0), 0);
  const itemOf = (e: Entry) => state.items.find((i) => i.uid === e.slot.uid);
  const weekly = ctx.weekly ?? {};
  const lowVolume = (a: Entry, b: Entry) =>
    (weekly[a.ex.primary] ?? 0) / volumeTarget(a.ex.primary) - (weekly[b.ex.primary] ?? 0) / volumeTarget(b.ex.primary);

  const tryAddSet = (e: Entry, maxSets: number): boolean => {
    if (!e.included || e.locked || e.fixed) return false;
    if (e.sets >= Math.min(maxSets, cap())) return false;
    if (muscleSets(e.ex.primary) >= 4) return false;
    e.sets++;
    const before = state;
    reval();
    if (state.seconds > config.budget) {
      e.sets--;
      state = before;
      return false;
    }
    adjustments.push({ kind: 'add-set', uid: e.slot.uid, exerciseId: e.ex.id, text: `${ordinal(e.sets)} serie en ${e.ex.name}` });
    return true;
  };
  const hasRoom = () => config.budget - state.seconds > config.budget - config.target;

  // 2. Relleno hasta el objetivo (presupuesto − 2 min)
  const steps: ((max: number) => Entry[])[] = [
    // (1) compuesto principal de cada músculo grande
    () => included().filter((e) => itemOf(e)?.isMain && BIG.includes(e.ex.primary)),
    // (2) músculos prioritarios del usuario
    () => included().filter((e) => profile.priorities.includes(e.ex.primary)),
    // (3) aislamientos de músculos con poco volumen semanal; luego el resto
    () => {
      const iso = included().filter((e) => e.ex.cls === 'A' || e.ex.cls === 'P').sort(lowVolume);
      const rest = included().filter((e) => !(e.ex.cls === 'A' || e.ex.cls === 'P')).sort(lowVolume);
      return [...iso, ...rest];
    }
  ];
  const fillPass = (maxSets: number, which: number[]) => {
    for (const k of which) {
      for (const e of steps[k](maxSets)) {
        if (!hasRoom()) return;
        tryAddSet(e, maxSets);
      }
    }
  };

  const tryInclude = (e: Entry): boolean => {
    e.included = true;
    const before = state;
    reval();
    if (state.seconds > config.budget) {
      e.included = false;
      state = before;
      return false;
    }
    adjustments.push({ kind: 'include-optional', uid: e.slot.uid, exerciseId: e.ex.id, text: `entra ${e.ex.name} (relleno)` });
    return true;
  };

  if (mode !== 'puro') {
    fillPass(2, config.conservative ? [0] : [0, 1]);
  }
  if (!config.conservative) {
    // (3) aislamientos de músculos con poco volumen semanal. Los ejercicios opcionales
    // del usuario compiten aquí por volumen (un opcional de un músculo con déficit
    // vale más que la 2ª serie de un músculo ya cubierto).
    type Action = { e: Entry; include: boolean };
    const actions = (): Action[] => {
      const list: Action[] = [];
      for (const e of entries) {
        if (e.slot.optional && !e.included) list.push({ e, include: true });
        else if (e.included && mode !== 'puro') list.push({ e, include: false });
      }
      const iso = (a: Action) => (a.e.ex.cls === 'A' || a.e.ex.cls === 'P' ? 0 : 1);
      return list.sort((a, b) => iso(a) - iso(b) || lowVolume(a.e, b.e) || Number(a.include) - Number(b.include));
    };
    for (const a of actions()) {
      if (!hasRoom()) break;
      if (a.include) tryInclude(a.e);
      else tryAddSet(a.e, 2);
    }
    for (const e of entries.filter((x) => x.slot.optional && !x.included)) {
      adjustments.push({ kind: 'skip-optional', uid: e.slot.uid, exerciseId: e.ex.id, text: `${e.ex.name} no cabe hoy` });
    }
    // 3ª serie sólo en sesiones de ≤4 ejercicios
    if (mode !== 'puro' && included().length <= 4) fillPass(3, [0, 1, 2]);
  }

  // 3. Recortes si se pasa del presupuesto
  const byLowPriority = (list: Entry[]) =>
    [...list].sort((a, b) => (itemOf(a)?.priority ?? 0) - (itemOf(b)?.priority ?? 0) || entries.indexOf(b) - entries.indexOf(a));

  if (state.seconds > config.budget) {
    // (1) calentamientos de ejercicios secundarios
    for (const e of byLowPriority(included().filter((x) => !itemOf(x)?.isMain && (itemOf(x)?.warmups.length ?? 0) > 0))) {
      if (state.seconds <= config.budget) break;
      e.warmupCut = true;
      reval();
      adjustments.push({ kind: 'remove-warmup', uid: e.slot.uid, exerciseId: e.ex.id, text: `sin calentamiento específico en ${e.ex.name}` });
    }
    // (2) descanso de aislamientos a 60 s
    for (const e of byLowPriority(included().filter((x) => x.ex.cls === 'A' && x.sets > 1))) {
      if (state.seconds <= config.budget) break;
      if ((itemOf(e)?.rest ?? 0) <= 60) continue;
      e.restShort = true;
      reval();
      adjustments.push({ kind: 'shorten-rest', uid: e.slot.uid, exerciseId: e.ex.id, text: `descanso de ${e.ex.name} a 60 s` });
    }
    // (3) series extra de menor prioridad
    let guard = 20;
    while (state.seconds > config.budget && guard-- > 0) {
      const victim = byLowPriority(included().filter((x) => x.sets > 1 && !x.locked && !x.fixed))[0];
      if (!victim) break;
      victim.sets--;
      reval();
      adjustments.push({ kind: 'remove-set', uid: victim.slot.uid, exerciseId: victim.ex.id, text: `quité la ${ordinal(victim.sets + 1)} serie de ${victim.ex.name}` });
    }
  }

  const overBudget = state.seconds > config.budget;
  let proposal: PrescribedDay['proposal'];
  if (overBudget) {
    const lockedVictim = byLowPriority(included().filter((x) => x.locked && x.sets > 1))[0];
    const victim = byLowPriority(included())[0];
    if (lockedVictim) {
      proposal = {
        removeUid: lockedVictim.slot.uid,
        exerciseId: lockedVictim.ex.id,
        text: `Liberar las series fijadas de ${lockedVictim.ex.name} para que el motor las ajuste`
      };
    } else if (victim) {
      const mins = Math.max(1, Math.round((itemOf(victim)?.seconds ?? 0) / 60));
      proposal = { removeUid: victim.slot.uid, exerciseId: victim.ex.id, text: `Quitar ${victim.ex.name} (−${mins} min, menor prioridad)` };
    }
  }

  // 4. Sugerencia de ejercicio extra si sobra mucho tiempo
  let suggestion: PrescribedDay['suggestion'];
  const floor = config.target - 120; // 36 min
  if (!overBudget && state.seconds < floor && !config.conservative) {
    const inDay = new Set(entries.map((e) => e.ex.id));
    const wanted: Muscle[] = (['core', 'gemelos', 'hombros'] as Muscle[]).sort(
      (a, b) => (weekly[a] ?? 0) / volumeTarget(a) - (weekly[b] ?? 0) / volumeTarget(b)
    );
    for (const m of wanted) {
      const cand = EXERCISES.find(
        (e) =>
          e.primary === m &&
          (m !== 'hombros' || e.pattern === 'abduccion-horizontal') &&
          !inDay.has(e.id) &&
          !used.has(e.id) &&
          isAvailable(e, profile)
      );
      if (cand) {
        const spare = Math.round((config.target - state.seconds) / 60);
        suggestion = { exerciseId: cand.id, text: `Te sobran ~${spare} min: añade ${cand.name}` };
        break;
      }
    }
  }

  const items = state.items;
  const fatigue = items.reduce((a, i) => a + i.exercise.fatigue, 0);
  const skipped = derive(
    entries.map((e) => ({ ...e, included: !e.included && !!e.slot.optional })),
    ctx
  );

  return {
    day,
    name: day.name ?? autoDayName(items),
    items,
    skipped,
    timeline: state.timeline,
    seconds: state.seconds,
    fatigue,
    adjustments,
    overBudget,
    proposal,
    suggestion
  };
}
