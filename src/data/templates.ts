import type { DayPlan, Equipment, Profile, Routine, Slot } from '@/engine/types';
import { EQUIPMENT } from './labels';

function s(uid: string, exerciseId: string, extra: Partial<Slot> = {}): Slot {
  return { uid, exerciseId, ...extra };
}

/**
 * Plantilla por defecto (sección 6 del brief). Las series NO se guardan aquí:
 * el motor parte de 1 serie efectiva y rellena según el modo hasta 38-40 min.
 * Los ejercicios `optional` sólo entran si sobra tiempo (p. ej. en HD Puro).
 */
export function defaultRoutine(weekdays: number[] = [1, 3, 5]): Routine {
  const days: DayPlan[] = [
    {
      id: 'd1',
      name: 'Pecho · Cuádriceps · Dorsal',
      weekday: weekdays[0],
      slots: [
        s('d1-prensa', 'prensa-45'),
        s('d1-incl', 'press-inclinado-mancuernas'),
        s('d1-jalon', 'jalon-neutro'),
        s('d1-lat', 'elevacion-lateral-polea'),
        s('d1-tri', 'ext-triceps-cuerda'),
        s('d1-talon', 'talones-de-pie'),
        s('d1-ext', 'extension-cuadriceps', { optional: true }),
        s('d1-pull', 'pullover-polea', { optional: true })
      ]
    },
    {
      id: 'd2',
      name: 'Espalda · Femorales · Hombro',
      weekday: weekdays[1],
      slots: [
        s('d2-pdr', 'peso-muerto-rumano'),
        s('d2-remo', 'remo-maquina'),
        s('d2-press', 'press-militar-mancuernas'),
        s('d2-fondos', 'fondos'),
        s('d2-curlfem', 'curl-femoral-tumbado'),
        s('d2-curlz', 'curl-barra-z'),
        s('d2-pajaros', 'pajaros-maquina'),
        s('d2-core', 'elevacion-piernas-colgado', { optional: true })
      ]
    },
    {
      id: 'd3',
      name: 'Cuádriceps · Pecho · Brazos',
      weekday: weekdays[2],
      slots: [
        s('d3-hack', 'sentadilla-hack'),
        s('d3-dom', 'dominadas'),
        s('d3-pecdeck', 'pec-deck', { preExhaustFor: 'd3-pressmaq' }),
        s('d3-pressmaq', 'press-pecho-maquina'),
        s('d3-tri', 'ext-triceps-sobre-cabeza'),
        s('d3-curl', 'curl-martillo'),
        s('d3-talon', 'talones-sentado'),
        s('d3-curlfem', 'curl-femoral-sentado'),
        s('d3-crunch', 'crunch-polea', { optional: true })
      ]
    }
  ];
  return { days };
}

export const FULL_GYM: Equipment[] = [...EQUIPMENT];

export function defaultProfile(): Profile {
  return { level: 'intermedio', bodyweight: 80, equipment: FULL_GYM, injuries: [], priorities: [] };
}
