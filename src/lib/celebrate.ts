import confetti from 'canvas-confetti';
import { beep, vibrate } from './feedback';

const EMBER = ['#FF4D1F', '#FF7346', '#EDE6DA', '#C83A12', '#FFB199'];

/** Celebración en capas: confeti + vibración + sonido. Respeta movimiento reducido y los ajustes. */
let calm = false;
/** Modo calma: sin confeti (se mantiene el aviso sonoro/vibración si están activos). */
export function setCalmCelebrations(v: boolean) {
  calm = v;
}

export function celebrate(kind: 'pr' | 'medal' | 'rank' | 'month', opts: { sound?: boolean; vibration?: boolean } = {}) {
  if (calm) {
    if (opts.vibration !== false) vibrate(40);
    if (opts.sound !== false) beep(880, 140, 0.12, 'sine');
    return;
  }
  const base = { colors: EMBER, disableForReducedMotion: true, zIndex: 90, ticks: 160 } as const;
  if (kind === 'pr') {
    void confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38, origin: { y: 0.85 }, scalar: 0.9 });
  } else if (kind === 'medal' || kind === 'rank') {
    void confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
    void confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
  } else {
    const end = Date.now() + 900;
    const frame = () => {
      void confetti({ ...base, particleCount: 6, angle: 60, spread: 55, origin: { x: 0 } });
      void confetti({ ...base, particleCount: 6, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }
  if (opts.vibration !== false) vibrate(kind === 'pr' ? [60, 40, 60, 40, 120] : [40, 30, 80]);
  if (opts.sound !== false) fanfare(kind === 'pr' ? [660, 880, 1320] : [520, 780, 1040, 1560]);
}

function fanfare(notes: number[]) {
  notes.forEach((f, i) => setTimeout(() => beep(f, i === notes.length - 1 ? 260 : 110, 0.16, 'triangle'), i * 110));
}

const PR_LINES = [
  'Nuevo récord. Así se forja.',
  'Más fuerte que la última vez.',
  'El trabajo está pagando.',
  'Récord personal. Anótalo.',
  'Eso es progreso real.'
];

export function prLine(seed: number): string {
  return PR_LINES[Math.abs(seed) % PR_LINES.length];
}
