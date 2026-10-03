import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ChevronDown, ChevronRight, Flame, Moon, Play, ShieldCheck, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReadinessSheet } from '@/components/Readiness';
import { Logo } from '@/components/ui/Logo';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Page, Rise } from '@/components/ui/Page';
import { Ring } from '@/components/ui/Ring';
import { Skeleton } from '@/components/ui/Skeleton';
import { db, useLive as useDexie } from '@/db';
import { CLASS_LABEL, MODE_LABEL, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/data/labels';
import { deloadDue, isStalled } from '@/engine/progression';
import { getExercise } from '@/data/exercises';
import type { PrescribedDay } from '@/engine/types';
import { useMedia } from '@/hooks/useMedia';
import { useNow } from '@/hooks/useNow';
import { useSessions } from '@/hooks/useSessions';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { addDays, isoDate, parseIso, shortDate, startOfWeek } from '@/lib/dates';
import { mmss } from '@/lib/format';
import { hoursSinceLast, nextSession, sessionOn, streakWeeks, weekdayOf, weeksSince } from '@/lib/schedule';
import { isDeloadWeek, useActiveSplit, useApp, useBudget, usePlan } from '@/store/app';
import { rankFor, totalXp } from '@/lib/rank';
import { RankChip } from '@/components/Rank';
import { RevealText } from '@/components/Motion';
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
  const budget = useBudget();
  const sessionMinutes = Math.round(budget / 60);
  const scheduleDeload = useApp((s) => s.scheduleDeload);
  const perWeek = routine.days.length;
  const split = useActiveSplit();
  const streak = streakWeeks(sessions ?? [], today, perWeek);
  // Estancamiento: ejercicios de la rutina sin mejorar su mejor e1RM en 3 sesiones
  const stalled = useMemo(() => {
    if (!sessions) return [] as string[];
    const ids = [...new Set(plan.days.flatMap((d) => d.items.filter((i) => i.priority >= 3).map((i) => i.exercise.id)))];
    return ids.filter((id) => isStalled(sessions.map((x) => ({ date: x.date, sets: x.sets.filter((y) => y.exerciseId === id) })).filter((h) => h.sets.length)));
  }, [sessions, plan]);
  const rank = useMemo(() => rankFor(totalXp(sessions ?? [], perWeek)), [sessions, perWeek]);
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
  const restDay = !isTrainingToday && !pick;
  const message = motivation({ doneToday: doneToday && !pick, isTrainingToday: isTrainingToday || !!pick, thisWeek: streak.thisWeek, perWeek, weeks: streak.weeks, toNext: rank.toNext, nextRank: rank.next?.name, dayName: featured.name });
  const alerts: { tone: 'warn' | 'ember'; node: React.ReactNode }[] = [];
  if (since !== undefined && since < 48 && split?.restRule === 'sesion')
    alerts.push({ tone: 'warn', node: <>Han pasado <span className="num">{Math.round(since)} h</span> desde tu última sesión. Tu split pide ≥48 h entre sesiones.</> });
  if (deloadNow) alerts.push({ tone: 'ember', node: 'Semana de descarga: −40 % de series, −10 % de carga, sin fallo.' });
  if (stalled.length >= 2 && !deloadNow)
    alerts.push({
      tone: 'ember',
      node: (
        <>
          Sin mejorar en 3 sesiones: {stalled.slice(0, 3).map((id) => getExercise(id).name).join(', ')}.{' '}
          <button className="font-semibold text-ember underline underline-offset-2" onClick={() => scheduleDeload(isoDate(addDays(startOfWeek(today), 7)))}>
            Programar descarga
          </button>
        </>
      )
    });
  if (deload.due && !deloadNow)
    alerts.push({
      tone: 'ember',
      node: (
        <>
          {deload.reason}.{' '}
          <Link to="/calendario" className="font-semibold text-ember underline underline-offset-2">
            Planificar descarga
          </Link>
        </>
      )
    });

  return (
    <Page>
      <Rise as="header" className="mb-5 flex items-center justify-between">
        <div className="lg:hidden">
          <Logo size={26} />
        </div>
        <div className="eyebrow hidden lg:block">
          {WEEKDAY_LONG[today.getDay()]} · {shortDate(today)}
        </div>
        <Link to="/progreso" aria-label="Ver rango y medallas">
          <RankChip state={rank} />
        </Link>
      </Rise>

      <Rise className="mb-4">
        <p className="eyebrow">{greeting(today)}</p>
        <p className="mt-1 font-display text-[22px] font-bold uppercase leading-tight tracking-wide">
          <RevealText text={message} />
        </p>
      </Rise>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* ───── Lo esencial: el entrenamiento de hoy ───── */}
        <Rise as="section" className="card-forge overflow-hidden p-5 lg:p-7">
          <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
          <div className="beam" aria-hidden />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ember/15 blur-3xl" aria-hidden />
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
              <h1 className="h-display mt-1 text-[clamp(32px,10.5vw,44px)] sm:text-5xl lg:text-[40px] 2xl:text-5xl">
                {(featured.name || `Día ${dayIndex + 1}`).split(' · ').map((p, i) => (
                  <span key={i} className="block">
                    {p}
                  </span>
                ))}
              </h1>
            </div>
            <Ring value={featured.seconds / budget} size={wide ? 124 : 100} stroke={wide ? 9 : 8} label={`${Math.round(featured.seconds / 60)} de ${sessionMinutes} minutos`}>
              <div className="text-center leading-none">
                <NumberTicker value={Math.round(featured.seconds / 60)} className={`block font-semibold ${wide ? 'text-4xl' : 'text-3xl'}`} />
                <span className="eyebrow !text-[10px]">/{sessionMinutes} min</span>
              </div>
            </Ring>
          </div>

          <p className="relative mt-4 text-[15px] text-muted">
            <span className="num font-semibold text-fg">{featured.items.length}</span> ejercicios ·{' '}
            <span className="num font-semibold text-fg">{totalSets}</span> series efectivas · {MODE_LABEL[mode]}
          </p>

          {restDay && nextAt && (
            <div className="relative mt-4 flex items-baseline justify-between gap-3 rounded-md border border-line bg-bg/60 px-4 py-3">
              <span className="eyebrow">Faltan</span>
              <span className="num text-2xl font-semibold tracking-tight">{countdown(nextAt.getTime() - now)}</span>
            </div>
          )}

          <div className="relative mt-5">
            {liveActive ? (
              <Link to="/entrenar" className="btn-ember min-h-[72px] w-full text-2xl">
                <Play size={22} fill="currentColor" /> Continuar sesión
              </Link>
            ) : featured.items.length === 0 ? (
              <Link to="/rutina" className="btn-ember min-h-[72px] w-full text-xl">
                Agregar ejercicios a este día
              </Link>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} className="btn-ember min-h-[72px] w-full text-[clamp(19px,5.6vw,26px)]" onClick={() => setReadyOpen(true)}>
                <Play size={24} fill="currentColor" /> {restDay ? 'Entrenar de todos modos' : 'Iniciar entrenamiento'}
              </motion.button>
            )}
          </div>
        </Rise>

        <div className="space-y-4">
          {/* ───── Racha semanal ───── */}
          <Rise as="section" className="card p-5">
            <div className="flex items-center gap-4">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-md bg-ember/15">
                <Flame size={30} className={streak.weeks > 0 ? 'text-ember' : 'text-muted'} aria-hidden />
                <span className="num absolute -bottom-1.5 -right-1.5 grid h-7 min-w-[28px] place-items-center rounded-sm bg-ember px-1 text-sm font-bold text-onember">{streak.weeks}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="eyebrow">Racha semanal</div>
                <div className="font-display text-2xl font-black uppercase leading-tight">
                  {streak.weeks} {streak.weeks === 1 ? 'semana' : 'semanas'}
                </div>
                <div className="text-sm text-muted">
                  {streak.thisWeek >= perWeek
                    ? 'Semana cerrada. Bien forjado.'
                    : `Esta semana ${streak.thisWeek}/${perWeek} · te ${perWeek - streak.thisWeek === 1 ? 'falta' : 'faltan'} ${perWeek - streak.thisWeek}`}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <WeekStrip doneDates={doneDates} today={today} />
            </div>
          </Rise>

          {/* ───── Lo demás, a un toque ───── */}
          {alerts.length > 0 && (
            <Disclosure title={`Avisos (${alerts.length})`} tone="warn">
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className={`${a.tone === 'warn' ? 'hazard' : 'hazard-ember'} flex gap-2 py-2.5 pr-3 text-sm`}>
                    {a.tone === 'warn' ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden /> : <Zap size={16} className="mt-0.5 shrink-0 text-ember" aria-hidden />}
                    <span>{a.node}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
          <Disclosure title={`La sesión · ${featured.items.length} ejercicios`} right={<Link to="/rutina" className="text-sm text-muted hover:text-fg">Editar</Link>}>
            {sessions === undefined ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <SessionList day={featured} />
            )}
          </Disclosure>
          <Disclosure title="Tiempo y carga">
            <PlanBar day={featured} budget={budget} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Ejercicios" value={featured.items.length} />
              <Stat label="Series efectivas" value={totalSets} />
              <Stat label="Fatiga" value={featured.fatigue} suffix="/24" />
            </div>
          </Disclosure>
          <Disclosure title="Entrenar otro día">
            <div className="flex flex-wrap gap-2">
              {plan.days.map((d, i) => (
                <button key={d.day.id} data-on={d.day.id === featuredId} className="chip min-h-[48px]" onClick={() => setPick(d.day.id === featuredId && pick ? null : d.day.id)}>
                  Día {i + 1} · {d.name || WEEKDAY_SHORT[d.day.weekday]}
                </button>
              ))}
            </div>
            <Link to="/splits" className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-muted hover:text-fg">
              Split: {split?.name ?? 'Mi split'} <ChevronRight size={14} aria-hidden />
            </Link>
          </Disclosure>
        </div>
      </div>

      <ReadinessSheet
        open={readyOpen}
        onClose={() => setReadyOpen(false)}
        defaultMinutes={sessionMinutes}
        hoursSince={split?.restRule === 'sesion' ? since : undefined}
        onDone={(r, minutes) => {
          setReadyOpen(false);
          void startWorkout(featured.day.id, r, minutes);
        }}
      />
    </Page>
  );
}

