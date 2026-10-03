import { EXERCISES, EXERCISE_BY_ID } from '@/data/exercises';
import type { BodyRecord, SessionRecord } from '@/db';
import { detectPRs, type ExerciseSession, type LoggedSet } from '@/engine/progression';
import type { Effort, Mode, Muscle } from '@/engine/types';
import { fromUnit, toUnit, type Unit } from './units';

// ───────────────────────── CSV básico (RFC 4180) ─────────────────────────

const cell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cur);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const r1 = (n: number) => Math.round(n * 100) / 100;
const num = (s?: string): number | undefined => {
  if (s == null || s.trim() === '') return undefined;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

// ───────────────────────── Series ─────────────────────────

export const SETS_HEADER = ['fecha', 'dia', 'ejercicio_id', 'ejercicio', 'tipo', 'serie', 'peso', 'unidad', 'reps', 'esfuerzo', 'tecnica', 'tut_s', 'duracion_s', 'estilo'];

/** Una fila por serie; el peso va en la unidad elegida y la columna `unidad` lo deja explícito. */
export function sessionsToCsv(sessions: SessionRecord[], unit: Unit): string {
  const rows: unknown[][] = [SETS_HEADER];
  for (const s of sessions) {
    const count: Record<string, number> = {};
    for (const x of s.sets) {
      const k = `${x.exerciseId}:${x.kind}`;
      count[k] = (count[k] ?? 0) + 1;
      rows.push([
        s.date,
        s.dayName,
        x.exerciseId,
        EXERCISE_BY_ID[x.exerciseId]?.name ?? x.exerciseId,
        x.kind === 'work' ? 'efectiva' : 'calentamiento',
        count[k],
        r1(toUnit(x.kg, unit)),
        unit,
        x.reps,
        x.effort,
        x.technique ?? '',
        x.tut ?? '',
        s.durationSec,
        s.mode
      ]);
    }
  }
  return toCsv(rows);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
const BY_NAME = new Map(EXERCISES.map((e) => [norm(e.name), e.id]));
const EFFORTS: Effort[] = ['fallo', '1 RIR', '2 RIR', '3 RIR'];
const MODES: Mode[] = ['puro', 'adaptado', 'fast40', 'clasico', 'custom'];

export interface ImportResult {
  sessions: SessionRecord[];
  skippedRows: number;
  duplicates: number;
}

/**
 * Reconstruye sesiones desde el CSV de series. Agrupa por fecha + día, convierte
 * el peso a kg, recalcula volumen, músculos y récords, y omite las sesiones que ya existen.
 */
export function csvToSessions(text: string, existing: SessionRecord[] = []): ImportResult {
  const rows = parseCsv(text);
  if (!rows.length) return { sessions: [], skippedRows: 0, duplicates: 0 };
  const head = rows[0].map(norm);
  const col = (name: string) => head.indexOf(name);
  const iDate = col('fecha');
  const iDay = col('dia');
  const iId = col('ejercicio_id');
  const iName = col('ejercicio');
  const iKind = col('tipo');
  const iKg = col('peso') >= 0 ? col('peso') : col('kg');
  const iUnit = col('unidad');
  const iReps = col('reps');
  const iEff = col('esfuerzo');
  const iTech = col('tecnica');
  const iTut = col('tut_s');
  const iDur = col('duracion_s');
  const iMode = col('estilo');
  if (iDate < 0 || iKg < 0 || iReps < 0 || (iId < 0 && iName < 0)) throw new Error('Faltan columnas: fecha, ejercicio, peso, reps');

  let skippedRows = 0;
  const groups = new Map<string, { date: string; dayName: string; sets: LoggedSet[]; dur?: number; mode?: Mode }>();
  for (const r of rows.slice(1)) {
    const rawDate = r[iDate]?.trim();
    const d = rawDate ? new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate) : null;
    const exId = (iId >= 0 && EXERCISE_BY_ID[r[iId]?.trim()] ? r[iId].trim() : undefined) ?? (iName >= 0 ? BY_NAME.get(norm(r[iName] ?? '')) : undefined);
    const w = num(r[iKg]);
    const reps = num(r[iReps]);
    if (!d || Number.isNaN(d.getTime()) || !exId || w == null || reps == null) {
      skippedRows++;
      continue;
    }
    const unit: Unit = iUnit >= 0 && norm(r[iUnit] ?? '') === 'lb' ? 'lb' : 'kg';
    const dayName = (iDay >= 0 ? r[iDay]?.trim() : '') || 'Sesión importada';
    const date = d.toISOString();
    const key = `${date}|${dayName}`;
    const g = groups.get(key) ?? { date, dayName, sets: [] };
    const eff = iEff >= 0 ? EFFORTS.find((e) => norm(e) === norm(r[iEff] ?? '')) : undefined;
    const kind = iKind >= 0 && /calent|warm/.test(norm(r[iKind] ?? '')) ? 'warmup' : 'work';
    g.sets.push({
      exerciseId: exId,
      kind,
      kg: r1(fromUnit(w, unit)),
      reps: Math.round(reps),
      effort: eff ?? 'fallo',
      technique: iTech >= 0 && r[iTech]?.trim() ? r[iTech].trim() : undefined,
      tut: iTut >= 0 ? num(r[iTut]) : undefined
    });
    if (iDur >= 0 && g.dur == null) g.dur = num(r[iDur]);
    if (iMode >= 0 && g.mode == null) g.mode = MODES.find((m) => m === r[iMode]?.trim());
    groups.set(key, g);
  }

  const seen = new Set(existing.map((s) => `${s.date}|${s.dayName}`));
  const history: SessionRecord[] = [...existing];
  const out: SessionRecord[] = [];
  let duplicates = 0;
  for (const g of [...groups.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    if (seen.has(`${g.date}|${g.dayName}`)) {
      duplicates++;
      continue;
    }
    const work = g.sets.filter((s) => s.kind === 'work');
    const muscles: Partial<Record<Muscle, number>> = {};
    for (const s of work) {
      const ex = EXERCISE_BY_ID[s.exerciseId];
      muscles[ex.primary] = (muscles[ex.primary] ?? 0) + 1;
      for (const m of ex.secondary) muscles[m] = (muscles[m] ?? 0) + 0.5;
    }
    const prior = history.filter((h) => h.date < g.date);
    const prs = [...new Set(work.map((s) => s.exerciseId))].flatMap((id) =>
      detectPRs(
        EXERCISE_BY_ID[id],
        work,
        prior.map((h): ExerciseSession => ({ date: h.date, sets: h.sets.filter((x) => x.exerciseId === id) })).filter((h) => h.sets.length)
      )
    );
    const dur = g.dur ?? 0;
    const rec: SessionRecord = {
      date: g.date,
      dayId: '',
      dayName: g.dayName,
      mode: g.mode ?? 'adaptado',
      durationSec: dur,
      plannedSec: dur,
      conservative: false,
      sets: g.sets,
      prs,
      volumeKg: r1(work.reduce((a, s) => a + s.kg * s.reps, 0)),
      muscles
    };
    out.push(rec);
    history.push(rec);
    seen.add(`${g.date}|${g.dayName}`);
  }
  return { sessions: out, skippedRows, duplicates };
}

// ───────────────────────── Cuerpo ─────────────────────────

export const BODY_HEADER = ['fecha', 'peso', 'unidad', 'cintura_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm'];

export function bodyToCsv(body: BodyRecord[], unit: Unit): string {
  return toCsv([
    BODY_HEADER,
    ...body.map((b) => [b.date, b.weightKg != null ? r1(toUnit(b.weightKg, unit)) : '', unit, b.waist ?? '', b.chest ?? '', b.arm ?? '', b.thigh ?? ''])
  ]);
}

export function csvToBody(text: string, existing: BodyRecord[] = []): { body: BodyRecord[]; duplicates: number } {
  const rows = parseCsv(text);
  if (!rows.length) return { body: [], duplicates: 0 };
  const head = rows[0].map(norm);
  const at = (r: string[], name: string) => (head.indexOf(name) >= 0 ? r[head.indexOf(name)] : undefined);
  const seen = new Set(existing.map((b) => b.date));
  const out: BodyRecord[] = [];
  let duplicates = 0;
  for (const r of rows.slice(1)) {
    const date = at(r, 'fecha')?.trim();
    if (!date) continue;
    if (seen.has(date)) {
      duplicates++;
      continue;
    }
    const unit: Unit = norm(at(r, 'unidad') ?? '') === 'lb' ? 'lb' : 'kg';
    const w = num(at(r, 'peso'));
    out.push({
      date,
      weightKg: w != null ? r1(fromUnit(w, unit)) : undefined,
      waist: num(at(r, 'cintura_cm')),
      chest: num(at(r, 'pecho_cm')),
      arm: num(at(r, 'brazo_cm')),
      thigh: num(at(r, 'muslo_cm'))
    });
    seen.add(date);
  }
  return { body: out, duplicates };
}

/** Cuál de los dos CSV es, por sus columnas. */
export function csvKind(text: string): 'sets' | 'body' | null {
  const head = parseCsv(text.split(/\r?\n/)[0] ?? '')[0]?.map(norm) ?? [];
  if (head.includes('reps')) return 'sets';
  if (head.includes('fecha') && (head.includes('peso') || head.includes('cintura_cm'))) return 'body';
  return null;
}
