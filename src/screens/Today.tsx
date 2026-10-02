import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Flame, Moon, Play, ShieldCheck, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReadinessSheet } from '@/components/Readiness';
import { Logo } from '@/components/ui/Logo';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Page, Rise, SectionTitle } from '@/components/ui/Page';
import { Ring } from '@/components/ui/Ring';
import { Skeleton } from '@/components/ui/Skeleton';
import { db, useLive as useDexie } from '@/db';
import { CLASS_LABEL, MODE_LABEL, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/data/labels';
import { deloadDue } from '@/engine/progression';
import type { PrescribedDay } from '@/engine/types';
import { useMedia } from '@/hooks/useMedia';
import { useNow } from '@/hooks/useNow';
import { useSessions } from '@/hooks/useSessions';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { addDays, isoDate, parseIso, shortDate, startOfWeek } from '@/lib/dates';
import { mmss } from '@/lib/format';
import { hoursSinceLast, nextSession, sessionOn, streakWeeks, weekdayOf, weeksSince } from '@/lib/schedule';
import { isDeloadWeek, useApp, usePlan } from '@/store/app';
import { rankFor, totalXp } from '@/lib/rank';
import { RankChip } from '@/components/Rank';
import { useLive } from '@/store/live';

function countdown(ms: number): string {
  if (ms <= 0) return 'ya';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hh = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${hh}` : hh;
}

export function Today() {
  const plan = usePlan();
  const routine = useApp((s) => s.routine);
  const overrides = useApp((s) => s.overrides);
  const deloads = useApp((s) => s.deloads);
  const programStart = useApp((s) => s.programStart);
  const mode = useApp((s) => s.settings.mode);
  const sessions = useSessions();
  const readinessHist = useDexie(() => db.readiness.orderBy('date').reverse().limit(3).toArray(), []);
  const liveActive = useLive((s) => s.active);
  const startWorkout = useStartWorkout();
  const now = useNow(1000);
  const [readyOpen, setReadyOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const wide = useMedia('(min-width: 400px)');

  const today = new Date(now);
  const doneDates = useMemo(() => new Set((sessions ?? []).map((s) => isoDate(new Date(s.date)))), [sessions]);
  const todayDay = sessionOn(routine, overrides, today);
  const doneToday = doneDates.has(isoDate(today));
  const next = nextSession(routine, overrides, doneToday ? addDays(today, 1) : today, doneDates);
  const isTrainingToday = !!todayDay && !doneToday;
  const featuredId = pick ?? (isTrainingToday ? todayDay!.id : next?.day.id ?? routine.days[0].id);
  const featured = plan.days.find((d) => d.day.id === featuredId) ?? plan.days[0];
  const dayIndex = plan.days.indexOf(featured);
  const streak = streakWeeks(sessions ?? [], today);
  const rank = useMemo(() => rankFor(totalXp(sessions ?? [])), [sessions]);
  const since = hoursSinceLast(sessions ?? [], today);
  const deloadNow = isDeloadWeek(deloads, today);
  const lastDeload = deloads.filter((d) => d.start <= isoDate(today)).at(-1)?.start ?? programStart;
  const deload = deloadDue({
    weeksSinceDeload: weeksSince(lastDeload, today),
    recentReadinessLow: (readinessHist ?? []).map((r) => r.low).reverse()
  });

  const lastHour = (() => {
    const last = sessions?.at(-1);
    return last ? new Date(last.date).getHours() : 18;
  })();
  const nextAt = next ? new Date(next.date.getFullYear(), next.date.getMonth(), next.date.getDate(), lastHour) : null;

  const totalSets = featured.items.reduce((a, i) => a + i.workSets, 0);

  return (
    <Page>
      <Rise as="header" className="mb-6 flex items-center justify-between">
        <div className="lg:hidden">
          <Logo size={26} />
        </div>
        <div className="eyebrow hidden lg:block">{WEEKDAY_LONG[today.getDay()]} · {shortDate(today)}</div>
        <div className="flex items-center gap-2">
          <span className="chip min-h-[44px]" title="Semanas seguidas con 3 sesiones" aria-label={`Racha: ${streak.weeks} semanas`}>
            <Flame size={15} className={streak.weeks > 0 ? 'text-ember' : ''} aria-hidden />
            <span className="num text-fg">{streak.weeks}</span>
            <span className="hidden sm:inline">sem</span>
          </span>
          <Link to="/progreso" aria-label="Ver rango y medallas">
            <RankChip state={rank} />
          </Link>
        </div>
      </Rise>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* ───── Tarjeta principal ───── */}
        <Rise as="section" className="card-forge overflow-hidden p-5 lg:p-7">
          <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ember/10 blur-3xl" aria-hidden />
          <span aria-hidden className="text-outline pointer-events-none absolute -bottom-10 -right-3 select-none font-display text-[220px] font-black leading-none lg:text-[280px]">
            {String(dayIndex + 1).padStart(2, '0')}
          </span>
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="eyebrow mb-2 flex items-center gap-2">
                {isTrainingToday && !pick ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-ember rounded-full bg-ember" /> Hoy toca
                  </>
                ) : doneToday && !pick ? (
                  <>
                    <ShieldCheck size={13} className="text-ok" /> Hecho hoy · siguiente
                  </>
                ) : pick ? (
                  'Sesión elegida'
                ) : (
                  <>
                    <Moon size={13} /> Descanso · próxima
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-[0.12em] text-ember">
                <span className="bg-ember px-1.5 leading-tight text-onember">D{String(dayIndex + 1).padStart(2, '0')}</span>
                {WEEKDAY_LONG[featured.day.weekday]}
              </div>
              <h1 className="h-display mt-1 text-[clamp(32px,10.5vw,44px)] sm:text-5xl lg:text-[40px] 2xl:text-5xl">{featured.name.split(' · ').map((p, i) => <span key={i} className="block">{p}</span>)}</h1>
            </div>
            <Ring value={featured.seconds / 2400} size={wide ? 124 : 100} stroke={wide ? 9 : 8} label={`${Math.round(featured.seconds / 60)} de 40 minutos`}>
              <div className="text-center leading-none">
                <NumberTicker value={Math.round(featured.seconds / 60)} className={`block font-semibold ${wide ? "text-4xl" : "text-3xl"}`} />
                <span className="eyebrow !text-[10px]">/40 min</span>
              </div>
            </Ring>
          </div>

          <PlanBar day={featured} />

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <Stat label="Ejercicios" value={featured.items.length} />
            <Stat label="Series efectivas" value={totalSets} />
            <Stat label="Fatiga" value={featured.fatigue} suffix="/24" />
          </div>

          {!isTrainingToday && !pick && nextAt && (
            <div className="relative mt-5 rounded-lg border border-line bg-bg/60 p-4">
              <div className="eyebrow mb-1">Cuenta regresiva · {WEEKDAY_LONG[next!.date.getDay()]}</div>
              <div className="num text-3xl font-semibold tracking-tight">{countdown(nextAt.getTime() - now)}</div>
              <p className="mt-1 text-sm text-muted">El músculo crece mientras descansas. En HD el descanso es parte del entrenamiento.</p>
            </div>
          )}

          {since !== undefined && since < 48 && (
            <div className="hazard mt-4 flex gap-2 py-2.5 pr-3 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <span>
                Han pasado <span className="num">{Math.round(since)}</span> h desde tu última sesión. Heavy Duty pide ≥48 h entre sesiones.
              </span>
            </div>
          )}
          {deloadNow && (
            <div className="hazard-ember mt-4 flex gap-2 py-2.5 pr-3 text-sm">
              <Zap size={16} className="mt-0.5 shrink-0 text-ember" aria-hidden />
              <span>Semana de descarga: −40 % de series, −10 % de carga, sin fallo.</span>
            </div>
          )}

          <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
            {liveActive ? (
              <Link to="/entrenar" className="btn-ember min-h-[64px] flex-1 text-2xl">
                <Play size={20} fill="currentColor" /> Continuar sesión
              </Link>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} className="btn-ember min-h-[64px] flex-1 text-2xl" onClick={() => setReadyOpen(true)}>
                <Play size={20} fill="currentColor" /> Iniciar entrenamiento
              </motion.button>
            )}
          </div>
          <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Entrenar otro día:</span>
            {plan.days.map((d, i) => (
              <button key={d.day.id} data-on={d.day.id === featuredId} className="chip min-h-[44px]" onClick={() => setPick(d.day.id === featuredId && pick ? null : d.day.id)}>
                Día {i + 1}
              </button>
            ))}
          </div>
        </Rise>

        {/* ───── Columna derecha ───── */}
        <div className="space-y-5">
          <Rise as="section" className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Semana</span>
              <span className="chip !py-1">{MODE_LABEL[mode]}</span>
            </div>
            <WeekStrip doneDates={doneDates} today={today} />
          </Rise>

          {deload.due && !deloadNow && (
            <Rise as="section" className="hazard-ember p-5">
              <div className="eyebrow mb-1 text-ember">Descarga sugerida</div>
              <p className="text-sm">{deload.reason}. Programa una semana de descarga en Recuperación.</p>
              <Link to="/calendario" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember">
                Planificar descarga <ChevronRight size={16} />
              </Link>
            </Rise>
          )}

          <Rise as="section">
            <SectionTitle index="02" right={<Link to="/rutina" className="press inline-flex min-h-[44px] items-center text-sm text-muted hover:text-fg">Editar</Link>}>La sesión</SectionTitle>
            {sessions === undefined ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <SessionList day={featured} />
            )}
          </Rise>
        </div>
      </div>

      <ReadinessSheet
        open={readyOpen}
        onClose={() => setReadyOpen(false)}
        onDone={(r) => {
          setReadyOpen(false);
          void startWorkout(featured.day.id, r);
        }}
      />
    </Page>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="relative rounded-md border border-line bg-bg/60 px-3 pb-2.5 pt-3">
      <span className="absolute left-3 top-0 h-[2px] w-5 bg-ember" aria-hidden />
      <div className="num text-[26px] font-semibold leading-none">
        <NumberTicker value={value} />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
      <div className="mt-1 text-[11px] leading-tight text-muted">{label}</div>
    </div>
  );
}

/** Presupuesto de 40 min segmentado: cada bloque es un ejercicio, a escala. */
function PlanBar({ day }: { day: PrescribedDay }) {
  const general = day.timeline[0]?.kind === 'general' ? day.timeline[0].seconds : 0;
  const segs = [
    { key: 'gen', sec: general, tone: 'bg-line2', label: 'Calentamiento general' },
    ...day.items.map((it) => ({
      key: it.uid,
      sec: it.seconds,
      tone: it.priority >= 4 ? 'bg-ember' : it.exercise.cls === 'A' || it.exercise.cls === 'P' ? 'bg-ember/45' : 'bg-ember/75',
      label: it.exercise.name
    }))
  ].filter((x) => x.sec > 0);
  return (
    <div className="relative mt-6" role="img" aria-label={`Presupuesto: ${mmss(day.seconds)} de 40:00 en ${day.items.length} ejercicios`}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="eyebrow">Presupuesto 40:00</span>
        <span className={`num text-xs ${day.seconds > 2400 ? 'text-ember' : 'text-muted'}`}>
          {mmss(day.seconds)} · libre {mmss(Math.max(0, 2400 - day.seconds))}
        </span>
      </div>
      <div className="flex h-4 gap-[2px] bg-bg/60 p-[2px]">
        {segs.map((sg, i) => (
          <motion.span
            key={sg.key}
            title={`${sg.label} · ${mmss(sg.sec)}`}
            className={`block h-full ${sg.tone}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 500, damping: 26 }}
            style={{ width: `${(sg.sec / 2400) * 100}%`, transformOrigin: 'bottom' }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted" aria-hidden>
        {[0, 10, 20, 30, 40].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function SessionList({ day }: { day: PrescribedDay }) {
  return (
    <ol className="space-y-1.5">
      {day.items.map((it, i) => (
        <motion.li
          key={it.uid}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 + i * 0.04, type: 'spring', stiffness: 420, damping: 26 }}
          className="relative flex items-center gap-3 overflow-hidden rounded-md border border-line bg-surface/80 py-2.5 pl-4 pr-3"
        >
          <span className={`absolute inset-y-0 left-0 w-[3px] ${it.priority >= 4 ? 'bg-ember' : 'bg-line2'}`} aria-hidden />
          <span className="w-8 shrink-0 font-display text-2xl font-black leading-none text-muted/70">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{it.exercise.name}</div>
            <div className="text-xs text-muted">
              {it.warmups.length > 0 && <span>{it.warmups.length} cal. + </span>}
              <span className="font-semibold text-fg">
                {it.workSets}×{it.reps[0]}-{it.reps[1]}
              </span>{' '}
              · {it.effort === 'fallo' ? 'al fallo' : it.effort}
              {it.technique && <span className="text-ember"> · {it.technique}</span>}
              {it.pairWith && <span> · en par</span>}
            </div>
          </div>
          <span className="hidden text-[11px] uppercase tracking-wide text-muted sm:block">{CLASS_LABEL[it.exercise.cls]}</span>
          <span className="num text-xs text-muted">{mmss(it.seconds)}</span>
        </motion.li>
      ))}
      {day.skipped.length > 0 && <li className="px-1 pt-1 text-xs text-muted">Sin tiempo hoy: {day.skipped.map((s) => s.exercise.name).join(', ')}</li>}
    </ol>
  );
}

