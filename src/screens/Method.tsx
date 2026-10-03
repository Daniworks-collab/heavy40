import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Page, PageTitle, Rise, SectionTitle } from '@/components/ui/Page';

const PRINCIPLES = [
  ['Esfuerzo real', 'Las series que cuentan se llevan cerca del fallo (0-3 reps en reserva). Una serie cómoda casi no estimula.'],
  ['Volumen suficiente', 'Suma series efectivas por músculo a la semana; la zona útil suele estar entre ~10 y 16 en músculos grandes.'],
  ['Frecuencia', 'Entrenar cada músculo 2 veces por semana suele rendir mejor que 1 con el mismo volumen. Tu split lo define.'],
  ['Progresión de carga', 'Doble progresión: primero repeticiones hasta el tope del rango, luego más peso. Sin progresión no hay adaptación.'],
  ['Recuperación', 'El estímulo se da en el gimnasio; el crecimiento ocurre al descansar. ≥48 h por músculo, sueño y proteína suficientes.']
];

const SPLITS_INFO = [
  ['Heavy Duty 3 días', 'Pocas series, muy intensas, días de descanso entre sesiones. Ideal si tienes poco tiempo y te gusta entrenar al límite.'],
  ['Full Body', 'Todo el cuerpo en cada sesión, 2-3 días. Alta frecuencia con pocas visitas al gimnasio.'],
  ['Torso / Pierna', '4 días alternando torso y pierna. Cada músculo 2×/semana con buen volumen: el equilibrio clásico.'],
  ['Push / Pull / Legs', 'Empuje, tirón y pierna. A 3 días cada músculo va 1×/semana; a 6 días, 2×/semana con mucho volumen.'],
  ['Arnold', 'Pecho+espalda, hombro+brazo y pierna. Permite superseries antagonistas naturales.'],
  ['Weider', 'Un grupo muscular por día. Mucho volumen por sesión pero frecuencia 1×/semana.'],
  ['Personalizado', 'Tú decides cuántos días, cómo se llaman y qué lleva cada uno. La app calcula tiempos, volumen y avisos igual.']
];

const STYLES_INFO = [
  ['HD Adaptado', 'Heavy Duty con lo que sugiere la evidencia actual: ~2 series en ejercicios clave, fallo sólo donde es seguro y 1 RIR en compuestos libres.'],
  ['HD Puro', 'Mike Mentzer: 1 serie efectiva al fallo por ejercicio, 6-10 reps, técnicas como rest-pause y negativas. Dorian Yates lo popularizó con 2-3 calentamientos y una serie brutal.'],
  ['Fast-40', 'Heavy Duty con pares antagonistas (pecho/espalda, bíceps/tríceps) para meter más series en poco tiempo.'],
  ['Hipertrofia clásica', '3-4 series por ejercicio, 8-12 reps (aislamientos 10-15) a 1-2 reps del fallo, descansos de 45-120 s. Más volumen, menos intensidad por serie.'],
  ['Personalizado', 'Tú eliges series, reps, esfuerzo, descansos y calentamientos. El motor respeta tus reglas y sólo recorta si no cabe en tu tiempo.']
];

