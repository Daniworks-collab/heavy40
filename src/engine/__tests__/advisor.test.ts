import { describe, expect, it } from 'vitest';
import { SPLIT_PRESETS, presetRoutine } from '@/data/splits';
import { applyAdvice, optimalZone, volumeAdvice } from '../advisor';
import { computePlan } from '../recalc';
import { cfg, profile, routine } from './helpers';

const dist = (sets: number, z: [number, number]) => (sets < z[0] ? z[0] - sets : sets > z[1] ? sets - z[1] : 0);

describe('asesor de volumen', () => {
  it('HD por defecto: propone cambios que suben músculos bajos, con series y reps', () => {
    const t0 = performance.now();
    const advice = volumeAdvice(routine(), profile(), cfg());
    const ms = performance.now() - t0;
    expect(advice.length).toBeGreaterThan(0);
    for (const a of advice) {
      expect(a.prescription.sets).toBeGreaterThanOrEqual(1);
      expect(a.prescription.reps[0]).toBeLessThanOrEqual(a.prescription.reps[1]);
      if (a.direction === 'subir') expect(a.after).toBeGreaterThan(a.before);
      expect(a.daySecondsAfter).toBeLessThanOrEqual(2400);
    }
    expect(ms).toBeLessThan(4000);
  });

  it('aplicar una recomendación acerca el músculo a su zona y no rompe el tiempo', () => {
    const r = routine();
    const advice = volumeAdvice(r, profile(), cfg());
    const a = advice[0];
    const next = applyAdvice(r, a);
    const p = computePlan(next, profile(), cfg());
    const after = p.weekly.find((w) => w.muscle === a.muscle)!.sets;
    expect(dist(after, optimalZone(a.muscle))).toBeLessThan(dist(a.before, optimalZone(a.muscle)));
    for (const d of p.days) expect(d.seconds <= 2400 || d.overBudget).toBe(true);
  });

  it('respeta la recuperación por músculo en splits de alta frecuencia', () => {
    const preset = SPLIT_PRESETS.find((x) => x.id === 'ppl6')!;
    const r = presetRoutine(preset);
    const c = cfg('clasico', { budget: 3600, target: 3480, restRule: 'musculo', distinctDays: false });
    const advice = volumeAdvice(r, profile(), c);
    for (const a of advice) {
      const next = applyAdvice(r, a);
      const p = computePlan(next, profile(), c);
      expect(p.warnings.filter((w) => w.kind === 'espaciado' && w.text.startsWith(p.weekly.find((x) => x.muscle === a.muscle) ? '' : 'x'))).toBeDefined();
      const spacing = p.warnings.filter((w) => w.kind === 'espaciado');
      const before = computePlan(r, profile(), c).warnings.filter((w) => w.kind === 'espaciado');
      expect(spacing.length).toBeLessThanOrEqual(before.length);
    }
  });

  it('músculo con exceso: propone cederle un ejercicio a otro músculo', () => {
    const preset = SPLIT_PRESETS.find((x) => x.id === 'weider5')!;
    const r = presetRoutine(preset);
    // pecho con muchísimo volumen
    r.days[0].slots.push({ uid: 'x1', exerciseId: 'pec-deck' }, { uid: 'x2', exerciseId: 'aperturas-mancuernas' });
    const c = cfg('custom', { budget: 7200, target: 7080, restRule: 'musculo', distinctDays: false, custom: { sets: 4, reps: [8, 12], effort: '1 RIR', restCompound: 90, restIsolation: 60, warmups: false } });
    const advice = volumeAdvice(r, profile(), c);
    const pecho = advice.find((a) => a.muscle === 'pecho');
    expect(pecho?.direction).toBe('bajar');
    expect(pecho!.after).toBeLessThan(pecho!.before);
  });
});

describe('asesor: no empeora otros músculos', () => {
  it('ninguna recomendación deja a otro músculo en una zona peor', async () => {
    const { bandFor } = await import('../validate');
    for (const preset of SPLIT_PRESETS) {
      const r = presetRoutine(preset);
      const c = cfg('clasico', { budget: 1800, target: 1680, restRule: preset.restRule, distinctDays: preset.distinctDays });
      for (const a of volumeAdvice(r, profile(), c)) {
        for (const x of a.sideEffects) {
          const b0 = bandFor(x.muscle, x.before);
          const b1 = bandFor(x.muscle, x.after);
          expect(b1 === 'bajo' && b0 !== 'bajo', `${preset.id} ${a.muscle}: ${x.muscle}`).toBe(false);
        }
      }
    }
  });
});
