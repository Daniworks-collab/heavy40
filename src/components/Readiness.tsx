import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { evaluateReadiness, type Readiness } from '@/engine/readiness';
import { Sheet } from './ui/Sheet';

const QUESTIONS: { key: keyof Readiness; label: string; lo: string; hi: string }[] = [
  { key: 'sleep', label: '¿Cómo dormiste?', lo: 'Fatal', hi: 'Excelente' },
  { key: 'energy', label: '¿Energía ahora?', lo: 'Vacío', hi: 'A tope' },
  { key: 'pain', label: '¿Molestias articulares?', lo: 'Nada', hi: 'Dolor agudo' }
];

const MINUTES = [20, 30, 40, 45, 50, 60, 75, 90];

export function ReadinessSheet({
  open,
  onClose,
  onDone,
  defaultMinutes = 40,
  hoursSince
}: {
  open: boolean;
  onClose: () => void;
  onDone: (r: Readiness, minutes: number) => void;
  defaultMinutes?: number;
  /** Horas desde la última sesión: si son < 48 se pide confirmación. */
  hoursSince?: number;
}) {
  const [r, setR] = useState<Readiness>({ sleep: 3, energy: 3, pain: 1 });
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [ackRecovery, setAckRecovery] = useState(false);
  useEffect(() => {
    if (open) {
      setMinutes(defaultMinutes);
      setAckRecovery(false);
    }
  }, [open, defaultMinutes]);
  const res = evaluateReadiness(r);
  const early = hoursSince !== undefined && hoursSince < 48;
  const blocked = early && !ackRecovery;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Readiness · 10 segundos"
      title="¿Cómo llegas?"
      footer={
        <button className="btn-ember w-full" disabled={blocked} onClick={() => onDone(r, minutes)}>
          {res.conservative ? 'Entrenar en modo conservador' : `A entrenar · ${minutes} min`}
        </button>
      }
    >
      <div className="space-y-6">
        {early && (
          <div className="hazard py-3 pr-3 text-sm">
            <div className="flex gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <span>
                Han pasado <span className="num font-semibold">{Math.round(hoursSince!)} h</span> desde tu última sesión. Tu split pide al menos 48 h para
                recuperarte; entrenar antes puede frenar tu progreso.
              </span>
            </div>
            <button
              onClick={() => setAckRecovery(!ackRecovery)}
              aria-pressed={ackRecovery}
              className={`press mt-3 min-h-[44px] w-full rounded-md border text-sm font-medium ${ackRecovery ? 'border-warn bg-warn/20' : 'border-warn/50'}`}
            >
              {ackRecovery ? 'Entendido: entreno de todos modos' : 'Entrenar de todos modos'}
            </button>
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Clock size={16} className="text-ember" aria-hidden /> ¿Cuánto tiempo tienes hoy?
          </div>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tiempo disponible hoy">
            {MINUTES.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={`press num min-h-[48px] rounded-md border text-base font-semibold ${minutes === m ? 'border-ember bg-ember text-onember' : 'border-line bg-raised/50 text-muted'}`}
              >
                {m}′
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">La sesión se recalcula para caber en ese tiempo. No cambia tu ajuste por defecto.</p>
        </div>
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <div className="mb-2 font-medium">{q.label}</div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={q.label}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = r[q.key] === n;
                const bad = q.key === 'pain' ? n >= 4 : n <= 2;
                return (
                  <motion.button
                    key={n}
                    role="radio"
                    aria-checked={on}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setR({ ...r, [q.key]: n })}
                    className={`num min-h-[52px] rounded-xl border text-lg font-semibold transition-colors ${
                      on ? (bad ? 'border-warn bg-warn/15 text-fg' : 'border-ember bg-ember text-onember') : 'border-line bg-raised/50 text-muted'
                    }`}
                  >
                    {n}
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{q.lo}</span>
              <span>{q.hi}</span>
            </div>
          </div>
        ))}
        <AnimatePresence mode="wait">
          <motion.div
            key={res.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border px-4 py-3 text-sm ${res.conservative ? 'border-warn/50 bg-warn/10' : 'border-line bg-raised/40'}`}
          >
            <span className="num mr-2 font-semibold">{String(res.score)}/5</span>
            {res.text}
          </motion.div>
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
