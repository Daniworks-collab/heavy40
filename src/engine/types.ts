// Tipos de dominio del motor HEAVY·40. Sin dependencias de UI.

export type Muscle =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'cuadriceps'
  | 'femorales'
  | 'gluteos'
  | 'gemelos'
  | 'core';

export type ExerciseClass = 'C1' | 'C2' | 'A' | 'P';

export type Equipment =
  | 'barra'
  | 'mancuernas'
  | 'maquina'
  | 'polea'
  | 'smith'
  | 'rack'
  | 'banco'
  | 'barra-dominadas'
  | 'paralelas'
  | 'peso-corporal';

export type Joint = 'hombro' | 'codo' | 'muneca' | 'lumbar' | 'rodilla' | 'cadera';

export type Pattern =
  | 'empuje-horizontal'
  | 'empuje-vertical'
  | 'traccion-vertical'
  | 'traccion-horizontal'
  | 'sentadilla'
  | 'bisagra'
  | 'puente'
  | 'aperturas'
  | 'elevacion-lateral'
  | 'abduccion-horizontal'
  | 'pullover'
  | 'flexion-codo'
  | 'extension-codo'
  | 'extension-rodilla'
  | 'flexion-rodilla'
  | 'abduccion-cadera'
  | 'flexion-plantar'
  | 'flexion-tronco';

export type Level = 'principiante' | 'intermedio' | 'avanzado';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  cls: ExerciseClass;
  fatigue: 1 | 2 | 3 | 4 | 5;
  safeFailure: boolean;
  repRange: [number, number];
  rest: number;
  equipment: Equipment[];
  unilateral: boolean;
  pattern: Pattern;
  joints: Joint[];
  cues: [string, string, string];
  commonError: string;
  alternatives: string[];
  level?: Level;
  /** Peso muerto rumano y variantes de bisagra: 6-10 aunque sea tren inferior */
  hinge?: boolean;
}

export type Mode = 'puro' | 'adaptado' | 'fast40';

export type Effort = 'fallo' | '1 RIR' | '2 RIR' | '3 RIR';

export type Technique = 'rest-pause' | 'negativas' | 'pre-agotamiento';

export interface Slot {
  uid: string;
  exerciseId: string;
  /** Series efectivas fijadas por el usuario. Si no hay, el motor decide. */
  lockedSets?: number;
  /** Relleno: sólo entra si cabe en el presupuesto. */
  optional?: boolean;
  /** Este aislamiento pre-agota al siguiente compuesto (uid del compuesto). */
  preExhaustFor?: string;
}

export interface DayPlan {
  id: string;
  /** null → nombre automático según los músculos del día. */
  name: string | null;
  weekday: number; // 0 = domingo … 6 = sábado
  slots: Slot[];
}

export interface Routine {
  days: DayPlan[];
}

export interface WarmupSet {
  pct: number;
  reps: string;
}

export type AdjustmentKind =
  | 'add-set'
  | 'remove-set'
  | 'remove-warmup'
  | 'shorten-rest'
  | 'include-optional'
  | 'skip-optional'
  | 'substitute'
  | 'drop-unavailable';

export interface Adjustment {
  kind: AdjustmentKind;
  uid: string;
  exerciseId: string;
  text: string;
}

export interface PrescribedExercise {
  uid: string;
  slot: Slot;
  exercise: Exercise;
  workSets: number;
  warmups: WarmupSet[];
  reps: [number, number];
  effort: Effort;
  rest: number;
  technique?: Technique;
  /** Mini-series de rest-pause previstas en la última serie. */
  techniqueMini?: number;
  tempo: string;
  /** Prioridad (4 = máxima). Para recortes y relleno. */
  priority: number;
  /** Es el compuesto principal de su músculo en este día. */
  isMain: boolean;
  /** uid del ejercicio con el que va en par antagonista (Fast-40). */
  pairWith?: string;
  /** Segundos atribuidos a este ejercicio (incluye su transición). */
  seconds: number;
  optional: boolean;
}

export type StepKind = 'general' | 'warmup' | 'work' | 'rest' | 'transition';

export interface TimelineStep {
  kind: StepKind;
  uid?: string;
  setIndex?: number;
  seconds: number;
  label: string;
}

export interface PrescribedDay {
  day: DayPlan;
  name: string;
  items: PrescribedExercise[];
  /** Ejercicios opcionales que no entraron por tiempo. */
  skipped: PrescribedExercise[];
  timeline: TimelineStep[];
  seconds: number;
  fatigue: number;
  adjustments: Adjustment[];
  overBudget: boolean;
  /** Propuesta para "Optimizar" cuando los recortes automáticos no bastan. */
  proposal?: { removeUid: string; exerciseId: string; text: string };
  /** Sugerencia de ejercicio extra cuando sobra tiempo. */
  suggestion?: { exerciseId: string; text: string };
}

export type VolumeBand = 'bajo' | 'minimo' | 'optimo' | 'excesivo' | 'ok' | 'alto';

export interface MuscleVolume {
  muscle: Muscle;
  sets: number;
  band: VolumeBand;
}

export type WarningKind = 'cobertura' | 'volumen' | 'fatiga' | 'redundancia' | 'espaciado' | 'tiempo' | 'equipo';

export interface Warning {
  kind: WarningKind;
  severity: 'info' | 'aviso' | 'critico';
  dayId?: string;
  text: string;
}

export interface PlanResult {
  mode: Mode;
  /** Tiempo disponible usado (s) */
  budget: number;
  days: PrescribedDay[];
  weekly: MuscleVolume[];
  /** exposiciones por músculo y día (1 directa, 0.5 indirecta) */
  coverage: Record<Muscle, number[]>;
  warnings: Warning[];
}

export interface Profile {
  level: Level;
  bodyweight: number;
  equipment: Equipment[];
  injuries: Joint[];
  priorities: Muscle[];
}

export interface EngineConfig {
  mode: Mode;
  /** Calentamiento general en segundos (0-300). */
  generalWarmup: number;
  /** Tiempo disponible en segundos (por defecto 2400 = 40 min). */
  budget: number;
  /** Objetivo de relleno: budget − 120 s. */
  target: number;
  /** Segundos por repetición según cadencia (subida + pausa + bajada). */
  secPerRep?: number;
  /** Cadencia mostrada, p. ej. "2-0-4". */
  tempo?: string;
  /** Rango global de reps que reemplaza el de cada clase (salvo gemelos/core). */
  repRange?: [number, number] | null;
  fatigueLimit: number; // 24
  restOverrides?: Partial<Record<ExerciseClass, number>>;
  /** Readiness bajo → modo conservador. */
  conservative?: boolean;
}
