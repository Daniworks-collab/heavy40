import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';

const PRINCIPLES = [
  ['Intensidad', 'Cada serie efectiva se lleva al fallo o a 1 repetición de él. Una serie que no exige no cuenta.'],
  ['Poco volumen', '1-2 series efectivas por ejercicio. Más series no compensan una serie floja.'],
  ['Técnica estricta', 'Tempo controlado (2 s subir, 3 s bajar), sin rebotes ni impulso. Si la técnica se rompe, la serie terminó.'],
  ['Progresión de carga', 'Doble progresión: primero repeticiones hasta el tope del rango, luego más peso.'],
  ['Recuperación', 'El estímulo se da en el gimnasio; el crecimiento ocurre al descansar. ≥48 h entre sesiones, sueño y proteína suficientes.']
];

const GLOSSARY = [
  ['Fallo', 'El punto en el que no puedes completar otra repetición con técnica correcta.'],
  ['RIR', '"Repeticiones en reserva". 1 RIR = te detienes cuando sólo te queda una repetición limpia.'],
  ['Rest-pause', 'Tras el fallo, 15 s de pausa y otra mini-serie al fallo. Hasta 3 mini-series.'],
  ['Negativas', 'Bajar la carga muy lento (4-6 s) cuando ya no puedes subirla; en máquinas, sube con dos extremidades y baja con una.'],
  ['Repeticiones forzadas', 'Un compañero ayuda lo justo para 1-2 repeticiones más allá del fallo.'],
  ['Pre-agotamiento', 'Un aislamiento seguido sin descanso (15 s) de un compuesto del mismo músculo, para que el músculo objetivo falle antes que los auxiliares.'],
  ['Tempo 2-0-3', 'Segundos de subida, pausa y bajada. HEAVY·40 usa 2 s subir, 0 pausa, 3 s bajar.'],
  ['Serie efectiva', 'Serie al fallo o cerca de él que cuenta para el volumen. Los calentamientos no cuentan.'],
  ['e1RM', 'Máximo estimado a una repetición, calculado con la fórmula de Epley: carga × (1 + reps/30).'],
  ['Descarga', 'Semana con −40 % de series y −10 % de carga para disipar fatiga acumulada.']
];

const SCIENCE = [
  {
    t: 'Varias series superan a una sola',
    d: 'En un metaanálisis, 2-3 series por ejercicio produjeron más hipertrofia que una sola serie.',
    r: 'Krieger, J. W. (2010). J Strength Cond Res, 24(4), 1150-1159.'
  },
  {
    t: 'Dosis-respuesta con las series semanales',
    d: 'Más series semanales por músculo se asocian a más crecimiento, con referencias de ~10 o más series para resultados claros.',
    r: 'Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). J Sports Sci, 35(11), 1073-1082.'
  },
  {
    t: 'Frecuencia 2×/semana',
    d: 'Con volumen igualado, entrenar cada músculo al menos dos veces por semana rindió mejor que una vez.',
    r: 'Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2016). Sports Med, 46(11), 1689-1697.'
  },
  {
    t: 'El fallo absoluto no es obligatorio',
    d: 'Acercarse al fallo ayuda, pero quedarse a 1-3 repeticiones rinde parecido para hipertrofia. En compuestos libres, el fallo dispara la fatiga y el riesgo.',
    r: 'Refalo, M. C., et al. (2023). Sports Med, 53, 649-665; Refalo et al. (2024).'
  },
  {
    t: 'Descansos más largos en compuestos',
    d: 'Descansos de 2-3 min entre series de compuestos suelen permitir más rendimiento y mejores resultados que descansos de 1 min.',
    r: 'Schoenfeld, B. J., et al. (2016). J Strength Cond Res, 30(7), 1805-1812.'
  }
];

