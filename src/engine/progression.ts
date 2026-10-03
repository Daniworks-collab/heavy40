import { isLower } from './rules';
import type { Effort, Exercise } from './types';

export interface LoggedSet {
  exerciseId: string;
  kind: 'warmup' | 'work';
  kg: number;
  reps: number;
  effort: Effort;
  technique?: string;
  /** Tiempo bajo tensión medido o estimado (s). */
  tut?: number;
}

export interface Increments {
  upper: number;
  lower: number;
}

export interface ExerciseSession {
  date: string; // ISO
  sets: LoggedSet[];
}

/** e1RM (Epley). */
export function epley(kg: number, reps: number): number {
  if (reps <= 0 || kg <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

/** Inverso de Epley: carga para N reps al fallo. */
export function loadForReps(e1rm: number, reps: number): number {
  return e1rm / (1 + reps / 30);
}

export function loadStep(ex: Exercise): number {
  if (ex.equipment.includes('mancuernas')) return 1;
  return 2.5;
}

export function roundLoad(ex: Exercise, kg: number): number {
  const step = loadStep(ex);
  return Math.max(0, Math.round(kg / step) * step);
}

/** Incremento de doble progresión: +2.5 kg superior, +5 kg inferior (mancuernas +1/+2), limitado a ~2-5 %. */
export function increment(ex: Exercise, kg: number, inc?: Increments): number {
  const dumbbell = ex.equipment.includes('mancuernas');
  const upper = inc?.upper ?? 2.5;
  const lower = inc?.lower ?? 5;
  // Mancuernas: el incremento es por mancuerna (≈40 % del de barra, mínimo 1 kg)
  const base = dumbbell ? Math.max(1, Math.round((isLower(ex) ? lower : upper) * 0.4)) : isLower(ex) ? lower : upper;
  const step = loadStep(ex);
  // Si el usuario configuró su incremento, manda ese valor; si no, se limita a ~5 % de la carga.
  if (inc) return Math.max(step, base);
  const capPct = Math.max(step, roundLoad(ex, kg * 0.05));
  return Math.max(step, Math.min(base, capPct));
}

const EFFORT_RANK: Record<Effort, number> = { fallo: 0, '1 RIR': 1, '2 RIR': 2, '3 RIR': 3 };

export type ProgressAction = 'subir' | 'mantener' | 'bajar' | 'calibrar';

export interface LoadSuggestion {
  kg: number;
  action: ProgressAction;
  text: string;
}

/**
 * Doble progresión: si TODAS las series efectivas llegan al tope del rango con el esfuerzo objetivo
 * (o más duro) → sube carga. Si alguna cae bajo el mínimo → baja 5-10 %. Si no → misma carga, +1 rep.
 */
export function suggestLoad(
  ex: Exercise,
  reps: [number, number],
  target: Effort,
  last?: ExerciseSession,
  calibrated?: number,
  inc?: Increments
): LoadSuggestion {
  const work = last?.sets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id) ?? [];
  if (work.length === 0) {
    if (calibrated) return { kg: roundLoad(ex, calibrated), action: 'mantener', text: 'Carga de calibración' };
    return { kg: 0, action: 'calibrar', text: 'Sin historial: calibra la carga' };
  }
  const kg = Math.max(...work.map((s) => s.kg));
  const top = work.filter((s) => s.kg === kg);
  const allTop = top.every((s) => s.reps >= reps[1] && EFFORT_RANK[s.effort] <= EFFORT_RANK[target]);
  const anyLow = top.some((s) => s.reps < reps[0]);
  if (allTop) {
    const step = increment(ex, kg, inc);
    return { kg: roundLoad(ex, kg + step), action: 'subir', text: `Llegaste al tope (${reps[1]}): +${step} kg` };
  }
  if (anyLow) {
    const down = roundLoad(ex, kg * 0.925);
    return { kg: down === kg ? Math.max(0, kg - loadStep(ex)) : down, action: 'bajar', text: `Bajo el mínimo (${reps[0]}): −7.5 %` };
  }
  const best = Math.max(...top.map((s) => s.reps));
  return { kg, action: 'mantener', text: `Misma carga, busca ${Math.min(best + 1, reps[1])} reps` };
}

export function warmupLoad(ex: Exercise, workKg: number, pct: number): number {
  return roundLoad(ex, (workKg * pct) / 100);
}

export function bestE1rm(sets: LoggedSet[]): number {
  return sets.filter((s) => s.kind === 'work').reduce((a, s) => Math.max(a, epley(s.kg, s.reps)), 0);
}

export interface PR {
  exerciseId: string;
  kind: 'e1rm' | 'carga' | 'reps';
  value: number;
  previous: number;
  text: string;
}

/**
 * Detecta récords de una sesión frente al historial previo del mismo ejercicio:
 * - e1RM: mejor 1RM estimado (Epley)
 * - carga: más peso que nunca
 * - reps: más repeticiones que nunca con ese peso (o más)
 */
export function detectPRs(ex: Exercise, sessionSets: LoggedSet[], history: ExerciseSession[]): PR[] {
  const work = sessionSets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id);
  if (!work.length || !history.length) return [];
  const prevSets = history.flatMap((h) => h.sets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id));
  if (!prevSets.length) return [];
  const out: PR[] = [];
  const prevE = bestE1rm(prevSets);
  const nowE = bestE1rm(work);
  if (nowE > prevE + 0.01) {
    out.push({ exerciseId: ex.id, kind: 'e1rm', value: nowE, previous: prevE, text: `1RM estimado ${nowE.toFixed(1)} kg (antes ${prevE.toFixed(1)})` });
  }
  const prevMax = Math.max(...prevSets.map((s) => s.kg));
  const nowMax = Math.max(...work.map((s) => s.kg));
  if (nowMax > prevMax) out.push({ exerciseId: ex.id, kind: 'carga', value: nowMax, previous: prevMax, text: `Carga máxima ${nowMax} kg (antes ${prevMax})` });
  // Reps: mejor marca de repeticiones a un peso igual o mayor que nunca
  const repsPR = work
    .map((s) => {
      const prevAt = prevSets.filter((p) => p.kg >= s.kg).reduce((a, p) => Math.max(a, p.reps), 0);
      return prevAt > 0 && s.reps > prevAt ? { s, prevAt } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.s.kg - a!.s.kg)[0];
  if (repsPR && nowMax <= prevMax) {
    out.push({
      exerciseId: ex.id,
      kind: 'reps',
      value: repsPR.s.reps,
      previous: repsPR.prevAt,
      text: `${repsPR.s.reps} reps con ${repsPR.s.kg} kg (antes ${repsPR.prevAt})`
    });
  }
  return out;
}

