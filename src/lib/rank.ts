import type { SessionRecord } from '@/db';
import { parseIso, weekKey } from './dates';
import { streakWeeks } from './schedule';

/**
 * Gamificación HEAVY·40. La XP premia lo que importa en hipertrofia:
 * series efectivas, récords, constancia semanal y respetar tu tiempo.
 */
export const XP = {
  workSet: 10,
  pr: 50,
  under40: 25,
  fullWeek: 100
} as const;

export interface Rank {
  id: string;
  name: string;
  min: number;
  tagline: string;
}

export const RANKS: Rank[] = [
  { id: 'hierro', name: 'Hierro', min: 0, tagline: 'Materia prima. Empieza la forja.' },
  { id: 'acero', name: 'Acero', min: 1500, tagline: 'Ya aguantas el calor.' },
  { id: 'templado', name: 'Acero templado', min: 4000, tagline: 'Duro y flexible. Constancia probada.' },
  { id: 'titanio', name: 'Titanio', min: 9000, tagline: 'Ligero, brutal, difícil de doblar.' },
  { id: 'tungsteno', name: 'Tungsteno', min: 18000, tagline: 'El punto de fusión más alto.' },
  { id: 'forjado', name: 'Forjado', min: 32000, tagline: 'Leyenda de la forja.' }
];

export function sessionXp(s: Pick<SessionRecord, 'sets' | 'prs' | 'durationSec' | 'budgetSec'>): number {
  const work = s.sets.filter((x) => x.kind === 'work').length;
  return work * XP.workSet + s.prs.length * XP.pr + (s.durationSec > 0 && s.durationSec <= (s.budgetSec ?? 2400) ? XP.under40 : 0);
}

export function totalXp(sessions: SessionRecord[], perWeek = 3): number {
  const byWeek = new Map<string, number>();
  let xp = 0;
  for (const s of sessions) {
    xp += sessionXp(s);
    const k = weekKey(parseIso(s.date.slice(0, 10)));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  for (const n of byWeek.values()) if (n >= perWeek) xp += XP.fullWeek;
  return xp;
}

export interface RankState {
  xp: number;
  rank: Rank;
  next?: Rank;
  index: number;
  /** 0..1 dentro del rango actual */
  progress: number;
  toNext: number;
}

export function rankFor(xp: number): RankState {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.min) index = i;
  });
  const rank = RANKS[index];
  const next = RANKS[index + 1];
  const progress = next ? (xp - rank.min) / (next.min - rank.min) : 1;
  return { xp, rank, next, index, progress, toNext: next ? next.min - xp : 0 };
}

export interface Medal {
  id: string;
  name: string;
  desc: string;
  icon: 'spark' | 'calendar' | 'flame' | 'timer' | 'layers' | 'trophy' | 'anvil' | 'crown' | 'dumbbell' | 'medal' | 'star' | 'zap' | 'month';
  current: number;
  goal: number;
  unlocked: boolean;
}

export function medals(sessions: SessionRecord[], perWeek = 3): Medal[] {
  const work = sessions.reduce((a, s) => a + s.sets.filter((x) => x.kind === 'work').length, 0);
  const prs = sessions.reduce((a, s) => a + s.prs.length, 0);
  const under = sessions.filter((s) => s.durationSec > 0 && s.durationSec <= (s.budgetSec ?? 2400)).length;
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const k = weekKey(parseIso(s.date.slice(0, 10)));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const fullWeeks = [...byWeek.values()].filter((n) => n >= perWeek).length;
  const streak = Math.max(streakWeeks(sessions, new Date(), perWeek).weeks, longestStreak(byWeek, perWeek));
  const m = (id: string, name: string, desc: string, icon: Medal['icon'], current: number, goal: number): Medal => ({
    id,
    name,
    desc,
    icon,
    current: Math.min(current, goal),
    goal,
    unlocked: current >= goal
  });
  // Mes completo: un mes calendario con al menos 4 semanas de split (sesiones ≥ días × 4)
  const byMonth = new Map<string, number>();
  for (const s of sessions) byMonth.set(s.date.slice(0, 7), (byMonth.get(s.date.slice(0, 7)) ?? 0) + 1);
  const fullMonths = [...byMonth.values()].filter((n) => n >= perWeek * 4).length;
  return [
    m('chispa', 'Primera chispa', 'Completa tu primera sesión', 'spark', sessions.length, 1),
    m('pr1', 'Primer récord', 'Supera una marca personal', 'zap', prs, 1),
    m('semana', 'Semana completa', 'Todos los días de tu split en una semana', 'calendar', fullWeeks, 1),
    m('w10', 'Diez', '10 entrenamientos', 'dumbbell', sessions.length, 10),
    m('mes', 'Mes completo', 'Un mes con todas tus sesiones (días × 4)', 'month', fullMonths, 1),
    m('racha4', 'Racha de hierro', '4 semanas seguidas completas', 'flame', streak, 4),
    m('disciplina', 'Disciplina', '10 sesiones dentro de tu tiempo', 'timer', under, 10),
    m('records', 'Rompe-récords', '10 récords personales', 'trophy', prs, 10),
    m('w50', 'Cincuenta', '50 entrenamientos', 'medal', sessions.length, 50),
    m('centurion', 'Centurión', '100 series efectivas', 'layers', work, 100),
    m('yunque', 'Yunque', '12 semanas seguidas completas', 'anvil', streak, 12),
    m('w100', 'Cien', '100 entrenamientos', 'star', sessions.length, 100),
    m('mil', 'Mil golpes', '1,000 series efectivas', 'crown', work, 1000)
  ];
}

function longestStreak(byWeek: Map<string, number>, perWeek: number): number {
  const weeks = [...byWeek.entries()]
    .filter(([, n]) => n >= perWeek)
    .map(([k]) => parseIso(k).getTime())
    .sort((a, b) => a - b);
  let best = 0;
  let cur = 0;
  let prev = 0;
  for (const t of weeks) {
    cur = prev && Math.round((t - prev) / (7 * 86400000)) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = t;
  }
  return best;
}

/** Medallas que pasan de bloqueadas a desbloqueadas. */
export function newlyUnlocked(before: Medal[], after: Medal[]): Medal[] {
  const was = new Set(before.filter((m) => m.unlocked).map((m) => m.id));
  return after.filter((m) => m.unlocked && !was.has(m.id));
}

/** Congeladores de racha: 1 al empezar + 1 por cada 4 semanas completas (máx. 2 guardados). */
export function freezesAvailable(sessions: SessionRecord[], perWeek: number, frozen: string[]): number {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const k = weekKey(parseIso(s.date.slice(0, 10)));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const full = [...byWeek.values()].filter((n) => n >= perWeek).length;
  const earned = 1 + Math.floor(full / 4);
  return Math.max(0, Math.min(2, earned - frozen.length));
}
