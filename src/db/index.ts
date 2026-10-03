import Dexie, { liveQuery, type Table } from 'dexie';
import { useEffect, useState } from 'react';
import type { LoggedSet, PR } from '@/engine/progression';
import type { Mode, Muscle } from '@/engine/types';

export interface SessionRecord {
  id?: number;
  date: string; // ISO completo
  dayId: string;
  dayName: string;
  mode: Mode;
  durationSec: number;
  plannedSec: number;
  conservative: boolean;
  deload?: boolean;
  readiness?: { sleep: number; energy: number; pain: number; score: number };
  sets: LoggedSet[];
  prs: PR[];
  volumeKg: number;
  muscles: Partial<Record<Muscle, number>>;
  /** Tiempo disponible que tenía la sesión (s). */
  budgetSec?: number;
  /** Nota libre de la sesión */
  notes?: string;
}

export interface BodyRecord {
  id?: number;
  date: string;
  weightKg?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
}

export interface ReadinessRecord {
  id?: number;
  date: string;
  sleep: number;
  energy: number;
  pain: number;
  score: number;
  low: boolean;
}

export interface PhotoRecord {
  id?: number;
  date: string; // ISO completo
  blob: Blob;
  note?: string;
  weightKg?: number;
}

class Heavy40DB extends Dexie {
  sessions!: Table<SessionRecord, number>;
  body!: Table<BodyRecord, number>;
  readiness!: Table<ReadinessRecord, number>;
  photos!: Table<PhotoRecord, number>;
  constructor() {
    super('heavy40');
    this.version(1).stores({
      sessions: '++id, date, dayId',
      body: '++id, date',
      readiness: '++id, date'
    });
    // v2: fotos de progreso (sólo en este dispositivo)
    this.version(2).stores({ photos: '++id, date' });
  }
}

export const db = new Heavy40DB();

/** Consulta reactiva mínima (equivalente a dexie-react-hooks). `undefined` mientras carga. */
export function useLive<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: () => setValue(undefined) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export async function exportAll() {
  const [sessions, body, readiness] = await Promise.all([db.sessions.toArray(), db.body.toArray(), db.readiness.toArray()]);
  return { sessions, body, readiness };
}

export async function importAll(data: { sessions?: SessionRecord[]; body?: BodyRecord[]; readiness?: ReadinessRecord[] }) {
  await db.transaction('rw', db.sessions, db.body, db.readiness, async () => {
    await Promise.all([db.sessions.clear(), db.body.clear(), db.readiness.clear()]);
    if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions.map(({ id: _id, ...r }) => r));
    if (data.body?.length) await db.body.bulkAdd(data.body.map(({ id: _id, ...r }) => r));
    if (data.readiness?.length) await db.readiness.bulkAdd(data.readiness.map(({ id: _id, ...r }) => r));
  });
}

export async function wipeAll() {
  await Promise.all([db.sessions.clear(), db.body.clear(), db.readiness.clear(), db.photos.clear()]);
}
