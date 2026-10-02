import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MORE_LINKS } from '@/components/Layout';
import { Logo } from '@/components/ui/Logo';
import { Page, PageTitle, Rise } from '@/components/ui/Page';

const SUB: Record<string, string> = {
  '/calendario': 'Calendario, reprogramar, descarga, readiness',
  '/metodo': 'Principios, ciencia, glosario y FAQ',
  '/nutricion': 'Proteína, sueño e hidratación',
  '/ajustes': 'Modo, descansos, equipo, datos'
};

export default function More() {
  return (
    <Page>
      <PageTitle eyebrow="HEAVY·40" title="Más" />
      <div className="space-y-2">
        {MORE_LINKS.map((l) => (
          <Rise key={l.to}>
            <Link to={l.to}>
              <motion.div whileTap={{ scale: 0.98 }} className="card flex min-h-[76px] items-center gap-4 px-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-line text-ember">
                  <l.icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-2xl font-bold uppercase leading-none">{l.label}</span>
                  <span className="text-sm text-muted">{SUB[l.to]}</span>
                </span>
                <ChevronRight size={18} className="text-muted" />
              </motion.div>
            </Link>
          </Rise>
        ))}
      </div>
      <Rise className="mt-12 text-center">
        <Logo size={22} />
        <p className="mt-2 text-xs text-muted">Todo se guarda en este dispositivo. Sin cuentas, sin servidor.</p>
      </Rise>
    </Page>
  );
}
