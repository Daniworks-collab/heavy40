import type { Mode, PrescribedExercise, TimelineStep } from './types';

/** Modelo de tiempo (segundos). Ver sección 5 del brief y DECISIONS.md. */
export const TIME = {
  warmupSet: 40,
  warmupTransition: 45,
  secPerRep: 6, // cadencia por defecto 2-0-4 (2 s subir / 4 s bajar)
  setPrep: 10,
  transition: 45,
  preExhaustGap: 15,
  restPauseMini: 15,
  negatives: 20,
  pairIntra: 60,
  pairRound: 90
} as const;

/** Repeticiones objetivo para estimar: mitad del rango redondeada hacia arriba. */
export function targetReps(reps: [number, number]): number {
  return Math.ceil((reps[0] + reps[1]) / 2);
}

export function workSetSeconds(
  item: Pick<PrescribedExercise, 'reps' | 'technique' | 'techniqueMini'>,
  isLast: boolean,
  secPerRep: number = TIME.secPerRep
): number {
  let s = targetReps(item.reps) * secPerRep + TIME.setPrep;
  if (isLast && item.technique === 'rest-pause') s += TIME.restPauseMini * (item.techniqueMini ?? 2);
  if (isLast && item.technique === 'negativas') s += TIME.negatives;
  return s;
}

/**
 * HD Puro: Mentzer pedía recuperar el aliento entre ejercicios; usamos el descanso de clase
 * del siguiente ejercicio como transición (mín. 45 s). El resto de modos: 45 s fijos.
 */
export function transitionBefore(next: PrescribedExercise | undefined, mode: Mode): number {
  if (!next) return 0;
  if (mode === 'puro') return Math.max(TIME.transition, next.rest);
  return TIME.transition;
}

function warmupSteps(item: PrescribedExercise): TimelineStep[] {
  const out: TimelineStep[] = [];
  item.warmups.forEach((w, i) => {
    out.push({ kind: 'warmup', uid: item.uid, setIndex: i, seconds: TIME.warmupSet, label: `Calentamiento ${w.pct}% × ${w.reps}` });
    out.push({ kind: 'transition', uid: item.uid, seconds: TIME.warmupTransition, label: 'Ajusta carga' });
  });
  return out;
}

function workSteps(item: PrescribedExercise, spr: number): TimelineStep[] {
  const out: TimelineStep[] = [];
  for (let s = 0; s < item.workSets; s++) {
    const last = s === item.workSets - 1;
    out.push({ kind: 'work', uid: item.uid, setIndex: s, seconds: workSetSeconds(item, last, spr), label: `Serie efectiva ${s + 1}` });
    if (!last) out.push({ kind: 'rest', uid: item.uid, seconds: item.rest, label: 'Descanso' });
  }
  return out;
}

function pairSteps(a: PrescribedExercise, b: PrescribedExercise, spr: number): TimelineStep[] {
  const out: TimelineStep[] = [...warmupSteps(a), ...warmupSteps(b)];
  const seq: { item: PrescribedExercise; set: number }[] = [];
  const rounds = Math.max(a.workSets, b.workSets);
  for (let r = 0; r < rounds; r++) {
    if (r < a.workSets) seq.push({ item: a, set: r });
    if (r < b.workSets) seq.push({ item: b, set: r });
  }
  seq.forEach((cur, i) => {
    const last = cur.set === cur.item.workSets - 1;
    out.push({ kind: 'work', uid: cur.item.uid, setIndex: cur.set, seconds: workSetSeconds(cur.item, last, spr), label: `Serie efectiva ${cur.set + 1}` });
    const nxt = seq[i + 1];
    if (!nxt) return;
    let rest: number;
    if (nxt.item.uid === cur.item.uid) rest = cur.item.rest;
    else if (cur.item.uid === a.uid) rest = TIME.pairIntra;
    else rest = TIME.pairRound;
    out.push({ kind: 'rest', uid: cur.item.uid, seconds: rest, label: nxt.item.uid === cur.item.uid ? 'Descanso' : 'Cambia al par' });
  });
  return out;
}

/** Construye la secuencia completa de la sesión. Su suma es la estimación de tiempo. */
export function buildTimeline(items: PrescribedExercise[], generalWarmup: number, mode: Mode, secPerRep: number = TIME.secPerRep): TimelineStep[] {
  const steps: TimelineStep[] = [];
  if (generalWarmup > 0) steps.push({ kind: 'general', seconds: generalWarmup, label: 'Calentamiento general' });
  const byUid = new Map(items.map((i) => [i.uid, i]));
  const done = new Set<string>();
  const order = items.filter((i) => !done.has(i.uid));
  for (let idx = 0; idx < order.length; idx++) {
    const item = order[idx];
    if (done.has(item.uid)) continue;
    done.add(item.uid);
    let lastUid = item.uid;
    const partner = item.pairWith ? byUid.get(item.pairWith) : undefined;
    if (partner && !done.has(partner.uid)) {
      done.add(partner.uid);
      steps.push(...pairSteps(item, partner, secPerRep));
      lastUid = partner.uid;
    } else {
      steps.push(...warmupSteps(item), ...workSteps(item, secPerRep));
    }
    const next = order.slice(idx + 1).find((i) => !done.has(i.uid));
    if (!next) continue;
    const lastItem = byUid.get(lastUid)!;
    if (lastItem.slot.preExhaustFor && lastItem.slot.preExhaustFor === next.uid) {
      steps.push({ kind: 'transition', uid: lastUid, seconds: TIME.preExhaustGap, label: 'Pre-agotamiento: ¡ya!' });
    } else {
      steps.push({ kind: 'transition', uid: lastUid, seconds: transitionBefore(next, mode), label: 'Siguiente ejercicio' });
    }
  }
  return steps;
}

export function sumSeconds(steps: TimelineStep[]): number {
  return steps.reduce((a, s) => a + s.seconds, 0);
}

/** Orden real de ejecución (los pares Fast-40 se ejecutan juntos). */
export function executionOrder(items: PrescribedExercise[]): PrescribedExercise[] {
  const byUid = new Map(items.map((i) => [i.uid, i]));
  const done = new Set<string>();
  const out: PrescribedExercise[] = [];
  for (const it of items) {
    if (done.has(it.uid)) continue;
    done.add(it.uid);
    out.push(it);
    const p = it.pairWith ? byUid.get(it.pairWith) : undefined;
    if (p && !done.has(p.uid)) {
      done.add(p.uid);
      out.push(p);
    }
  }
  return out;
}

export function fmtMin(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}
