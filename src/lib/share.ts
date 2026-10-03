import { mmss } from './format';

export interface ShareSession {
  dayName: string;
  date: Date;
  durationSec: number;
  budgetSec: number;
  sets: number;
  volumeKg: number;
  prs: { exercise: string; text: string }[];
  splitName?: string;
  rankName?: string;
  xpGained?: number;
  unit?: 'kg' | 'lb';
}

const vol = (d: ShareSession, withUnit = true) => {
  const v = Math.round(d.unit === 'lb' ? d.volumeKg / 0.45359237 : d.volumeKg).toLocaleString('es-MX');
  return withUnit ? `${v} ${d.unit ?? 'kg'}` : v;
};

const appUrl = () => `${location.origin}${import.meta.env.BASE_URL}`;

export function shareText(d: ShareSession): string {
  const lines = [
    `HEAVY·40 · ${d.dayName}`,
    `${mmss(d.durationSec)} de ${mmss(d.budgetSec)} · ${d.sets} series efectivas · ${vol(d)}`
  ];
  if (d.prs.length) lines.push(`Récords: ${d.prs.map((p) => `${p.exercise} (${p.text})`).join('; ')}`);
  if (d.xpGained) lines.push(`+${d.xpGained} XP${d.rankName ? ` · ${d.rankName}` : ''}`);
  return lines.join('\n');
}

function css(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return v ? `rgb(${v.split(/\s+/).join(',')})` : '#888';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Imagen 1080×1350 (4:5) con la estética Forja, lista para redes. */
export async function renderShareImage(d: ShareSession): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  try {
    await Promise.all([
      document.fonts.load('900 120px "Big Shoulders Display"'),
      document.fonts.load('600 64px "JetBrains Mono"'),
      document.fonts.load('500 32px "Instrument Sans"')
    ]);
  } catch {
    /* si las fuentes no cargan se usan las del sistema */
  }
  const bg = '#121215';
  const fg = '#EDE6DA';
  const ember = css('ember') === '#888' ? '#FF4D1F' : css('ember');
  const muted = '#A8ACB4';
  const display = '"Big Shoulders Display", Impact, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, monospace';
  const sans = '"Instrument Sans", system-ui, sans-serif';

  // Fondo + retícula
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(237,230,218,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(W * 0.85, 120, 0, W * 0.85, 120, 520);
  glow.addColorStop(0, 'rgba(255,77,31,0.35)');
  glow.addColorStop(1, 'rgba(255,77,31,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Marca
  ctx.fillStyle = fg;
  ctx.font = `900 76px ${display}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('HEAVY', 80, 150);
  const hw = ctx.measureText('HEAVY').width;
  ctx.save();
  ctx.translate(80 + hw + 26, 124);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = ember;
  ctx.fillRect(-9, -9, 18, 18);
  ctx.restore();
  ctx.fillStyle = ember;
  ctx.fillText('40', 80 + hw + 48, 150);

  // Encabezado
  ctx.fillStyle = muted;
  ctx.font = `600 26px ${mono}`;
  const dateTxt = d.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  ctx.fillText(`SESIÓN TERMINADA · ${dateTxt}`, 80, 250);

  // Nombre del día
  ctx.fillStyle = fg;
  // El título se reduce hasta caber en 2 líneas
  let size = 132;
  let nameLines: string[] = [];
  for (; size >= 72; size -= 12) {
    ctx.font = `900 ${size}px ${display}`;
    nameLines = wrap(ctx, d.dayName.toUpperCase(), W - 160);
    if (nameLines.length <= 2) break;
  }
  nameLines = nameLines.slice(0, 2);
  let y = 270 + size;
  for (const l of nameLines) {
    ctx.fillText(l, 80, y);
    y += size * 0.92;
  }

  // Duración
  y += 30;
  ctx.fillStyle = ember;
  ctx.font = `600 150px ${mono}`;
  ctx.fillText(mmss(d.durationSec), 80, y + 110);
  const dw = ctx.measureText(mmss(d.durationSec)).width;
  ctx.fillStyle = muted;
  ctx.font = `600 44px ${mono}`;
  ctx.fillText(`/ ${mmss(d.budgetSec)}`, 80 + dw + 24, y + 110);
  y += 170;

  // Métricas
  const stat = (x: number, label: string, value: string) => {
    ctx.fillStyle = fg;
    ctx.font = `600 72px ${mono}`;
    ctx.fillText(value, x, y + 70);
    ctx.fillStyle = muted;
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(label, x, y + 115);
  };
  stat(80, 'series efectivas', String(d.sets));
  stat(500, `${d.unit ?? 'kg'} movidos`, vol(d, false));
  y += 175;

  // Récords
  // Cada récord ocupa 62 px; el pie empieza en H − 150
  const room = Math.max(0, Math.floor((H - 185 - (y + 98)) / 62) + 1);
  const prs = d.prs.slice(0, Math.min(3, room));
  if (prs.length) {
    ctx.fillStyle = ember;
    ctx.fillRect(80, y, 6, prs.length * 62 + 50);
    ctx.font = `900 40px ${display}`;
    ctx.fillText('RÉCORDS PERSONALES', 110, y + 40);
    ctx.fillStyle = fg;
    ctx.font = `500 32px ${sans}`;
    prs.forEach((p, i) => {
      const line = `${p.exercise} · ${p.text}`;
      ctx.fillText(wrap(ctx, line, W - 200)[0], 110, y + 98 + i * 62);
    });
  }

  // Pie
  ctx.fillStyle = 'rgba(237,230,218,0.1)';
  ctx.fillRect(80, H - 150, W - 160, 2);
  ctx.fillStyle = muted;
  ctx.font = `500 28px ${sans}`;
  const foot = [d.splitName, d.rankName, d.xpGained ? `+${d.xpGained} XP` : ''].filter(Boolean).join(' · ');
  ctx.fillText(foot, 80, H - 95);
  ctx.fillStyle = fg;
  ctx.font = `600 26px ${mono}`;
  ctx.fillText(appUrl().replace(/^https?:\/\//, ''), 80, H - 55);

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'error';

/** Web Share con imagen → con texto → copiar al portapapeles + descargar imagen. */
export async function shareSession(d: ShareSession): Promise<ShareResult> {
  const text = shareText(d);
  const url = appUrl();
  let blob: Blob | null = null;
  try {
    blob = await renderShareImage(d);
  } catch {
    blob = null;
  }
  const file = blob ? new File([blob], `heavy40-${d.date.toISOString().slice(0, 10)}.png`, { type: 'image/png' }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'HEAVY·40', text });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title: 'HEAVY·40', text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
  }
  try {
    await navigator.clipboard?.writeText(`${text}\n${url}`);
    if (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file?.name ?? 'heavy40.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return 'downloaded';
    }
    return 'copied';
  } catch {
    return 'error';
  }
}

export function shareMessage(r: ShareResult): string | null {
  switch (r) {
    case 'shared':
      return '¡Compartido!';
    case 'copied':
      return 'Resumen copiado al portapapeles';
    case 'downloaded':
      return 'Imagen descargada y resumen copiado';
    case 'error':
      return 'No se pudo compartir en este navegador';
    default:
      return null;
  }
}
