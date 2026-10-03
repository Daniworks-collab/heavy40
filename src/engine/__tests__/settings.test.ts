import { describe, expect, it } from 'vitest';
import { computePlan, explainPlanChange } from '../recalc';
import { cfg, profile, routine } from './helpers';
import type { Mode } from '../types';

const budget = (min: number) => ({ budget: min * 60, target: min * 60 - 120 });

describe('tiempo disponible configurable', () => {
  for (const mode of ['puro', 'adaptado', 'fast40'] as Mode[]) {
    it(`30 min (${mode}): ningún día se pasa en silencio`, () => {
      const p = computePlan(routine(), profile(), cfg(mode, budget(30)));
      for (const d of p.days) {
        if (d.seconds > 30 * 60) {
          expect(d.overBudget).toBe(true);
          expect(d.proposal).toBeTruthy();
        }
      }
    });
  }

  it('30 min adaptado: cabe recortando relleno', () => {
    const p = computePlan(routine(), profile(), cfg('adaptado', budget(30)));
    for (const d of p.days) expect(d.seconds).toBeLessThanOrEqual(30 * 60);
  });

  it('60 min da más series que 40 y nunca se pasa', () => {
    const p40 = computePlan(routine(), profile(), cfg('adaptado'));
    const p60 = computePlan(routine(), profile(), cfg('adaptado', budget(60)));
    const sets = (p: typeof p40) => p.days.reduce((a, d) => a + d.items.reduce((b, i) => b + i.workSets, 0), 0);
    expect(sets(p60)).toBeGreaterThan(sets(p40));
    for (const d of p60.days) expect(d.seconds).toBeLessThanOrEqual(60 * 60);
  });

  it('cambiar el tiempo disponible explica el cambio con el nuevo tope', () => {
    const p40 = computePlan(routine(), profile(), cfg('adaptado'));
    const p30 = computePlan(routine(), profile(), cfg('adaptado', budget(30)));
    const lines = explainPlanChange(p40, p30, profile(), cfg('adaptado', budget(30)));
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('cadencia y rango de reps', () => {
  it('una cadencia más lenta alarga la sesión o reduce series', () => {
    const fast = computePlan(routine(), profile(), cfg('adaptado', { secPerRep: 4, tempo: '1-0-3' }));
    const slow = computePlan(routine(), profile(), cfg('adaptado', { secPerRep: 8, tempo: '3-1-4' }));
    const sets = (p: typeof fast) => p.days.reduce((a, d) => a + d.items.reduce((b, i) => b + i.workSets, 0), 0);
    expect(sets(slow)).toBeLessThanOrEqual(sets(fast));
    expect(slow.days[0].items[0].tempo).toBe('3-1-4');
  });

  it('rango global 6-10 reemplaza el de clase, salvo gemelos y core', () => {
    const p = computePlan(routine(), profile(), cfg('adaptado', { repRange: [6, 10] }));
    for (const it of p.days.flatMap((d) => d.items)) {
      if (it.exercise.cls === 'P') expect(it.reps).not.toEqual([6, 10]);
      else expect(it.reps).toEqual([6, 10]);
    }
  });
});
