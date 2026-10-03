import { describe, expect, it } from 'vitest';
import { getExercise } from '@/data/exercises';
import { dayGoal, genericWarmup, increment, platesPerSide, previousSet, warmupPlan, type ExerciseSession } from '../progression';

const bench = getExercise('press-banca-barra');
const leg = getExercise('prensa-45');
const sess = (exerciseId: string, kg: number, reps: number[]): ExerciseSession => ({
  date: '2026-09-01',
  sets: reps.map((r) => ({ exerciseId, kind: 'work' as const, kg, reps: r, effort: 'fallo' as const }))
});

describe('meta del día', () => {
  it('dentro del rango: "Hoy intenta 9 reps o 62.5 kg"', () => {
    const g = dayGoal(bench, [6, 10], 'fallo', sess(bench.id, 60, [8, 7]));
    expect(g.lastText).toBe('60 kg × 8');
    expect(g.goalText).toBe('Hoy intenta 9 reps o 62.5 kg');
  });
  it('tope del rango: sube la carga', () => {
    const g = dayGoal(bench, [6, 10], 'fallo', sess(bench.id, 60, [10, 10]));
    expect(g.action).toBe('subir');
    expect(g.kg).toBe(62.5);
  });
  it('incremento configurable', () => {
    expect(increment(bench, 60, { upper: 5, lower: 10 })).toBe(5);
    expect(increment(leg, 200, { upper: 2.5, lower: 10 })).toBe(10);
  });
  it('serie anterior por índice', () => {
    const last = sess(bench.id, 60, [8, 7]);
    expect(previousSet(last, bench.id, 'work', 1)?.reps).toBe(7);
    expect(previousSet(last, bench.id, 'work', 2)).toBeUndefined();
  });
});

describe('calculadoras', () => {
  it('discos por lado: 100 kg con barra de 20 → 25 + 15', () => {
    const r = platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    expect(r.perSide).toEqual([25, 15]);
    expect(r.remainder).toBe(0);
  });
  it('discos: carga imposible deja resto', () => {
    const r = platesPerSide(61, 20, [20, 10, 5, 2.5, 1.25]);
    expect(r.achieved).toBe(60);
    expect(r.remainder).toBe(1);
  });
  it('calentamiento en kilos', () => {
    const w = warmupPlan(bench, 100, [
      { pct: 60, reps: '6-8' },
      { pct: 80, reps: '3-4' }
    ]);
    expect(w.map((x) => x.kg)).toEqual([60, 80]);
    const g = genericWarmup(120);
    expect(g[0].kg).toBe(20);
    expect(g.every((s) => s.kg < 120)).toBe(true);
  });
});
