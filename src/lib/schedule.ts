import type { SessionRecord } from '@/db';
import type { DayPlan, Routine } from '@/engine/types';
import { addDays, daysBetween, isoDate, parseIso, startOfWeek, weekKey } from './dates';

type Overrides = Record<string, Record<string, number>>;

export function weekdayOf(day: DayPlan, overrides: Overrides, ref: Date): number {
  return overrides[weekKey(ref)]?.[day.id] ?? day.weekday;
}

export function sessionOn(routine: Routine, overrides: Overrides, date: Date): DayPlan | undefined {
  return routine.days.find((d) => weekdayOf(d, overrides, date) === date.getDay());
}

/** Próxima sesión programada a partir de `from` (incluye hoy si aún no se hizo). */
export function nextSession(routine: Routine, overrides: Overrides, from: Date, doneDates: Set<string>): { day: DayPlan; date: Date } | undefined {
  for (let i = 0; i < 14; i++) {
    const d = addDays(new Date(from.getFullYear(), from.getMonth(), from.getDate()), i);
    const s = sessionOn(routine, overrides, d);
    if (s && !doneDates.has(isoDate(d))) return { day: s, date: d };
  }
  return undefined;
}

/** Día de la rutina que toca según el orden (el siguiente al último hecho). */
export function nextInRotation(routine: Routine, sessions: SessionRecord[]): DayPlan {
  const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return routine.days[0];
  const idx = routine.days.findIndex((d) => d.id === last.dayId);
  return routine.days[(idx + 1) % routine.days.length] ?? routine.days[0];
}

/** Semanas consecutivas con 3 sesiones (la actual cuenta si ya va completa o en ritmo). */
export function streakWeeks(sessions: SessionRecord[], now = new Date()): { weeks: number; thisWeek: number } {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const k = weekKey(parseIso(s.date));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const thisWeek = byWeek.get(weekKey(now)) ?? 0;
  let weeks = thisWeek >= 3 ? 1 : 0;
  let cursor = addDays(startOfWeek(now), -7);
  for (let i = 0; i < 520; i++) {
    if ((byWeek.get(isoDate(cursor)) ?? 0) >= 3) weeks++;
    else break;
    cursor = addDays(cursor, -7);
  }
  return { weeks, thisWeek };
}

export function hoursSinceLast(sessions: SessionRecord[], now = new Date()): number | undefined {
  const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return undefined;
  return (now.getTime() - new Date(last.date).getTime()) / 3600000;
}

export function weeksSince(iso: string, now = new Date()): number {
  return Math.floor(daysBetween(parseIso(iso), now) / 7);
}
