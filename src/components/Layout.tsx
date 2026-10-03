import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CalendarDays, Dumbbell, Flame, LayoutGrid, Rows3, Salad, ScrollText, Settings, TrendingUp } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { Logo } from './ui/Logo';
import { Skeleton } from './ui/Skeleton';
import { useLive } from '@/store/live';

const MAIN = [
  { to: '/', label: 'Hoy', icon: Flame },
  { to: '/rutina', label: 'Rutina', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen }
];
const MORE = [
  { to: '/splits', label: 'Splits', icon: Rows3 },
  { to: '/calendario', label: 'Recuperación', icon: CalendarDays },
  { to: '/metodo', label: 'Método', icon: ScrollText },
  { to: '/nutricion', label: 'Nutrición', icon: Salad },
  { to: '/ajustes', label: 'Ajustes', icon: Settings }
];

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pt-10 lg:px-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const live = useLive((s) => s.active);
  const moreActive = MORE.some((m) => location.pathname.startsWith(m.to)) || location.pathname === '/mas';
  const section = '/' + (location.pathname.split('/')[1] ?? '');

  return (
    <div className="lg:flex">
      {/* Sidebar escritorio */}
      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-5 py-8 lg:flex">
        <Logo size={30} />
        <p className="mt-2 text-xs text-muted">Hipertrofia · cualquier split · tu tiempo</p>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Principal">
          {[...MAIN, ...MORE].map((n) => (
            <SideLink key={n.to} to={n.to} label={n.label} icon={<n.icon size={18} />} />
          ))}
        </nav>
        {live && (
          <NavLink to="/entrenar" className="btn-ember mt-auto w-full text-base">
            <span className="h-2 w-2 animate-ember rounded-full bg-onember" /> Sesión en curso
          </NavLink>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {live && location.pathname !== '/entrenar' && (
          <NavLink
            to="/entrenar"
            className="fixed inset-x-4 bottom-[88px] z-30 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ember font-display text-lg font-bold uppercase tracking-wide text-onember shadow-[0_8px_30px_rgb(var(--ember)/0.35)] lg:hidden"
          >
            <span className="h-2 w-2 animate-ember rounded-full bg-onember" /> Volver a la sesión
          </NavLink>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <Suspense fallback={<PageFallback />} key={section}>
            {outlet}
          </Suspense>
        </AnimatePresence>
      </div>

      {/* Tab bar móvil */}
      <nav
        aria-label="Principal"
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MAIN.map((n) => (
            <TabLink key={n.to} to={n.to} label={n.label} icon={n.icon} />
          ))}
          <TabLink to="/mas" label="Más" icon={LayoutGrid} forceActive={moreActive} />
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, label, icon: Icon, forceActive }: { to: string; label: string; icon: typeof Flame; forceActive?: boolean }) {
  return (
    <NavLink to={to} end={to === '/'} className="press relative flex min-h-[60px] flex-col items-center justify-center gap-1">
      {({ isActive }) => {
        const on = isActive || !!forceActive;
        return (
          <>
            {on && (
              <motion.span layoutId="tab-ind" className="absolute inset-x-2 top-0 bottom-1 bg-gradient-to-b from-ember/[0.14] to-transparent" transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
                <span className="absolute inset-x-0 top-0 h-[3px] bg-ember" />
              </motion.span>
            )}
            <Icon size={22} className={`relative ${on ? 'text-ember' : 'text-muted'}`} strokeWidth={2} aria-hidden />
            <span className={`relative text-[11px] font-semibold uppercase tracking-wide ${on ? 'text-fg' : 'text-muted'}`}>{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

function SideLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink to={to} end={to === '/'} className="relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[15px]">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="side-ind" className="absolute inset-0 rounded-lg border border-line bg-raised" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          {isActive && <motion.span layoutId="side-bar" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-ember" />}
          <span className={`relative ${isActive ? 'text-ember' : 'text-muted'}`}>{icon}</span>
          <span className={`relative ${isActive ? 'text-fg' : 'text-muted'}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export const MORE_LINKS = MORE;
