import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Ring } from '@/components/ui/Ring';
import { Stepper } from '@/components/ui/Stepper';
import { getExercise } from '@/data/exercises';
import { EQUIPMENT, EQUIPMENT_LABEL, JOINTS, JOINT_LABEL, LEVEL_LABEL, MODES, MODE_BLURB, MODE_LABEL, MUSCLES, MUSCLE_LABEL, WEEKDAY_SHORT } from '@/data/labels';
import { PRESET_BY_ID, SPLIT_PRESETS, customSplit, splitFromPreset, spreadWeekdays, type Split } from '@/data/splits';
import { FULL_GYM } from '@/data/templates';
import { calibrationLoad } from '@/engine/progression';
import { computePlan } from '@/engine/recalc';
import { spacingWarnings } from '@/engine/validate';
import type { Equipment, Joint, Level, Mode, Muscle, Profile } from '@/engine/types';
import { kg as fmtKg, mmss } from '@/lib/format';
import { DEFAULT_SETTINGS, engineConfig, useApp } from '@/store/app';

const PARQ = [
  '¿Algún médico te ha dicho que tienes un problema del corazón o de presión arterial?',
  '¿Sientes dolor en el pecho al hacer actividad física?',
  '¿Has perdido el equilibrio por mareos o el conocimiento en el último año?',
  '¿Tienes un problema óseo, articular o una lesión que empeore con el ejercicio?'
];

const PRESETS: { label: string; eq: Equipment[] }[] = [
  { label: 'Gimnasio completo', eq: FULL_GYM },
  { label: 'Mancuernas + banco + barra de dominadas', eq: ['mancuernas', 'banco', 'barra-dominadas', 'peso-corporal'] },
  { label: 'Sin equipo', eq: ['peso-corporal'] }
];

const CALIB = ['prensa-45', 'press-inclinado-mancuernas', 'jalon-neutro', 'peso-muerto-rumano', 'press-militar-mancuernas', 'sentadilla-hack'];