/** Estancamiento: 3 sesiones seguidas sin mejorar el mejor e1RM previo. */
export function isStalled(history: ExerciseSession[]): boolean {
  if (history.length < 4) return false;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const e = sorted.map((h) => bestE1rm(h.sets));
  const before = Math.max(...e.slice(0, -3));
  return e.slice(-3).every((v) => v <= before + 0.01);
}

export const STALL_ADVICE = [
  'Revisa sueño (7-9 h) y proteína (1.6-2.2 g/kg).',
  'Añade un día de descanso extra: muchas veces la respuesta es más descanso, no menos.',
  'Semana de descarga: −40 % de series y −10 % de carga.',
  'Cambia la variante del ejercicio.'
];

export function calibrationLoad(ex: Exercise, kg: number, reps: number): { e1rm: number; target: number; load: number } {
  const target = isLower(ex) ? 8 : 6;
  const e1 = epley(kg, reps);
  return { e1rm: e1, target, load: roundLoad(ex, loadForReps(e1, target)) };
}

/** Descarga sugerida cada 6-8 semanas o con readiness bajo 3 sesiones seguidas. */
export function deloadDue(opts: { weeksSinceDeload: number; recentReadinessLow: boolean[] }): { due: boolean; reason?: string } {
  const last3 = opts.recentReadinessLow.slice(-3);
  if (last3.length === 3 && last3.every(Boolean)) return { due: true, reason: 'Readiness bajo en 3 sesiones seguidas' };
  if (opts.weeksSinceDeload >= 8) return { due: true, reason: `${opts.weeksSinceDeload} semanas sin descarga` };
  if (opts.weeksSinceDeload >= 6) return { due: true, reason: 'Ventana de descarga (6-8 semanas)' };
  return { due: false };
}

// ───────────────────────── Meta del día ─────────────────────────

