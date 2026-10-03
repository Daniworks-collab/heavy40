import { Download, Share, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '@/lib/install';

/** Invita a instalar la app (pantalla de inicio, pantalla completa, sin internet). */
export function InstallCard() {
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  if (isStandalone()) return null;
  const ios = isIOS();
  const can = canPromptInstall();
  return (
    <section className="card-forge overflow-hidden p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ember text-onember">
          <Smartphone size={24} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-black uppercase leading-none">Instala la app</div>
          <p className="mt-1 text-sm text-muted">Pantalla completa, ícono en tu inicio y funciona sin internet en el gimnasio.</p>
        </div>
      </div>
      {can ? (
        <button className="btn-ember mt-4 w-full" onClick={() => void promptInstall()}>
          <Download size={18} aria-hidden /> Instalar HEAVY·40
        </button>
      ) : ios ? (
        <ol className="mt-4 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="num grid h-6 w-6 place-items-center rounded-sm bg-raised text-xs">1</span> Abre esta página en <strong>Safari</strong>.
          </li>
          <li className="flex items-center gap-2">
            <span className="num grid h-6 w-6 place-items-center rounded-sm bg-raised text-xs">2</span> Toca <Share size={15} className="text-ember" aria-label="Compartir" /> <strong>Compartir</strong>.
          </li>
          <li className="flex items-center gap-2">
            <span className="num grid h-6 w-6 place-items-center rounded-sm bg-raised text-xs">3</span> Elige <strong>Agregar a pantalla de inicio</strong>.
          </li>
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">En Chrome o Edge: menú ⋮ → <strong className="text-fg">Instalar app</strong>.</p>
      )}
    </section>
  );
}
