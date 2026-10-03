import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import { defaultProfile, defaultRoutine } from '@/data/templates';
import { PRESET_BY_ID, newId, splitFromPreset, type Split } from '@/data/splits';
import { DEFAULT_CONFIG } from '@/engine/plan';
import { DEFAULT_CUSTOM } from '@/engine/rules';
import { applyProposal, computePlan, explainPlanChange } from '@/engine/recalc';
import type { CustomStyle, DayPlan, EngineConfig, ExerciseClass, Mode, PlanResult, Profile, Routine } from '@/engine/types';
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
  /** Tiempo disponible por sesión (min). */
  sessionMinutes: number;
  /** Cadencia en segundos: subida, pausa, bajada. */
  cadence: { up: number; pause: number; down: number };
  /** Rango global de reps; null = rango por tipo de ejercicio. */
  repRange: [number, number] | null;
  /** Incremento de carga para la doble progresión (kg). */
  increments: { upper: number; lower: number };
  /** Calculadora de discos */
  barKg: number;
  plates: number[];
  /** Reglas del estilo personalizado */
  custom: CustomStyle;
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
  /** Biblioteca de splits; `routine` es siempre la rutina del split activo. */
  splits: Split[];
  activeSplitId: string;

  completeOnboarding: (p: {
    profile: Profile;
    mode: Mode;
    weekdays: number[];
    loads: Record<string, number>;
    sessionMinutes?: number;
    split?: Split;
  }) => void;
  addSplit: (split: Split, opts?: { activate?: boolean; mode?: Mode }) => void;
  activateSplit: (id: string) => void;
  renameSplit: (id: string, name: string) => void;
  duplicateSplit: (id: string) => void;
  deleteSplit: (id: string) => void;
  addDay: (name: string, weekday: number) => string[];
  removeDay: (dayId: string) => string[];
  updateDay: (dayId: string, patch: Partial<Pick<DayPlan, 'name' | 'weekday'>>) => void;
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
  fatigueLimit: 24,
  sessionMinutes: 40,
  cadence: { up: 2, pause: 0, down: 4 },
  repRange: null,
  increments: { upper: 2.5, lower: 5 },
  barKg: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  custom: DEFAULT_CUSTOM
};

/** Ajustes guardados por versiones anteriores pueden no tener los campos nuevos. */
export function withDefaults(s: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...s };
}

export function cadenceSeconds(c: Settings['cadence']): number {
  return c.up + c.pause + c.down;
}

export function engineConfig(raw: Settings, extra: Partial<EngineConfig> = {}): EngineConfig {
  const settings = withDefaults(raw);
  const budget = Math.round(settings.sessionMinutes * 60);
  return {
    ...DEFAULT_CONFIG,
    mode: settings.mode,
    generalWarmup: settings.generalWarmup,
    restOverrides: settings.restOverrides,
    fatigueLimit: settings.fatigueLimit,
    budget,
    target: budget - 120,
    secPerRep: cadenceSeconds(settings.cadence),
    tempo: `${settings.cadence.up}-${settings.cadence.pause}-${settings.cadence.down}`,
    repRange: settings.repRange,
    custom: settings.custom,
    ...extra
  };
}

type SplitState = Pick<AppState, 'settings' | 'splits' | 'activeSplitId'>;

export function activeSplit(s: Pick<AppState, 'splits' | 'activeSplitId'>): Split | undefined {
  return s.splits?.find((x) => x.id === s.activeSplitId) ?? s.splits?.[0];
}

/** Configuración del motor con las reglas del split activo (recuperación, días distintos). */
export function stateConfig(s: SplitState, extra: Partial<EngineConfig> = {}): EngineConfig {
  const sp = activeSplit(s);
  return engineConfig(s.settings, { restRule: sp?.restRule ?? 'sesion', distinctDays: sp?.distinctDays ?? true, ...extra });
}

/** Segundos de presupuesto con el tiempo disponible configurado. */
export function useBudget(): number {
  return useApp((s) => Math.round(withDefaults(s.settings).sessionMinutes * 60));
}

function hdSplit(routine: Routine = defaultRoutine()): Split {
  return { ...splitFromPreset(PRESET_BY_ID.hd3), id: 'split-hd3', routine };
}

