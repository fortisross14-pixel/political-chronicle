import { useId, useMemo, useRef, useState } from 'react';

/** Validated categorical slots for the dark surface (dataviz skill: dark steps 1–3, all checks pass on #172234). */
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70'];

export interface Series {
  name: string;
  values: number[];
  color?: string;
}

interface Props {
  title: string;
  series: Series[];
  format: (v: number) => string;
  /** Labels for the x positions (one per value), shown in the tooltip and at the ends of the axis. */
  xLabels?: string[];
  yMin?: number;
  yMax?: number;
  height?: number;
}

const W = 600;
const PAD = { top: 12, right: 72, bottom: 22, left: 44 };

/** A small, accessible line chart: one axis, thin lines, crosshair tooltip, a table view. */
export function LineChart({ title, series, format, xLabels, yMin, yMax, height = 180 }: Props) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(0, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const lo = yMin ?? Math.min(0, ...all);
  const hi = yMax ?? Math.max(lo + 1, ...all);
  const H = height;
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = useMemo(() => [lo, lo + (hi - lo) / 2, hi], [lo, hi]);
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]! }));

  if (n === 0) return <p className="muted small">{title}: no data yet.</p>;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      {colored.length >= 2 && (
        <div className="chart-legend small">
          {colored.map((s) => (
            <span key={s.name}>
              <span className="swatch" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="chart-body">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${id}-desc`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <desc id={`${id}-desc`}>{title}</desc>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="chart-axis">
                {format(t)}
              </text>
            </g>
          ))}
          {xLabels && (
            <>
              <text x={x(0)} y={H - 4} className="chart-axis">
                {xLabels[0]}
              </text>
              <text x={x(n - 1)} y={H - 4} textAnchor="end" className="chart-axis">
                {xLabels[n - 1]}
              </text>
            </>
          )}
          {colored.map((s) => (
            <polyline
              key={s.name}
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* Direct end labels (names in text ink, a dot in the series color). */}
          {colored.length >= 2 &&
            colored.map((s) => {
              const last = s.values.length - 1;
              return (
                <g key={`${s.name}-end`}>
                  <circle cx={x(last)} cy={y(s.values[last]!)} r={4} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
                  <text x={x(last) + 8} y={y(s.values[last]!) + 4} className="chart-end">
                    {s.name.length > 10 ? `${s.name.slice(0, 9)}…` : s.name}
                  </text>
                </g>
              );
            })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="chart-crosshair" />
              {colored.map((s) =>
                s.values[hover] === undefined ? null : (
                  <circle key={s.name} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
                ),
              )}
            </g>
          )}
          {/* Hit area bigger than the lines. */}
          <rect x={PAD.left} y={0} width={W - PAD.left - PAD.right} height={H} fill="transparent" />
        </svg>
        {hover !== null && (
          <div className="chart-tooltip small" style={{ left: `${(x(hover) / W) * 100}%` }}>
            {xLabels?.[hover] && <div className="muted">{xLabels[hover]}</div>}
            {colored.map((s) =>
              s.values[hover] === undefined ? null : (
                <div key={s.name}>
                  <span className="swatch" style={{ background: s.color }} /> {colored.length > 1 ? `${s.name}: ` : ''}
                  <strong>{format(s.values[hover]!)}</strong>
                </div>
              ),
            )}
          </div>
        )}
      </div>
      <details className="small">
        <summary>Show data</summary>
        <table className="table">
          <thead>
            <tr>
              <th>{xLabels ? 'When' : '#'}</th>
              {colored.map((s) => (
                <th key={s.name}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, i) => (
              <tr key={i}>
                <td>{xLabels?.[i] ?? i + 1}</td>
                {colored.map((s) => (
                  <td key={s.name}>{s.values[i] === undefined ? '—' : format(s.values[i]!)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
