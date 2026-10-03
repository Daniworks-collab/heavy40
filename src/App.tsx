import { MotionConfig } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useApp } from './store/app';
import { Today } from './screens/Today';
import { Onboarding } from './screens/Onboarding';

const Routine = lazy(() => import('./screens/Routine'));
const Library = lazy(() => import('./screens/Library'));
const Progress = lazy(() => import('./screens/Progress'));
const Method = lazy(() => import('./screens/Method'));
const Calendar = lazy(() => import('./screens/Calendar'));
const Nutrition = lazy(() => import('./screens/Nutrition'));
const SettingsScreen = lazy(() => import('./screens/Settings'));
const More = lazy(() => import('./screens/More'));
const Splits = lazy(() => import('./screens/Splits'));
const Workout = lazy(() => import('./screens/Workout'));

function Gate({ children }: { children: React.ReactNode }) {
  const onboarded = useApp((s) => s.onboarded);
  if (!onboarded) return <Navigate to="/bienvenida" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/bienvenida', element: <Onboarding /> },
  {
    path: '/entrenar',
    element: (
      <Gate>
        <Suspense fallback={null}>
          <Workout />
        </Suspense>
      </Gate>
    )
  },
  {
    element: (
      <Gate>
        <Layout />
      </Gate>
    ),
    children: [
      { path: '/', element: <Today /> },
      { path: '/rutina', element: <Routine /> },
      { path: '/biblioteca', element: <Library /> },
      { path: '/biblioteca/:id', element: <Library /> },
      { path: '/progreso', element: <Progress /> },
      { path: '/metodo', element: <Method /> },
      { path: '/calendario', element: <Calendar /> },
      { path: '/nutricion', element: <Nutrition /> },
      { path: '/ajustes', element: <SettingsScreen /> },
      { path: '/mas', element: <More /> },
      { path: '/splits', element: <Splits /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

export function App() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'hueso' ? '#EDE6DA' : theme === 'alto' ? '#000000' : '#0A0A0B');
  }, [theme]);
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
