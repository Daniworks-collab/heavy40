import { db, type SessionRecord } from '@/db';
import { getExercise } from '@/data/exercises';
import { computePlan } from '@/engine/recalc';
import { calibrationLoad, detectPRs, roundLoad, type ExerciseSession } from '@/engine/progression';
import { isLower } from '@/engine/rules';
import type { Muscle } from '@/engine/types';
import { engineConfig, useApp } from '@/store/app';
import { addDays, isoDate, startOfWeek } from './dates';

/** Genera ~6 semanas de historial plausible para explorar la app. */
export async function seedDemo() {
  const s = useApp.getState();
  const plan = computePlan(s.routine, s.profile, engineConfig(s.settings));
  const start = addDays(startOfWeek(new Date()), -42);
  const base: Record<string, number> = {};
  const records: SessionRecord[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let w = 0; w < 6; w++) {
    for (const day of plan.days) {
      const date = addDays(start, w * 7 + ((day.day.weekday + 6) % 7));
      if (date > new Date()) continue;
      date.setHours(18, 10);
      const sets: SessionRecord['sets'] = [];
      const muscles: Partial<Record<Muscle, number>> = {};
      for (const it of day.items) {
        const ex = getExercise(it.exercise.id);
        base[ex.id] ??= calibrationLoad(ex, isLower(ex) ? 80 : ex.cls === 'A' || ex.cls === 'P' ? 20 : 45, 10).load || 20;
        const kg = roundLoad(ex, base[ex.id] * (1 + w * 0.025));
        for (const wu of it.warmups) sets.push({ exerciseId: ex.id, kind: 'warmup', kg: roundLoad(ex, (kg * wu.pct) / 100), reps: parseInt(wu.reps, 10), effort: '3 RIR' });
        for (let k = 0; k < it.workSets; k++) {
          const reps = Math.max(it.reps[0] - 1, Math.min(it.reps[1], it.reps[0] + Math.round(rnd() * (it.reps[1] - it.reps[0])) - k));
          sets.push({ exerciseId: ex.id, kind: 'work', kg, reps, effort: it.effort });
        }
        muscles[ex.primary] = (muscles[ex.primary] ?? 0) + it.workSets;
        for (const m of ex.secondary) muscles[m] = (muscles[m] ?? 0) + it.workSets * 0.5;
      }
      const work = sets.filter((x) => x.kind === 'work');
      const prs = [...new Set(work.map((x) => x.exerciseId))].flatMap((id) => {
        const hist: ExerciseSession[] = records.map((r) => ({ date: r.date, sets: r.sets.filter((x) => x.exerciseId === id) })).filter((h) => h.sets.length);
        return detectPRs(getExercise(id), work, hist).filter((p) => p.kind === 'e1rm');
      });
      records.push({
        date: date.toISOString(),
        dayId: day.day.id,
        dayName: day.name,
        mode: s.settings.mode,
        durationSec: day.seconds - 60 + Math.round(rnd() * 150),
        plannedSec: day.seconds,
        conservative: false,
        sets,
        prs,
        volumeKg: work.reduce((a, x) => a + x.kg * x.reps, 0),
        muscles,
        readiness: { sleep: 3 + Math.round(rnd() * 2), energy: 3 + Math.round(rnd() * 2), pain: 1, score: 4 }
      });
    }
  }
  await db.sessions.bulkAdd(records);
  const weights = Array.from({ length: 6 }).map((_, i) => ({ date: isoDate(addDays(start, i * 7)), weightKg: Math.round((s.profile.bodyweight - 1.2 + i * 0.25) * 10) / 10 }));
  await db.body.bulkAdd(weights);
  await db.readiness.bulkAdd(records.map((r) => ({ date: r.date.slice(0, 10), sleep: r.readiness!.sleep, energy: r.readiness!.energy, pain: 1, score: r.readiness!.score, low: false })));
}
