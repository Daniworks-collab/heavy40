import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Bottom sheet en móvil (arrastra para cerrar), modal centrado en escritorio. */
export function Sheet({ open, onClose, title, eyebrow, children, footer, wide }: SheetProps) {
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={`glass relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border lg:rounded-3xl ${wide ? 'lg:max-w-3xl' : 'lg:max-w-lg'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ y: '100%', transition: { duration: 0.18, ease: 'easeIn' } }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="touch-none" onPointerDown={(e) => controls.start(e)}>
            <div className="flex cursor-grab justify-center pt-3 lg:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-line2" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 lg:pt-5">
              <div>
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                {title && <h2 className="h-display text-3xl">{title}</h2>}
              </div>
              <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-fg" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>
            {footer && <div className="safe-bottom border-t border-fg/10 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
