import { describe, expect, it } from 'vitest';
import { applyProposal, computePlan, explainPlanChange } from '../recalc';
import { cfg, profile, routine, swap } from './helpers';
import type { Routine } from '../types';

describe('recálculo al cambiar ejercicios', () => {
  it('Prensa → Sentadilla libre: 8-12 reps, 1 RIR, +1 calentamiento, 150 s y explica el cambio', () => {
    const r0 = routine();
    const p0 = computePlan(r0, profile(), cfg());
    const r1 = swap(r0, 'd1', 'd1-prensa', 'sentadilla-libre');
    const p1 = computePlan(r1, profile(), cfg());
    const before = p0.days[0].items.find((i) => i.uid === 'd1-prensa')!;
    const after = p1.days[0].items.find((i) => i.uid === 'd1-prensa')!;
    expect(after.exercise.id).toBe('sentadilla-libre');
    expect(after.reps).toEqual([8, 12]);
    expect(after.effort).toBe('1 RIR');
    expect(after.rest).toBe(150);
    expect(after.warmups.length).toBe(before.warmups.length + 1);
    expect(p1.days[0].seconds).toBeLessThanOrEqual(2400);

    const lines = explainPlanChange(p0, p1, profile(), cfg());
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // otros días sólo pueden cambiar por rebalanceo de volumen y se dice
    lines.slice(1).forEach((l) => expect(l).toContain('rebalanceo'));
    expect(lines[0]).toContain('Cambiaste Prensa 45° por Sentadilla libre con barra');
    expect(lines[0]).toContain('8-12 reps');
    expect(lines[0]).toContain('1 RIR');
    expect(lines[0]).toContain('+1 calentamiento');
    expect(lines[0]).toContain('descanso 150 s');
    // el día subía de 40 → algo tuvo que recortarse y se dice qué
    expect(lines[0]).toMatch(/quité|sin calentamiento|descanso de|salió/);
  });

  it('cambiar un aislamiento por un compuesto recalcula clase, descanso y esfuerzo', () => {
    const r1 = swap(routine(), 'd1', 'd1-lat', 'press-hombros-maquina');
    const p1 = computePlan(r1, profile(), cfg());
    const it = p1.days[0].items.find((i) => i.uid === 'd1-lat')!;
    expect(it.exercise.cls).toBe('C2');
    expect(it.rest).toBe(120);
    expect(it.reps).toEqual([6, 10]);
    expect(it.isMain).toBe(true);
    expect(it.warmups.length).toBeGreaterThan(0);
  });

  it('agregar un ejercicio reduce el relleno de otros y lo explica', () => {
    const r0 = routine();
    const p0 = computePlan(r0, profile(), cfg());
    const r1: Routine = {
      days: r0.days.map((d) => (d.id === 'd2' ? { ...d, slots: [...d.slots, { uid: 'x-face', exerciseId: 'face-pull' }] } : d))
    };
    const p1 = computePlan(r1, profile(), cfg());
    expect(p1.days[1].items.some((i) => i.exercise.id === 'face-pull')).toBe(true);
    expect(p1.days[1].seconds).toBeLessThanOrEqual(2400);
    const lines = explainPlanChange(p0, p1, profile(), cfg());
    expect(lines[0]).toMatch(/^Agregaste Face pull/);
  });

  it('quitar un ejercicio libera tiempo que se rellena', () => {
    const r0 = routine();
    const p0 = computePlan(r0, profile(), cfg());
    const r1: Routine = { days: r0.days.map((d) => (d.id === 'd2' ? { ...d, slots: d.slots.filter((s) => s.uid !== 'd2-fondos') } : d)) };
    const p1 = computePlan(r1, profile(), cfg());
    const sets = (p: typeof p0) => p.days[1].items.filter((i) => i.uid !== 'd2-fondos').reduce((a, i) => a + i.workSets, 0);
    expect(sets(p1)).toBeGreaterThan(sets(p0));
    const lines = explainPlanChange(p0, p1, profile(), cfg());
    expect(lines[0]).toContain('Quitaste Fondos');
  });

  it('el recálculo es determinista y completo (no depende del estado anterior)', () => {
    const r1 = swap(routine(), 'd3', 'd3-hack', 'prensa-45');
    const a = computePlan(r1, profile(), cfg());
    const b = computePlan(swap(r1, 'd3', 'd3-hack', 'prensa-45'), profile(), cfg());
    expect(a.days.map((d) => d.seconds)).toEqual(b.days.map((d) => d.seconds));
  });

  it('cambiar de modo explica el cambio en una línea', () => {
    const p0 = computePlan(routine(), profile(), cfg('adaptado'));
    const p1 = computePlan(routine(), profile(), cfg('puro'));
    const lines = explainPlanChange(p0, p1, profile(), cfg('puro'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^Estilo HD Puro/);
  });

  it('series fijadas por el usuario se respetan y, si desbordan, Optimizar las libera', () => {
    const r0 = routine();
    const r1: Routine = {
      days: r0.days.map((d) => (d.id === 'd2' ? { ...d, slots: d.slots.map((s) => ({ ...s, lockedSets: 2 })) } : d))
    };
    const p1 = computePlan(r1, profile(), cfg());
    const d2 = p1.days[1];
    if (d2.overBudget) {
      expect(d2.proposal).toBeTruthy();
      const r2 = applyProposal(r1, 'd2', d2.proposal!.removeUid);
      const p2 = computePlan(r2, profile(), cfg());
      expect(p2.days[1].seconds).toBeLessThan(d2.seconds);
    } else {
      expect(d2.seconds).toBeLessThanOrEqual(2400);
    }
  });
});

describe('casos borde', () => {
  it('día con sólo 2 ejercicios: hasta 3 series, no se pasa y sugiere un extra', () => {
    const r: Routine = {
      days: [
        { id: 'a', name: null, weekday: 1, slots: [{ uid: 'a1', exerciseId: 'prensa-45' }, { uid: 'a2', exerciseId: 'jalon-neutro' }] },
        { id: 'b', name: null, weekday: 3, slots: [{ uid: 'b1', exerciseId: 'press-pecho-maquina' }, { uid: 'b2', exerciseId: 'curl-femoral-tumbado' }] },
        { id: 'c', name: null, weekday: 5, slots: [{ uid: 'c1', exerciseId: 'sentadilla-hack' }, { uid: 'c2', exerciseId: 'remo-maquina' }] }
      ]
    };
    const p = computePlan(r, profile(), cfg());
    for (const d of p.days) {
      expect(d.items).toHaveLength(2);
      expect(d.seconds).toBeLessThanOrEqual(2400);
      expect(d.items.some((i) => i.workSets === 3)).toBe(true);
      expect(d.items.every((i) => i.workSets <= 3)).toBe(true);
      expect(d.suggestion).toBeTruthy();
    }
  });

  it('día con 9 ejercicios: nunca se pasa en silencio', () => {
    const ids = ['prensa-45', 'press-inclinado-mancuernas', 'jalon-neutro', 'elevacion-lateral-polea', 'ext-triceps-cuerda', 'talones-de-pie', 'curl-polea', 'pec-deck', 'remo-polea-baja'];
    const r: Routine = {
      days: [
        { id: 'a', name: null, weekday: 1, slots: ids.map((id, i) => ({ uid: `a${i}`, exerciseId: id })) },
        ...routine().days.slice(1)
      ]
    };
    for (const mode of ['puro', 'adaptado', 'fast40'] as const) {
      const p = computePlan(r, profile(), cfg(mode));
      const d = p.days[0];
      expect(d.items).toHaveLength(9);
      if (d.seconds > 2400) {
        expect(d.overBudget).toBe(true);
        expect(d.proposal).toBeTruthy();
        expect(p.warnings.some((w) => w.kind === 'tiempo' && w.severity === 'critico')).toBe(true);
      }
      expect(d.items.every((i) => i.workSets <= 2)).toBe(true);
    }
  });

  it('sin equipo: sustituye por peso corporal o descarta, sin romperse', () => {
    const p = computePlan(routine(), profile({ equipment: [] }), cfg());
    for (const d of p.days) {
      expect(d.items.length).toBeGreaterThan(0);
      for (const it of d.items) expect(it.exercise.equipment).toEqual(['peso-corporal']);
      expect(d.seconds).toBeLessThanOrEqual(2400);
    }
    expect(p.warnings.some((w) => w.kind === 'equipo')).toBe(true);
  });

  it('lesión lumbar excluye peso muerto rumano y lo sustituye', () => {
    const p = computePlan(routine(), profile({ injuries: ['lumbar'] }), cfg());
    const ids = p.days.flatMap((d) => d.items.map((i) => i.exercise.id));
    expect(ids).not.toContain('peso-muerto-rumano');
    expect(p.days[1].items[0].exercise.primary).toBe('femorales');
  });

  it('peso muerto convencional sólo para nivel avanzado', () => {
    const r = swap(routine(), 'd2', 'd2-pdr', 'peso-muerto');
    const inter = computePlan(r, profile({ level: 'intermedio' }), cfg());
    expect(inter.days[1].items.map((i) => i.exercise.id)).not.toContain('peso-muerto');
    const adv = computePlan(r, profile({ level: 'avanzado' }), cfg());
    expect(adv.days[1].items.map((i) => i.exercise.id)).toContain('peso-muerto');
  });

  it('músculos prioritarios reciben series extra antes que el resto', () => {
    const base = computePlan(routine(), profile(), cfg());
    const pri = computePlan(routine(), profile({ priorities: ['biceps'] }), cfg());
    const bis = (p: typeof base) => p.weekly.find((w) => w.muscle === 'biceps')!.sets;
    expect(bis(pri)).toBeGreaterThanOrEqual(bis(base));
  });
});