const initial = () => ({
  onboarded: false,
  fitnessAck: false,
  profile: defaultProfile(),
  routine: hdSplit().routine,
  splits: [hdSplit()] as Split[],
  activeSplitId: 'split-hd3',
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
        const prevPlan = computePlan(s.routine, s.profile, stateConfig(s));
        const routine = next.routine ?? s.routine;
        const profile = next.profile ?? s.profile;
        const settings = next.settings ?? s.settings;
        const cfg = stateConfig({ ...s, settings });
        const nextPlan = computePlan(routine, profile, cfg);
        const lines = explainPlanChange(prevPlan, nextPlan, profile, cfg);
        set({ routine, profile, settings, splits: syncSplits(s, routine), changes: pushChange(s.changes, lines) });
        return lines;
      };
      /** Guarda la rutina activa dentro de su split. */
      const syncSplits = (s: AppState, routine: Routine): Split[] =>
        (s.splits ?? []).map((x) => (x.id === s.activeSplitId ? { ...x, routine } : x));
      return {
        ...initial(),
        completeOnboarding: ({ profile, mode, weekdays, loads, sessionMinutes, split }) => {
          const sp = split ?? hdSplit(defaultRoutine(weekdays));
          set({
            onboarded: true,
            fitnessAck: true,
            profile,
            routine: sp.routine,
            splits: [sp],
            activeSplitId: sp.id,
            settings: { ...withDefaults(get().settings), mode, sessionMinutes: sessionMinutes ?? 40 },
            loads,
            programStart: isoDate(),
            changes: []
          });
        },
        updateRoutine: (fn) => commit({ routine: fn(get().routine) }),
        setMode: (mode) => commit({ settings: { ...get().settings, mode } }),
        setProfile: (p) => commit({ profile: { ...get().profile, ...p } }),
        updateSettings: (p) => {
          const affectsPlan = ['mode', 'generalWarmup', 'restOverrides', 'fatigueLimit', 'sessionMinutes', 'cadence', 'repRange', 'custom'].some((k) => k in p);
          if (affectsPlan) return commit({ settings: { ...get().settings, ...p } });
          set({ settings: { ...get().settings, ...p } });
          return [];
        },
        setWeekdays: (w) => {
          const s = get();
          const routine = { days: s.routine.days.map((d, i) => ({ ...d, weekday: w[i] ?? d.weekday })) };
          set({ routine, splits: syncSplits(s, routine) });
        },
        addSplit: (split, opts = {}) => {
          const s = get();
          const splits = [...syncSplits(s, s.routine), split];
          if (opts.activate === false) return set({ splits });
          set({
            splits,
            activeSplitId: split.id,
            routine: split.routine,
            settings: opts.mode ? { ...s.settings, mode: opts.mode } : s.settings,
            changes: pushChange(s.changes, [`Split activo: ${split.name} (${split.routine.days.length} días).`])
          });
        },
        activateSplit: (id) => {
          const s = get();
          const target = s.splits.find((x) => x.id === id);
          if (!target || id === s.activeSplitId) return;
          set({
            splits: syncSplits(s, s.routine),
            activeSplitId: id,
            routine: target.routine,
            changes: pushChange(s.changes, [`Split activo: ${target.name} (${target.routine.days.length} días).`])
          });
        },
        renameSplit: (id, name) => set({ splits: get().splits.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name } : x)) }),
        duplicateSplit: (id) => {
          const s = get();
          const src = syncSplits(s, s.routine).find((x) => x.id === id);
          if (!src) return;
          const sid = newId('d');
          const copy: Split = {
            ...src,
            id: newId('split'),
            name: `${src.name} (copia)`,
            custom: true,
            createdAt: new Date().toISOString(),
            routine: {
              days: src.routine.days.map((d, i) => ({ ...d, id: `${sid}-d${i + 1}`, slots: d.slots.map((sl, j) => ({ ...sl, uid: `${sid}-${i}-${j}-${sl.exerciseId}` })) }))
            }
          };
          // los pre-agotamientos apuntan a uids: re-mapear
          copy.routine.days.forEach((d, i) => {
            const old = src.routine.days[i];
            d.slots.forEach((sl, j) => {
              if (old.slots[j].preExhaustFor) {
                const k = old.slots.findIndex((o) => o.uid === old.slots[j].preExhaustFor);
                sl.preExhaustFor = k >= 0 ? d.slots[k].uid : undefined;
              }
            });
          });
          set({ splits: [...syncSplits(s, s.routine), copy] });
        },
        deleteSplit: (id) => {
          const s = get();
          if (s.splits.length <= 1) return;
          const splits = s.splits.filter((x) => x.id !== id);
          if (id !== s.activeSplitId) return set({ splits });
          set({ splits, activeSplitId: splits[0].id, routine: splits[0].routine });
        },
        addDay: (name, weekday) =>
          commit({
            routine: { days: [...get().routine.days, { id: newId('day'), name: name.trim() || `Día ${get().routine.days.length + 1}`, weekday, slots: [] }] }
          }),
        removeDay: (dayId) => {
          const r = get().routine;
          if (r.days.length <= 1) return [];
          return commit({ routine: { days: r.days.filter((d) => d.id !== dayId) } });
        },
        updateDay: (dayId, patch) => {
          const s = get();
          const routine = { days: s.routine.days.map((d) => (d.id === dayId ? { ...d, ...patch, name: patch.name !== undefined ? (patch.name ?? '').trim() || null : d.name } : d)) };
          set({ routine, splits: syncSplits(s, routine) });
        },
        setLoad: (exerciseId, kg) => set({ loads: { ...get().loads, [exerciseId]: kg } }),
        optimize: (dayId) => {
          const s = get();
          const plan = computePlan(s.routine, s.profile, stateConfig(s));
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
      version: 3,
      migrate: (persisted, version) => {
        const st = persisted as Partial<AppState>;
        if (version < 2 && st.settings) st.settings = withDefaults(st.settings);
        if (version < 3) {
          if (st.settings) st.settings = withDefaults(st.settings);
          // La rutina existente pasa a ser el split "Heavy Duty 3 días"
          const sp = hdSplit(st.routine ?? defaultRoutine());
          st.splits = [sp];
          st.activeSplitId = sp.id;
        }
        return st as AppState;
      },
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
        sleepGoal: s.sleepGoal,
        splits: s.splits,
        activeSplitId: s.activeSplitId
      })
    }
  )
);

/** Plan recalculado (memoizado) para la rutina y ajustes actuales. */
export function usePlan(extra?: Partial<EngineConfig>): PlanResult {
  const routine = useApp((s) => s.routine);
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const splits = useApp((s) => s.splits);
  const activeSplitId = useApp((s) => s.activeSplitId);
  const key = JSON.stringify(extra ?? {});
  return useMemo(
    () => computePlan(routine, profile, stateConfig({ settings, splits, activeSplitId }, extra)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routine, profile, settings, splits, activeSplitId, key]
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

/** Split activo (memo). */
export function useActiveSplit(): Split | undefined {
  return useApp((s) => activeSplit(s));
}

/** Días planeados por semana en el split activo. */
export function usePerWeek(): number {
  return useApp((s) => s.routine.days.length);
}
