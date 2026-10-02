// Formato es-MX: punto decimal, coma de miles.
const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

export function mmss(totalSec: number): string {
  const neg = totalSec < 0;
  const s = Math.abs(Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${neg ? '−' : ''}${m}:${String(r).padStart(2, '0')}`;
}

export function minutes(sec: number): string {
  return `${Math.round(sec / 60)}`;
}

export function kg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function dec(n: number, d = 1): string {
  return n.toFixed(d).replace(/\.0+$/, '');
}

export function int(n: number): string {
  return nf0.format(n);
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
