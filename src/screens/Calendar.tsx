import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/Chart';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';
import { Sheet } from '@/components/ui/Sheet';
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/data/labels';
import { db, useLive as useDexie } from '@/db';
import { deloadDue } from '@/engine/progression';
import { spacingWarnings } from '@/engine/validate';
import { useSessions } from '@/hooks/useSessions';
import { addDays, isoDate, shortDate, startOfWeek, weekKey } from '@/lib/dates';
import { weekdayOf, weeksSince } from '@/lib/schedule';
import { useApp, usePlan } from '@/store/app';

export default function Calendar() {
  const plan = usePlan();
  const routine = useApp((s) => s.routine);
  const overrides = useApp((s) => s.overrides);
  const deloads = useApp((s) => s.deloads);
  const programStart = useApp((s) => s.programStart);
  const reschedule = useApp((s) => s.reschedule);
  const scheduleDeload = useApp((s) => s.scheduleDeload);
  const cancelDeload = useApp((s) => s.cancelDeload);
  const sessions = useSessions();
  const readiness = useDexie(() => db.readiness.orderBy('date').toArray(), []);
  const [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState<string | null>(null);

  const monday = addDays(startOfWeek(), offset * 7);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(monday, i));
  const doneByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions ?? []) m.set(isoDate(new Date(s.date)), s.dayName);
    return m;
  }, [sessions]);
  const isDeload = deloads.some((d) => d.start === weekKey(monday));

  const lastDeload = deloads.filter((d) => d.start <= isoDate()).at(-1)?.start ?? programStart;
  const due = deloadDue({ weeksSinceDeload: weeksSince(lastDeload), recentReadinessLow: (readiness ?? []).slice(-3).map((r) => r.low) });
  const recommended = (() => {
    const w = Math.max(0, 6 - weeksSince(lastDeload));
    return weekKey(addDays(startOfWeek(), (due.due ? 1 : w) * 7));
  })();

  const editing = routine.days.find((d) => d.id === edit);
  const editIdx = routine.days.findIndex((d) => d.id === edit);
  const weekdaysNow = routine.days.map((d) => weekdayOf(d, overrides, monday));

  return (
    <Page>
      <PageTitle eyebrow="Recuperación y calendario" title="Descanso" />

      <Rise className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="font-display text-xl font-bold uppercase">
              {offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana pasada' : `Semana del ${shortDate(monday)}`}
            </div>
            <div className="text-xs text-muted">
              {shortDate(monday)} – {shortDate(addDays(monday, 6))}
              {isDeload && <span className="text-ember"> · descarga</span>}
            </div>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => setOffset(offset + 1)} aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
        <motion.div key={offset} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const idx = routine.days.findIndex((r) => weekdayOf(r, overrides, d) === d.getDay());
            const done = doneByDate.get(isoDate(d));
            const moved = idx >= 0 && overrides[weekKey(d)]?.[routine.days[idx].id] != null;
            return (
              <button
                key={isoDate(d)}
                disabled={idx < 0}
                onClick={() => idx >= 0 && setEdit(routine.days[idx].id)}
                className={`flex min-h-[110px] flex-col items-center gap-1 rounded-xl border p-1.5 pt-2 text-center ${
                  isoDate(d) === isoDate() ? 'border-ember' : 'border-line'
                } ${done ? 'bg-ember/90 text-onember' : idx >= 0 ? 'bg-raised/60 hover:border-line2' : ''}`}
              >
                <span className="text-[10px] uppercase opacity-80">{WEEKDAY_SHORT[d.getDay()]}</span>
                <span className="num text-sm font-semibold">{d.getDate()}</span>
                {idx >= 0 && (
                  <>
                    <span className={`font-display text-lg font-black ${done ? '' : 'text-ember'}`}>D{idx + 1}</span>
                    {moved && <span className="text-[9px] uppercase">movido</span>}
                  </>
                )}
                {idx < 0 && <span className="mt-2 h-1 w-1 rounded-full bg-line2" aria-label="descanso" />}
              </button>
            );
          })}
        </motion.div>
        <p className="mt-3 text-xs text-muted">Toca una sesión para moverla sólo esa semana. Los días fijos se cambian en Ajustes.</p>
      </Rise>

      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Rise as="section">
          <SectionTitle>Planificador de descarga</SectionTitle>
          <div className={`mb-3 rounded-xl border p-4 text-sm ${due.due ? 'border-ember/50 bg-ember/[0.07]' : 'border-line'}`}>
            {due.due ? (
              <>
                <span className="font-semibold text-ember">Toca descargar.</span> {due.reason}.
              </>
            ) : (
              <>
                Llevas <span className="num">{weeksSince(lastDeload)}</span> semanas desde la última descarga. Se sugiere cada 6-8 semanas o tras 3 sesiones con readiness bajo.
              </>
            )}
          </div>
          <ul className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const w = addDays(startOfWeek(), i * 7);
              const k = weekKey(w);
              const on = deloads.some((d) => d.start === k);
              return (
                <li key={k}>
                  <button
                    onClick={() => (on ? cancelDeload(k) : scheduleDeload(k))}
                    className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 text-left ${on ? 'border-ember bg-ember/10' : 'border-line hover:border-line2'}`}
                    aria-pressed={on}
                  >
                    <span>
                      <span className="font-medium">{i === 0 ? 'Esta semana' : `Semana del ${shortDate(w)}`}</span>
                      {k === recommended && !on && <span className="ml-2 text-xs text-ember">recomendada</span>}
                    </span>
                    <span className={`text-sm ${on ? 'text-ember' : 'text-muted'}`}>{on ? 'Descarga: −40 % series, −10 % carga' : 'Normal'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Rise>
        <Rise as="section">
          <SectionTitle>Tendencia de readiness</SectionTitle>
          <ChartCard
            title="Readiness"
            sub="Sueño + energía + (6 − molestias), 1-5. Bajo 2.75 → modo conservador."
            unit="/5"
            data={(readiness ?? []).map((r) => ({ x: shortDate(r.date), y: r.score }))}
            band={[2.75, 5]}
          />
          <div className="mt-4 rounded-xl border border-line p-4 text-sm text-muted">
            Sesiones esta semana: <span className="num text-fg">{plan.days.length}</span> · Separación mínima: 48 h por músculo. Ante la duda, descansa un día más.
          </div>
        </Rise>
      </div>

      <Sheet open={!!editing} onClose={() => setEdit(null)} title={`Mover día ${editIdx + 1}`} eyebrow="Sólo esta semana">
        {editing && (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const cur = weekdayOf(editing, overrides, monday);
                const taken = weekdaysNow.some((w, i) => i !== editIdx && w === wd);
                const trial = weekdaysNow.map((w, i) => (i === editIdx ? wd : w));
                const bad = spacingWarnings(trial).length > 0;
                return (
                  <button
                    key={wd}
                    disabled={taken}
                    onClick={() => {
                      reschedule(editing.id, wd === editing.weekday ? null : wd, monday);
                      setEdit(null);
                    }}
                    className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border text-sm disabled:opacity-30 ${
                      cur === wd ? 'border-ember bg-ember text-onember' : bad ? 'border-warn/50 text-warn' : 'border-line'
                    }`}
                  >
                    {WEEKDAY_SHORT[wd]}
                    {bad && cur !== wd && <span className="text-[9px]">&lt;48 h</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted">Original: {WEEKDAY_LONG[editing.weekday]}. Los días en ámbar dejan menos de 48 h con otra sesión.</p>
            <button
              className="btn-ghost mt-4 w-full"
              onClick={() => {
                reschedule(editing.id, null, monday);
                setEdit(null);
              }}
            >
              <RotateCcw size={16} /> Restablecer
            </button>
          </>
        )}
      </Sheet>
    </Page>
  );
}