function greeting(d: Date): string {
  const h = d.getHours();
  const part = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${part} · ${WEEKDAY_LONG[d.getDay()]} ${shortDate(d)}`;
}

/** Mensaje motivador según el estado de la semana (sin presión excesiva). */
function motivation(o: { doneToday: boolean; isTrainingToday: boolean; thisWeek: number; perWeek: number; weeks: number; toNext: number; nextRank?: string; dayName: string }): string {
  if (o.doneToday) return 'Trabajo hecho. Ahora come, duerme y crece.';
  if (o.isTrainingToday) {
    if (o.thisWeek + 1 === o.perWeek) return 'Hoy cierras la semana. Remátala.';
    if (o.toNext > 0 && o.toNext <= 250 && o.nextRank) return `Estás a ${o.toNext} XP de ${o.nextRank}. Hoy lo alcanzas.`;
    if (o.weeks >= 2) return `${o.weeks} semanas seguidas. Hoy suma otra.`;
    return 'Hoy toca forjar. Una serie a la vez.';
  }
  if (o.thisWeek >= o.perWeek) return 'Semana completa. Descansa con orgullo.';
  return 'Día de descanso: aquí es donde creces.';
}

/** Sección colapsable: lo secundario queda a un toque. */
function Disclosure({ title, children, right, tone }: { title: string; children: React.ReactNode; right?: React.ReactNode; tone?: 'warn' }) {
  const [open, setOpen] = useState(false);
  return (
    <Rise as="section" className="card overflow-hidden">
      <div className="flex items-center gap-2 pr-4">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="press flex min-h-[60px] flex-1 items-center gap-3 px-5 text-left">
          {tone === 'warn' && <span className="h-2 w-2 shrink-0 animate-ember rounded-full bg-warn" aria-hidden />}
          <span className="flex-1 font-display text-lg font-bold uppercase tracking-wide">{title}</span>
          <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {right}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Rise>
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

/** Tiempo disponible segmentado: cada bloque es un ejercicio, a escala. */
function PlanBar({ day, budget }: { day: PrescribedDay; budget: number }) {
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
    <div className="relative mt-6" role="img" aria-label={`Presupuesto: ${mmss(day.seconds)} de ${mmss(budget)} en ${day.items.length} ejercicios`}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="eyebrow">Tiempo {mmss(budget)}</span>
        <span className={`num text-xs ${day.seconds > budget ? 'text-ember' : 'text-muted'}`}>
          {mmss(day.seconds)} · libre {mmss(Math.max(0, budget - day.seconds))}
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
            style={{ width: `${(sg.sec / Math.max(budget, day.seconds)) * 100}%`, transformOrigin: 'bottom' }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted" aria-hidden>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{Math.round((budget / 60) * f)}</span>
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
          transition={{ delay: 0.04 + i * 0.03, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
