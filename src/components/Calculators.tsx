import { useEffect, useState } from 'react';
import { genericWarmup, platesPerSide } from '@/engine/progression';
import { PLATES_LB, fmtNum, roundDisplay, toUnit, useUnits } from '@/lib/units';
const fmtKg = fmtNum;
import { useApp, withDefaults } from '@/store/app';
import { Segmented } from './ui/Segmented';
import { Sheet } from './ui/Sheet';
import { Stepper } from './ui/Stepper';

/** Colores de disco tipo competición (kg). */
// Colores tipo competición por tamaño relativo (del más pesado al más ligero)
const TONES = ['bg-[#C8322B] text-white', 'bg-[#2D5BC4] text-white', 'bg-[#D9A92C] text-black', 'bg-[#3E8E4E] text-white', 'bg-[#EDE6DA] text-black', 'bg-[#1B1B1D] text-white border border-line2', 'bg-[#8A8F98] text-black', 'bg-[#8A8F98] text-black'];
const HEIGHTS = ['h-16', 'h-16', 'h-14', 'h-12', 'h-10', 'h-8', 'h-7', 'h-6'];

/** Barra y discos en la unidad del usuario. */
function useBarSetup() {
  const st = withDefaults(useApp((s) => s.settings));
  const u = useUnits();
  const bar = u.unit === 'kg' ? st.barKg : roundDisplay(toUnit(st.barKg, 'lb'), 'lb');
  const plates = u.unit === 'kg' ? [...st.plates].sort((a, b) => b - a) : PLATES_LB;
  return { bar, plates, u };
}

/** Dibujo de un lado de la barra con sus discos. */
/** `total` en kg (como lo guarda el motor); se dibuja en la unidad del usuario. */
export function PlateStack({ total, compact = false }: { total: number; compact?: boolean }) {
  const { bar, plates, u } = useBarSetup();
  const totalU = roundDisplay(toUnit(total, u.unit), u.unit);
  const r = platesPerSide(totalU, bar, plates);
  const tone = (p: number) => TONES[Math.max(0, plates.indexOf(p))] ?? 'bg-raised';
  const height = (p: number) => HEIGHTS[Math.max(0, plates.indexOf(p))] ?? 'h-8';
  if (totalU <= bar) {
    return <p className="text-xs text-muted">Sólo la barra ({fmtKg(bar)} {u.label})</p>;
  }
  if (compact) {
    return (
      <p className="text-xs text-muted">
        Por lado: <span className="num font-semibold text-fg">{r.perSide.map(fmtKg).join(' + ') || '—'}</span>
        {r.remainder > 0 && <span className="text-warn"> · faltan {fmtKg(r.remainder)} {u.label}</span>}
      </p>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1" role="img" aria-label={`Por lado: ${r.perSide.join(', ')} ${u.unit === 'kg' ? 'kilos' : 'libras'}`}>
        <span className="h-3 w-10 rounded-sm bg-line2" aria-hidden />
        <span className="h-6 w-2 rounded-sm bg-muted" aria-hidden />
        {r.perSide.map((p, i) => (
          <span key={i} className={`grid w-5 place-items-center rounded-sm text-[9px] font-bold ${tone(p)} ${height(p)}`}>
            <span className="-rotate-90 whitespace-nowrap">{fmtKg(p)}</span>
          </span>
        ))}
        <span className="h-3 flex-1 rounded-sm bg-line2" aria-hidden />
      </div>
      <p className="mt-2 text-sm">
        Por lado: <span className="num font-semibold">{r.perSide.map(fmtKg).join(' + ')}</span>
        <span className="text-muted">
          {' '}
          · barra {fmtKg(bar)} {u.label}
        </span>
      </p>
      {r.remainder > 0 && (
        <p className="text-sm text-warn">
          Con tus discos llegas a {fmtKg(r.achieved)} {u.label} (faltan {fmtKg(r.remainder)} {u.label}).
        </p>
      )}
    </div>
  );
}

/** Calculadoras: trabaja en la unidad del usuario; `initialKg` llega en kg. */
export function ToolsSheet({ open, onClose, initialKg = 60 }: { open: boolean; onClose: () => void; initialKg?: number }) {
  const [tab, setTab] = useState<'discos' | 'calentamiento'>('discos');
  const { bar, u } = useBarSetup();
  const [val, setVal] = useState(u.toDisp(initialKg || 60));
  useEffect(() => {
    if (open && initialKg > 0) setVal(u.toDisp(initialKg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialKg, u.unit]);
  const ladder = genericWarmup(val, bar);
  return (
    <Sheet open={open} onClose={onClose} title="Calculadoras" eyebrow="Herramientas">
      <Segmented<'discos' | 'calentamiento'>
        label="Calculadora"
        value={tab}
        onChange={setTab}
        size="sm"
        options={[
          { value: 'discos', label: 'Discos' },
          { value: 'calentamiento', label: 'Calentamiento' }
        ]}
      />
      <div className="mt-4">
        <Stepper label={tab === 'discos' ? 'Peso total' : 'Peso de trabajo'} unit={u.label} value={val} onChange={setVal} step={u.unit === 'kg' ? 2.5 : 5} min={0} max={1100} big format={fmtKg} />
      </div>
      <div className="mt-5">
        {tab === 'discos' ? (
          <PlateStack total={u.fromDisp(val)} />
        ) : (
          <ol className="space-y-2">
            {ladder.map((w, i) => (
              <li key={i} className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
                <span className="num w-10 text-xs text-muted">{w.pct}%</span>
                <span className="num flex-1 text-lg font-semibold">
                  {fmtKg(w.kg)} {u.label} <span className="text-sm font-normal text-muted">× {w.reps}</span>
                </span>
                <span className="w-32 text-right">
                  <PlateStack total={u.fromDisp(w.kg)} compact />
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-md border border-ember bg-ember/10 px-3 py-2.5">
              <span className="num w-10 text-xs text-ember">100%</span>
              <span className="num flex-1 text-lg font-semibold">
                {fmtKg(val)} {u.label} · serie efectiva
              </span>
            </li>
          </ol>
        )}
      </div>
    </Sheet>
  );
}
