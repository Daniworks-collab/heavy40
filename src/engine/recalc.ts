import { EXERCISE_BY_ID } from '@/data/exercises';
import { MODE_LABEL } from '@/data/labels';
import { planDay, type DayContext } from './plan';
import { buildTimeline, sumSeconds } from './time';
import { validatePlan } from './validate';
import type { DayPlan, EngineConfig, Muscle, PlanResult, PrescribedDay, PrescribedExercise, Profile, Routine } from './types';

/** Calcula la rutina completa: dos pasadas (la 2ª conoce el volumen semanal para priorizar relleno). */
export function computePlan(routine: Routine, profile: Profile, config: EngineConfig): PlanResult {
  const runPass = (weekly?: Partial<Record<Muscle, number>>) => {
    const used = new Set<string>();
    return routine.days.map((d) => {
      const others = new Set<string>();
      routine.days.forEach((o) => o.id !== d.id && o.slots.forEach((s) => others.add(s.exerciseId)));
      used.forEach((u) => others.add(u));
      const ctx: DayContext = { profile, config, weekly, usedElsewhere: others };
      const res = planDay(d, ctx);
      res.items.forEach((i) => used.add(i.exercise.id));
      return res;
    });
  };
  const first = runPass();
  const weekly1: Partial<Record<Muscle, number>> = {};
  for (const d of first) {
    for (const it of d.items) {
      weekly1[it.exercise.primary] = (weekly1[it.exercise.primary] ?? 0) + it.workSets;
      for (const s of it.exercise.secondary) weekly1[s] = (weekly1[s] ?? 0) + it.workSets * 0.5;
    }
  }
  const days = runPass(weekly1);
  const { weekly, coverage, warnings } = validatePlan(days, config);
  return { mode: config.mode, budget: config.budget, days, weekly, coverage, warnings };
}

// ───────────────────────── Diff explicado ─────────────────────────

function mins(sec: number, budget = 2400): string {
  const m = sec / 60;
  if (sec > budget && Math.round(m) <= budget / 60) return `${Math.floor(m)}:${String(Math.round(sec % 60)).padStart(2, '0')} min`;
  return `${Math.round(m)} min`;
}

function nth(n: number) {
  return `${n}ª`;
}

function describeNew(prev: PrescribedExercise | undefined, next: PrescribedExercise): string {
  const parts: string[] = [`${next.reps[0]}-${next.reps[1]} reps`, next.effort === 'fallo' ? 'al fallo' : next.effort];
  if (prev) {
    const dw = next.warmups.length - prev.warmups.length;
    if (dw > 0) parts.push(`+${dw} calentamiento${dw > 1 ? 's' : ''}`);
    if (dw < 0) parts.push(`${dw} calentamiento${dw < -1 ? 's' : ''}`);
    if (next.rest !== prev.rest || next.exercise.cls !== prev.exercise.cls) parts.push(`descanso ${next.rest} s`);
  } else {
    if (next.warmups.length) parts.push(`${next.warmups.length} calentamiento${next.warmups.length > 1 ? 's' : ''}`);
    parts.push(`descanso ${next.rest} s`);
  }
  if (next.technique && next.technique !== prev?.technique) parts.push(next.technique);
  return parts.join(', ');
}

/**
 * Tiempo "ingenuo": el día nuevo conservando las series que tenía antes cada ejercicio.
 * Sirve para explicar "el día subió a 41 min, así que…".
 */
function naiveSeconds(prevDay: PrescribedDay, nextDay: DayPlan, profile: Profile, config: EngineConfig): number {
  const prevSets = new Map(prevDay.items.map((i) => [i.uid, i.workSets]));
  const locked: DayPlan = {
    ...nextDay,
    slots: nextDay.slots
      .filter((s) => !s.optional || prevDay.items.some((i) => i.uid === s.uid))
      .map((s) => ({ ...s, optional: false, lockedSets: s.lockedSets ?? prevSets.get(s.uid) ?? 1 }))
  };
  const raw = planDay(locked, { profile, config: { ...config, budget: 99999, target: 0 } });
  // Sin relleno ni recortes: sólo las series que ya tenía.
  return sumSeconds(buildTimeline(raw.items, config.generalWarmup, config.mode, config.secPerRep));
}

