// Verificador de contraste WCAG 2.x para los tokens de color de cada tema.
// Uso: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');
const themes = {};
for (const m of css.matchAll(/\[data-theme='(\w+)'\]\s*\{([^}]*)\}/g)) {
  const vars = {};
  for (const v of m[2].matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) vars[v[1]] = [+v[2], +v[3], +v[4]];
  themes[m[1]] = vars;
}
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((x) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
// [texto, fondo, mínimo, uso]
const pairs = [
  ['fg', 'bg', 4.5, 'texto principal'],
  ['fg', 'surface', 4.5, 'texto en tarjeta'],
  ['fg', 'raised', 4.5, 'texto en control'],
  ['muted', 'bg', 4.5, 'texto secundario'],
  ['muted', 'surface', 4.5, 'texto secundario en tarjeta'],
  ['muted', 'raised', 4.5, 'texto secundario en control'],
  ['ember', 'bg', 3, 'acento (texto grande / íconos)'],
  ['ember', 'surface', 3, 'acento en tarjeta'],
  ['onember', 'ember', 4.5, 'texto sobre botón brasa'],
  ['ok', 'surface', 3, 'estado OK'],
  ['warn', 'surface', 3, 'estado aviso'],
  ['line2', 'surface', 3, 'bordes de control (no texto)']
];
let fail = 0;
for (const [name, v] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [a, b, min, use] of pairs) {
    if (!v[a] || !v[b]) continue;
    const r = ratio(v[a], v[b]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${a.padEnd(8)} / ${b.padEnd(8)} ${r.toFixed(2).padStart(5)}:1  (mín ${min}) ${use}`);
  }
}
process.exit(fail ? 1 : 0);
