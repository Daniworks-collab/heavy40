import { describe, expect, it } from 'vitest';
import { computePlan } from '../recalc';
import { cfg, profile, routine } from './helpers';
import type { Mode } from '../types';

const MODES: Mode[] = ['puro', 'adaptado', 'fast40'];

describe('plantillas por defecto', () => {
  for (const mode of MODES) {
    it(`estiman entre 36 y 40 min en modo ${mode}`, () => {
      const plan = computePlan(routine(), profile(), cfg(mode));
      expect(plan.days).toHaveLength(3);
      for (const d of plan.days) {
        expect(d.seconds, `${d.name} (${mode})`).toBeGreaterThanOrEqual(36 * 60);
        expect(d.seconds, `${d.name} (${mode})`).toBeLessThanOrEqual(40 * 60);
        expect(d.overBudget).toBe(false);
      }
    });

    it(`no tiene alertas críticas en modo ${mode}`, () => {
      const plan = computePlan(routine(), profile(), cfg(mode));
      expect(plan.warnings.filter((w) => w.severity === 'critico')).toEqual([]);
    });
  }

  it('HD Puro usa exactamente 1 serie efectiva por ejercicio, al fallo, 6-10 reps', () => {
    const plan = computePlan(routine(), profile(), cfg('puro'));
    for (const it of plan.days.flatMap((d) => d.items)) {
      expect(it.workSets).toBe(1);
      expect(it.effort).toBe('fallo');
      if (it.exercise.cls !== 'P') expect(it.reps).toEqual([6, 10]);
    }
  });

  it('HD Adaptado: compuestos libres a 1 RIR, máquinas y aislamientos al fallo', () => {
    const plan = computePlan(routine(), profile(), cfg('adaptado'));
    for (const it of plan.days.flatMap((d) => d.items)) {
      if (it.exercise.cls === 'C1') expect(it.effort).toBe('1 RIR');
      if (it.exercise.cls === 'C2' && it.exercise.safeFailure) expect(it.effort).toBe('fallo');
      if (it.exercise.cls === 'A' && it.exercise.safeFailure) expect(it.effort).toBe('fallo');
      expect(it.workSets).toBeLessThanOrEqual(2);
    }
  });

  it('respeta topes: ≤2 series por ejercicio (sesión >4 ejercicios) y ≤4 por músculo', () => {
    for (const mode of MODES) {
      const plan = computePlan(routine(), profile(), cfg(mode));
      for (const d of plan.days) {
        const perMuscle = new Map<string, number>();
        for (const it of d.items) {
          expect(it.workSets).toBeLessThanOrEqual(d.items.length <= 4 ? 3 : 2);
          perMuscle.set(it.exercise.primary, (perMuscle.get(it.exercise.primary) ?? 0) + it.workSets);
        }
        for (const v of perMuscle.values()) expect(v).toBeLessThanOrEqual(4);
      }
    }
  });

  it('los 3 días tienen ejercicios distintos', () => {
    const plan = computePlan(routine(), profile(), cfg());
    const ids = plan.days.flatMap((d) => d.items.map((i) => i.exercise.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('músculos grandes con ≥2 exposiciones semanales', () => {
    const plan = computePlan(routine(), profile(), cfg());
    for (const m of ['pecho', 'espalda', 'cuadriceps', 'femorales', 'hombros'] as const) {
      expect(plan.coverage[m].reduce((a, b) => a + b, 0), m).toBeGreaterThanOrEqual(2);
    }
  });

  it('Fast-40 empareja antagonistas', () => {
    const plan = computePlan(routine(), profile(), cfg('fast40'));
    const d1 = plan.days[0];
    const press = d1.items.find((i) => i.exercise.id === 'press-inclinado-mancuernas')!;
    const jalon = d1.items.find((i) => i.exercise.id === 'jalon-neutro')!;
    expect(press.pairWith).toBe(jalon.uid);
    expect(jalon.pairWith).toBe(press.uid);
  });

  it('pre-agotamiento: 15 s entre aislamiento y compuesto, sin calentamiento en el compuesto', () => {
    const plan = computePlan(routine(), profile(), cfg());
    const d3 = plan.days[2];
    const press = d3.items.find((i) => i.exercise.id === 'press-pecho-maquina')!;
    expect(press.warmups).toHaveLength(0);
    const deck = d3.items.find((i) => i.exercise.id === 'pec-deck')!;
    expect(deck.technique).toBe('pre-agotamiento');
    const gap = d3.timeline.find((s) => s.kind === 'transition' && s.uid === deck.uid && s.seconds === 15);
    expect(gap).toBeTruthy();
  });

  it('modo conservador (readiness bajo): sin relleno, +1 RIR, sin técnicas', () => {
    const normal = computePlan(routine(), profile(), cfg());
    const cons = computePlan(routine(), profile(), cfg('adaptado', { conservative: true }));
    for (let i = 0; i < 3; i++) {
      const sets = (d: typeof normal.days[number]) => d.items.reduce((a, x) => a + x.workSets, 0);
      expect(sets(cons.days[i])).toBeLessThanOrEqual(sets(normal.days[i]));
      for (const it of cons.days[i].items) {
        expect(it.effort).not.toBe('fallo');
        expect(it.technique === undefined || it.technique === 'pre-agotamiento').toBe(true);
        expect(it.optional).toBe(false);
      }
    }
  });
});
