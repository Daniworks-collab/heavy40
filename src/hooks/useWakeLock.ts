import { useEffect } from 'react';

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (sentinel && !sentinel.released) return;
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* Puede fallar por batería baja, ahorro de energía o pestaña oculta: no es crítico. */
      }
    };
    void request();
    const onVis = () => {
      if (!cancelled && document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