function WeekStrip({ doneDates, today }: { doneDates: Set<string>; today: Date }) {
  const routine = useApp((s) => s.routine);
  const overrides = useApp((s) => s.overrides);
  const monday = startOfWeek(today);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(monday, i));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const iso = isoDate(d);
        const s = routine.days.findIndex((r) => weekdayOf(r, overrides, d) === d.getDay());
        const done = doneDates.has(iso);
        const isToday = iso === isoDate(today);
        const past = parseIso(iso) < parseIso(isoDate(today));
        return (
          <div
            key={iso}
            className={`flex aspect-[3/4] flex-col items-center justify-between rounded-md border py-2 ${
              isToday ? 'border-ember' : 'border-line'
            } ${done ? 'bg-ember text-onember' : s >= 0 ? 'bg-raised/70' : 'bg-transparent'}`}
          >
            <span className={`text-[10px] font-medium uppercase ${done ? '' : 'text-muted'}`}>{WEEKDAY_SHORT[d.getDay()]}</span>
            <span className="num text-sm font-semibold">{d.getDate()}</span>
            <span className={`font-display text-[11px] font-bold ${done ? '' : s >= 0 ? (past ? 'text-muted line-through' : 'text-ember') : 'text-transparent'}`}>
              {s >= 0 ? `D${s + 1}` : '·'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