const FAQ = [
  ['¿Por qué no voy al fallo en press banca o sentadilla?', 'Porque en compuestos libres el fallo sube mucho la fatiga y el riesgo sin aportar más crecimiento que quedarte a 1 repetición. Si tienes seguros bien puestos o un ayudante, puedes hacerlo en la última serie.'],
  ['¿Por qué sólo 40 minutos?', 'Es el formato que elegiste. La app protege ese límite: si el día se pasa, recorta en orden (calentamientos secundarios, descansos de aislamiento, series extra) y te avisa. Nunca recorta en silencio.'],
  ['¿Es suficiente volumen?', 'Es moderado. Con 3 sesiones de 40 min sueles llegar a ~6-8 series directas por músculo grande. Funciona, sobre todo si progresas la carga, pero no es el máximo posible. El panel de volumen te lo muestra con honestidad.'],
  ['¿Qué modo elijo?', 'HD Adaptado si no sabes: mantiene la intensidad de Heavy Duty con lo que la evidencia actual sugiere. HD Puro si quieres la experiencia Mentzer. Fast-40 si quieres meter más series a cambio de menos descanso.'],
  ['Me estanqué, ¿entreno más?', 'En Heavy Duty la respuesta suele ser lo contrario: revisa sueño y proteína, añade un día de descanso, o haz una semana de descarga antes de cambiar el ejercicio.'],
  ['¿Esto sustituye a un entrenador o médico?', 'No. Es una herramienta. Si tienes lesiones, enfermedades o dudas, consulta a un profesional antes de entrenar al fallo.']
];

export default function Method() {
  return (
    <Page>
      <PageTitle eyebrow="Mentzer · Yates · evidencia actual" title="Método" />

      <Rise as="section" className="card relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -bottom-16 -right-10 font-display text-[200px] font-black leading-none text-fg/[0.03]" aria-hidden>
          HD
        </div>
        <div className="eyebrow mb-2 text-ember">Heavy Duty</div>
        <p className="max-w-2xl text-lg leading-relaxed">
          Mike Mentzer propuso entrenar <strong>breve, infrecuente e intenso</strong>: 1-2 series al fallo por ejercicio, 6-10 repeticiones, y 4-7 días antes de volver a
          entrenar el mismo músculo. Dorian Yates lo llevó a la práctica con 2-3 series de calentamiento y 1-2 series efectivas brutales.
        </p>
      </Rise>

      <Rise as="section">
        <SectionTitle>Principios</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PRINCIPLES.map(([t, d], i) => (
            <div key={t} className="card p-4">
              <div className="num text-xs text-ember">0{i + 1}</div>
              <div className="font-display mt-1 text-xl font-bold uppercase">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Rise>

      <Rise as="section">
        <SectionTitle>HD Adaptado: la decisión de diseño</SectionTitle>
        <div className="card p-5 lg:p-6">
          <p className="leading-relaxed">
            HEAVY·40 conserva lo esencial de Heavy Duty (intensidad, poco volumen por sesión, doble progresión y descanso como prioridad) y ajusta tres cosas según la
            evidencia actual:
          </p>
          <ul className="mt-3 space-y-2">
            <li className="flex gap-3"><span className="text-ember">—</span>~2 series efectivas en los ejercicios clave en lugar de 1.</li>
            <li className="flex gap-3"><span className="text-ember">—</span>Cada músculo grande se entrena 2×/semana (directo o indirecto).</li>
            <li className="flex gap-3"><span className="text-ember">—</span>Fallo total sólo en máquinas, poleas y aislamientos; 1 RIR en compuestos libres.</li>
          </ul>
        </div>
      </Rise>

      <Rise as="section">
        <SectionTitle>Qué dice la ciencia</SectionTitle>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {SCIENCE.map((s) => (
            <article key={s.t} className="card p-5">
              <h3 className="font-display text-xl font-bold uppercase">{s.t}</h3>
              <p className="mt-1 text-sm">{s.d}</p>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[11px] text-muted">{s.r}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-warn/40 bg-warn/[0.07] p-5">
          <div className="eyebrow mb-1 text-warn">Nota honesta</div>
          <p className="text-sm leading-relaxed">
            Con 40 minutos × 3 días, el volumen semanal es moderado (~6-8 series directas por músculo grande), por debajo de lo que la literatura asocia con el máximo
            crecimiento. Es un compromiso a cambio de sesiones cortas y sostenibles. La app te lo muestra en el panel de volumen y no promete resultados. No sustituye
            consejo médico.
          </p>
        </div>
      </Rise>

      <Rise as="section">
        <SectionTitle>Glosario</SectionTitle>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line px-4 py-3">
              <dt className="font-display text-lg font-bold uppercase text-ember">{t}</dt>
              <dd className="text-sm text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </Rise>

      <Rise as="section">
        <SectionTitle>Preguntas frecuentes</SectionTitle>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <Faq key={q} q={q} a={a} />
          ))}
        </div>
      </Rise>
    </Page>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface/60">
      <button className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left font-medium" onClick={() => setOpen(!open)} aria-expanded={open}>
        {q}
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-sm text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
