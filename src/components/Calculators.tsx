import { useEffect, useState } from 'react';
import { genericWarmup, platesPerSide } from '@/engine/progression';
import { kg as fmtKg } from '@/lib/format';
import { useApp, withDefaults } from '@/store/app';
import { Segmented } from './ui/Segmented';
import { Sheet } from './ui/Sheet';
import { Stepper } from './ui/Stepper';

/** Colores de disco tipo competición (kg). */
const PLATE_TONE: Record<string, string> = {
  '25': 'bg-[#C8322B] text-white',
  '20': 'bg-[#2D5BC4] text-white',
  '15': 'bg-[#D9A92C] text-black',
  '10': 'bg-[#3E8E4E] text-white',
  '5': 'bg-[#EDE6DA] text-black',
  '2.5': 'bg-[#1B1B1D] text-white border border-line2',
  '1.25': 'bg-[#8A8F98] text-black',
  '0.5': 'bg-[#8A8F98] text-black'
};
const PLATE_H: Record<string, string> = { '25': 'h-16', '20': 'h-16', '15': 'h-14', '10': 'h-12', '5': 'h-10', '2.5': 'h-8', '1.25': 'h-7', '0.5': 'h-6' };

/** Dibujo de un lado de la barra con sus discos. */
export function PlateStack({ total, compact = false }: { total: number; compact?: boolean }) {
  const st = withDefaults(useApp((s) => s.settings));
  const r = platesPerSide(total, st.barKg, st.plates);
  if (total <= st.barKg) {
    return <p className="text-xs text-muted">Sólo la barra ({fmtKg(st.barKg)} kg)</p>;
  }
  if (compact) {
    return (
      <p className="text-xs text-muted">
        Por lado: <span className="num font-semibold text-fg">{r.perSide.map(fmtKg).join(' + ') || '—'}</span>
        {r.remainder > 0 && <span className="text-warn"> · faltan {fmtKg(r.remainder)} kg</span>}
      </p>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1" role="img" aria-label={`Por lado: ${r.perSide.join(', ')} kilos`}>
        <span className="h-3 w-10 rounded-sm bg-line2" aria-hidden />
        <span className="h-6 w-2 rounded-sm bg-muted" aria-hidden />
        {r.perSide.map((p, i) => (
          <span key={i} className={`grid w-5 place-items-center rounded-sm text-[9px] font-bold ${PLATE_TONE[String(p)] ?? 'bg-raised'} ${PLATE_H[String(p)] ?? 'h-8'}`}>
            <span className="-rotate-90 whitespace-nowrap">{fmtKg(p)}</span>
          </span>
        ))}
        <span className="h-3 flex-1 rounded-sm bg-line2" aria-hidden />
      </div>
      <p className="mt-2 text-sm">
        Por lado: <span className="num font-semibold">{r.perSide.map(fmtKg).join(' + ')}</span>
        <span className="text-muted"> · barra {fmtKg(st.barKg)} kg</span>
      </p>
      {r.remainder > 0 && (
        <p className="text-sm text-warn">
          Con tus discos llegas a {fmtKg(r.achieved)} kg (faltan {fmtKg(r.remainder)} kg).
        </p>
      )}
    </div>
  );
}

export function ToolsSheet({ open, onClose, initialKg = 60 }: { open: boolean; onClose: () => void; initialKg?: number }) {
  const [tab, setTab] = useState<'discos' | 'calentamiento'>('discos');
  const [kg, setKg] = useState(initialKg || 60);
  useEffect(() => {
    if (open && initialKg > 0) setKg(initialKg);
  }, [open, initialKg]);
  const barKg = withDefaults(useApp((s) => s.settings)).barKg;
  const ladder = genericWarmup(kg, barKg);
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
        <Stepper label={tab === 'discos' ? 'Peso total' : 'Peso de trabajo'} unit="kg" value={kg} onChange={setKg} step={2.5} min={0} max={500} big format={fmtKg} />
      </div>
      <div className="mt-5">
        {tab === 'discos' ? (
          <PlateStack total={kg} />
        ) : (
          <ol className="space-y-2">
            {ladder.map((w, i) => (
              <li key={i} className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
                <span className="num w-10 text-xs text-muted">{w.pct}%</span>
                <span className="num flex-1 text-lg font-semibold">
                  {fmtKg(w.kg)} kg <span className="text-sm font-normal text-muted">× {w.reps}</span>
                </span>
                <span className="w-32 text-right">
                  <PlateStack total={w.kg} compact />
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-md border border-ember bg-ember/10 px-3 py-2.5">
              <span className="num w-10 text-xs text-ember">100%</span>
              <span className="num flex-1 text-lg font-semibold">{fmtKg(kg)} kg · serie efectiva</span>
            </li>
          </ol>
        )}
      </div>
    </Sheet>
  );
}
