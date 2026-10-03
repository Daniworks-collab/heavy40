import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID } from '@/data/exercises';
import { SPLIT_PRESETS, customSplit, presetRoutine, spreadWeekdays } from '@/data/splits';
import { computePlan } from '../recalc';
import { cfg, profile } from './helpers';
import type { Mode } from '../types';

const presetCfg = (p: (typeof SPLIT_PRESETS)[number], mode: Mode, minutes = 40) =>
  cfg(mode, { budget: minutes * 60, target: minutes * 60 - 120, restRule: p.restRule, distinctDays: p.distinctDays });

describe('splits prearmados', () => {
  it('todos los ejercicios existen en el catálogo', () => {
    for (const p of SPLIT_PRESETS) for (const d of p.plan) for (const id of d.ex) expect(EXERCISE_BY_ID[id], `${p.id}: ${id}`).toBeTruthy();
  });

  it('cada split tiene tantos días como dice y días de la semana distintos', () => {
    for (const p of SPLIT_PRESETS) {
      const r = presetRoutine(p);
      expect(r.days).toHaveLength(p.days);
      expect(new Set(r.days.map((d) => d.weekday)).size).toBe(p.days);
      const uids = r.days.flatMap((d) => d.slots.map((s) => s.uid));
      expect(new Set(uids).size).toBe(uids.length);
    }
  });

  for (const mode of ['adaptado', 'clasico', 'custom'] as Mode[]) {
    for (const minutes of [40, 60]) {
      it(`${mode} · ${minutes} min: ningún día se pasa en silencio`, () => {
        for (const p of SPLIT_PRESETS) {
          const plan = computePlan(presetRoutine(p), profile(), presetCfg(p, mode, minutes));
          for (const d of plan.days) {
            expect(d.items.length, `${p.id} ${d.name}`).toBeGreaterThan(0);
            if (d.seconds > minutes * 60) {
              expect(d.overBudget, `${p.id} ${d.name}`).toBe(true);
              expect(d.proposal).toBeTruthy();
            }
          }
        }
      });
    }
  }

  it('splits de alta frecuencia no se marcan como "sin recuperación" (regla por músculo)', () => {
    for (const id of ['fb3', 'ul4', 'ppl6', 'arnold6', 'weider5']) {
      const p = SPLIT_PRESETS.find((x) => x.id === id)!;
      const plan = computePlan(presetRoutine(p), profile(), presetCfg(p, 'clasico', 60));
      expect(plan.warnings.filter((w) => w.kind === 'espaciado'), id).toEqual([]);
    }
  });

  it('con la regla por músculo, un músculo en días seguidos sí avisa', () => {
    const p = SPLIT_PRESETS.find((x) => x.id === 'ppl3')!;
    const r = presetRoutine(p, [1, 2, 3]);
    r.days[1].slots.push({ uid: 'extra-press', exerciseId: 'press-pecho-maquina' });
    const plan = computePlan(r, profile(), presetCfg(p, 'clasico', 60));
    expect(plan.warnings.some((w) => w.kind === 'espaciado' && w.text.startsWith('Pecho'))).toBe(true);
  });

  it('PPL 6 repite ejercicios sin avisar; Heavy Duty sí avisa', () => {
    const p = SPLIT_PRESETS.find((x) => x.id === 'ppl6')!;
    const r = presetRoutine(p);
    r.days[3].slots.push({ uid: 'dup', exerciseId: 'press-banca-barra' });
    const plan = computePlan(r, profile(), presetCfg(p, 'clasico', 60));
    expect(plan.warnings.some((w) => w.text.includes('más de un día'))).toBe(false);
  });
});

describe('estilos', () => {
  const ul = SPLIT_PRESETS.find((x) => x.id === 'ul4')!;

  it('hipertrofia clásica: 3+ series en compuestos, 8-12, reps en reserva', () => {
    const plan = computePlan(presetRoutine(ul), profile(), presetCfg(ul, 'clasico', 90));
    const main = plan.days[0].items[0];
    expect(main.workSets).toBeGreaterThanOrEqual(3);
    expect(main.reps).toEqual([8, 12]);
    expect(main.effort).toBe('2 RIR');
    expect(main.rest).toBe(120);
  });

  it('personalizado: series, reps, esfuerzo y descansos del usuario', () => {
    const plan = computePlan(
      presetRoutine(ul),
      profile(),
      cfg('custom', {
        budget: 120 * 60,
        target: 118 * 60,
        restRule: 'musculo',
        custom: { sets: 4, reps: [10, 15], effort: 'fallo', restCompound: 90, restIsolation: 45, warmups: false }
      })
    );
    for (const it of plan.days[0].items) {
      expect(it.workSets).toBe(4);
      expect(it.effort).toBe('fallo');
      expect(it.warmups).toHaveLength(0);
      if (it.exercise.cls !== 'P') expect(it.reps).toEqual([10, 15]);
      expect(it.rest).toBe(it.exercise.cls === 'C1' || it.exercise.cls === 'C2' ? 90 : 45);
    }
  });

  it('personalizado que no cabe: recorta y lo explica', () => {
    const plan = computePlan(
      presetRoutine(ul),
      profile(),
      cfg('custom', { restRule: 'musculo', custom: { sets: 5, reps: [8, 12], effort: '1 RIR', restCompound: 180, restIsolation: 90, warmups: true } })
    );
    for (const d of plan.days) expect(d.seconds <= 2400 || d.overBudget).toBe(true);
  });
});

describe('split personalizado', () => {
  it('crea días con nombre y día de la semana, sin ejercicios', () => {
    const s = customSplit('Mi split de verano', [
      { name: 'Pecho y bíceps', weekday: 1 },
      { name: 'Pierna pesada', weekday: 3 }
    ]);
    expect(s.name).toBe('Mi split de verano');
    expect(s.custom).toBe(true);
    expect(s.routine.days.map((d) => d.name)).toEqual(['Pecho y bíceps', 'Pierna pesada']);
    expect(s.routine.days.every((d) => d.slots.length === 0)).toBe(true);
    const plan = computePlan(s.routine, profile(), cfg('clasico', { restRule: 'musculo' }));
    expect(plan.days.every((d) => d.items.length === 0)).toBe(true);
  });

  it('días por defecto', () => {
    expect(spreadWeekdays(4)).toEqual([1, 2, 4, 5]);
    expect(spreadWeekdays(7)).toHaveLength(7);
  });
});
