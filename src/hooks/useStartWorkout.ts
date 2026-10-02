import { useNavigate } from 'react-router-dom';
import { db } from '@/db';
import { computePlan } from '@/engine/recalc';
import { evaluateReadiness, type Readiness } from '@/engine/readiness';
import { engineConfig, isDeloadWeek, useApp } from '@/store/app';
import { useLive } from '@/store/live';
import { isoDate } from '@/lib/dates';
import { unlockAudio } from '@/lib/feedback';

export function useStartWorkout() {
  const navigate = useNavigate();
  const start = useLive((s) => s.start);
  return async (dayId: string, readiness?: Readiness) => {
    unlockAudio();
    const s = useApp.getState();
    const res = readiness ? evaluateReadiness(readiness) : undefined;
    const deload = isDeloadWeek(s.deloads);
    const conservative = !!res?.conservative || deload;
    const plan = computePlan(s.routine, s.profile, engineConfig(s.settings, { conservative }));
    const day = plan.days.find((d) => d.day.id === dayId) ?? plan.days[0];
    if (readiness && res) {
      await db.readiness.add({ date: isoDate(), ...readiness, score: res.score, low: res.low });
    }
    start(day, { conservative, deload, readiness: readiness && res ? { ...readiness, score: res.score } : undefined });
    navigate('/entrenar');
  };
}
