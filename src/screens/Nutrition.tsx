import { motion } from 'motion/react';
import { BedDouble, Droplets, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';
import { Ring } from '@/components/ui/Ring';
import { isoDate } from '@/lib/dates';
import { useApp } from '@/store/app';

export default function Nutrition() {
  const bw = useApp((s) => s.profile.bodyweight);
  const water = useApp((s) => s.water[isoDate()] ?? 0);
  const addWater = useApp((s) => s.addWater);
  const sleepGoal = useApp((s) => s.sleepGoal);
  const setSleepGoal = useApp((s) => s.setSleepGoal);
  const [weight, setWeight] = useState(bw);
  const [factor, setFactor] = useState(1.8);
  const [meals, setMeals] = useState(4);
  const protein = Math.round(weight * factor);
  const waterGoal = Math.round(weight * 35 / 250); // ~35 ml/kg en vasos de 250 ml

  return (
    <Page>
      <PageTitle eyebrow="Básico, sin dietas" title="Nutrición" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Rise as="section" className="card p-5 lg:p-6">
          <div className="eyebrow mb-2">Proteína diaria</div>
          <div className="flex items-end gap-2">
            <NumberTicker value={protein} className="font-display text-7xl font-black leading-none" />
            <span className="mb-2 text-lg text-muted">g/día</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            ≈ <span className="num text-fg">{Math.round(protein / meals)}</span> g en cada una de {meals} comidas. Rango útil para hipertrofia: 1.6-2.2 g/kg.
          </p>
          <label className="mt-5 block">
            <span className="flex justify-between text-sm">
              <span>Peso corporal</span>
              <span className="num">{weight} kg</span>
            </span>
            <input type="range" min={40} max={160} step={0.5} value={weight} onChange={(e) => setWeight(+e.target.value)} className="mt-2 w-full accent-[rgb(var(--ember))]" aria-label="Peso corporal" />
          </label>
          <label className="mt-4 block">
            <span className="flex justify-between text-sm">
              <span>Gramos por kg</span>
              <span className="num">{factor.toFixed(1)}</span>
            </span>
            <input type="range" min={1.6} max={2.2} step={0.1} value={factor} onChange={(e) => setFactor(+e.target.value)} className="mt-2 w-full accent-[rgb(var(--ember))]" aria-label="Gramos por kilo" />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm">Comidas</span>
            {[3, 4, 5].map((n) => (
              <button key={n} data-on={meals === n} className="chip min-h-[40px] min-w-[48px] justify-center" onClick={() => setMeals(n)}>
                {n}
              </button>
            ))}
          </div>
        </Rise>

        <div className="space-y-5">
          <Rise as="section" className="card flex items-center gap-5 p-5">
            <Ring value={water / waterGoal} size={120} stroke={9} label={`${water} de ${waterGoal} vasos`}>
              <div className="text-center leading-none">
                <Droplets size={18} className="mx-auto mb-1 text-ember" />
                <span className="num text-2xl font-semibold">{water}</span>
                <span className="text-xs text-muted">/{waterGoal}</span>
              </div>
            </Ring>
            <div className="flex-1">
              <div className="eyebrow">Hidratación hoy</div>
              <p className="mt-1 text-sm text-muted">Vasos de 250 ml. Meta orientativa ~35 ml/kg; más si sudas mucho.</p>
              <div className="mt-3 flex gap-2">
                <motion.button whileTap={{ scale: 0.9 }} className="btn-ghost !min-h-[48px] !px-4" onClick={() => addWater(-1)} aria-label="Quitar vaso">
                  <Minus size={18} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} className="btn-ember flex-1 !min-h-[48px]" onClick={() => addWater(1)}>
                  <Plus size={18} /> Vaso
                </motion.button>
              </div>
            </div>
          </Rise>

          <Rise as="section" className="card p-5">
            <div className="flex items-center gap-2">
              <BedDouble size={18} className="text-ember" />
              <span className="eyebrow">Sueño</span>
            </div>
            <p className="mt-2 text-sm">
              Meta: <span className="num font-semibold">{sleepGoal} h</span>. El sueño es la mitad del progreso: 7-9 h es el rango recomendado para adultos.
            </p>
            <div className="mt-3 flex gap-2">
              {[7, 7.5, 8, 8.5, 9].map((h) => (
                <button key={h} data-on={sleepGoal === h} className="chip min-h-[44px] flex-1 justify-center" onClick={() => setSleepGoal(h)}>
                  {String(h)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">El readiness previo a cada sesión pregunta cómo dormiste; si duermes mal, la app baja la intensidad sola.</p>
          </Rise>
        </div>
      </div>

      <Rise as="section">
        <SectionTitle>Lo básico</SectionTitle>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ['Proteína en cada comida', 'Repartida en 3-5 tomas de ~0.4 g/kg.'],
            ['Calorías suficientes', 'Para crecer, un superávit pequeño ayuda más que comer de más.'],
            ['Nada de dietas aquí', 'Para planes alimentarios, consulta a un nutriólogo.']
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl border border-line px-4 py-3">
              <div className="font-medium">{t}</div>
              <div className="text-sm text-muted">{d}</div>
            </li>
          ))}
        </ul>
      </Rise>
    </Page>
  );
}
