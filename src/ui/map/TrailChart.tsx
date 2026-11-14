// The line under the map: one point per turn start of this campaign (or term), plus "now".
import { useState } from 'react';
import { decided } from '../../engine';
import type { AreaPoint, GameState, RegionId } from '../../engine';
import { areaName } from '../format';
import { sideColor } from './colors';
import { areaNowAndStart, METRIC_LABEL } from './StateMap';
import type { MapLayer } from './StateMap';

const W = 600;
const H = 190;
const PAD = { l: 40, r: 16, t: 14, b: 26 };

interface Series {
  name: string;
  color: string;
  values: (number | undefined)[];
}

export function TrailChart({ state, regionId, layer }: { state: GameState; regionId: RegionId; layer: MapLayer }) {
  const { now, trail } = areaNowAndStart(state);
  const [hover, setHover] = useState<number | null>(null);
  const metric =
    layer === 'shift' || layer === 'vote'
      ? 'vote'
      : layer === 'recognition' || layer === 'favorability' || layer === 'approval'
        ? layer
        : 'vote';
  const points: { label: string; p?: AreaPoint }[] = [
    ...trail.map((t, i) => ({ label: `T${i + 1}`, p: t.areas[regionId] })),
    { label: 'Now', p: now[regionId] },
  ];
  if (!now[regionId]) return null;
  const race = state.career.race;
  const fav = metric === 'favorability';
  const series: Series[] =
    metric === 'vote'
      ? [
          {
            name: 'You',
            color: sideColor(state.career.affiliation, 0, true),
            values: points.map((x) => (x.p?.shares ? decided(x.p.shares)[0] : undefined)),
          },
          ...(race?.opponents ?? []).map((c, i) => ({
            name: c.name,
            color: sideColor(c.affiliation, c.lean, false),
            values: points.map((x) => (x.p?.shares ? decided(x.p.shares)[i + 1] : undefined)),
          })),
        ]
      : [
          {
            name: METRIC_LABEL[metric],
            color: '#f5c842',
            values: points.map((x) =>
              x.p ? (metric === 'recognition' ? x.p.rec : metric === 'favorability' ? x.p.fav : x.p.approval) : undefined,
            ),
          },
        ];
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== undefined);
  if (!all.length) return null;
  const lo = fav ? Math.min(-0.2, ...all) : 0;
  const hi = fav ? Math.max(0.2, ...all) : Math.max(0.5, ...all) + 0.05;
  const x = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v: number) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);
  const fmt = (v: number) => (fav ? `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}` : `${Math.round(v * 100)}%`);
  const ticks = fav ? [lo, 0, hi] : [0, hi / 2, hi];

  return (
    <figure className="trail-chart">
      <figcaption>
        <strong>{areaName(regionId)}</strong> · {METRIC_LABEL[metric]}, turn by turn
      </figcaption>
      {series.length > 1 && (
        <div className="trail-legend" aria-hidden="true">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="trail-plot" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${METRIC_LABEL[metric]} in ${areaName(regionId)} by turn`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="trail-grid" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="trail-axis">
                {fmt(t)}
              </text>
            </g>
          ))}
          {points.map((pt, i) => (
            <text key={pt.label} x={x(i)} y={H - 8} textAnchor="middle" className={`trail-axis${pt.label === 'Now' ? ' now' : ''}`}>
              {pt.label}
            </text>
          ))}
          {series.map((s) => {
            const d = s.values
              .map((v, i) => (v === undefined ? '' : `${x(i)},${y(v)}`))
              .filter(Boolean)
              .join(' L');
            return (
              <g key={s.name}>
                {d && <path d={`M${d}`} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />}
                {s.values.map((v, i) =>
                  v === undefined ? null : <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="#0b1430" strokeWidth={2} />,
                )}
              </g>
            );
          })}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="trail-cross" />}
          {points.map((pt, i) => (
            <rect
              key={pt.label}
              x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, points.length - 1) / 2}
              y={0}
              width={(W - PAD.l - PAD.r) / Math.max(1, points.length - 1)}
              height={H}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hover !== null && (
          <div className="trail-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <strong>{hover === points.length - 1 ? 'Now' : (trail[hover]?.label ?? points[hover]!.label)}</strong>
            {series.map((s) =>
              s.values[hover] === undefined ? null : (
                <span key={s.name}>
                  <i style={{ background: s.color }} /> {s.name} {fmt(s.values[hover]!)}
                </span>
              ),
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
