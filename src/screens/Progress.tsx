import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Database, Plus, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/Chart';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { getExercise } from '@/data/exercises';
import { MUSCLES, MUSCLE_LABEL } from '@/data/labels';
import { db, useLive as useDexie, type BodyRecord } from '@/db';
import { STALL_ADVICE, bestE1rm, isStalled, suggestLoad } from '@/engine/progression';
import { SMALL } from '@/engine/rules';
import type { Muscle } from '@/engine/types';
import { useSessions } from '@/hooks/useSessions';
import { addDays, isoDate, parseIso, shortDate, startOfWeek } from '@/lib/dates';
import { seedDemo } from '@/lib/demo';
import { kg as fmtKg, mmss } from '@/lib/format';
import { useApp, useBudget, usePerWeek, usePlan } from '@/store/app';
import { medals, rankFor, totalXp } from '@/lib/rank';
import { MedalGrid, RankCard } from '@/components/Rank';

export default function Progress() {
  const sessions = useSessions();
  const body = useDexie(() => db.body.orderBy('date').toArray(), []);
  const plan = usePlan();
  const budget = useBudget();
  const perWeek = usePerWeek();
  const loads = useApp((s) => s.loads);
  const [exId, setExId] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<Muscle>('pecho');
  const [bodyOpen, setBodyOpen] = useState(false);
  const [openSession, setOpenSession] = useState<number | null>(null);

  const exIds = useMemo(() => {
    const seen = new Set<string>();
    for (const s of sessions ?? []) for (const x of s.sets) if (x.kind === 'work') seen.add(x.exerciseId);
    return [...seen];
  }, [sessions]);
  const current = exId ?? exIds[0] ?? null;

  const e1rmSeries = useMemo(
    () =>
      (sessions ?? [])
        .map((s) => ({ x: shortDate(s.date), y: bestE1rm(s.sets.filter((x) => x.exerciseId === current)) }))
        .filter((p) => p.y > 0),
    [sessions, current]
  );

  const weekly = useMemo(() => {
    const weeks = Array.from({ length: 8 }).map((_, i) => addDays(startOfWeek(), -7 * (7 - i)));
    return weeks.map((w) => {
      const end = addDays(w, 7);
      const sets = (sessions ?? [])
        .filter((s) => {
          const d = new Date(s.date);
          return d >= w && d < end;
        })
        .reduce((a, s) => a + (s.muscles[muscle] ?? 0), 0);
      return { x: shortDate(w), y: sets };
    });
  }, [sessions, muscle]);

  const prs = useMemo(() => (sessions ?? []).flatMap((s) => s.prs.map((p) => ({ ...p, date: s.date }))).reverse(), [sessions]);

  const suggestions = useMemo(() => {
    if (!sessions) return [];
    return plan.days.flatMap((d) =>
      d.items.map((it) => {
        const hist = sessions.map((s) => ({ date: s.date, sets: s.sets.filter((x) => x.exerciseId === it.exercise.id) })).filter((h) => h.sets.length);
        const sug = suggestLoad(it.exercise, it.reps, it.effort, hist.at(-1), loads[it.exercise.id]);
        return { it, sug, stalled: isStalled(hist) };
      })
    );
  }, [plan, sessions, loads]);

  if (sessions === undefined) {
    return (
      <Page>
        <PageTitle eyebrow="Historial y tendencias" title="Progreso" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </Page>
    );
  }

  const totalVol = sessions.reduce((a, s) => a + s.volumeKg, 0);
  const rank = rankFor(totalXp(sessions, perWeek));
  const medalList = medals(sessions, perWeek);
  const avgDur = sessions.length ? sessions.reduce((a, s) => a + s.durationSec, 0) / sessions.length : 0;
  const stalled = suggestions.filter((s) => s.stalled);
  const isSmall = SMALL.includes(muscle);

  return (
    <Page>
      <PageTitle eyebrow="Historial y tendencias" title="Progreso" />

      {sessions.length === 0 && (
        <Rise className="card mb-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="font-display text-2xl font-bold uppercase">Aún no hay sesiones</div>
            <p className="text-sm text-muted">Completa tu primer entrenamiento o carga 6 semanas de ejemplo para explorar las gráficas (puedes borrarlas en Ajustes).</p>
          </div>
          <button className="btn-ghost" onClick={() => void seedDemo()}>
            <Database size={16} /> Datos de ejemplo
          </button>
        </Rise>
      )}

      <Rise className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Sesiones" value={sessions.length} />
        {totalVol >= 10000 ? <Kpi label="Volumen total" value={Math.round(totalVol / 100) / 10} decimals={1} suffix="t" /> : <Kpi label="Volumen total" value={Math.round(totalVol)} suffix="kg" />}
        <Kpi label="Récords" value={sessions.reduce((a, s) => a + s.prs.length, 0)} />
        <Kpi label="Duración media" text={mmss(avgDur)} sub={`meta ≤ ${mmss(budget)}`} />
      </Rise>

      <Rise as="section" className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <RankCard state={rank} />
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="h-display shrink-0 text-[26px]">Medallas</h2>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="num text-xs text-muted">
              {medalList.filter((m) => m.unlocked).length}/{medalList.length}
            </span>
          </div>
          <MedalGrid list={medalList} />
        </div>
      </Rise>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Rise>
          <ChartCard
            title="Fuerza estimada"
            sub={current ? `e1RM de ${getExercise(current).name} · mejor serie por sesión (Epley)` : 'Elige un ejercicio'}
            unit="kg"
            data={e1rmSeries}
            right={
              exIds.length > 0 && (
                <select aria-label="Ejercicio" className="chip max-w-[150px] appearance-none truncate bg-transparent" value={current ?? ''} onChange={(e) => setExId(e.target.value)}>
                  {exIds.map((id) => (
                    <option key={id} value={id}>
                      {getExercise(id).name}
                    </option>
                  ))}
                </select>
              )
            }
          />
        </Rise>
        <Rise>
          <ChartCard
            title="Volumen semanal"
            sub={`${MUSCLE_LABEL[muscle]} · series efectivas (indirectas = 0.5) · franja = ${isSmall ? '4-8' : '10-16'}`}
            unit="series"
            kind="bar"
            data={weekly}
            band={isSmall ? [4, 8] : [10, 16]}
            right={
              <select aria-label="Músculo" className="chip appearance-none bg-transparent" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>
                {MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {MUSCLE_LABEL[m]}
                  </option>
                ))}
              </select>
            }
          />
        </Rise>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Rise as="section">
          <SectionTitle>Próxima carga</SectionTitle>
          <ul className="space-y-2">
            {suggestions.slice(0, 12).map(({ it, sug }) => (
              <li key={it.uid} className="flex items-center gap-3 rounded-xl border border-line bg-surface/70 px-3 py-2.5">
                {sug.action === 'subir' ? (
                  <TrendingUp size={16} className="shrink-0 text-ok" />
                ) : sug.action === 'bajar' ? (
                  <TrendingDown size={16} className="shrink-0 text-warn" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.exercise.name}</div>
                  <div className="text-xs text-muted">{sug.text}</div>
                </div>
                <span className="num text-sm font-semibold">{sug.kg > 0 ? `${fmtKg(sug.kg)} kg` : '—'}</span>
              </li>
            ))}
          </ul>
          {stalled.length > 0 && (
            <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
              <div className="eyebrow mb-2 text-warn">Estancamiento: {stalled.map((s) => s.it.exercise.name).join(', ')}</div>
              <ol className="list-decimal space-y-1 pl-5">
                {STALL_ADVICE.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </div>
          )}
        </Rise>

        <Rise as="section">
          <SectionTitle>Récords</SectionTitle>
          {prs.length === 0 ? (
            <p className="text-sm text-muted">Los PRs aparecen aquí cuando superas tu mejor e1RM o carga.</p>
          ) : (
            <ul className="space-y-2">
              {prs.slice(0, 10).map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
                  <Trophy size={15} className="shrink-0 text-ember" />
                  <span className="min-w-0 flex-1 truncate">{getExercise(p.exerciseId).name}</span>
                  <span className="num text-xs text-muted">{shortDate(p.date)}</span>
                  <span className="num font-semibold">{fmtKg(Math.round(p.value * 10) / 10)} kg</span>
                </li>
              ))}
            </ul>
          )}
        </Rise>
      </div>

      <Rise as="section">
        <SectionTitle
          right={
            <button className="chip min-h-[40px]" onClick={() => setBodyOpen(true)}>
              <Plus size={14} /> Registrar
            </button>
          }
        >
          Cuerpo
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Peso corporal" unit="kg" data={(body ?? []).filter((b) => b.weightKg).map((b) => ({ x: shortDate(b.date), y: b.weightKg! }))} />
          <div className="card p-5">
            <h3 className="h-display mb-3 text-2xl">Medidas</h3>
            <MeasuresTable rows={body ?? []} />
          </div>
        </div>
      </Rise>

      <Rise as="section">
        <SectionTitle>Historial</SectionTitle>
        <ul className="space-y-2">
          {[...sessions].reverse().slice(0, 30).map((s) => (
            <li key={s.id} className="rounded-xl border border-line bg-surface/70">
              <button className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" onClick={() => setOpenSession(openSession === s.id ? null : s.id!)} aria-expanded={openSession === s.id}>
                <span className="num w-14 shrink-0 text-xs text-muted">{shortDate(s.date)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{s.dayName}</span>
                <span className={`num text-xs ${s.durationSec > (s.budgetSec ?? 2400) ? 'text-ember' : 'text-muted'}`}>{mmss(s.durationSec)}</span>
                <ChevronDown size={16} className={`text-muted transition-transform ${openSession === s.id ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openSession === s.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-line px-4 py-3 text-sm">
                      {groupSets(s.sets).map(([id, sets]) => (
                        <div key={id} className="flex justify-between gap-3 py-1">
                          <span className="truncate text-muted">{getExercise(id).name}</span>
                          <span className="num shrink-0">{sets.map((x) => `${fmtKg(x.kg)}×${x.reps}`).join('  ')}</span>
                        </div>
                      ))}
                      {s.notes && <p className="mt-2 rounded-md border border-line bg-bg/50 px-3 py-2 text-sm italic text-muted">“{s.notes}”</p>}
                      <div className="mt-2 text-xs text-muted">
                        Volumen {Math.round(s.volumeKg)} kg{s.conservative && ' · conservador'}
                        {s.deload && ' · descarga'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </Rise>

      <BodySheet open={bodyOpen} onClose={() => setBodyOpen(false)} />
    </Page>
  );
}

function groupSets(sets: { exerciseId: string; kind: string; kg: number; reps: number }[]) {
  const m = new Map<string, typeof sets>();
  for (const s of sets) if (s.kind === 'work') m.set(s.exerciseId, [...(m.get(s.exerciseId) ?? []), s]);
  return [...m.entries()];
}

function Kpi({ label, value, suffix, text, sub, decimals = 0 }: { label: string; value?: number; suffix?: string; text?: string; sub?: string; decimals?: number }) {
  return (
    <div className="card px-4 py-3">
      <div className="num text-3xl font-semibold">
        {text ?? <NumberTicker value={value ?? 0} decimals={decimals} />}
        {suffix && <span className="ml-0.5 text-base text-muted">{suffix}</span>}
      </div>
      <div className="text-xs text-muted">{label}</div>
      {sub && <div className="text-[10px] text-muted/80">{sub}</div>}
    </div>
  );
}

function MeasuresTable({ rows }: { rows: BodyRecord[] }) {
  const cols: [keyof BodyRecord, string][] = [
    ['waist', 'Cintura'],
    ['chest', 'Pecho'],
    ['arm', 'Brazo'],
    ['thigh', 'Muslo']
  ];
  const with_ = rows.filter((r) => cols.some(([k]) => r[k] != null)).slice(-6).reverse();
  if (!with_.length) return <p className="text-sm text-muted">Registra medidas (cm) para ver su tendencia.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="py-1 font-normal">Fecha</th>
          {cols.map(([, l]) => (
            <th key={l} className="py-1 text-right font-normal">
              {l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {with_.map((r) => (
          <tr key={r.id} className="border-t border-line">
            <td className="py-1.5">{shortDate(parseIso(r.date))}</td>
            {cols.map(([k]) => (
              <td key={k} className="num py-1.5 text-right">
                {r[k] != null ? String(r[k]) : '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BodySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bw = useApp((s) => s.profile.bodyweight);
  const [f, setF] = useState<Record<string, string>>({});
  const fields: [string, string, string][] = [
    ['weightKg', 'Peso', 'kg'],
    ['waist', 'Cintura', 'cm'],
    ['chest', 'Pecho', 'cm'],
    ['arm', 'Brazo', 'cm'],
    ['thigh', 'Muslo', 'cm']
  ];
  const num = (v?: string) => (v && !Number.isNaN(parseFloat(v.replace(',', '.'))) ? parseFloat(v.replace(',', '.')) : undefined);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar"
      eyebrow={`Cuerpo · ${shortDate(new Date())}`}
      footer={
        <button
          className="btn-ember w-full"
          onClick={async () => {
            await db.body.add({ date: isoDate(), weightKg: num(f.weightKg), waist: num(f.waist), chest: num(f.chest), arm: num(f.arm), thigh: num(f.thigh) });
            setF({});
            onClose();
          }}
        >
          Guardar
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([k, l, u]) => (
          <label key={k} className={k === 'weightKg' ? 'col-span-2' : ''}>
            <span className="eyebrow mb-1 block">
              {l} ({u})
            </span>
            <input className="field num" inputMode="decimal" placeholder={k === 'weightKg' ? String(bw) : '—'} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>
        ))}
      </div>
    </Sheet>
  );
}
