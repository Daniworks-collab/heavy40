import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  big?: boolean;
  format?: (v: number) => string;
}

export function Stepper({ value, onChange, step, min = 0, max = 9999, label, unit, big, format }: StepperProps) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 100) / 100)));
  const btn = `grid shrink-0 place-items-center rounded-xl border border-line bg-raised/70 text-fg active:bg-line ${big ? 'h-14 w-14' : 'h-12 w-12'}`;
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <motion.button whileTap={{ scale: 0.9 }} className={btn} onClick={() => set(value - step)} aria-label={`Menos ${label}`}>
        <Minus size={big ? 22 : 18} />
      </motion.button>
      <div className="min-w-0 flex-1 text-center">
        <div className="eyebrow !text-[10px]">{label}</div>
        <input
          inputMode="decimal"
          aria-label={label}
          className={`num w-full bg-transparent text-center font-semibold text-fg focus:outline-none ${big ? 'text-4xl' : 'text-2xl'}`}
          value={format ? format(value) : value}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(',', '.'));
            if (!Number.isNaN(n)) set(n);
            else if (e.target.value === '') set(min);
          }}
        />
        {unit && <div className="text-[11px] text-muted">{unit}</div>}
      </div>
      <motion.button whileTap={{ scale: 0.9 }} className={btn} onClick={() => set(value + step)} aria-label={`Más ${label}`}>
        <Plus size={big ? 22 : 18} />
      </motion.button>
    </div>
  );
}
