import { AnimatePresence, motion } from 'motion/react';
import { Database, Download, FileSpreadsheet, Sparkles, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Page, PageTitle, Rise } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { Toggle } from '@/components/ui/Toggle';
import { CLASS_LABEL, EQUIPMENT, EQUIPMENT_LABEL, JOINTS, JOINT_LABEL, LEVEL_LABEL, MUSCLES, MUSCLE_LABEL, WEEKDAY_SHORT } from '@/data/labels';
import { db, exportAll, importAll, wipeAll } from '@/db';
import { bodyToCsv, csvKind, csvToBody, csvToSessions, sessionsToCsv } from '@/lib/csv';
import { beep } from '@/lib/feedback';
import { DEFAULT_REST } from '@/engine/rules';
import { spacingWarnings } from '@/engine/validate';
import type { Equipment, ExerciseClass, Joint, Level, Muscle } from '@/engine/types';
import { seedDemo } from '@/lib/demo';
import { activeSplit, useApp, withDefaults, type Theme } from '@/store/app';
import { Link } from 'react-router-dom';
import { StylePicker } from '@/components/StylePicker';
import { unitSwitch, useUnits } from '@/lib/units';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

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
  const st = withDefaults(s.settings);
  const u = useUnits();
  const sp = activeSplit(s);
  const activeSplitName = sp?.name ?? 'Mi split';
  const activeRestRule = sp?.restRule ?? 'sesion';
  const [lines, setLines] = useState<string[]>([]);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const show = (l: string[]) => setLines(l);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4500);
  };

  const weekdays = s.routine.days.map((d) => d.weekday);
  const doExport = async () => {
    const data = await exportAll();
    const g = useApp.getState();
    const state = {
      onboarded: g.onboarded,
      fitnessAck: g.fitnessAck,
      profile: g.profile,
      routine: g.routine,
      settings: g.settings,
      loads: g.loads,
      changes: g.changes,
      programStart: g.programStart,
      deloads: g.deloads,
      overrides: g.overrides,
      water: g.water,
      sleepGoal: g.sleepGoal,
      splits: g.splits,
      activeSplitId: g.activeSplitId,
      frozenWeeks: g.frozenWeeks,
      seenRecaps: g.seenRecaps
    };
    download(
      new Blob([JSON.stringify({ app: 'heavy40', version: 2, exportedAt: new Date().toISOString(), state, ...data }, null, 2)], { type: 'application/json' }),
      `heavy40-${new Date().toISOString().slice(0, 10)}.json`
    );
  };

  const doExportCsv = async () => {
    const { sessions, body } = await exportAll();
    const day = new Date().toISOString().slice(0, 10);
    // BOM para que Excel respete los acentos
    download(new Blob(['\uFEFF' + sessionsToCsv(sessions, st.units)], { type: 'text/csv' }), `heavy40-series-${day}.csv`);
    if (body.length) setTimeout(() => download(new Blob(['\uFEFF' + bodyToCsv(body, st.units)], { type: 'text/csv' }), `heavy40-cuerpo-${day}.csv`), 400);
    flash(body.length ? 'Se descargaron 2 CSV: series y cuerpo' : `CSV de series descargado (${sessions.length} sesiones)`);
  };

  const doImportCsv = async (file: File) => {
    try {
      const text = await file.text();
      const kind = csvKind(text);
      if (kind === 'sets') {
        const r = csvToSessions(text, await db.sessions.toArray());
        if (r.sessions.length) await db.sessions.bulkAdd(r.sessions);
        flash(
          `${plural(r.sessions.length, 'sesión importada', 'sesiones importadas')}` +
            (r.duplicates ? ` · ${plural(r.duplicates, 'ya existía', 'ya existían')}` : '') +
            (r.skippedRows ? ` · ${plural(r.skippedRows, 'fila omitida', 'filas omitidas')} (ejercicio o datos no reconocidos)` : '')
        );
      } else if (kind === 'body') {
        const r = csvToBody(text, await db.body.toArray());
        if (r.body.length) await db.body.bulkAdd(r.body);
        flash(`${plural(r.body.length, 'registro de cuerpo importado', 'registros de cuerpo importados')}${r.duplicates ? ` · ${plural(r.duplicates, 'ya existía', 'ya existían')}` : ''}`);
      } else throw new Error('no reconozco las columnas');
    } catch (e) {
      flash(`No se pudo importar: ${(e as Error).message}`);
    }
  };

  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (json.app !== 'heavy40') throw new Error('Archivo no válido');
      await importAll(json);
      if (json.state) {
        const next = { ...json.state };
        if (next.settings) next.settings = withDefaults(next.settings);
        // Respaldos anteriores a los splits: la rutina se guarda en el split activo
        if (next.routine && !next.splits) {
          const cur = useApp.getState();
          next.splits = cur.splits.map((x) => (x.id === cur.activeSplitId ? { ...x, routine: next.routine } : x));
        }
        useApp.getState().replaceAll(next);
      }
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
        <Group title="Estilo y split">
          <StylePicker onLines={show} />
          <Link to="/splits" className="press mt-4 flex min-h-[52px] items-center justify-between rounded-md border border-line px-4 text-sm">
            <span>
              Split: <span className="font-semibold">{activeSplitName}</span>
            </span>
            <span className="text-muted">Cambiar ›</span>
          </Link>
          <div className="mt-4">
            <div className="eyebrow mb-2">Unidades de peso</div>
            <Segmented<'kg' | 'lb'>
              label="Unidades de peso"
              value={st.units}
              onChange={(next) => s.updateSettings(unitSwitch(next, st))}
              size="sm"
              options={[
                { value: 'kg', label: 'Kilogramos' },
                { value: 'lb', label: 'Libras' }
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">Cambia cómo se muestran e ingresan los pesos. Tu historial se conserva y se convierte solo.</p>
          </div>
        </Group>

        <Group title="Tiempo disponible">
          <Stepper
            label="Por sesión"
            unit="minutos"
            big
            value={st.sessionMinutes}
            min={15}
            max={120}
            step={5}
            onChange={(v) => show(s.updateSettings({ sessionMinutes: Math.round(v / 5) * 5 }))}
          />
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {[30, 40, 45, 60, 90].map((m) => (
              <button key={m} data-on={st.sessionMinutes === m} className="chip min-h-[44px] justify-center" onClick={() => show(s.updateSettings({ sessionMinutes: m }))}>
                {m}′
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">El motor ajusta series, calentamientos y descansos para que cada sesión quepa. El día que entrenes puedes elegir otro tiempo sólo para esa sesión.</p>
        </Group>

        <Group title="Cadencia y reps">
          <div className="eyebrow mb-2">Cadencia (segundos)</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(['up', 'pause', 'down'] as const).map((k) => (
              <Stepper
                key={k}
                label={k === 'up' ? 'Subir' : k === 'pause' ? 'Pausa' : 'Bajar'}
                value={st.cadence[k]}
                min={k === 'pause' ? 0 : 1}
                max={8}
                step={1}
                onChange={(v) => show(s.updateSettings({ cadence: { ...st.cadence, [k]: Math.round(v) } }))}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Tempo <span className="num text-fg">{st.cadence.up}-{st.cadence.pause}-{st.cadence.down}</span> = {st.cadence.up + st.cadence.pause + st.cadence.down} s por repetición. El metrónomo y el tiempo bajo tensión lo usan.
          </p>
          <div className="eyebrow mb-2 mt-5">Rango de repeticiones</div>
          <div className="grid grid-cols-2 gap-2">
            <button data-on={st.repRange === null} className="chip min-h-[48px] justify-center" onClick={() => show(s.updateSettings({ repRange: null }))}>
              Por ejercicio
            </button>
            <button data-on={st.repRange !== null} className="chip min-h-[48px] justify-center" onClick={() => show(s.updateSettings({ repRange: st.repRange ?? [6, 10] }))}>
              Rango global
            </button>
          </div>
          {st.repRange ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stepper label="Mínimo" value={st.repRange[0]} min={1} max={st.repRange[1]} step={1} onChange={(v) => show(s.updateSettings({ repRange: [Math.round(v), st.repRange![1]] }))} />
              <Stepper label="Máximo" value={st.repRange[1]} min={st.repRange[0]} max={30} step={1} onChange={(v) => show(s.updateSettings({ repRange: [st.repRange![0], Math.round(v)] }))} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">Compuestos 6-10 (pierna 8-12), aislamientos 8-12, gemelos 12-20, core 10-15.</p>
          )}
          {st.repRange && <p className="mt-2 text-xs text-muted">Gemelos y core conservan su rango alto.</p>}
        </Group>

        <Group title="Progresión y discos">
          <div className="eyebrow mb-2">Incremento al llegar al tope del rango</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stepper label="Tren superior" unit={u.label} value={u.toDisp(st.increments.upper)} min={u.unit === 'kg' ? 0.5 : 1} max={u.unit === 'kg' ? 10 : 25} step={u.unit === 'kg' ? 0.5 : 1} onChange={(v) => s.updateSettings({ increments: { ...st.increments, upper: u.fromDisp(v) } })} />
            <Stepper label="Tren inferior" unit={u.label} value={u.toDisp(st.increments.lower)} min={u.unit === 'kg' ? 0.5 : 1} max={u.unit === 'kg' ? 20 : 45} step={u.unit === 'kg' ? 0.5 : 1} onChange={(v) => s.updateSettings({ increments: { ...st.increments, lower: u.fromDisp(v) } })} />
          </div>
          <p className="mt-2 text-xs text-muted">Con mancuernas se aplica ~40 % por mancuerna (mínimo {u.unit === 'kg' ? '1 kg' : '2.5 lb'}).</p>
          <div className="eyebrow mb-2 mt-5">Barra y discos disponibles</div>
          <Stepper label="Barra" unit={u.label} value={u.toDisp(st.barKg)} min={0} max={u.unit === 'kg' ? 30 : 65} step={u.unit === 'kg' ? 2.5 : 5} onChange={(v) => s.updateSettings({ barKg: u.fromDisp(v) })} />
          {u.unit === 'lb' ? (
            <p className="mt-3 text-xs text-muted">En libras se usan los discos estándar: 45, 35, 25, 10, 5 y 2.5 lb.</p>
          ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {[25, 20, 15, 10, 5, 2.5, 1.25, 0.5].map((p) => {
              const on = st.plates.includes(p);
              return (
                <button
                  key={p}
                  data-on={on}
                  className="chip num min-h-[44px] min-w-[56px] justify-center"
                  onClick={() => s.updateSettings({ plates: on ? st.plates.filter((x) => x !== p) : [...st.plates, p].sort((a, b) => b - a) })}
                >
                  {p}
                </button>
              );
            })}
          </div>
          )}
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
          <div className="space-y-3">
            {s.routine.days.map((d, i) => (
              <div key={d.id}>
                <div className="mb-1 text-sm font-medium">{d.name || `Día ${i + 1}`}</div>
                <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label={`Día de la semana de ${d.name || `Día ${i + 1}`}`}>
                  {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                    const on = d.weekday === wd;
                    const taken = !on && weekdays.includes(wd);
                    return (
                      <button
                        key={wd}
                        role="radio"
                        aria-checked={on}
                        disabled={taken}
                        onClick={() => s.updateDay(d.id, { weekday: wd })}
                        className={`press min-h-[44px] rounded-md border text-xs font-medium disabled:opacity-30 ${on ? 'border-ember bg-ember text-onember' : 'border-line text-muted'}`}
                      >
                        {WEEKDAY_SHORT[wd]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {activeRestRule === 'sesion' &&
            spacingWarnings(weekdays).map((w) => (
              <p key={w.text} className="mt-2 text-sm text-warn">
                {w.text}
              </p>
            ))}
          <p className="mt-3 text-xs text-muted">Para agregar o quitar días, ve a Mi rutina o a Splits.</p>
        </Group>

        <Group title="Sonido, vibración y tema">
          <Toggle label="Sonido" sub="Avisos a 10 s y fin del descanso (Web Audio)" on={s.settings.sound} onChange={(v) => s.updateSettings({ sound: v })} />
          <Toggle label="Vibración" sub="En serie hecha y fin de descanso" on={s.settings.vibration} onChange={(v) => s.updateSettings({ vibration: v })} />
          <Toggle label="Metrónomo de tempo" sub="Activado por defecto al entrenar" on={s.settings.metronome} onChange={(v) => s.updateSettings({ metronome: v })} />
          <label className="mt-2 block">
            <span className="flex justify-between text-sm">
              <span>Volumen de sonidos</span>
              <span className="num text-muted">{Math.round(st.soundVolume * 100)} %</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(st.soundVolume * 100)}
              onChange={(e) => s.updateSettings({ soundVolume: +e.target.value / 100 })}
              onPointerUp={() => beep(880, 120, 0.18)}
              className="mt-2 h-10 w-full accent-[rgb(var(--ember))]"
              aria-label="Volumen de sonidos"
            />
          </label>
          <Toggle
            label="Modo calma"
            sub="Sin animaciones, sin confeti y colores apagados. Para días tranquilos o si te molesta el movimiento."
            on={st.calm}
            onChange={(v) => s.updateSettings({ calm: v })}
          />
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
            <Stepper label="Peso corporal" unit={u.label} value={u.toDisp(s.profile.bodyweight)} step={u.unit === 'kg' ? 0.5 : 1} min={u.unit === 'kg' ? 35 : 77} max={u.unit === 'kg' ? 250 : 550} onChange={(v) => s.setProfile({ bodyweight: u.fromDisp(v) })} />
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
            <button className="btn-ghost" onClick={() => void doExportCsv()}>
              <FileSpreadsheet size={16} /> Exportar CSV
            </button>
            <button className="btn-ghost" onClick={() => csvRef.current?.click()}>
              <Upload size={16} /> Importar CSV
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
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImportCsv(f);
              e.target.value = '';
            }}
          />
          <p className="mt-3 text-xs text-muted">
            El CSV trae una fila por serie (fecha, ejercicio, peso, unidad, reps, esfuerzo) para abrirlo en Excel o Sheets. Al importarlo se suman sesiones nuevas sin borrar las tuyas; las repetidas se omiten. El JSON es el respaldo completo. Las fotos nunca salen del dispositivo.
          </p>
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
