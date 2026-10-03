import { AnimatePresence, motion } from 'motion/react';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useOnline } from '@/hooks/useOnline';

/** Estado de conexión: la app funciona igual sin internet; sólo informamos. */
export function ConnectionBanner() {
  const online = useOnline();
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(!online);
  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      setBackOnline(true);
      const t = setTimeout(() => setBackOnline(false), 2500);
      return () => clearTimeout(t);
    }
  }, [online]);
  const show = !online || backOnline;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-[70] flex justify-center px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.14 } }}
            className={`glass flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-xl ${online ? 'text-ok' : 'text-fg'}`}
          >
            {online ? <Wifi size={15} aria-hidden /> : <WifiOff size={15} className="text-warn" aria-hidden />}
            {online ? 'De nuevo en línea' : 'Sin conexión · todo se guarda en tu teléfono'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