export interface DayGoal {
  /** "60 kg × 8" de la mejor serie de la última vez */
  lastText?: string;
  /** "Hoy intenta 9 reps o 62.5 kg" */
  goalText: string;
  kg: number;
  reps: number;
  action: ProgressAction;
}

export function dayGoal(
  ex: Exercise,
  reps: [number, number],
  target: Effort,
  last?: ExerciseSession,
  calibrated?: number,
  inc?: Increments
): DayGoal {
  const sug = suggestLoad(ex, reps, target, last, calibrated, inc);
  const work = last?.sets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id) ?? [];
  if (!work.length) {
    return sug.kg > 0
      ? { goalText: `Hoy: ${fmt(sug.kg)} kg × ${reps[0]}-${reps[1]}`, kg: sug.kg, reps: reps[0], action: sug.action }
      : { goalText: `Elige una carga para ${reps[0]}-${reps[1]} reps estrictas`, kg: 0, reps: reps[0], action: 'calibrar' };
  }
  const topKg = Math.max(...work.map((s) => s.kg));
  const best = Math.max(...work.filter((s) => s.kg === topKg).map((s) => s.reps));
  const lastText = `${fmt(topKg)} kg × ${best}`;
  if (sug.action === 'subir') {
    return { lastText, goalText: `Hoy sube a ${fmt(sug.kg)} kg y busca ${reps[0]}+ reps`, kg: sug.kg, reps: reps[0], action: 'subir' };
  }
  if (sug.action === 'bajar') {
    return { lastText, goalText: `Hoy baja a ${fmt(sug.kg)} kg y busca ${reps[0]}+ reps`, kg: sug.kg, reps: reps[0], action: 'bajar' };
  }
  const next = Math.min(best + 1, reps[1]);
  const up = roundLoad(ex, topKg + increment(ex, topKg, inc));
  return { lastText, goalText: `Hoy intenta ${next} reps o ${fmt(up)} kg`, kg: topKg, reps: next, action: 'mantener' };
}

/** Serie anterior equivalente (mismo índice de serie efectiva). */
export function previousSet(last: ExerciseSession | undefined, exerciseId: string, kind: 'warmup' | 'work', index: number): LoggedSet | undefined {
  return last?.sets.filter((s) => s.exerciseId === exerciseId && s.kind === kind)[index];
}

// ───────────────────────── Calculadoras ─────────────────────────

export interface WarmupStep {
  pct: number;
  reps: string;
  kg: number;
}

/** Series de calentamiento en kilos a partir del peso de trabajo. */
export function warmupPlan(ex: Exercise, workKg: number, sets: { pct: number; reps: string }[]): WarmupStep[] {
  return sets.map((w) => ({ ...w, kg: warmupLoad(ex, workKg, w.pct) }));
}

/** Escalera genérica (calculadora libre): barra vacía si aplica, 40/60/80 %. */
export function genericWarmup(workKg: number, barKg = 20): WarmupStep[] {
  const r = (x: number) => Math.max(barKg, Math.round(x / 2.5) * 2.5);
  const out: WarmupStep[] = [];
  if (workKg >= barKg * 2.5) out.push({ pct: Math.round((barKg / workKg) * 100), reps: '10', kg: barKg });
  out.push({ pct: 40, reps: '8', kg: r(workKg * 0.4) }, { pct: 60, reps: '5', kg: r(workKg * 0.6) }, { pct: 80, reps: '2-3', kg: r(workKg * 0.8) });
  return out.filter((s, i, a) => s.kg < workKg && a.findIndex((x) => x.kg === s.kg) === i);
}

export interface PlateResult {
  perSide: number[];
  /** kg que no se pudieron cargar con los discos disponibles */
  remainder: number;
  achieved: number;
}

/** Discos por lado (voraz, del más pesado al más ligero). */
export function platesPerSide(totalKg: number, barKg: number, available: number[]): PlateResult {
  const plates = [...available].sort((a, b) => b - a);
  let side = Math.max(0, (totalKg - barKg) / 2);
  const perSide: number[] = [];
  for (const p of plates) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side -= p;
    }
  }
  const loaded = perSide.reduce((a, b) => a + b, 0);
  return { perSide, remainder: Math.round(side * 2 * 100) / 100, achieved: barKg + loaded * 2 };
}

export function usesBar(ex: Exercise): boolean {
  return ex.equipment.includes('barra') || ex.equipment.includes('smith');
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
