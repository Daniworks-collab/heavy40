import type { Effort, EngineConfig, Exercise, ExerciseClass, Mode, Muscle, Technique, WarmupSet } from './types';

export const LOWER_BODY: Muscle[] = ['cuadriceps', 'femorales', 'gluteos', 'gemelos'];
export const BIG: Muscle[] = ['pecho', 'espalda', 'cuadriceps', 'femorales', 'hombros'];
export const SMALL: Muscle[] = ['biceps', 'triceps', 'gemelos', 'core'];

/** Antagonistas para Fast-40. */
export const ANTAGONISTS: [Muscle, Muscle][] = [
  ['pecho', 'espalda'],
  ['biceps', 'triceps']
];

export const DEFAULT_REST: Record<ExerciseClass, number> = { C1: 150, C2: 120, A: 75, P: 60 };

export const TEMPO = '2-0-3';

export function isLower(ex: Exercise): boolean {
  return LOWER_BODY.includes(ex.primary) && !ex.hinge;
}

export interface ClassRule {
  reps: [number, number];
  effort: Effort;
  rest: number;
}

/** Reglas por clase y modo. HD Adaptado es la referencia (sección 5 del brief). */
export function classRule(ex: Exercise, mode: Mode, cfg?: Pick<EngineConfig, 'restOverrides'>): ClassRule {
  const restBase = cfg?.restOverrides?.[ex.cls] ?? DEFAULT_REST[ex.cls];
  let reps: [number, number];
  let effort: Effort;
  switch (ex.cls) {
    case 'C1':
      reps = ex.hinge ? [6, 10] : isLower(ex) ? [8, 12] : [6, 10];
      // Fallo sólo con seguros/ayudante → por defecto 1 RIR en compuestos libres.
      effort = '1 RIR';
      break;
    case 'C2':
      reps = isLower(ex) ? [8, 12] : [6, 10];
      effort = ex.safeFailure ? 'fallo' : '1 RIR';
      break;
    case 'A':
      reps = [8, 12];
      effort = ex.safeFailure ? 'fallo' : '1 RIR';
      break;
    case 'P':
      reps = ex.primary === 'core' ? [10, 15] : [12, 20];
      effort = ex.safeFailure ? 'fallo' : '1 RIR';
      break;
  }
  if (mode === 'puro') {
    // Mentzer: todo al fallo, 6-10. Gemelos/core conservan su rango alto.
    if (ex.cls !== 'P') reps = [6, 10];
    effort = 'fallo';
  }
  return { reps, effort, rest: restBase };
}

export function softenEffort(e: Effort): Effort {
  if (e === 'fallo') return '1 RIR';
  if (e === '1 RIR') return '2 RIR';
  if (e === '2 RIR') return '3 RIR';
  return e;
}

/**
 * Calentamientos específicos (aproximación).
 * - Compuesto principal C1: 60%×6-8 y 80%×3-4 (+40%×10 si fatiga 5).
 * - Compuesto principal C2: 80%×3-4 (+60%×6-8 si fatiga ≥3).
 * - Compuesto secundario: 1 de acercamiento (recortable).
 * - Aislamiento: 1 ligera sólo si es el primero de su músculo en el día.
 * - P y compuestos pre-agotados: ninguno.
 * - HD Puro (Yates): +1 aproximación en el compuesto principal.
 */
export function warmupsFor(
  ex: Exercise,
  opts: { isMain: boolean; firstOfMuscle: boolean; preExhausted: boolean; yates?: boolean }
): WarmupSet[] {
  const W40: WarmupSet = { pct: 40, reps: '10' };
  const W60: WarmupSet = { pct: 60, reps: '6-8' };
  const W80: WarmupSet = { pct: 80, reps: '3-4' };
  const LIGHT: WarmupSet = { pct: 50, reps: '10-12' };
  if (opts.preExhausted) return [];
  if (ex.cls === 'P') return [];
  if (ex.cls === 'A') return opts.firstOfMuscle ? [LIGHT] : [];
  if (opts.isMain) {
    // HD Puro sigue a Yates: una aproximación más antes de la única serie efectiva.
    if (ex.cls === 'C1') return ex.fatigue >= 5 || opts.yates ? [W40, W60, W80] : [W60, W80];
    if (opts.yates) return ex.fatigue >= 3 ? [W40, W60, W80] : [W60, W80];
    return ex.fatigue >= 3 ? [W60, W80] : [W80];
  }
  return [W80];
}

export function techniqueFor(
  ex: Exercise,
  mode: Mode,
  opts: { conservative: boolean; preExhaust: boolean; paired: boolean }
): { technique?: Technique; mini?: number } {
  if (opts.preExhaust) return { technique: 'pre-agotamiento' };
  if (opts.conservative) return {};
  if (!ex.safeFailure) return {};
  if (mode === 'puro') {
    if (ex.cls === 'A') return { technique: 'rest-pause', mini: 2 };
    if (ex.cls === 'C2') return { technique: 'negativas' };
    return {};
  }
  if (mode === 'adaptado' && ex.cls === 'A') return { technique: 'rest-pause', mini: 2 };
  if (mode === 'fast40' && ex.cls === 'A' && !opts.paired) return { technique: 'rest-pause', mini: 1 };
  return {};
}

/**
 * Prioridad (4 = máxima):
 * compuesto principal de músculo grande > músculo prioritario > aislamientos/compuestos secundarios > core/gemelos/brazos.
 */
export function priorityFor(ex: Exercise, isMain: boolean, priorities: Muscle[]): number {
  if (isMain && (ex.cls === 'C1' || ex.cls === 'C2') && BIG.includes(ex.primary)) return 4;
  if (priorities.includes(ex.primary)) return 3;
  if (SMALL.includes(ex.primary)) return 1;
  return 2;
}

/** Objetivo semanal de referencia para ordenar "poco volumen". */
export function volumeTarget(m: Muscle): number {
  return SMALL.includes(m) ? 6 : 10;
}
