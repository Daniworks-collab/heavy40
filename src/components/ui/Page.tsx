import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } }
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }
};

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className={`mx-auto w-full max-w-6xl overflow-x-clip px-4 pb-32 pt-[max(env(safe-area-inset-top),16px)] lg:px-10 lg:pb-16 lg:pt-10 ${className}`}
    >
      {children}
    </motion.main>
  );
}

export function Rise({ children, className = '', as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'header' }) {
  const C = as === 'section' ? motion.section : as === 'header' ? motion.header : motion.div;
  return (
    <C variants={rise} className={className}>
      {children}
    </C>
  );
}

export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  // Parallax sutil de la marca de agua al hacer scroll (desactivado con movimiento reducido)
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, reduce ? 0 : -48]);
  const opacity = useTransform(scrollY, [0, 300], [1, reduce ? 1 : 0.2]);
  return (
    <Rise as="header" className="relative mb-7 flex items-end justify-between gap-4">
      {/* Marca de agua contorneada: el título repetido a escala monumental */}
      <motion.span
        aria-hidden
        style={{ y, opacity }}
        className="text-outline pointer-events-none absolute -left-1 -top-6 select-none whitespace-nowrap font-display text-[120px] font-black uppercase leading-none lg:-top-10 lg:text-[180px]"
      >
        {title}
      </motion.span>
      <div className="relative">
        {eyebrow && (
          <div className="eyebrow mb-2 flex items-center gap-2">
            <span className="h-2 w-2 bg-ember" aria-hidden />
            {eyebrow}
          </div>
        )}
        <h1 className="h-display text-[56px] lg:text-7xl">{title}</h1>
      </div>
      {right && <div className="relative">{right}</div>}
    </Rise>
  );
}

export function SectionTitle({ children, right, index }: { children: ReactNode; right?: ReactNode; index?: string }) {
  return (
    <div className="mb-3 mt-9 flex items-center gap-3">
      {index && <span className="num text-xs text-ember">{index}</span>}
      <h2 className="h-display shrink-0 text-[26px]">{children}</h2>
      <span className="h-px flex-1 bg-line" aria-hidden />
      {right}
    </div>
  );
}
