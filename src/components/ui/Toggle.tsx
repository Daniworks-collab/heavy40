import { motion } from 'motion/react';

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-[56px] w-full items-center justify-between gap-4 text-left">
      <span>
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${on ? 'border-ember bg-ember/25' : 'border-line bg-raised'}`}>
        <motion.span
          className={`absolute top-1 h-[22px] w-[22px] rounded-full ${on ? 'bg-ember' : 'bg-muted'}`}
          animate={{ left: on ? 28 : 4 }}
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        />
      </span>
    </button>
  );
}
