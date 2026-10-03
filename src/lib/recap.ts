import type { SessionRecord } from '@/db';
import type { Muscle } from '@/engine/types';
import { addDays, isoDate, parseIso, startOfWeek, weekKey } from './dates';

export interface Recap {
  key: string;
  kind: 'semana' | 'mes';
  title: string;
  sessions: number;
  planned: number;
  volume: number;
  prs: number;
  minutes: number;
  topMuscle?: Muscle;
  complete: boolean;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function summarize(list: SessionRecord[]) {
  const muscles: Partial<Record<Muscle, number>> = {};
  for (const s of list) for (const [m, v] of Object.entries(s.muscles)) muscles[m as Muscle] = (muscles[m as Muscle] ?? 0) + (v ?? 0);
  const topMuscle = (Object.entries(muscles).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as Muscle | undefined) ?? undefined;
  return {
    sessions: list.length,
    volume: Math.round(list.reduce((a, s) => a + s.volumeKg, 0)),
    prs: list.reduce((a, s) => a + s.prs.length, 0),
    minutes: Math.round(list.reduce((a, s) => a + s.durationSec, 0) / 60),
    topMuscle
  };
}

/** Resumen de la semana anterior (lunes a domingo). */
export function lastWeekRecap(sessions: SessionRecord[], perWeek: number, now = new Date()): Recap | null {
  const start = addDays(startOfWeek(now), -7);
  const end = startOfWeek(now);
  const list = sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= start && d < end;
  });
  if (!list.length) return null;
  const sum = summarize(list);
  return { key: `w-${weekKey(start)}`, kind: 'semana', title: 'Tu semana', planned: perWeek, complete: sum.sessions >= perWeek, ...sum };
}

/** Resumen del mes anterior; se ofrece durante los primeros 7 días del mes. */
export function lastMonthRecap(sessions: SessionRecord[], perWeek: number, now = new Date()): Recap | null {
  if (now.getDate() > 7) return null;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prefix = isoDate(prev).slice(0, 7);
  const list = sessions.filter((s) => s.date.slice(0, 7) === prefix);
  if (!list.length) return null;
  const sum = summarize(list);
  const planned = perWeek * 4;
  return { key: `m-${prefix}`, kind: 'mes', title: `Tu ${MONTHS[prev.getMonth()]}`, planned, complete: sum.sessions >= planned, ...sum };
}

export function weekStartLabel(key: string): Date {
  return parseIso(key.slice(2));
}
