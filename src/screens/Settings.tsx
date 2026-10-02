import { AnimatePresence, motion } from 'framer-motion';
import { Database, Download, Sparkles, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Page, PageTitle, Rise } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { Toggle } from '@/components/ui/Toggle';
import { CLASS_LABEL, EQUIPMENT, EQUIPMENT_LABEL, JOINTS, JOINT_LABEL, LEVEL_LABEL, MODE_BLURB, MUSCLES, MUSCLE_LABEL, WEEKDAY_SHORT } from '@/data/labels';
import { exportAll, importAll, wipeAll } from '@/db';
import { DEFAULT_REST } from '@/engine/rules';
import { spacingWarnings } from '@/engine/validate';
import type { Equipment, ExerciseClass, Joint, Level, Mode, Muscle } from '@/engine/types';
import { seedDemo } from '@/lib/demo';
import { useApp, type Theme } from '@/store/app';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Rise as="section" className="card p-5">
      <h2 className="h-display mb-3 text-2xl">{title}</h2>
      {children}
    </Rise>
  );
}

export default function Settings() {
  const s = useApp();
  const [lines, setLines] = useState<string[]>([]);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const show = (l: string[]) => setLines(l);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  };

  const weekdays = s.routine.days.map((d) => d.weekday);
  const toggleDay = (wd: number) => {
    if (weekdays.includes(wd)) return;
    // Mueve al día seleccionado más cercano; cada sesión conserva su identidad (Día 1/2/3).
    const dist = (a: number, b: number) => Math.min((a - b + 7) % 7, (b - a + 7) % 7);
    let idx = 0;
    weekdays.forEach((w, i) => {
      if (dist(w, wd) < dist(weekdays[idx], wd)) idx = i;
    });
    const next = [...weekdays];
    next[idx] = wd;
    s.setWeekdays(next);
  };

  const doExport = async () => {
    const data = await exportAll();
    const { onboarded, fitnessAck, profile, routine, settings, loads, changes, programStart, deloads, overrides, water, sleepGoal } = useApp.getState();
    const blob = new Blob(
      [JSON.stringify({ app: 'heavy40', version: 1, exportedAt: new Date().toISOString(), state: { onboarded, fitnessAck, profile, routine, settings, loads, changes, programStart, deloads, overrides, water, sleepGoal }, ...data }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `heavy40-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (json.app !== 'heavy40') throw new Error('Archivo no válido');
      await importAll(json);
      if (json.state) useApp.getState().replaceAll(json.state);
      flash('Datos importados');
    } catch (e) {
      flash(`No se pudo importar: ${(e as Error).message}`);
    }
  };

  return (
    <Page>
      <PageTitle eyebrow="Todo local, todo tuyo" title="Ajustes" />

      <AnimatePresence>
        {lines.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <div className="rounded-2xl border border-ember/50 bg-ember/[0.07] p-4 text-sm" role="status">
              <div className="eyebrow mb-1 flex items-center gap-1.5 text-ember">
                <Sparkles size={13} /> Rutina recalculada
              </div>
              {lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Group title="Modo">
          <Segmented<Mode>
            label="Modo"
            value={s.settings.mode}
            onChange={(m) => show(s.setMode(m))}
            options={[
              { value: 'puro', label: 'HD Puro' },
              { value: 'adaptado', label: 'Adaptado' },
              { value: 'fast40', label: 'Fast-40' }
            ]}
          />
          <p className="mt-2 text-sm text-muted">{MODE_BLURB[s.settings.mode]}</p>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
            <span>Unidades</span>
            <span className="num text-muted">kg</span>
          </div>
        </Group>

        <Group title="Tiempos">
          <Stepper
            label="Calentamiento general"
            unit="minutos"
            value={s.settings.generalWarmup / 60}
            min={0}
            max={5}
            step={1}
            onChange={(v) => show(s.updateSettings({ generalWarmup: Math.round(v) * 60 }))}
          />
          <div className="mt-4 space-y-3">
            {(['C1', 'C2', 'A', 'P'] as ExerciseClass[]).map((c) => (
              <div key={c} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-sm">
                  <div className="font-medium">{c}</div>
                  <div className="text-[11px] text-muted">{CLASS_LABEL[c]}</div>
                </div>
                <div className="flex-1">
                  <Stepper
                    label="Descanso"
                    unit="segundos"
                    value={s.settings.restOverrides[c] ?? DEFAULT_REST[c]}
                    step={15}
                    min={30}
                    max={300}
                    onChange={(v) => show(s.updateSettings({ restOverrides: { ...s.settings.restOverrides, [c]: v === DEFAULT_REST[c] ? undefined : v } }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Días de entrenamiento">
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <button
                key={wd}
                onClick={() => toggleDay(wd)}
                aria-pressed={weekdays.includes(wd)}
                className={`min-h-[52px] rounded-xl border text-sm font-medium ${weekdays.includes(wd) ? 'border-ember bg-ember text-onember' : 'border-line text-muted'}`}
              >
                {WEEKDAY_SHORT[wd]}
              </button>
            ))}
          </div>
          {spacingWarnings(weekdays).map((w) => (
            <p key={w.text} className="mt-2 text-sm text-warn">
              {w.text}
            </p>
          ))}
          <p className="mt-2 text-xs text-muted">Toca un día libre para moverlo ahí; se sustituye el día más cercano. Por defecto L-M-V.</p>
        </Group>

        <Group title="Sonido, vibración y tema">
          <Toggle label="Sonido" sub="Avisos a 10 s y fin del descanso (Web Audio)" on={s.settings.sound} onChange={(v) => s.updateSettings({ sound: v })} />
          <Toggle label="Vibración" sub="En serie hecha y fin de descanso" on={s.settings.vibration} onChange={(v) => s.updateSettings({ vibration: v })} />
          <Toggle label="Metrónomo de tempo" sub="Activado por defecto al entrenar (2 s sube · 3 s baja)" on={s.settings.metronome} onChange={(v) => s.updateSettings({ metronome: v })} />
          <div className="mt-3">
            <Segmented<Theme>
              label="Tema"
              value={s.settings.theme}
              onChange={(t) => s.updateSettings({ theme: t })}
              size="sm"
              options={[
                { value: 'forja', label: 'Forja' },
                { value: 'hueso', label: 'Hueso' },
                { value: 'alto', label: 'Alto contraste' }
              ]}
            />
          </div>
        </Group>

        <Group title="Perfil">
          <div className="eyebrow mb-2">Nivel</div>
          <Segmented<Level>
            label="Nivel"
            value={s.profile.level}
            onChange={(l) => show(s.setProfile({ level: l }))}
            size="sm"
            options={(['principiante', 'intermedio', 'avanzado'] as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
          />
          <div className="mt-4">
            <Stepper label="Peso corporal" unit="kg" value={s.profile.bodyweight} step={0.5} min={35} max={250} onChange={(v) => s.setProfile({ bodyweight: v })} />
          </div>
          <div className="eyebrow mb-2 mt-4">Músculos prioritarios (máx. 2)</div>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => {
              const on = s.profile.priorities.includes(m);
              return (
                <button
                  key={m}
                  data-on={on}
                  className="chip min-h-[40px]"
                  onClick={() => {
                    const p: Muscle[] = on ? s.profile.priorities.filter((x) => x !== m) : [...s.profile.priorities, m].slice(-2);
                    show(s.setProfile({ priorities: p }));
                  }}
                >
                  {MUSCLE_LABEL[m]}
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Equipo y lesiones">
          <div className="eyebrow mb-2">Equipo disponible</div>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.filter((e) => e !== 'peso-corporal').map((e) => {
              const on = s.profile.equipment.includes(e);
              return (
                <button
                  key={e}
                  data-on={on}
                  className="chip min-h-[40px]"
                  onClick={() => show(s.setProfile({ equipment: on ? s.profile.equipment.filter((x) => x !== e) : [...s.profile.equipment, e as Equipment] }))}
                >
                  {EQUIPMENT_LABEL[e]}
                </button>
              );
            })}
          </div>
          <div className="eyebrow mb-2 mt-4">Lesiones (excluyen ejercicios que cargan esa zona)</div>
          <div className="flex flex-wrap gap-2">
            {JOINTS.map((j) => {
              const on = s.profile.injuries.includes(j);
              return (
                <button
                  key={j}
                  data-on={on}
                  className="chip min-h-[40px]"
                  onClick={() => show(s.setProfile({ injuries: on ? s.profile.injuries.filter((x) => x !== j) : [...s.profile.injuries, j as Joint] }))}
                >
                  {JOINT_LABEL[j]}
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Datos">
          <p className="mb-3 text-sm text-muted">Todo vive en este dispositivo (IndexedDB + almacenamiento local). Exporta para respaldar o mover a otro teléfono.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button className="btn-ghost" onClick={() => void doExport()}>
              <Download size={16} /> Exportar JSON
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importar JSON
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                await seedDemo();
                flash('6 semanas de ejemplo cargadas');
              }}
            >
              <Database size={16} /> Datos de ejemplo
            </button>
            <button className="btn-ghost !border-ember/40 text-ember" onClick={() => setConfirmWipe(true)}>
              <Trash2 size={16} /> Borrar datos
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          {msg && <p className="mt-3 text-sm text-ok" role="status">{msg}</p>}
        </Group>
      </div>

      <p className="mt-8 text-center text-xs text-muted">HEAVY·40 no sustituye consejo médico. Ante dolor, para.</p>

      <Sheet
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="¿Borrar todo?"
        eyebrow="Irreversible"
        footer={
          <button
            className="btn-ember w-full"
            onClick={async () => {
              await wipeAll();
              localStorage.removeItem('heavy40-live');
              s.reset();
              setConfirmWipe(false);
              window.location.assign(`${import.meta.env.BASE_URL}bienvenida`);
            }}
          >
            Sí, borrar historial, rutina y ajustes
          </button>
        }
      >
        <p className="text-sm text-muted">Se eliminan sesiones, medidas, readiness, rutina y ajustes de este dispositivo. Exporta antes si quieres conservarlos.</p>
      </Sheet>
    </Page>
  );
}
