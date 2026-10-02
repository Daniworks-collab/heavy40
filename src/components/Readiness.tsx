import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { evaluateReadiness, type Readiness } from '@/engine/readiness';
import { Sheet } from './ui/Sheet';

const QUESTIONS: { key: keyof Readiness; label: string; lo: string; hi: string }[] = [
  { key: 'sleep', label: '¿Cómo dormiste?', lo: 'Fatal', hi: 'Excelente' },
  { key: 'energy', label: '¿Energía ahora?', lo: 'Vacío', hi: 'A tope' },
  { key: 'pain', label: '¿Molestias articulares?', lo: 'Nada', hi: 'Dolor agudo' }
];

export function ReadinessSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: Readiness) => void }) {
  const [r, setR] = useState<Readiness>({ sleep: 3, energy: 3, pain: 1 });
  const res = evaluateReadiness(r);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Readiness · 10 segundos"
      title="¿Cómo llegas?"
      footer={
        <button className="btn-ember w-full" onClick={() => onDone(r)}>
          {res.conservative ? 'Entrenar en modo conservador' : 'Listo, a entrenar'}
        </button>
      }
    >
      <div className="space-y-6">
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
