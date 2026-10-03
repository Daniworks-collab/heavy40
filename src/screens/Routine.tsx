import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, GripVertical, Lock, Plus, Replace, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExercisePicker } from '@/components/ExercisePicker';
import { CoverageMatrix, TimeBar, VolumePanel, WarningList } from '@/components/PlanWidgets';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { EXERCISE_BY_ID } from '@/data/exercises';
import { CLASS_LABEL, MODE_BLURB, WEEKDAY_LONG } from '@/data/labels';
import { applyProposal, computePlan } from '@/engine/recalc';
import type { Mode, PrescribedDay, PrescribedExercise, Slot } from '@/engine/types';
import { mmss } from '@/lib/format';
import { engineConfig, useApp, useBudget, usePlan } from '@/store/app';

let uidCounter = 0;
const newUid = () => `s${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export default function Routine() {
  const plan = usePlan();
  const routine = useApp((s) => s.routine);
  const mode = useApp((s) => s.settings.mode);
  const changes = useApp((s) => s.changes);
  const updateRoutine = useApp((s) => s.updateRoutine);
  const setMode = useApp((s) => s.setMode);
  const dismissChange = useApp((s) => s.dismissChange);
  const [dayIdx, setDayIdx] = useState(0);
  const [picker, setPicker] = useState<{ mode: 'swap' | 'add'; slot?: Slot } | null>(null);
  const [optOpen, setOptOpen] = useState(false);

  const day = plan.days[dayIdx];
  const budget = useBudget();
  const dayPlan = routine.days[dayIdx];
  const usedIds = routine.days.flatMap((d) => d.slots.map((s) => s.exerciseId));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const editDay = (fn: (slots: Slot[]) => Slot[]) =>
    updateRoutine((r) => ({ days: r.days.map((d, i) => (i === dayIdx ? { ...d, name: null, slots: fn(d.slots) } : d)) }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    editDay((slots) => {
      const from = slots.findIndex((s) => s.uid === e.active.id);
      const to = slots.findIndex((s) => s.uid === e.over!.id);
      return arrayMove(slots, from, to);
    });
  };

  const lastChange = changes[0];

  return (
    <Page>
      <PageTitle eyebrow="Constructor · recálculo en vivo" title="Mi rutina" />

      <Rise className="mb-5">
        <Segmented<Mode>
          label="Modo de entrenamiento"
          value={mode}
          onChange={(m) => setMode(m)}
          options={[
            { value: 'puro', label: 'HD Puro' },
            { value: 'adaptado', label: 'Adaptado' },
            { value: 'fast40', label: 'Fast-40' }
          ]}
        />
        <p className="mt-2 text-sm text-muted">{MODE_BLURB[mode]}</p>
      </Rise>

      <AnimatePresence>
        {lastChange && Date.now() - new Date(lastChange.at).getTime() < 1000 * 60 * 60 * 6 && (
          <motion.div
            key={lastChange.at}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="relative rounded-2xl border border-ember/50 bg-ember/[0.07] p-4 pr-12" role="status" aria-live="polite">
              <div className="eyebrow mb-1.5 flex items-center gap-1.5 text-ember">
                <Sparkles size={13} /> Qué cambió y por qué
              </div>
              {lastChange.lines.map((l, i) => (
                <p key={i} className="text-[15px] leading-snug">
                  {l}
                </p>
              ))}
              <button onClick={dismissChange} className="absolute right-2 top-2 grid h-10 w-10 place-items-center text-muted" aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Rise className="mb-4">
            <Segmented<number>
              label="Día"
              value={dayIdx}
              onChange={setDayIdx}
              options={plan.days.map((d, i) => ({ value: i, label: `Día ${i + 1}`, sub: WEEKDAY_LONG[d.day.weekday] }))}
            />
          </Rise>

          <Rise className="card-forge p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="eyebrow">Día {dayIdx + 1}</div>
                <h2 className="h-display mt-1 text-3xl">{day.name}</h2>
              </div>
              {(day.overBudget || day.proposal || day.suggestion) && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setOptOpen(true)} className="btn-ember shrink-0 !min-h-[44px] !px-4 !text-base">
                  <Wand2 size={16} /> Optimizar
                </motion.button>
              )}
            </div>
            <TimeBar seconds={day.seconds} budget={budget} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                Fatiga <span className={`num ${day.fatigue > 24 ? 'text-ember' : 'text-fg'}`}>{day.fatigue}/24</span>
              </span>
              <span>
                Series efectivas <span className="num text-fg">{day.items.reduce((a, i) => a + i.workSets, 0)}</span>
              </span>
              <span>
                Calentamientos <span className="num text-fg">{day.items.reduce((a, i) => a + i.warmups.length, 0)}</span>
              </span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={dayPlan.slots.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                <ul className="mt-5 space-y-2">
                  {dayPlan.slots.map((slot) => (
                    <SlotRow
                      key={slot.uid}
                      slot={slot}
                      day={day}
                      onSwap={() => setPicker({ mode: 'swap', slot })}
                      onRemove={() => editDay((slots) => slots.filter((s) => s.uid !== slot.uid).map((s) => (s.preExhaustFor === slot.uid ? { ...s, preExhaustFor: undefined } : s)))}
                      onLock={(n) => editDay((slots) => slots.map((s) => (s.uid === slot.uid ? { ...s, lockedSets: n } : s)))}
                      onToggleOptional={() => editDay((slots) => slots.map((s) => (s.uid === slot.uid ? { ...s, optional: !s.optional } : s)))}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            <button onClick={() => setPicker({ mode: 'add' })} className="btn-ghost mt-3 w-full border-dashed">
              <Plus size={18} /> Agregar ejercicio
            </button>
          </Rise>
        </div>

        <div className="space-y-6">
          <Rise as="section">
            <SectionTitle>Alertas</SectionTitle>
            <WarningList warnings={plan.warnings} />
          </Rise>
          <Rise as="section" className="card p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="h-display text-2xl">Volumen semanal</h2>
              <span className="eyebrow">series efectivas</span>
            </div>
            <p className="mb-4 text-xs text-muted">Directo = 1, indirecto = 0.5. Franja verde: zona óptima. Con 40 min × 3 días el volumen es moderado; es el precio de sesiones cortas.</p>
            <VolumePanel weekly={plan.weekly} />
          </Rise>
          <Rise as="section" className="card p-5">
            <h2 className="h-display mb-3 text-2xl">Cobertura</h2>
            <CoverageMatrix coverage={plan.coverage} days={plan.days} />
          </Rise>
        </div>
      </div>

      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.mode === 'swap' ? 'Cambiar ejercicio' : 'Agregar ejercicio'}
        initialMuscle={picker?.slot ? EXERCISE_BY_ID[picker.slot.exerciseId]?.primary : 'todos'}
        exclude={usedIds}
        currentId={picker?.slot?.exerciseId}
        onSelect={(id) => {
          if (picker?.mode === 'swap' && picker.slot) {
            const uid = picker.slot.uid;
            editDay((slots) => slots.map((s) => (s.uid === uid ? { ...s, exerciseId: id, lockedSets: undefined } : s)));
          } else {
            editDay((slots) => [...slots, { uid: newUid(), exerciseId: id }]);
          }
          setPicker(null);
        }}
      />

      <OptimizeSheet open={optOpen} onClose={() => setOptOpen(false)} day={day} dayIdx={dayIdx} />
    </Page>
  );
}

function SlotRow({
  slot,
  day,
  onSwap,
  onRemove,
  onLock,
  onToggleOptional
}: {
  slot: Slot;
  day: PrescribedDay;
  onSwap: () => void;
  onRemove: () => void;
  onLock: (n: number | undefined) => void;
  onToggleOptional: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.uid });
  const item: PrescribedExercise | undefined = day.items.find((i) => i.uid === slot.uid);
  const skipped = day.skipped.find((i) => i.uid === slot.uid);
  const shown = item ?? skipped;
  const ex = shown?.exercise ?? EXERCISE_BY_ID[slot.exerciseId];
  const substituted = shown && shown.exercise.id !== slot.exerciseId;
  const [open, setOpen] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className={`relative overflow-hidden rounded-md border bg-surface ${isDragging ? 'border-ember shadow-2xl' : 'border-line'} ${!item ? 'opacity-60' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${item && item.priority >= 4 ? 'bg-ember' : 'bg-line2'}`} aria-hidden />
      <div className="flex items-center gap-2 p-2 pr-3">
        <button
          {...attributes}
          {...listeners}
          className="grid h-12 w-9 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
          aria-label={`Reordenar ${ex?.name}`}
        >
          <GripVertical size={18} />
        </button>
        <button className="min-w-0 flex-1 py-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{ex?.name}</span>
            {slot.lockedSets && <Lock size={12} className="shrink-0 text-ember" aria-label="Series fijadas" />}
          </div>
          <div className="text-xs text-muted">
            {item ? (
              <>
                <span className="text-fg">
                  {item.workSets}×{item.reps[0]}-{item.reps[1]}
                </span>{' '}
                · {item.effort === 'fallo' ? 'fallo' : item.effort} · {item.rest} s{item.warmups.length > 0 && ` · ${item.warmups.length} cal.`}
                {item.technique && <span className="text-ember"> · {item.technique}</span>}
                {item.pairWith && ' · par'}
              </>
            ) : skipped ? (
              'Opcional: no cabe hoy'
            ) : (
              'No disponible con tu equipo'
            )}
            {substituted && <span className="text-warn"> · sustituye a {EXERCISE_BY_ID[slot.exerciseId]?.name}</span>}
          </div>
        </button>
        <span className="num hidden text-xs text-muted sm:block">{item ? mmss(item.seconds) : '—'}</span>
        <button onClick={onSwap} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-fg" aria-label={`Cambiar ${ex?.name}`}>
          <Replace size={17} />
        </button>
      </div>
      {slot.preExhaustFor && (
        <div className="flex items-center gap-1.5 px-12 pb-2 text-[11px] text-ember">
          <ArrowDown size={12} /> pre-agotamiento: 15 s y al siguiente
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
              {ex && (
                <div className="text-xs text-muted">
                  {CLASS_LABEL[ex.cls]} · fatiga {ex.fatigue}/5 · {ex.safeFailure ? 'fallo seguro' : 'fallo sólo con seguros/ayudante'}
                  {item && ` · prioridad ${item.priority}/4`}
                </div>
              )}
              <div>
                <div className="eyebrow mb-1.5">Series efectivas</div>
                <div className="flex gap-2">
                  {[undefined, 1, 2, 3].map((n) => (
                    <button key={String(n)} data-on={slot.lockedSets === n} className="chip min-h-[40px] flex-1 justify-center" onClick={() => onLock(n)}>
                      {n === undefined ? 'Auto' : n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button data-on={!!slot.optional} className="chip min-h-[40px] flex-1 justify-center" onClick={onToggleOptional}>
                  {slot.optional ? 'Opcional (relleno)' : 'Fijo'}
                </button>
                <button onClick={onRemove} className="chip min-h-[40px] flex-1 justify-center !border-ember/40 !text-ember">
                  <Trash2 size={14} /> Quitar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function OptimizeSheet({ open, onClose, day, dayIdx }: { open: boolean; onClose: () => void; day: PrescribedDay; dayIdx: number }) {
  const s = useApp();
  const after = useMemo(() => {
    if (!day.proposal) return null;
    const r = applyProposal(s.routine, day.day.id, day.proposal.removeUid);
    return computePlan(r, s.profile, engineConfig(s.settings)).days[dayIdx];
  }, [day, s.routine, s.profile, s.settings, dayIdx]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Optimizar"
      eyebrow={`Día ${dayIdx + 1} · vista previa`}
      wide
      footer={
        day.proposal ? (
          <button
            className="btn-ember w-full"
            onClick={() => {
              s.optimize(day.day.id);
              onClose();
            }}
          >
            Aplicar cambio
          </button>
        ) : day.suggestion ? (
          <button
            className="btn-ember w-full"
            onClick={() => {
              s.updateRoutine((r) => ({
                days: r.days.map((d) => (d.id === day.day.id ? { ...d, name: null, slots: [...d.slots, { uid: newUid(), exerciseId: day.suggestion!.exerciseId }] } : d))
              }));
              onClose();
            }}
          >
            Añadir {EXERCISE_BY_ID[day.suggestion.exerciseId]?.name}
          </button>
        ) : undefined
      }
    >
      {day.proposal ? (
        <>
          <p className="mb-4 rounded-xl border border-line bg-raised/40 px-4 py-3 text-sm">{day.proposal.text}. Los recortes automáticos (calentamientos secundarios, descansos de aislamiento, series extra) no bastaron.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DayColumn title="Antes" day={day} highlight={day.proposal.removeUid} />
            {after && <DayColumn title="Después" day={after} />}
          </div>
        </>
      ) : day.suggestion ? (
        <p className="text-sm">{day.suggestion.text}. El motor no añade ejercicios por su cuenta: tú decides.</p>
      ) : (
        <p className="text-sm text-muted">Este día ya está optimizado.</p>
      )}
    </Sheet>
  );
}

function DayColumn({ title, day, highlight }: { title: string; day: PrescribedDay; highlight?: string }) {
  const budget = useBudget();
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-xl font-bold uppercase">{title}</span>
        <span className={`num text-sm font-semibold ${day.seconds > budget ? 'text-ember' : 'text-ok'}`}>{mmss(day.seconds)}</span>
      </div>
      <ul className="space-y-1 text-sm">
        {day.items.map((i) => (
          <li key={i.uid} className={`flex justify-between gap-2 ${i.uid === highlight ? 'text-ember line-through' : ''}`}>
            <span className="truncate">{i.exercise.name}</span>
            <span className="num shrink-0 text-muted">{i.workSets}×</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

