import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import { defaultProfile, defaultRoutine } from '@/data/templates';
import { DEFAULT_CONFIG } from '@/engine/plan';
import { applyProposal, computePlan, explainPlanChange } from '@/engine/recalc';
import type { EngineConfig, ExerciseClass, Mode, PlanResult, Profile, Routine } from '@/engine/types';
import { isoDate, weekKey } from '@/lib/dates';

export type Theme = 'forja' | 'hueso' | 'alto';

export interface Settings {
  mode: Mode;
  generalWarmup: number; // s
  restOverrides: Partial<Record<ExerciseClass, number>>;
  sound: boolean;
  vibration: boolean;
  metronome: boolean;
  theme: Theme;
  fatigueLimit: number;
}

export interface ChangeEntry {
  at: string;
  lines: string[];
}

export interface Deload {
  start: string; // ISO date (lunes)
}

interface AppState {
  onboarded: boolean;
  fitnessAck: boolean;
  profile: Profile;
  routine: Routine;
  settings: Settings;
  loads: Record<string, number>;
  changes: ChangeEntry[];
  programStart: string;
  deloads: Deload[];
  /** weekKey → dayId → weekday reprogramado sólo esa semana */
  overrides: Record<string, Record<string, number>>;
  water: Record<string, number>;
  sleepGoal: number;

  completeOnboarding: (p: { profile: Profile; mode: Mode; weekdays: number[]; loads: Record<string, number> }) => void;
  updateRoutine: (fn: (r: Routine) => Routine) => string[];
  setMode: (m: Mode) => string[];
  setProfile: (p: Partial<Profile>) => string[];
  updateSettings: (p: Partial<Settings>) => string[];
  setWeekdays: (w: number[]) => void;
  setLoad: (exerciseId: string, kg: number) => void;
  optimize: (dayId: string) => string[];
  dismissChange: () => void;
  reschedule: (dayId: string, weekday: number | null, ref?: Date) => void;
  scheduleDeload: (start: string) => void;
  cancelDeload: (start: string) => void;
  addWater: (delta: number) => void;
  setSleepGoal: (h: number) => void;
  replaceAll: (s: Partial<AppState>) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'adaptado',
  generalWarmup: 180,
  restOverrides: {},
  sound: true,
  vibration: true,
  metronome: false,
  theme: 'forja',
  fatigueLimit: 24
};

export function engineConfig(settings: Settings, extra: Partial<EngineConfig> = {}): EngineConfig {
  return {
    ...DEFAULT_CONFIG,
    mode: settings.mode,
    generalWarmup: settings.generalWarmup,
    restOverrides: settings.restOverrides,
    fatigueLimit: settings.fatigueLimit,
    ...extra
  };
}

const initial = () => ({
  onboarded: false,
  fitnessAck: false,
  profile: defaultProfile(),
  routine: defaultRoutine(),
  settings: DEFAULT_SETTINGS,
  loads: {} as Record<string, number>,
  changes: [] as ChangeEntry[],
  programStart: isoDate(),
  deloads: [] as Deload[],
  overrides: {} as Record<string, Record<string, number>>,
  water: {} as Record<string, number>,
  sleepGoal: 8
});

