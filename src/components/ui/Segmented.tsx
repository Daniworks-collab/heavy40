import { motion } from 'motion/react';
import { useId } from 'react';

interface Option<T extends string | number> {
  value: T;
  label: string;
  sub?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  label
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="relative flex rounded-xl border border-line bg-raised/50 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 rounded-lg px-2 font-display font-bold uppercase tracking-[0.05em] transition-colors ${
              size === 'sm' ? 'min-h-[40px] text-sm' : 'min-h-[48px] text-base'
            } ${on ? 'text-onember' : 'text-muted hover:text-fg'}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-lg bg-ember"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="block leading-tight">{o.label}</span>
            {o.sub && <span className={`block font-sans text-[10px] normal-case tracking-normal ${on ? 'text-onember/80' : 'text-muted'}`}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
