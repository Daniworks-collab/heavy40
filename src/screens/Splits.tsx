import { motion } from 'framer-motion';
import { Check, Copy, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { MODE_LABEL, WEEKDAY_SHORT } from '@/data/labels';
import { SPLIT_PRESETS, customSplit, spreadWeekdays, splitFromPreset, type Split, type SplitPreset } from '@/data/splits';
import { useApp } from '@/store/app';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function Splits() {
  const splits = useApp((s) => s.splits);
  const activeId = useApp((s) => s.activeSplitId);
  const routine = useApp((s) => s.routine);
  const activate = useApp((s) => s.activateSplit);
  const duplicate = useApp((s) => s.duplicateSplit);
  const remove = useApp((s) => s.deleteSplit);
  const navigate = useNavigate();
  const [preset, setPreset] = useState<SplitPreset | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Split | null>(null);
  const [deleting, setDeleting] = useState<Split | null>(null);

  const active = splits.find((x) => x.id === activeId) ?? splits[0];

  return (
    <Page>
      <PageTitle eyebrow="Cómo organizas tu semana" title="Splits" />

      {/* ───── Split activo ───── */}
      <Rise as="section" className="card-forge overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="relative">
          <div className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-ember rounded-full bg-ember" aria-hidden /> Split activo
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="h-display text-[40px] leading-[0.9]">{active.name}</h2>
            <button onClick={() => setRenaming(active)} className="press grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line text-muted" aria-label={`Renombrar ${active.name}`}>
              <Pencil size={16} />
            </button>
          </div>
          <div className="mt-1 text-sm text-muted">
            {routine.days.length} {routine.days.length === 1 ? 'día' : 'días'} por semana · {active.restRule === 'sesion' ? 'descanso ≥48 h entre sesiones' : 'descanso ≥48 h por músculo'}
            {active.custom && ' · personalizado'}
          </div>
          <ol className="mt-4 grid gap-1.5">
            {routine.days.map((d, i) => (
              <li key={d.id} className="flex items-center gap-3 rounded-md border border-line bg-bg/50 px-3 py-2">
                <span className="w-9 font-display text-sm font-black text-ember">{WEEKDAY_SHORT[d.weekday]}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{d.name ?? `Día ${i + 1}`}</span>
                <span className="num text-xs text-muted">{d.slots.length} ej.</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ember" onClick={() => navigate('/rutina')}>
              <Dumbbell size={16} /> Ejercicios
            </button>
            <button className="btn-ghost" onClick={() => duplicate(active.id)}>
              <Copy size={16} /> Duplicar
            </button>
          </div>
        </div>
      </Rise>

      {/* ───── Mis splits ───── */}
      {splits.length > 1 && (
        <Rise as="section">
          <SectionTitle index="01">Mis splits</SectionTitle>
          <ul className="space-y-2">
            {splits
              .filter((x) => x.id !== activeId)
              .map((x) => (
                <li key={x.id} className="flex items-center gap-2 rounded-md border border-line bg-surface/70 p-2 pl-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{x.name}</div>
                    <div className="text-xs text-muted">
                      {x.routine.days.length} días · {x.routine.days.map((d) => WEEKDAY_SHORT[d.weekday]).join(' ')}
                    </div>
                  </div>
                  <button onClick={() => activate(x.id)} className="press min-h-[44px] rounded-md bg-ember px-3 font-display text-sm font-bold uppercase text-onember">
                    Usar
                  </button>
                  <button onClick={() => setRenaming(x)} className="press grid h-11 w-11 place-items-center rounded-md border border-line text-muted" aria-label={`Renombrar ${x.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleting(x)} className="press grid h-11 w-11 place-items-center rounded-md border border-line text-ember" aria-label={`Eliminar ${x.name}`}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
          </ul>
        </Rise>
      )}

      {/* ───── Personalizado ───── */}
      <Rise as="section">
        <SectionTitle index="02">Personalizado</SectionTitle>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setCreating(true)}
          className="card flex min-h-[88px] w-full items-center gap-4 border-dashed px-5 text-left hover:border-ember"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ember text-onember">
            <Plus size={24} aria-hidden />
          </span>
          <span>
            <span className="block font-display text-2xl font-black uppercase leading-none">Crear mi split</span>
            <span className="text-sm text-muted">Ponle nombre, elige cuántos días, nombra cada día y arma sus ejercicios.</span>
          </span>
        </motion.button>
      </Rise>

      {/* ───── Prearmados ───── */}
      <Rise as="section">
        <SectionTitle index="03">Prearmados</SectionTitle>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SPLIT_PRESETS.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button onClick={() => setPreset(p)} className="card press flex h-full w-full flex-col p-4 text-left hover:border-line2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-2xl font-black uppercase leading-none">{p.name}</span>
                  <span className="num shrink-0 rounded-sm bg-ember px-1.5 py-0.5 text-xs font-semibold text-onember">{p.days}d</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{p.desc}</p>
                <div className="mt-auto pt-3 text-[11px] uppercase tracking-wider text-muted">Estilo sugerido: {MODE_LABEL[p.suggestedMode]}</div>
              </button>
            </motion.li>
          ))}
        </ul>
      </Rise>

      <PresetSheet preset={preset} onClose={() => setPreset(null)} onDone={() => navigate('/rutina')} />
      <CreateSheet open={creating} onClose={() => setCreating(false)} onDone={() => navigate('/rutina')} />
      <RenameSheet split={renaming} onClose={() => setRenaming(null)} />
      <Sheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="¿Eliminar split?"
        eyebrow={deleting?.name}
        footer={
          <button
            className="btn-ember w-full"
            onClick={() => {
              if (deleting) remove(deleting.id);
              setDeleting(null);
            }}
          >
            Eliminar
          </button>
        }
      >
        <p className="text-sm text-muted">Se borra la estructura y sus ejercicios. Tu historial de entrenamientos no se toca.</p>
      </Sheet>
    </Page>
  );
}

function WeekdayPicker({ value, onChange, taken }: { value: number; onChange: (wd: number) => void; taken: number[] }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Día de la semana">
      {WEEK.map((wd) => {
        const on = value === wd;
        const busy = !on && taken.includes(wd);
        return (
          <button
            key={wd}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(wd)}
            className={`press min-h-[44px] rounded-md border text-xs font-semibold ${
              on ? 'border-ember bg-ember text-onember' : busy ? 'border-line text-muted/50 line-through' : 'border-line text-muted'
            }`}
          >
            {WEEKDAY_SHORT[wd]}
          </button>
        );
      })}
    </div>
  );
}

function PresetSheet({ preset, onClose, onDone }: { preset: SplitPreset | null; onClose: () => void; onDone: () => void }) {
  const mode = useApp((s) => s.settings.mode);
  const addSplit = useApp((s) => s.addSplit);
  const [wds, setWds] = useState<number[]>([]);
  const [useStyle, setUseStyle] = useState(true);
  useEffect(() => {
    if (preset) {
      setWds(spreadWeekdays(preset.days));
      setUseStyle(true);
    }
  }, [preset]);
  if (!preset) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const dup = new Set(wds).size !== wds.length;
  const names = preset.id === 'hd3' ? ['Pecho · Cuádriceps · Dorsal', 'Espalda · Femorales · Hombro', 'Cuádriceps · Pecho · Brazos'] : preset.plan.map((d) => d.name);
  return (
    <Sheet
      open={!!preset}
      onClose={onClose}
      title={preset.name}
      eyebrow={`${preset.days} días por semana`}
      footer={
        <button
          className="btn-ember w-full"
          disabled={dup}
          onClick={() => {
            addSplit(splitFromPreset(preset, wds), { mode: useStyle && preset.suggestedMode !== mode ? preset.suggestedMode : undefined });
            onClose();
            onDone();
          }}
        >
          <Check size={18} /> Usar este split
        </button>
      }
    >
      <p className="text-sm text-muted">{preset.desc}</p>
      <div className="mt-4 space-y-3">
        {names.map((n, i) => (
          <div key={i}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-display text-lg font-bold uppercase">{n}</span>
              {preset.plan[i] && <span className="text-xs text-muted">{preset.plan[i].ex.length} ejercicios</span>}
            </div>
            <WeekdayPicker value={wds[i]} taken={wds} onChange={(wd) => setWds(wds.map((x, j) => (j === i ? wd : x)))} />
          </div>
        ))}
        {dup && <p className="text-sm text-warn">Dos días caen el mismo día de la semana.</p>}
      </div>
      {preset.suggestedMode !== mode && (
        <div className="mt-4 rounded-md border border-line px-4">
          <Toggle
            label={`Usar estilo ${MODE_LABEL[preset.suggestedMode]}`}
            sub={`Ahora usas ${MODE_LABEL[mode]}. Puedes cambiarlo cuando quieras.`}
            on={useStyle}
            onChange={setUseStyle}
          />
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Se guarda como un split nuevo; tus otros splits y tu historial se conservan.</p>
    </Sheet>
  );
}

function CreateSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const addSplit = useApp((s) => s.addSplit);
  const [name, setName] = useState('');
  const [n, setN] = useState(4);
  const [days, setDays] = useState<{ name: string; weekday: number }[]>([]);
  useEffect(() => {
    if (open) {
      setName('');
      setN(4);
      setDays(spreadWeekdays(4).map((weekday) => ({ name: '', weekday })));
    }
  }, [open]);
  useEffect(() => {
    const wds = spreadWeekdays(n);
    setDays((prev) => wds.map((wd, i) => ({ name: prev[i]?.name ?? '', weekday: prev[i] && i < prev.length ? prev[i].weekday : wd })));
  }, [n]);
  const dup = new Set(days.map((d) => d.weekday)).size !== days.length;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Crear mi split"
      eyebrow="Personalizado"
      footer={
        <button
          className="btn-ember w-full"
          disabled={!name.trim() || dup}
          onClick={() => {
            addSplit(customSplit(name, days));
            onClose();
            onDone();
          }}
        >
          Crear y agregar ejercicios
        </button>
      }
    >
      <label className="block">
        <span className="eyebrow mb-1.5 block">Nombre del split</span>
        <input className="field" placeholder="Ej.: Mi split de verano" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="mt-5">
        <div className="eyebrow mb-1.5">Días por semana</div>
        <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Días por semana">
          {[1, 2, 3, 4, 5, 6, 7].map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={n === k}
              onClick={() => setN(k)}
              className={`press num min-h-[48px] rounded-md border text-lg font-semibold ${n === k ? 'border-ember bg-ember text-onember' : 'border-line text-muted'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {days.map((d, i) => (
          <div key={i} className="rounded-md border border-line p-3">
            <label className="block">
              <span className="eyebrow mb-1.5 block">Día {i + 1}</span>
              <input
                className="field"
                placeholder={`Ej.: ${['Pecho y bíceps', 'Espalda y tríceps', 'Pierna pesada', 'Hombro y core', 'Brazos', 'Full body', 'Cardio y core'][i]}`}
                maxLength={40}
                value={d.name}
                onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
            </label>
            <div className="mt-2">
              <WeekdayPicker value={d.weekday} taken={days.map((x) => x.weekday)} onChange={(wd) => setDays(days.map((x, j) => (j === i ? { ...x, weekday: wd } : x)))} />
            </div>
          </div>
        ))}
        {dup && <p className="text-sm text-warn">Dos días caen el mismo día de la semana.</p>}
      </div>
    </Sheet>
  );
}

function RenameSheet({ split, onClose }: { split: Split | null; onClose: () => void }) {
  const rename = useApp((s) => s.renameSplit);
  const [name, setName] = useState('');
  useEffect(() => {
    if (split) setName(split.name);
  }, [split]);
  return (
    <Sheet
      open={!!split}
      onClose={onClose}
      title="Renombrar"
      eyebrow="Split"
      footer={
        <button
          className="btn-ember w-full"
          disabled={!name.trim()}
          onClick={() => {
            if (split) rename(split.id, name);
            onClose();
          }}
        >
          Guardar
        </button>
      }
    >
      <input className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del split" autoFocus />
    </Sheet>
  );
}