function pushChange(changes: ChangeEntry[], lines: string[]): ChangeEntry[] {
  if (!lines.length) return changes;
  return [{ at: new Date().toISOString(), lines }, ...changes].slice(0, 30);
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Recalcula, explica y guarda. Devuelve las líneas del diff. */
      const commit = (next: { routine?: Routine; profile?: Profile; settings?: Settings }): string[] => {
        const s = get();
        const prevPlan = computePlan(s.routine, s.profile, engineConfig(s.settings));
        const routine = next.routine ?? s.routine;
        const profile = next.profile ?? s.profile;
        const settings = next.settings ?? s.settings;
        const nextPlan = computePlan(routine, profile, engineConfig(settings));
        const lines = explainPlanChange(prevPlan, nextPlan, profile, engineConfig(settings));
        set({ routine, profile, settings, changes: pushChange(s.changes, lines) });
        return lines;
      };
      return {
        ...initial(),
        completeOnboarding: ({ profile, mode, weekdays, loads }) => {
          const routine = defaultRoutine(weekdays);
          set({
            onboarded: true,
            fitnessAck: true,
            profile,
            routine,
            settings: { ...get().settings, mode },
            loads,
            programStart: isoDate(),
            changes: []
          });
        },
        updateRoutine: (fn) => commit({ routine: fn(get().routine) }),
        setMode: (mode) => commit({ settings: { ...get().settings, mode } }),
        setProfile: (p) => commit({ profile: { ...get().profile, ...p } }),
        updateSettings: (p) => {
          const affectsPlan = ['mode', 'generalWarmup', 'restOverrides', 'fatigueLimit'].some((k) => k in p);
          if (affectsPlan) return commit({ settings: { ...get().settings, ...p } });
          set({ settings: { ...get().settings, ...p } });
          return [];
        },
        setWeekdays: (w) => {
          const r = get().routine;
          set({ routine: { days: r.days.map((d, i) => ({ ...d, weekday: w[i] ?? d.weekday })) } });
        },
        setLoad: (exerciseId, kg) => set({ loads: { ...get().loads, [exerciseId]: kg } }),
        optimize: (dayId) => {
          const s = get();
          const plan = computePlan(s.routine, s.profile, engineConfig(s.settings));
          const day = plan.days.find((d) => d.day.id === dayId);
          if (!day?.proposal) return [];
          return commit({ routine: applyProposal(s.routine, dayId, day.proposal.removeUid) });
        },
        dismissChange: () => set({ changes: get().changes.slice(1) }),
        reschedule: (dayId, weekday, ref = new Date()) => {
          const key = weekKey(ref);
          const cur = { ...(get().overrides[key] ?? {}) };
          if (weekday == null) delete cur[dayId];
          else cur[dayId] = weekday;
          set({ overrides: { ...get().overrides, [key]: cur } });
        },
        scheduleDeload: (start) => set({ deloads: [...get().deloads.filter((d) => d.start !== start), { start }].sort((a, b) => a.start.localeCompare(b.start)) }),
        cancelDeload: (start) => set({ deloads: get().deloads.filter((d) => d.start !== start) }),
        addWater: (delta) => {
          const k = isoDate();
          set({ water: { ...get().water, [k]: Math.max(0, (get().water[k] ?? 0) + delta) } });
        },
        setSleepGoal: (h) => set({ sleepGoal: h }),
        replaceAll: (s) => set(s),
        reset: () => set(initial())
      };
    },
    {
      name: 'heavy40-app',
      version: 1,
      partialize: (s) => ({
        onboarded: s.onboarded,
        fitnessAck: s.fitnessAck,
        profile: s.profile,
        routine: s.routine,
        settings: s.settings,
        loads: s.loads,
        changes: s.changes,
        programStart: s.programStart,
        deloads: s.deloads,
        overrides: s.overrides,
        water: s.water,
        sleepGoal: s.sleepGoal
      })
    }
  )
);

/** Plan recalculado (memoizado) para la rutina y ajustes actuales. */
export function usePlan(extra?: Partial<EngineConfig>): PlanResult {
  const routine = useApp((s) => s.routine);
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const key = JSON.stringify(extra ?? {});
  return useMemo(
    () => computePlan(routine, profile, engineConfig(settings, extra)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routine, profile, settings, key]
  );
}

/** ¿La semana de `ref` es de descarga? */
export function isDeloadWeek(deloads: Deload[], ref: Date = new Date()): boolean {
  const k = weekKey(ref);
  return deloads.some((d) => d.start === k);
}

/** Día de la semana efectivo de cada sesión esta semana (con reprogramaciones). */
export function effectiveWeekdays(routine: Routine, overrides: AppState['overrides'], ref: Date = new Date()): Record<string, number> {
  const o = overrides[weekKey(ref)] ?? {};
  return Object.fromEntries(routine.days.map((d) => [d.id, o[d.id] ?? d.weekday]));
}
