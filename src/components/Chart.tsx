import { Table2, LineChart as LineIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Ticks cortos: sin decimales largos y miles compactos (12.5k). */
const tick = (v: number) => (Math.abs(v) >= 10000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10));

const AXIS = { stroke: 'rgb(var(--muted))', fontSize: 11, fontFamily: 'JetBrains Mono', tickLine: false, axisLine: false } as const;

interface Point {
  x: string;
  y: number;
}

function Tip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold text-fg">
        {String(Math.round(payload[0].value * 10) / 10)} {unit}
      </div>
    </div>
  );
}

/** Tarjeta de gráfica con vista de tabla accesible. Serie única → sin leyenda; el título la nombra. */
export function ChartCard({ title, sub, unit, data, kind = 'area', band, height = 200, right, header }: {
  title: string;
  sub?: string;
  unit: string;
  data: Point[];
  kind?: 'area' | 'bar';
  band?: [number, number];
  height?: number;
  right?: ReactNode;
  header?: ReactNode;
}) {
  const [table, setTable] = useState(false);
  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h3 className="h-display text-2xl">{title}</h3>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <button
            onClick={() => setTable(!table)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-fg"
            aria-label={table ? 'Ver gráfica' : 'Ver tabla'}
            aria-pressed={table}
          >
            {table ? <LineIcon size={16} /> : <Table2 size={16} />}
          </button>
        </div>
      </div>
      {header}
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Sin datos todavía.</p>
      ) : table ? (
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-normal">Fecha</th>
                <th className="py-1 text-right font-normal">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">{d.x}</td>
                  <td className="num py-1.5 text-right">{String(Math.round(d.y * 10) / 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}: ${data.length} puntos, último ${data[data.length - 1].y} ${unit}`}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'area' ? (
              <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--ember))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--ember))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="2 4" />
                <XAxis dataKey="x" {...AXIS} minTickGap={28} padding={{ left: 6, right: 6 }} />
                <YAxis {...AXIS} domain={['auto', 'auto']} width={48} tickFormatter={tick} />
                {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="rgb(var(--ok))" fillOpacity={0.07} />}
                <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: 'rgb(var(--line2))' }} />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="rgb(var(--ember))"
                  strokeWidth={2}
                  fill={`url(#g-${title})`}
                  dot={{ r: 3, fill: 'rgb(var(--ember))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
                  animationDuration={900}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -18 }} barCategoryGap={6}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="2 4" />
                <XAxis dataKey="x" {...AXIS} />
                <YAxis {...AXIS} allowDecimals={false} width={48} tickFormatter={tick} />
                {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="rgb(var(--ok))" fillOpacity={0.08} />}
                <Tooltip content={<Tip unit={unit} />} cursor={{ fill: 'rgb(var(--fg) / 0.04)' }} />
                <Bar dataKey="y" fill="rgb(var(--ember))" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={800} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
