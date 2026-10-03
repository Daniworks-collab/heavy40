import type { DayPlan, Mode, Routine, Slot } from '@/engine/types';
import { defaultRoutine } from './templates';

/** Un split guardado por el usuario (prearmado o personalizado). */
export interface Split {
  id: string;
  name: string;
  presetId?: string;
  custom: boolean;
  /** Recuperación: Heavy Duty pide ≥48 h entre sesiones; el resto, ≥48 h por músculo. */
  restRule: 'sesion' | 'musculo';
  /** Heavy Duty: cada día lleva ejercicios distintos. */
  distinctDays: boolean;
  routine: Routine;
  createdAt: string;
}

export interface SplitPreset {
  id: string;
  name: string;
  short: string;
  days: number;
  desc: string;
  restRule: Split['restRule'];
  distinctDays: boolean;
  suggestedMode: Mode;
  /** Nombres y ejercicios por día (ids del catálogo). */
  plan: { name: string; ex: string[] }[];
}

/** Días de la semana por defecto según cuántos días entrenas (0 = domingo). */
export function spreadWeekdays(n: number): number[] {
  const table: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 0]
  };
  return table[Math.max(1, Math.min(7, n))];
}

const PUSH_A = ['press-banca-barra', 'press-inclinado-mancuernas', 'press-militar-mancuernas', 'elevacion-lateral-mancuerna', 'pajaros-maquina', 'ext-triceps-cuerda', 'ext-triceps-sobre-cabeza'];
const PULL_A = ['dominadas', 'remo-barra', 'remo-maquina', 'pullover-polea', 'curl-barra-z', 'curl-martillo'];
const LEGS_A = ['sentadilla-hack', 'peso-muerto-rumano', 'extension-cuadriceps', 'curl-femoral-sentado', 'talones-de-pie', 'crunch-polea'];
const PUSH_B = ['press-inclinado-smith', 'press-pecho-maquina', 'press-hombros-maquina', 'cruces-polea', 'elevacion-lateral-polea', 'face-pull', 'press-frances'];
const PULL_B = ['jalon-neutro', 'remo-t', 'remo-mancuerna', 'remo-polea-baja', 'curl-inclinado', 'curl-polea'];
const LEGS_B = ['prensa-45', 'hip-thrust', 'sentadilla-smith', 'curl-femoral-tumbado', 'talones-sentado', 'elevacion-piernas-colgado'];

