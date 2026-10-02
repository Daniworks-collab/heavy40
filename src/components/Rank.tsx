import { motion, useReducedMotion } from 'framer-motion';
import { Anvil, CalendarCheck, Crown, Flame, Layers, Lock, Sparkles, Timer, Trophy } from 'lucide-react';
import { RANKS, type Medal, type RankState } from '@/lib/rank';
import { int } from '@/lib/format';
import { NumberTicker } from './ui/NumberTicker';

const MEDAL_ICON = { spark: Sparkles, calendar: CalendarCheck, flame: Flame, timer: Timer, layers: Layers, trophy: Trophy, anvil: Anvil, crown: Crown } as const;

/** Insignia de rango: rombo facetado con el número de rango. */
export function RankBadge({ index, size = 44 }: { index: number; size?: number }) {
  const heat = index / (RANKS.length - 1);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <polygon points="24,2 46,24 24,46 2,24" fill="rgb(var(--raised))" stroke="rgb(var(--ember))" strokeWidth="2" />
      <polygon points="24,9 39,24 24,39 9,24" fill="rgb(var(--ember))" fillOpacity={0.18 + heat * 0.82} />
      <polygon points="24,9 39,24 24,24" fill="rgb(255 255 255 / 0.12)" />
      <text x="24" y="29" textAnchor="middle" className="font-display" fontWeight="900" fontSize="15" fill="rgb(var(--fg))">
        {['I', 'II', 'III', 'IV', 'V', 'VI'][index]}
      </text>
    </svg>
  );
}

/** Ficha compacta para la cabecera de HOY. */
export function RankChip({ state }: { state: RankState }) {
  return (
    <div className="press flex min-h-[44px] items-center gap-2 rounded-md border border-line bg-surface/80 py-1 pl-1.5 pr-3" aria-label={`Rango ${state.rank.name}, ${int(state.xp)} XP`}>
      <RankBadge index={state.index} size={30} />
      <div className="leading-none">
        <div className="font-display text-[15px] font-black uppercase tracking-wide">{state.rank.name}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="relative block h-1 w-14 overflow-hidden bg-line">
            <motion.span className="absolute inset-y-0 left-0 bg-ember" initial={{ width: 0 }} animate={{ width: `${state.progress * 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
          </span>
          <span className="num text-[10px] text-muted">{int(state.xp)} XP</span>
        </div>
      </div>
    </div>
  );
}

/** Tarjeta de rango completa (Progreso). */
export function RankCard({ state }: { state: RankState }) {
  const reduce = useReducedMotion();
  return (
    <section className="card-forge overflow-hidden p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="relative flex items-center gap-4">
        <RankBadge index={state.index} size={72} />
        <div className="min-w-0">
          <div className="eyebrow">Rango {state.index + 1} de {RANKS.length}</div>
          <div className="h-display text-[44px] leading-none">{state.rank.name}</div>
          <p className="mt-1 text-sm text-muted">{state.rank.tagline}</p>
        </div>
      </div>
      <div className="relative mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="num font-semibold">
            <NumberTicker value={state.xp} /> XP
          </span>
          <span className="text-muted">{state.next ? `${int(state.toNext)} XP para ${state.next.name}` : 'Rango máximo'}</span>
        </div>
        <div className="relative h-3 overflow-hidden bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.progress * 100)} aria-label="Progreso al siguiente rango">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-ember-deep to-ember"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${state.progress * 100}%` }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute inset-0 tick-rule opacity-40" aria-hidden />
        </div>
        <div className="mt-3 flex justify-between gap-1" aria-hidden>
          {RANKS.map((r, i) => (
            <span key={r.id} className={`h-1.5 flex-1 ${i <= state.index ? 'bg-ember' : 'bg-line'}`} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Serie efectiva +10 · Récord +50 · Sesión ≤40:00 +25 · Semana completa +100</p>
      </div>
    </section>
  );
}

export function MedalGrid({ list }: { list: Medal[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {list.map((m, i) => {
        const Icon = MEDAL_ICON[m.icon];
        return (
          <motion.li
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.04 * i, type: 'spring', stiffness: 380, damping: 22 }}
            className={`relative flex flex-col items-center rounded-lg border p-4 text-center ${m.unlocked ? 'border-ember/60 bg-ember/[0.07]' : 'border-line bg-surface/60'}`}
          >
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
              <polygon
                points="28,3 50,15.5 50,40.5 28,53 6,40.5 6,15.5"
                fill={m.unlocked ? 'rgb(var(--ember))' : 'rgb(var(--raised))'}
                stroke={m.unlocked ? 'rgb(var(--ember-hot))' : 'rgb(var(--line2))'}
                strokeWidth="2"
              />
              <polygon points="28,3 50,15.5 28,28" fill="rgb(255 255 255 / 0.14)" />
            </svg>
            <span className={`absolute top-[30px] grid place-items-center ${m.unlocked ? 'text-onember' : 'text-muted'}`}>
              {m.unlocked ? <Icon size={22} strokeWidth={2.2} aria-hidden /> : <Lock size={18} aria-hidden />}
            </span>
            <div className="mt-2 font-display text-base font-bold uppercase leading-tight">{m.name}</div>
            <div className="mt-0.5 text-xs text-muted">{m.desc}</div>
            <div className="mt-2 h-1 w-full overflow-hidden bg-line" aria-hidden>
              <div className="h-full bg-ember" style={{ width: `${(m.current / m.goal) * 100}%` }} />
            </div>
            <div className="num mt-1 text-[11px] text-muted">
              {m.unlocked ? 'Desbloqueada' : `${int(m.current)}/${int(m.goal)}`}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
