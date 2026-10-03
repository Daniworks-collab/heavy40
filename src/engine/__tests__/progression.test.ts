import { describe, expect, it } from 'vitest';
import { getExercise } from '@/data/exercises';
import { calibrationLoad, deloadDue, detectPRs, epley, increment, isStalled, suggestLoad, type ExerciseSession } from '../progression';
import { evaluateReadiness } from '../readiness';

const bench = getExercise('press-pecho-maquina');
const leg = getExercise('prensa-45');
const db = getExercise('press-inclinado-mancuernas');

const sess = (date: string, exerciseId: string, kg: number, reps: number[], effort: 'fallo' | '1 RIR' = 'fallo'): ExerciseSession => ({
  date,
  sets: reps.map((r) => ({ exerciseId, kind: 'work' as const, kg, reps: r, effort }))
});

describe('progresión', () => {
  it('Epley', () => {
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 10)).toBeCloseTo(133.33, 1);
  });

  it('doble progresión: tope del rango con esfuerzo objetivo → sube', () => {
    const s = suggestLoad(bench, [6, 10], 'fallo', sess('2026-01-01', bench.id, 60, [10, 10]));
    expect(s.action).toBe('subir');
    expect(s.kg).toBe(62.5);
  });

  it('tren inferior sube +5 kg', () => {
    const s = suggestLoad(leg, [8, 12], 'fallo', sess('2026-01-01', leg.id, 150, [12, 12]));
    expect(s.kg).toBe(155);
    expect(increment(leg, 150)).toBe(5);
  });

  it('mancuernas suben de 1 kg en 1 kg', () => {
    expect(increment(db, 30)).toBe(1);
  });

  it('bajo el mínimo → baja ~7.5 %', () => {
    const s = suggestLoad(bench, [6, 10], 'fallo', sess('2026-01-01', bench.id, 80, [5, 4]));
    expect(s.action).toBe('bajar');
    expect(s.kg).toBeLessThan(80);
    expect(s.kg).toBeGreaterThanOrEqual(72);
  });

  it('dentro del rango → mantener', () => {
    const s = suggestLoad(bench, [6, 10], 'fallo', sess('2026-01-01', bench.id, 60, [8, 7]));
    expect(s.action).toBe('mantener');
    expect(s.kg).toBe(60);
  });

  it('tope del rango pero sin el esfuerzo objetivo → no sube', () => {
    const s = suggestLoad(bench, [6, 10], 'fallo', sess('2026-01-01', bench.id, 60, [10, 10], '1 RIR'));
    expect(s.action).toBe('mantener');
  });

  it('PRs', () => {
    const hist = [sess('2026-01-01', bench.id, 60, [8])];
    const prs = detectPRs(bench, sess('2026-01-05', bench.id, 62.5, [8]).sets, hist);
    expect(prs.map((p) => p.kind)).toContain('e1rm');
    expect(prs.map((p) => p.kind)).toContain('carga');
  });

  it('estancamiento tras 3 sesiones sin mejora', () => {
    const h = [
      sess('2026-01-01', bench.id, 60, [9]),
      sess('2026-01-05', bench.id, 60, [9]),
      sess('2026-01-09', bench.id, 60, [8]),
      sess('2026-01-13', bench.id, 60, [9])
    ];
    expect(isStalled(h)).toBe(true);
    expect(isStalled([...h.slice(0, 3), sess('2026-01-13', bench.id, 62.5, [9])])).toBe(false);
  });

  it('calibración HD: ~6 reps (superior) / 8 (inferior)', () => {
    const c = calibrationLoad(bench, 50, 12);
    expect(c.target).toBe(6);
    expect(c.load).toBeGreaterThan(50);
    expect(calibrationLoad(leg, 100, 8).load).toBe(100);
  });

  it('descarga', () => {
    expect(deloadDue({ weeksSinceDeload: 3, recentReadinessLow: [true, true, true] }).due).toBe(true);
    expect(deloadDue({ weeksSinceDeload: 7, recentReadinessLow: [] }).due).toBe(true);
    expect(deloadDue({ weeksSinceDeload: 2, recentReadinessLow: [false, true] }).due).toBe(false);
  });
});

describe('readiness', () => {
  it('bajo → conservador', () => {
    expect(evaluateReadiness({ sleep: 2, energy: 2, pain: 3 }).conservative).toBe(true);
    expect(evaluateReadiness({ sleep: 4, energy: 4, pain: 1 }).conservative).toBe(false);
  });
  it('dolor articular agudo sugiere cambiar ejercicio', () => {
    expect(evaluateReadiness({ sleep: 5, energy: 5, pain: 5 }).swapAdvice).toBe(true);
  });
});

describe('récords de repeticiones', () => {
  it('más reps con el mismo peso es récord', () => {
    const hist = [sess('2026-01-01', bench.id, 60, [8])];
    const prs = detectPRs(bench, sess('2026-01-05', bench.id, 60, [10]).sets, hist);
    expect(prs.map((p) => p.kind)).toContain('reps');
  });
  it('menos peso con más reps no es récord de reps', () => {
    const hist = [sess('2026-01-01', bench.id, 60, [8])];
    const prs = detectPRs(bench, sess('2026-01-05', bench.id, 50, [9]).sets, hist);
    expect(prs.map((p) => p.kind)).not.toContain('reps');
  });
});