export const SPLIT_PRESETS: SplitPreset[] = [
  {
    id: 'hd3',
    name: 'Heavy Duty 3 días',
    short: 'HD 3',
    days: 3,
    desc: 'Pecho·Cuádriceps·Dorsal / Espalda·Femorales·Hombro / Cuádriceps·Pecho·Brazos. Cada músculo grande 2×/semana con pocas series muy intensas.',
    restRule: 'sesion',
    distinctDays: true,
    suggestedMode: 'adaptado',
    plan: []
  },
  {
    id: 'fb2',
    name: 'Full Body 2 días',
    short: 'FB 2',
    days: 2,
    desc: 'Cuerpo completo dos veces por semana. Ideal si tienes poco tiempo para ir al gimnasio.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Cuerpo completo A', ex: ['prensa-45', 'press-banca-mancuernas', 'remo-maquina', 'press-militar-mancuernas', 'curl-femoral-tumbado', 'curl-polea', 'ext-triceps-cuerda'] },
      { name: 'Cuerpo completo B', ex: ['peso-muerto-rumano', 'press-inclinado-maquina', 'jalon-neutro', 'elevacion-lateral-mancuerna', 'extension-cuadriceps', 'curl-martillo', 'ext-triceps-sobre-cabeza'] }
    ]
  },
  {
    id: 'fb3',
    name: 'Full Body 3 días',
    short: 'FB 3',
    days: 3,
    desc: 'Cuerpo completo tres veces por semana con rotación A/B/C. Frecuencia alta, sesiones equilibradas.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Full Body A', ex: ['sentadilla-hack', 'press-banca-mancuernas', 'remo-maquina', 'elevacion-lateral-polea', 'curl-femoral-tumbado', 'curl-barra-z'] },
      { name: 'Full Body B', ex: ['peso-muerto-rumano', 'press-militar-mancuernas', 'jalon-neutro', 'pec-deck', 'extension-cuadriceps', 'ext-triceps-cuerda'] },
      { name: 'Full Body C', ex: ['prensa-45', 'press-inclinado-mancuernas', 'remo-polea-baja', 'pajaros-maquina', 'curl-femoral-sentado', 'curl-martillo', 'talones-sentado'] }
    ]
  },
  {
    id: 'ul4',
    name: 'Torso / Pierna 4 días',
    short: 'T/P 4',
    days: 4,
    desc: 'Torso y pierna alternados, cada músculo 2×/semana. El clásico equilibrio entre volumen y recuperación.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Torso A', ex: ['press-banca-barra', 'remo-barra', 'press-militar-mancuernas', 'jalon-neutro', 'curl-barra-z', 'ext-triceps-cuerda'] },
      { name: 'Pierna A', ex: ['sentadilla-libre', 'peso-muerto-rumano', 'extension-cuadriceps', 'curl-femoral-sentado', 'talones-de-pie', 'crunch-polea'] },
      { name: 'Torso B', ex: ['press-inclinado-mancuernas', 'remo-maquina', 'dominadas', 'elevacion-lateral-polea', 'curl-inclinado', 'ext-triceps-sobre-cabeza'] },
      { name: 'Pierna B', ex: ['prensa-45', 'hip-thrust', 'sentadilla-hack', 'curl-femoral-tumbado', 'talones-sentado', 'elevacion-piernas-colgado'] }
    ]
  },
  {
    id: 'ppl3',
    name: 'Push / Pull / Legs 3 días',
    short: 'PPL 3',
    days: 3,
    desc: 'Empuje (pecho, hombro, tríceps), tirón (espalda, bíceps) y pierna. Cada músculo 1×/semana con más volumen por sesión.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Push · Empuje', ex: PUSH_A },
      { name: 'Pull · Tirón', ex: PULL_A },
      { name: 'Legs · Pierna', ex: LEGS_A }
    ]
  },
  {
    id: 'ppl6',
    name: 'Push / Pull / Legs 6 días',
    short: 'PPL 6',
    days: 6,
    desc: 'PPL dos veces por semana con variantes A y B. Alta frecuencia y volumen; exige buena recuperación.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Push A', ex: PUSH_A },
      { name: 'Pull A', ex: PULL_A },
      { name: 'Legs A', ex: LEGS_A },
      { name: 'Push B', ex: PUSH_B },
      { name: 'Pull B', ex: PULL_B },
      { name: 'Legs B', ex: LEGS_B }
    ]
  },
  {
    id: 'arnold3',
    name: 'Arnold 3 días',
    short: 'Arnold 3',
    days: 3,
    desc: 'El split de Arnold: Pecho+Espalda, Hombro+Brazo y Pierna. Superseries antagonistas naturales.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Pecho y espalda', ex: ['press-banca-barra', 'dominadas', 'press-inclinado-mancuernas', 'remo-barra', 'pullover-polea', 'cruces-polea'] },
      { name: 'Hombro y brazo', ex: ['press-militar-mancuernas', 'elevacion-lateral-mancuerna', 'pajaros-maquina', 'curl-barra-z', 'press-frances', 'curl-inclinado', 'ext-triceps-cuerda'] },
      { name: 'Pierna', ex: ['sentadilla-libre', 'peso-muerto-rumano', 'extension-cuadriceps', 'curl-femoral-tumbado', 'talones-de-pie', 'crunch-polea'] }
    ]
  },
  {
    id: 'arnold6',
    name: 'Arnold 6 días',
    short: 'Arnold 6',
    days: 6,
    desc: 'El split de Arnold dos veces por semana, con variantes A y B. Volumen alto, para avanzados.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Pecho y espalda A', ex: ['press-banca-barra', 'dominadas', 'press-inclinado-mancuernas', 'remo-barra', 'pullover-polea', 'cruces-polea'] },
      { name: 'Hombro y brazo A', ex: ['press-militar-mancuernas', 'elevacion-lateral-mancuerna', 'pajaros-maquina', 'curl-barra-z', 'press-frances', 'curl-inclinado', 'ext-triceps-cuerda'] },
      { name: 'Pierna A', ex: ['sentadilla-libre', 'peso-muerto-rumano', 'extension-cuadriceps', 'curl-femoral-tumbado', 'talones-de-pie', 'crunch-polea'] },
      { name: 'Pecho y espalda B', ex: ['press-inclinado-smith', 'jalon-prono', 'press-pecho-maquina', 'remo-t', 'pec-deck', 'pullover-mancuerna'] },
      { name: 'Hombro y brazo B', ex: ['press-hombros-maquina', 'elevacion-lateral-polea', 'face-pull', 'curl-predicador-maquina', 'ext-triceps-sobre-cabeza', 'curl-martillo', 'ext-triceps-maquina'] },
      { name: 'Pierna B', ex: ['sentadilla-hack', 'hip-thrust', 'prensa-45', 'curl-femoral-sentado', 'talones-sentado', 'elevacion-piernas-colgado'] }
    ]
  },
  {
    id: 'weider5',
    name: 'Weider 5 días',
    short: 'Weider 5',
    days: 5,
    desc: 'Un grupo muscular por día: pecho, espalda, hombro, brazo y pierna. Cada músculo 1×/semana con mucho volumen.',
    restRule: 'musculo',
    distinctDays: false,
    suggestedMode: 'clasico',
    plan: [
      { name: 'Pecho', ex: ['press-banca-barra', 'press-inclinado-mancuernas', 'press-pecho-maquina', 'cruces-polea', 'fondos'] },
      { name: 'Espalda', ex: ['dominadas', 'remo-barra', 'jalon-neutro', 'remo-polea-baja', 'pullover-polea'] },
      { name: 'Hombro', ex: ['press-militar-mancuernas', 'elevacion-lateral-mancuerna', 'elevacion-lateral-polea', 'pajaros-maquina', 'face-pull'] },
      { name: 'Brazo', ex: ['curl-barra-z', 'press-frances', 'curl-inclinado', 'ext-triceps-cuerda', 'curl-martillo', 'ext-triceps-sobre-cabeza'] },
      { name: 'Pierna', ex: ['sentadilla-libre', 'prensa-45', 'peso-muerto-rumano', 'extension-cuadriceps', 'curl-femoral-sentado', 'talones-de-pie'] }
    ]
  }
];

