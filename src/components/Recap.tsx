import { motion } from 'motion/react';
import { PartyPopper, Trophy, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MUSCLE_LABEL } from '@/data/labels';
import { celebrate } from '@/lib/celebrate';
import { int } from '@/lib/format';
import type { Recap } from '@/lib/recap';
import { useApp, withDefaults } from '@/store/app';
import { NumberTicker } from './ui/NumberTicker';

/** Recompensa en capas: resumen semanal y celebración mensual (una sola vez). */
export function RecapCard({ recap, onClose }: { recap: Recap; onClose: () => void }) {
  const settings = withDefaults(useApp((s) => s.settings));
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (recap.kind === 'mes' || recap.complete) {
      const t = setTimeout(() => celebrate(recap.kind === 'mes' ? 'month' : 'medal', { sound: settings.sound, vibration: settings.vibration }), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = Math.min(1, recap.sessions / recap.planned);
  const headline =
    recap.kind === 'mes'
      ? recap.complete
        ? 'Mes completo. Eso es constancia de verdad.'
        : `${recap.sessions} sesiones este mes. Cada una contó.`
      : recap.complete
        ? 'Semana cerrada. Bien forjado.'
        : `${recap.sessions} de ${recap.planned}. La que viene, la cierras.`;
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`card-forge relative mb-4 overflow-hidden p-5 ${recap.kind === 'mes' ? 'border-ember' : ''}`}
      aria-label={recap.title}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember/20 blur-3xl" aria-hidden />
      <button onClick={onClose} className="press absolute right-2 top-2 grid h-11 w-11 place-items-center text-muted" aria-label="Cerrar resumen">
        <X size={18} />
      </button>
      <div className="relative flex items-center gap-2">
        <PartyPopper size={18} className="text-ember" aria-hidden />
        <span className="eyebrow">{recap.kind === 'mes' ? 'Celebración mensual' : 'Resumen semanal'}</span>
      </div>
      <h2 className="h-display relative mt-1 pr-10 text-[34px] leading-none">{recap.title}</h2>
      <p className="relative mt-1 text-sm">{headline}</p>
      <div className="relative mt-4 h-2 overflow-hidden bg-raised" aria-hidden>
        <motion.div className="h-full bg-ember" initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <dl className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Sesiones" value={recap.sessions} suffix={`/${recap.planned}`} />
        <Fact label="Kilos movidos" value={recap.volume} />
        <Fact label="Minutos" value={recap.minutes} />
        <div>
          <dt className="text-[11px] text-muted">Récords</dt>
          <dd className="num flex items-center gap-1 text-2xl font-semibold">
            <Trophy size={16} className={recap.prs ? 'text-ember' : 'text-muted'} aria-hidden />
            {int(recap.prs)}
          </dd>
        </div>
      </dl>
      {recap.topMuscle && (
        <p className="relative mt-3 text-xs text-muted">
          Músculo más trabajado: <span className="font-semibold text-fg">{MUSCLE_LABEL[recap.topMuscle]}</span>
        </p>
      )}
    </motion.section>
  );
}

function Fact({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="num text-2xl font-semibold">
        <NumberTicker value={value} />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </dd>
    </div>
  );
}