export function Onboarding() {
  const navigate = useNavigate();
  const complete = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [parq, setParq] = useState<boolean[]>(PARQ.map(() => false));
  const [ack, setAck] = useState(false);
  const [level, setLevel] = useState<Level>('intermedio');
  const [bw, setBw] = useState(78);
  const [choice, setChoice] = useState<string>('hd3');
  const [wds, setWds] = useState<number[]>([1, 3, 5]);
  const [customName, setCustomName] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>(FULL_GYM);
  const [injuries, setInjuries] = useState<Joint[]>([]);
  const [priorities, setPriorities] = useState<Muscle[]>([]);
  const [mode, setMode] = useState<Mode>('adaptado');
  const [minutesAvail, setMinutesAvail] = useState(40);
  const [calib, setCalib] = useState<Record<string, { kg: number; reps: number }>>({});

  const profile: Profile = { level, bodyweight: bw, equipment, injuries, priorities };
  const buildSplit = (): Split =>
    choice === 'custom'
      ? customSplit(customName || 'Mi split', wds.map((weekday) => ({ name: '', weekday })))
      : splitFromPreset(PRESET_BY_ID[choice], wds);
  const preview = useMemo(buildSplit, [choice, wds, customName]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(
    () =>
      computePlan(
        preview.routine,
        profile,
        engineConfig({ ...DEFAULT_SETTINGS, mode, sessionMinutes: minutesAvail }, { restRule: preview.restRule, distinctDays: preview.distinctDays })
      ),
    [preview, level, bw, equipment, injuries, priorities, mode, minutesAvail] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const pickSplit = (id: string, n?: number) => {
    setChoice(id);
    const days = id === 'custom' ? n ?? wds.length : PRESET_BY_ID[id].days;
    setWds(spreadWeekdays(days));
    if (id !== 'custom') setMode(PRESET_BY_ID[id].suggestedMode);
  };
  const dupDays = new Set(wds).size !== wds.length;

  const STEPS = 9;
  const go = (d: 1 | -1) => {
    setDir(d);
    setStep((s) => Math.max(0, Math.min(STEPS, s + d)));
  };
  const canNext = step !== 1 || ack;

  const finish = () => {
    const loads: Record<string, number> = {};
    for (const [id, v] of Object.entries(calib)) if (v.kg > 0 && v.reps > 0) loads[id] = calibrationLoad(getExercise(id), v.kg, v.reps).load;
    complete({ profile, mode, weekdays: wds, loads, sessionMinutes: minutesAvail, split: buildSplit() });
    navigate('/', { replace: true });
  };

  let body: ReactNode;
  switch (step) {
    case 0:
      body = (
        <div className="relative flex min-h-[60dvh] flex-col justify-center">
          <div className="pointer-events-none absolute -inset-x-4 -top-10 bottom-0 grid-bg" aria-hidden />
          <span aria-hidden className="text-outline pointer-events-none absolute -right-6 top-0 select-none font-display text-[260px] font-black leading-none">
            40
          </span>
          <motion.div className="relative" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <Logo size={64} />
          </motion.div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="h-display relative mt-6 text-[56px] leading-[0.9]">
            Tu split.
            <br />
            Tu tiempo.
            <br />
            <span className="text-ember">Tu forja.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="relative mt-5 max-w-sm text-muted">
            Entrena hipertrofia con el split que quieras (Heavy Duty, PPL, Torso/Pierna, Full Body o el tuyo) en el tiempo que tengas. Una rutina que se recalcula sola cada vez que la cambias.
          </motion.p>
        </div>
      );
      break;
    case 1:
      body = (
        <Step eyebrow="Antes de empezar" title="Aptitud">
          <p className="mb-4 text-sm text-muted">Responde con honestidad. Entrenar al fallo es exigente.</p>
          <div className="space-y-2">
            {PARQ.map((q, i) => (
              <div key={q} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <span className="flex-1 text-sm">{q}</span>
                <div className="flex shrink-0 gap-1">
                  {[false, true].map((v) => (
                    <button
                      key={String(v)}
                      aria-pressed={parq[i] === v}
                      onClick={() => setParq(parq.map((p, j) => (j === i ? v : p)))}
                      className={`min-h-[44px] min-w-[52px] rounded-lg border text-sm ${parq[i] === v ? (v ? 'border-warn bg-warn/20' : 'border-ember bg-ember text-onember') : 'border-line text-muted'}`}
                    >
                      {v ? 'Sí' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {parq.some(Boolean) && (
            <p className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
              Respondiste "sí" al menos una vez: consulta a un médico antes de entrenar al fallo.
            </p>
          )}
          <button onClick={() => setAck(!ack)} aria-pressed={ack} className="mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line px-4 text-left text-sm">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${ack ? 'border-ember bg-ember text-onember' : 'border-line2'}`}>{ack && <Check size={16} />}</span>
            Entiendo que HEAVY·40 no sustituye consejo médico y que usaré seguros o ayudante al ir al fallo con barra libre.
          </button>
        </Step>
      );
      break;
    case 2:
      body = (
        <Step eyebrow="Tú" title="Nivel y peso">
          <div className="grid gap-2">
            {(['principiante', 'intermedio', 'avanzado'] as Level[]).map((l) => (
              <Choice key={l} on={level === l} onClick={() => setLevel(l)} title={LEVEL_LABEL[l]} sub={l === 'principiante' ? '< 1 año constante' : l === 'intermedio' ? '1-3 años' : '3+ años · habilita peso muerto convencional'} />
            ))}
          </div>
          <div className="mt-6">
            <Stepper label="Peso corporal" unit="kg" value={bw} onChange={setBw} step={0.5} min={35} max={250} big />
          </div>
        </Step>
      );
      break;
    case 3:
      body = (
        <Step eyebrow="Agenda" title="Tu tiempo">
          <div className="mb-6">
            <div className="mb-2 font-medium">¿Cuánto tiempo tienes por sesión?</div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Minutos por sesión">
              {[30, 40, 45, 60].map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={minutesAvail === m}
                  onClick={() => setMinutesAvail(m)}
                  className={`press num min-h-[56px] rounded-md border text-lg font-semibold ${minutesAvail === m ? 'border-ember bg-ember text-onember' : 'border-line text-muted'}`}
                >
                  {m}′
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Lo puedes cambiar en Ajustes o el día que entrenes; la rutina se ajusta para caber.</p>
          </div>
          <div className="mb-2 font-medium">Tu split</div>
          <div className="grid gap-1.5" role="radiogroup" aria-label="Split">
            {SPLIT_PRESETS.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={choice === p.id}
                onClick={() => pickSplit(p.id)}
                className={`press flex min-h-[52px] items-center justify-between gap-3 rounded-md border px-4 text-left ${choice === p.id ? 'border-ember bg-ember/10' : 'border-line'}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="num shrink-0 text-xs text-muted">{p.days} días</span>
              </button>
            ))}
            <button
              role="radio"
              aria-checked={choice === 'custom'}
              onClick={() => pickSplit('custom', 4)}
              className={`press flex min-h-[52px] items-center justify-between gap-3 rounded-md border border-dashed px-4 text-left ${choice === 'custom' ? 'border-ember bg-ember/10' : 'border-line2'}`}
            >
              <span className="font-medium">Personalizado: lo armo yo</span>
              <span className="text-xs text-muted">1-7 días</span>
            </button>
          </div>
          {choice === 'custom' && (
            <div className="mt-4 space-y-3 rounded-md border border-line p-3">
              <input className="field" placeholder="Nombre de tu split" maxLength={40} value={customName} onChange={(e) => setCustomName(e.target.value)} aria-label="Nombre de tu split" />
              <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Días por semana">
                {[1, 2, 3, 4, 5, 6, 7].map((k) => (
                  <button
                    key={k}
                    role="radio"
                    aria-checked={wds.length === k}
                    onClick={() => setWds(spreadWeekdays(k))}
                    className={`press num min-h-[44px] rounded-md border font-semibold ${wds.length === k ? 'border-ember bg-ember text-onember' : 'border-line text-muted'}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">Nombras cada día y agregas sus ejercicios después, en Mi rutina.</p>
            </div>
          )}
          <div className="mb-2 mt-5 font-medium">¿Qué días?</div>
          <div className="space-y-2">
            {wds.map((wd, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted">
                  {choice === 'custom' || choice === 'hd3' ? `Día ${i + 1}` : PRESET_BY_ID[choice].plan[i]?.name}
                </span>
                <div className="grid flex-1 grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 0].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWds(wds.map((x, j) => (j === i ? w : x)))}
                      aria-pressed={wd === w}
                      aria-label={`${WEEKDAY_SHORT[w]} para el día ${i + 1}`}
                      className={`press min-h-[40px] rounded-sm border text-[11px] font-semibold ${wd === w ? 'border-ember bg-ember text-onember' : wds.includes(w) ? 'border-line text-muted/40' : 'border-line text-muted'}`}
                    >
                      {WEEKDAY_SHORT[w].slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {dupDays && <p className="mt-2 text-sm text-warn">Dos días caen el mismo día de la semana.</p>}
          {choice === 'hd3' &&
            spacingWarnings(wds).map((w) => (
              <p key={w.text} className="mt-2 text-sm text-warn">
                {w.text}
              </p>
            ))}
        </Step>
      );
      break;
    case 4:
      body = (
        <Step eyebrow="Material" title="Equipo">
          <div className="grid gap-2">
            {PRESETS.map((p) => (
              <Choice key={p.label} on={p.eq.length === equipment.length && p.eq.every((e) => equipment.includes(e))} onClick={() => setEquipment(p.eq)} title={p.label} />
            ))}
          </div>
          <div className="eyebrow mb-2 mt-5">Ajuste fino</div>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.filter((e) => e !== 'peso-corporal').map((e) => (
              <button key={e} data-on={equipment.includes(e)} className="chip min-h-[44px]" onClick={() => setEquipment(equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e])}>
                {EQUIPMENT_LABEL[e]}
              </button>
            ))}
          </div>
        </Step>
      );
      break;
    case 5:
      body = (
        <Step eyebrow="Cuidado" title="Lesiones">
          <p className="mb-4 text-sm text-muted">Marca zonas con molestias. Se excluyen los ejercicios que las cargan y el motor busca alternativas.</p>
          <div className="grid grid-cols-2 gap-2">
            {JOINTS.map((j) => (
              <Choice key={j} on={injuries.includes(j)} onClick={() => setInjuries(injuries.includes(j) ? injuries.filter((x) => x !== j) : [...injuries, j])} title={JOINT_LABEL[j]} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{injuries.length === 0 ? 'Ninguna marcada.' : `${injuries.length} zona(s) protegida(s).`}</p>
        </Step>
      );
      break;
    case 6:
      body = (
        <Step eyebrow="Enfoque" title="Prioridades">
          <p className="mb-4 text-sm text-muted">Hasta 2 músculos. Reciben series extra antes que el resto cuando sobra tiempo.</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => (
              <button
                key={m}
                data-on={priorities.includes(m)}
                className="chip min-h-[48px] px-4 text-sm"
                onClick={() => setPriorities(priorities.includes(m) ? priorities.filter((x) => x !== m) : [...priorities, m].slice(-2))}
              >
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
        </Step>
      );
      break;
    case 7:
      body = (
        <Step eyebrow="Filosofía" title="Modo">
          <div className="grid gap-2">
            {MODES.map((m) => (
              <Choice
                key={m}
                on={mode === m}
                onClick={() => setMode(m)}
                title={`${MODE_LABEL[m]}${choice !== 'custom' && PRESET_BY_ID[choice].suggestedMode === m ? ' · recomendado para tu split' : ''}`}
                sub={m === 'custom' ? `${MODE_BLURB[m]} Lo ajustas en Mi rutina.` : MODE_BLURB[m]}
              />
            ))}
          </div>
        </Step>
      );
      break;
    case 8:
      body = (
        <Step eyebrow="Opcional" title="Calibración">
          <p className="mb-4 text-sm text-muted">
            Escribe una serie reciente (carga × reps). Calculamos la carga para ~6 reps estrictas al fallo (tren superior) u 8 (inferior). Puedes saltarlo y calibrar en tu primera sesión.
          </p>
          <div className="space-y-2">
            {CALIB.map((id) => {
              const ex = getExercise(id);
              const v = calib[id] ?? { kg: 0, reps: 0 };
              const res = v.kg > 0 && v.reps > 0 ? calibrationLoad(ex, v.kg, v.reps) : null;
              return (
                <div key={id} className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{ex.name}</span>
                    {res && (
                      <span className="num shrink-0 text-sm text-ember">
                        → {fmtKg(res.load)} kg × {res.target}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input className="field num" inputMode="decimal" placeholder="kg" aria-label={`Carga ${ex.name}`} value={v.kg || ''} onChange={(e) => setCalib({ ...calib, [id]: { ...v, kg: parseFloat(e.target.value.replace(',', '.')) || 0 } })} />
                    <input className="field num" inputMode="numeric" placeholder="reps" aria-label={`Repeticiones ${ex.name}`} value={v.reps || ''} onChange={(e) => setCalib({ ...calib, [id]: { ...v, reps: parseInt(e.target.value, 10) || 0 } })} />
                  </div>
                </div>
              );
            })}
          </div>
        </Step>
      );
      break;
    default:
      body = (
        <Step eyebrow="Tu rutina está lista" title="A forjar">
          <div className="grid gap-2">
            {plan.days.map((d, i) => (
              <motion.div key={d.day.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="card flex items-center gap-4 p-4">
                <Ring value={d.seconds / (minutesAvail * 60)} size={68} stroke={6} ticks={20} label={`${Math.round(d.seconds / 60)} minutos`}>
                  <span className="num text-sm font-semibold">{Math.round(d.seconds / 60)}′</span>
                </Ring>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold uppercase text-ember">
                    Día {i + 1} · {WEEKDAY_SHORT[d.day.weekday]}
                  </div>
                  <div className="font-display text-xl font-bold uppercase leading-tight">{d.name}</div>
                  <div className="text-xs text-muted">
                    {d.items.length} ejercicios · {d.items.reduce((a, x) => a + x.workSets, 0)} series efectivas · {mmss(d.seconds)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {plan.warnings.filter((w) => w.severity !== 'info').length > 0 && (
            <p className="mt-3 text-sm text-warn">{plan.warnings.filter((w) => w.severity !== 'info').length} alerta(s): revísalas en Mi rutina.</p>
          )}
        </Step>
      );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(env(safe-area-inset-top),16px)]">
      {step > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => go(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-line" aria-label="Atrás">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-1 gap-1" aria-label={`Paso ${step} de ${STEPS}`}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span className="block h-full bg-ember" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 flex gap-2 bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
        {step === 8 && (
          <button className="btn-ghost flex-1" onClick={() => go(1)}>
            Saltar
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!canNext || (step === 3 && (dupDays || (choice === 'custom' && !customName.trim())))}
          onClick={() => (step === STEPS ? finish() : go(1))}
          className="btn-ember min-h-[60px] flex-[2] text-xl"
        >
          {step === 0 ? 'Empezar' : step === STEPS ? 'Entrar' : 'Siguiente'} <ArrowRight size={20} />
        </motion.button>
      </div>
    </div>
  );
}

function Step({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h1 className="h-display mb-5 text-6xl">{title}</h1>
      {children}
    </div>
  );
}

function Choice({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${on ? 'border-ember bg-ember/10' : 'border-line hover:border-line2'}`}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? 'border-ember bg-ember text-onember' : 'border-line2'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
      <span>
        <span className="block font-medium">{title}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
    </motion.button>
  );
}
