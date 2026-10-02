import { db, useLive, type SessionRecord } from '@/db';

export function useSessions(): SessionRecord[] | undefined {
  return useLive(() => db.sessions.orderBy('date').toArray(), []);
}