export const PRESET_BY_ID: Record<string, SplitPreset> = Object.fromEntries(SPLIT_PRESETS.map((p) => [p.id, p]));

let seq = 0;
export function newId(prefix = 'x'): string {
  return `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Rutina inicial de un split prearmado. */
export function presetRoutine(preset: SplitPreset, weekdays?: number[]): Routine {
  const wds = weekdays && weekdays.length === preset.days ? weekdays : spreadWeekdays(preset.days);
  if (preset.id === 'hd3') return defaultRoutine(wds);
  const sid = newId('s');
  const days: DayPlan[] = preset.plan.map((d, i) => ({
    id: `${sid}-d${i + 1}`,
    name: d.name,
    weekday: wds[i],
    slots: d.ex.map((exerciseId, j): Slot => ({ uid: `${sid}-d${i + 1}-${j}-${exerciseId}`, exerciseId }))
  }));
  return { days };
}

export function splitFromPreset(preset: SplitPreset, weekdays?: number[]): Split {
  return {
    id: newId('split'),
    name: preset.name,
    presetId: preset.id,
    custom: false,
    restRule: preset.restRule,
    distinctDays: preset.distinctDays,
    routine: presetRoutine(preset, weekdays),
    createdAt: new Date().toISOString()
  };
}

/** Split personalizado vacío: el usuario nombra el split y sus días, y luego agrega ejercicios. */
export function customSplit(name: string, days: { name: string; weekday: number }[]): Split {
  const sid = newId('c');
  return {
    id: newId('split'),
    name: name.trim() || 'Mi split',
    custom: true,
    restRule: 'musculo',
    distinctDays: false,
    routine: {
      days: days.map((d, i) => ({ id: `${sid}-d${i + 1}`, name: d.name.trim() || `Día ${i + 1}`, weekday: d.weekday, slots: [] }))
    },
    createdAt: new Date().toISOString()
  };
}