const GLOSSARY = [
  ['Fallo', 'El punto en el que no puedes completar otra repetición con técnica correcta.'],
  ['RIR', '"Repeticiones en reserva". 1 RIR = te detienes cuando sólo te queda una repetición limpia.'],
  ['Rest-pause', 'Tras el fallo, 15 s de pausa y otra mini-serie al fallo. Hasta 3 mini-series.'],
  ['Negativas', 'Bajar la carga muy lento (4-6 s) cuando ya no puedes subirla; en máquinas, sube con dos extremidades y baja con una.'],
  ['Repeticiones forzadas', 'Un compañero ayuda lo justo para 1-2 repeticiones más allá del fallo.'],
  ['Pre-agotamiento', 'Un aislamiento seguido sin descanso (15 s) de un compuesto del mismo músculo, para que el músculo objetivo falle antes que los auxiliares.'],
  ['Tempo 2-0-4', 'Segundos de subida, pausa y bajada. Por defecto 2 s subir, 0 pausa, 4 s bajar; lo cambias en Ajustes.'],
  ['Split', 'Cómo repartes los músculos en los días de la semana (PPL, Torso/Pierna, Full Body…).'],
  ['Volumen semanal', 'Series efectivas por músculo en la semana. Directas cuentan 1; las indirectas (músculo secundario), 0.5.'],
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
  ['¿Qué split elijo?', 'El que puedas sostener. Con 2-3 días: Full Body o Heavy Duty. Con 4: Torso/Pierna. Con 5-6 y buena recuperación: PPL o Arnold. Si ninguno te queda, crea el tuyo en Splits.'],
  ['¿Qué estilo elijo?', 'Hipertrofia clásica si quieres el enfoque más común y con más volumen. HD Adaptado si tienes poco tiempo y te gusta la intensidad. Personalizado si ya sabes exactamente cómo quieres entrenar.'],
  ['¿Por qué no voy al fallo en press banca o sentadilla?', 'En compuestos libres el fallo sube mucho la fatiga y el riesgo sin aportar más crecimiento que quedarte a 1-2 repeticiones. Con seguros bien puestos o un ayudante, puedes hacerlo en la última serie.'],
  ['¿Cómo protege la app mi tiempo?', 'Eliges cuántos minutos tienes. Si el día se pasa, recorta en orden (calentamientos secundarios, descansos de aislamiento, series extra) y te dice qué quitó. Nunca recorta en silencio.'],
  ['¿Es suficiente mi volumen?', 'Revísalo en Mi rutina: cada músculo muestra sus series semanales y su zona. Si alguno queda bajo o alto, la app te propone qué ejercicio cambiar, con series y reps, y cómo quedaría.'],
  ['Me estanqué, ¿entreno más?', 'Muchas veces es lo contrario: revisa sueño y proteína, añade un día de descanso o haz una semana de descarga antes de cambiar el ejercicio.'],
  ['¿Esto sustituye a un entrenador o médico?', 'No. Es una herramienta. Si tienes lesiones, enfermedades o dudas, consulta a un profesional antes de entrenar cerca del fallo.']
];

export default function Method() {
  return (
    <Page>
      <PageTitle eyebrow="Hipertrofia basada en evidencia" title="Método" />

      <Rise as="section" className="card relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -bottom-16 -right-10 font-display text-[200px] font-black leading-none text-fg/[0.03]" aria-hidden>
          40
        </div>
        <div className="eyebrow mb-2 text-ember">Cómo funciona HEAVY·40</div>
        <p className="max-w-2xl text-lg leading-relaxed">
          Tú eliges el <strong>split</strong> (qué días y qué ejercicios), el <strong>estilo</strong> (cuántas series, reps y qué tan cerca del fallo) y el{' '}
          <strong>tiempo</strong> que tienes. La app arma cada sesión para que quepa, te guía serie por serie y te dice cómo va tu volumen por músculo.
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
        <SectionTitle>Splits</SectionTitle>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SPLITS_INFO.map(([t, d]) => (
            <div key={t} className="rounded-md border border-line px-4 py-3">
              <dt className="font-display text-lg font-bold uppercase">{t}</dt>
              <dd className="text-sm text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </Rise>

      <Rise as="section">
        <SectionTitle>Estilos</SectionTitle>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STYLES_INFO.map(([t, d]) => (
            <div key={t} className="rounded-md border border-line px-4 py-3">
              <dt className="font-display text-lg font-bold uppercase text-ember">{t}</dt>
              <dd className="text-sm text-muted">{d}</dd>
            </div>
          ))}
        </dl>
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
            Con pocos días o sesiones cortas, el volumen semanal puede quedar moderado (~6-8 series directas por músculo grande), por debajo de lo que la literatura
            asocia con el máximo crecimiento. Es un compromiso a cambio de sesiones sostenibles. La app te lo muestra en el panel de volumen, te propone ajustes y no
            promete resultados. No sustituye consejo médico.
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