export function explainDayChange(
  prevDay: PrescribedDay,
  nextDay: PrescribedDay,
  profile: Profile,
  config: EngineConfig,
  reason: 'edit' | 'budget' = 'edit'
): string | null {
  const prevSlots = new Map(prevDay.day.slots.map((s) => [s.uid, s]));
  const nextSlots = new Map(nextDay.day.slots.map((s) => [s.uid, s]));
  const prevItems = new Map(prevDay.items.map((i) => [i.uid, i]));
  const nextItems = new Map(nextDay.items.map((i) => [i.uid, i]));
  const head: string[] = [];
  const changed = new Set<string>();

  for (const [uid, s] of nextSlots) {
    const p = prevSlots.get(uid);
    const ni = nextItems.get(uid);
    if (!p) {
      changed.add(uid);
      const name = EXERCISE_BY_ID[s.exerciseId]?.name ?? s.exerciseId;
      head.push(ni ? `Agregaste ${name} → ${describeNew(undefined, ni)}` : `Agregaste ${name} (opcional, sin tiempo hoy)`);
    } else if (p.exerciseId !== s.exerciseId) {
      changed.add(uid);
      const a = EXERCISE_BY_ID[p.exerciseId]?.name ?? p.exerciseId;
      const b = EXERCISE_BY_ID[s.exerciseId]?.name ?? s.exerciseId;
      head.push(ni ? `Cambiaste ${a} por ${b} → ${describeNew(prevItems.get(uid), ni)}` : `Cambiaste ${a} por ${b}`);
    } else if (p.lockedSets !== s.lockedSets) {
      changed.add(uid);
      const name = EXERCISE_BY_ID[s.exerciseId]?.name ?? s.exerciseId;
      head.push(s.lockedSets ? `Fijaste ${s.lockedSets} serie${s.lockedSets > 1 ? 's' : ''} en ${name}` : `${name} vuelve a series automáticas`);
    }
  }
  for (const [uid, p] of prevSlots) {
    if (!nextSlots.has(uid)) {
      changed.add(uid);
      head.push(`Quitaste ${EXERCISE_BY_ID[p.exerciseId]?.name ?? p.exerciseId}`);
    }
  }
  const prevOrder = prevDay.day.slots.map((s) => s.uid).filter((u) => nextSlots.has(u));
  const nextOrder = nextDay.day.slots.map((s) => s.uid).filter((u) => prevSlots.has(u));
  if (head.length === 0 && prevOrder.join() !== nextOrder.join()) head.push('Reordenaste el día');

  // Efectos colaterales en el resto de ejercicios
  const adds: string[] = [];
  const cuts: string[] = [];
  for (const [uid, ni] of nextItems) {
    if (changed.has(uid)) continue;
    const pi = prevItems.get(uid);
    if (!pi) {
      adds.push(ni.optional ? `entró el relleno ${ni.exercise.name}` : `entró ${ni.exercise.name}`);
      continue;
    }
    if (ni.workSets > pi.workSets) adds.push(`añadí la ${nth(ni.workSets)} serie de ${ni.exercise.name}`);
    if (ni.workSets < pi.workSets) cuts.push(`quité la ${nth(pi.workSets)} serie de ${ni.exercise.name}`);
    if (ni.warmups.length < pi.warmups.length && pi.exercise.id === ni.exercise.id) cuts.push(`sin calentamiento en ${ni.exercise.name}`);
    if (ni.warmups.length > pi.warmups.length && pi.exercise.id === ni.exercise.id) adds.push(`+1 calentamiento en ${ni.exercise.name}`);
    if (ni.rest < pi.rest) cuts.push(`descanso de ${ni.exercise.name} a ${ni.rest} s`);
  }
  for (const [uid, pi] of prevItems) {
    if (!nextItems.has(uid) && !changed.has(uid)) cuts.push(pi.optional ? `quité el relleno ${pi.exercise.name}` : `salió ${pi.exercise.name} (no cabe)`);
  }

  if (head.length === 0 && adds.length === 0 && cuts.length === 0 && prevDay.seconds === nextDay.seconds) return null;

  const tail: string[] = [];
  const naive = naiveSeconds(prevDay, nextDay.day, profile, config);
  if (reason === 'budget' && cuts.length) {
    tail.push(`Para caber en ${Math.round(config.budget / 60)} min: ${cuts.join(', ')}.`);
  } else if (cuts.length && naive > config.budget) {
    tail.push(`El día subía a ${mins(naive, config.budget)}, así que ${cuts.join(', ')}.`);
  } else if (cuts.length) {
    tail.push(`Para cuadrar ${cuts.join(', ')}.`);
  }
  if (adds.length && reason === 'budget') {
    tail.push(`Con ${Math.round(config.budget / 60)} min hay espacio: ${adds.join(', ')}.`);
  } else if (adds.length) {
    tail.push(`${naive < config.target ? `Sobraba tiempo: ${adds.join(', ')}` : adds.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  const timeLine =
    Math.round(prevDay.seconds / 60) !== Math.round(nextDay.seconds / 60)
      ? `Ahora ${mins(nextDay.seconds, config.budget)} (antes ${mins(prevDay.seconds, config.budget)}).`
      : `Sigue en ${mins(nextDay.seconds, config.budget)}.`;
  if (nextDay.overBudget) tail.push(`Aún pasa de ${Math.round(config.budget / 60)} min: usa Optimizar.`);

  const first = head.length ? `${head.join('. ')}.` : '';
  return [first, ...tail, timeLine].filter(Boolean).join(' ');
}

/** Una línea por día que cambió. */
export function explainPlanChange(prev: PlanResult, next: PlanResult, profile: Profile, config: EngineConfig): string[] {
  const out: string[] = [];
  if (prev.mode !== next.mode) {
    const sets = (p: PlanResult) => p.days.reduce((a, d) => a + d.items.reduce((b, i) => b + i.workSets, 0), 0);
    out.push(
      `Estilo ${MODE_LABEL[next.mode]}: ${sets(next)} series efectivas/semana (antes ${sets(prev)}); ` +
        next.days.map((d) => `${Math.round(d.seconds / 60)} min`).join(' · ') +
        '.'
    );
    return out;
  }
  const budgetChanged = prev.budget !== next.budget;
  if (budgetChanged) out.push(`Tiempo disponible: ${Math.round(prev.budget / 60)} → ${Math.round(next.budget / 60)} min por sesión.`);
  next.days.forEach((nd) => {
    const pd = prev.days.find((d) => d.day.id === nd.day.id);
    if (!pd) return;
    const line = explainDayChange(pd, nd, profile, config, budgetChanged ? 'budget' : 'edit');
    if (!line) return;
    if (budgetChanged) {
      out.push(`${nd.name}: ${line}`);
      return;
    }
    const direct = JSON.stringify(pd.day.slots) !== JSON.stringify(nd.day.slots);
    out.push(direct ? line : `${nd.name} (rebalanceo por volumen semanal): ${line.replace(/^Para cuadrar /, '')}`);
  });
  return out;
}

/** Aplica la propuesta de "Optimizar" de un día y devuelve la rutina nueva (no muta). */
export function applyProposal(routine: Routine, dayId: string, removeUid: string): Routine {
  return {
    days: routine.days.map((d) => {
      if (d.id !== dayId) return d;
      const slot = d.slots.find((s) => s.uid === removeUid);
      if (slot?.lockedSets && slot.lockedSets > 1) {
        return { ...d, slots: d.slots.map((s) => (s.uid === removeUid ? { ...s, lockedSets: undefined } : s)) };
      }
      return {
        ...d,
        slots: d.slots
          .filter((s) => s.uid !== removeUid)
          .map((s) => (s.preExhaustFor === removeUid ? { ...s, preExhaustFor: undefined } : s))
      };
    })
  };
}
