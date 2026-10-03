import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '@/db';
import { bodyToCsv, csvKind, csvToBody, csvToSessions, parseCsv, sessionsToCsv, toCsv } from '@/lib/csv';
import { fmtLoad, fromUnit, roundDisplay, toUnit } from '@/lib/units';

const session = (date: string, kg: number, reps: number, dayName = 'Pecho y espalda'): SessionRecord => ({
  date,
  dayId: 'd1',
  dayName,
  mode: 'adaptado',
  durationSec: 2280,
  plannedSec: 2400,
  conservative: false,
  sets: [
    { exerciseId: 'press-banca-barra', kind: 'warmup', kg: kg * 0.5, reps: 8, effort: '2 RIR' },
    { exerciseId: 'press-banca-barra', kind: 'work', kg, reps, effort: 'fallo', technique: 'negativas', tut: 48 }
  ],
  prs: [],
  volumeKg: kg * reps,
  muscles: { pecho: 1, triceps: 0.5, hombros: 0.5 }
});

describe('unidades', () => {
  it('convierte kg ↔ lb sin perder precisión', () => {
    expect(toUnit(100, 'lb')).toBeCloseTo(220.462, 2);
    expect(fromUnit(220.462, 'lb')).toBeCloseTo(100, 2);
    expect(toUnit(80, 'kg')).toBe(80);
  });
  it('redondea para mostrar según la unidad', () => {
    expect(roundDisplay(81.3, 'kg')).toBe(81.5);
    expect(roundDisplay(176.6, 'lb')).toBe(177);
    expect(roundDisplay(12.3, 'lb')).toBe(12.5);
    expect(fmtLoad(100, 'lb')).toBe('220 lb');
    expect(fmtLoad(60, 'kg')).toBe('60 kg');
  });
});

describe('CSV', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    const text = toCsv([['a,b', 'di "hola"', 'x\ny', 'ok']]);
    expect(parseCsv(text)).toEqual([['a,b', 'di "hola"', 'x\ny', 'ok']]);
  });

  it('ida y vuelta de series en kg', () => {
    const src = [session('2026-09-01T17:00:00.000Z', 80, 8), session('2026-09-04T17:00:00.000Z', 82.5, 8)];
    const csv = sessionsToCsv(src, 'kg');
    expect(csvKind(csv)).toBe('sets');
    const { sessions, skippedRows, duplicates } = csvToSessions(csv);
    expect(skippedRows).toBe(0);
    expect(duplicates).toBe(0);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].sets).toEqual(src[0].sets);
    expect(sessions[1].volumeKg).toBe(660);
    expect(sessions[1].muscles.pecho).toBe(1);
    expect(sessions[0].durationSec).toBe(2280);
    // La segunda sesión supera a la primera: se reconstruyen los récords
    expect(sessions[1].prs.map((p) => p.kind)).toContain('carga');
  });

  it('ida y vuelta en libras conserva los kilos', () => {
    const csv = sessionsToCsv([session('2026-09-01T17:00:00.000Z', 100, 6)], 'lb');
    expect(csv).toContain('220.46');
    const { sessions } = csvToSessions(csv);
    expect(sessions[0].sets[1].kg).toBeCloseTo(100, 1);
  });

  it('omite sesiones duplicadas y filas inválidas', () => {
    const existing = [session('2026-09-01T17:00:00.000Z', 80, 8)];
    const csv = sessionsToCsv(existing, 'kg') + '\r\n2026-09-02,Pierna,no-existe,Ejercicio raro,efectiva,1,50,kg,10,fallo,,,,';
    const r = csvToSessions(csv, existing);
    expect(r.duplicates).toBe(1);
    expect(r.skippedRows).toBe(1);
    expect(r.sessions).toHaveLength(0);
  });

  it('acepta CSV escritos a mano con nombre de ejercicio y fecha corta', () => {
    const csv = 'fecha;ejercicio;peso;reps\n2026-09-10;Press banca con barra;70;10\n2026-09-10;press banca con barra;70;9';
    const { sessions } = csvToSessions(csv);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sets).toHaveLength(2);
    expect(sessions[0].sets[0].exerciseId).toBe('press-banca-barra');
    expect(sessions[0].volumeKg).toBe(1330);
  });

  it('ida y vuelta de medidas corporales', () => {
    const body = [{ date: '2026-09-01', weightKg: 80, waist: 84 }, { date: '2026-09-08', weightKg: 79.5 }];
    const csv = bodyToCsv(body, 'lb');
    expect(csvKind(csv)).toBe('body');
    const r = csvToBody(csv, [{ date: '2026-09-01', weightKg: 80 }]);
    expect(r.duplicates).toBe(1);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].weightKg).toBeCloseTo(79.5, 1);
  });
});
