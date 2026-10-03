import { useNavigate } from 'react-router-dom';
import { db } from '@/db';
import { computePlan } from '@/engine/recalc';
import { evaluateReadiness, type Readiness } from '@/engine/readiness';
import { engineConfig, isDeloadWeek, useApp, withDefaults } from '@/store/app';
import { useLive } from '@/store/live';
import { isoDate } from '@/lib/dates';
import { unlockAudio } from '@/lib/feedback';

export function useStartWorkout() {
  const navigate = useNavigate();
  const start = useLive((s) => s.start);
  /** `minutes`: tiempo disponible hoy (si no, el de Ajustes). */
  return async (dayId: string, readiness?: Readiness, minutes?: number) => {
    unlockAudio();
    const s = useApp.getState();
    const res = readiness ? evaluateReadiness(readiness) : undefined;
    const deload = isDeloadWeek(s.deloads);
    const conservative = !!res?.conservative || deload;
    const budget = Math.round((minutes ?? withDefaults(s.settings).sessionMinutes) * 60);
    const plan = computePlan(s.routine, s.profile, engineConfig(s.settings, { conservative, budget, target: budget - 120 }));
    const day = plan.days.find((d) => d.day.id === dayId) ?? plan.days[0];
    if (readiness && res) {
      await db.readiness.add({ date: isoDate(), ...readiness, score: res.score, low: res.low });
    }
    start(day, { conservative, deload, budget, readiness: readiness && res ? { ...readiness, score: res.score } : undefined });
    navigate('/entrenar');
  };
}
