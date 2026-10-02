import { DEFAULT_CONFIG } from '../plan';
import { defaultProfile, defaultRoutine } from '@/data/templates';
import type { EngineConfig, Mode, Profile, Routine } from '../types';

export const cfg = (mode: Mode = 'adaptado', extra: Partial<EngineConfig> = {}): EngineConfig => ({ ...DEFAULT_CONFIG, mode, ...extra });
export const profile = (extra: Partial<Profile> = {}): Profile => ({ ...defaultProfile(), ...extra });
export const routine = (): Routine => defaultRoutine();

export function swap(r: Routine, dayId: string, uid: string, exerciseId: string): Routine {
  return { days: r.days.map((d) => (d.id !== dayId ? d : { ...d, slots: d.slots.map((s) => (s.uid === uid ? { ...s, exerciseId } : s)) })) };
}
