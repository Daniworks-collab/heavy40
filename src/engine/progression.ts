import { isLower } from './rules';
import type { Effort, Exercise } from './types';

export interface LoggedSet {
  exerciseId: string;
  kind: 'warmup' | 'work';
  kg: number;
  reps: number;
  effort: Effort;
  technique?: string;
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
export function increment(ex: Exercise, kg: number): number {
  const dumbbell = ex.equipment.includes('mancuernas');
  const base = dumbbell ? (isLower(ex) ? 2 : 1) : isLower(ex) ? 5 : 2.5;
  const step = loadStep(ex);
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
export function suggestLoad(ex: Exercise, reps: [number, number], target: Effort, last?: ExerciseSession, calibrated?: number): LoadSuggestion {
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
    const inc = increment(ex, kg);
    return { kg: roundLoad(ex, kg + inc), action: 'subir', text: `Llegaste al tope (${reps[1]}): +${inc} kg` };
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

/** Detecta PRs de una sesión frente al historial previo del mismo ejercicio. */
export function detectPRs(ex: Exercise, sessionSets: LoggedSet[], history: ExerciseSession[]): PR[] {
  const work = sessionSets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id);
  if (!work.length || !history.length) return [];
  const prevSets = history.flatMap((h) => h.sets.filter((s) => s.kind === 'work' && s.exerciseId === ex.id));
  if (!prevSets.length) return [];
  const out: PR[] = [];
  const prevE = bestE1rm(prevSets);
  const nowE = bestE1rm(work);
  if (nowE > prevE + 0.01) {
    out.push({ exerciseId: ex.id, kind: 'e1rm', value: nowE, previous: prevE, text: `e1RM ${nowE.toFixed(1)} kg (antes ${prevE.toFixed(1)})` });
  }
  const prevMax = Math.max(...prevSets.map((s) => s.kg));
  const nowMax = Math.max(...work.map((s) => s.kg));
  if (nowMax > prevMax) out.push({ exerciseId: ex.id, kind: 'carga', value: nowMax, previous: prevMax, text: `Carga máxima ${nowMax} kg` });
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
  'Añade un día de descanso extra: en HD la respuesta suele ser más descanso, no menos.',
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
