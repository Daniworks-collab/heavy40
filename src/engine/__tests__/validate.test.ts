import { describe, expect, it } from 'vitest';
import { computePlan } from '../recalc';
import { bandFor, spacingWarnings } from '../validate';
import { buildTimeline, sumSeconds, targetReps, workSetSeconds } from '../time';
import { cfg, profile, routine, swap } from './helpers';

describe('modelo de tiempo', () => {
  it('serie efectiva = reps objetivo × segundos por rep (cadencia) + 10 s', () => {
    expect(targetReps([8, 12])).toBe(10);
    // cadencia por defecto 2-0-4 = 6 s/rep
    expect(workSetSeconds({ reps: [8, 12] }, true)).toBe(70);
    expect(workSetSeconds({ reps: [8, 12] }, true, 5)).toBe(60);
    expect(workSetSeconds({ reps: [8, 12], technique: 'rest-pause', techniqueMini: 2 }, true, 5)).toBe(90);
    expect(workSetSeconds({ reps: [8, 12], technique: 'rest-pause', techniqueMini: 2 }, false, 5)).toBe(60);
    expect(workSetSeconds({ reps: [6, 10], technique: 'negativas' }, true, 5)).toBe(70);
  });

  it('la estimación es la suma del timeline e incluye el calentamiento general', () => {
    const p = computePlan(routine(), profile(), cfg('adaptado', { generalWarmup: 0 }));
    const p3 = computePlan(routine(), profile(), cfg('adaptado', { generalWarmup: 180 }));
    const d = p.days[0];
    expect(sumSeconds(buildTimeline(d.items, 0, 'adaptado', 6))).toBe(d.seconds);
    expect(p3.days[0].timeline[0].kind).toBe('general');
  });
});

describe('validaciones', () => {
  it('bandas de volumen', () => {
    expect(bandFor('pecho', 5)).toBe('bajo');
    expect(bandFor('pecho', 7)).toBe('minimo');
    expect(bandFor('pecho', 12)).toBe('optimo');
    expect(bandFor('pecho', 18)).toBe('excesivo');
    expect(bandFor('biceps', 5)).toBe('ok');
    expect(bandFor('gemelos', 3)).toBe('bajo');
  });

  it('espaciado: L-M-V ok; días consecutivos avisan', () => {
    expect(spacingWarnings([1, 3, 5])).toEqual([]);
    expect(spacingWarnings([1, 2, 5]).length).toBeGreaterThan(0);
    expect(spacingWarnings([0, 2, 4])).toEqual([]);
    // Viernes → Domingo = 48 h; Sábado → Domingo = consecutivo
    expect(spacingWarnings([6, 0, 3]).length).toBeGreaterThan(0);
  });

  it('peso muerto + sentadilla libre el mismo día avisa por fatiga', () => {
    let r = swap(routine(), 'd2', 'd2-pdr', 'peso-muerto');
    r = swap(r, 'd2', 'd2-press', 'sentadilla-libre');
    const p = computePlan(r, profile({ level: 'avanzado' }), cfg());
    expect(p.warnings.some((w) => w.kind === 'fatiga' && w.text.includes('Peso muerto convencional'))).toBe(true);
  });

  it('≥3 ejercicios del mismo patrón en un día avisa redundancia', () => {
    let r = swap(routine(), 'd1', 'd1-lat', 'press-pecho-maquina');
    r = swap(r, 'd1', 'd1-tri', 'press-banca-mancuernas');
    const p = computePlan(r, profile(), cfg());
    expect(p.warnings.some((w) => w.kind === 'redundancia')).toBe(true);
  });

  it('músculo grande con 1 exposición avisa cobertura', () => {
    const r = swap(routine(), 'd3', 'd3-curlfem', 'curl-polea');
    const p = computePlan(r, profile(), cfg());
    expect(p.warnings.some((w) => w.kind === 'cobertura' && w.text.startsWith('Femorales'))).toBe(true);
  });

  it('el mismo ejercicio en dos días avisa', () => {
    const r = swap(routine(), 'd3', 'd3-hack', 'prensa-45');
    const p = computePlan(r, profile(), cfg());
    expect(p.warnings.some((w) => w.text.includes('más de un día'))).toBe(true);
  });
});
