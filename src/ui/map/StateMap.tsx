// The TV map: the state's districts, or a city's neighborhoods when that's the race (or the office).
// Layers: who leads, how it moved this turn, approval, lean, recognition, favorability, election night.
import { useState } from 'react';
import { getOffice, getRegion } from '../../data';
import { MAPS } from '../../data/geometry';
import { counted, decided, poll, reportedShares } from '../../engine';
import type { GameState, RegionId } from '../../engine';
import { favorabilityColor, leadColor, leanColor, recognitionColor, sideColor } from './colors';

export type MapLayer = 'vote' | 'shift' | 'approval' | 'lean' | 'recognition' | 'favorability' | 'night';

export const MAP_LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'vote', label: 'Leading' },
  { id: 'shift', label: 'Shift this turn' },
  { id: 'approval', label: 'Job approval' },
  { id: 'lean', label: 'Partisan lean' },
  { id: 'recognition', label: 'Your recognition' },
  { id: 'favorability', label: 'Your favorability' },
];

interface Props {
  state: GameState;
  layer: MapLayer;
  selected: RegionId;
  onSelect: (id: RegionId) => void;
  /** A region a card is being dragged over. */
  hover?: RegionId;
  /** Show the popup with the area's numbers when an area is tapped. */
  popup?: boolean;
}

/** Which map to draw: the city when the race (or office) is a mayoralty, otherwise the state. */
export function mapIdFor(state: GameState): string {
  const officeId = state.night?.officeId ?? state.career.race?.officeId ?? state.career.office?.officeId;
  if (officeId && MAPS[officeId]) return officeId;
  return getRegion(state.politician.residentRegionId).state;
}

/** Map-ready regions of the current map. */
export function mapRegions(state: GameState): RegionId[] {
  return Object.keys(MAPS[mapIdFor(state)]!.shapes);
}

const UNDECIDED = '#7d8794';

function names(state: GameState): string[] {
  return [state.politician.name, ...(state.career.race?.opponents.map((c) => c.name) ?? [])];
}

function fmt(v: number): string {
  return (v * 100).toFixed(1);
}

function delta(v: number): string {
  const d = v * 100;
  return `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`;
}

export function StateMap({ state, layer, selected, onSelect, hover, popup }: Props) {
  const geo = MAPS[mapIdFor(state)]!;
  const race = state.career.race?.platform.length ? state.career.race : undefined;
  const intention = race ? poll(state, race).regions : {};
  const prev = race?.prevPoll ?? {};
  const raceIds = race ? new Set(getOffice(race.officeId).regionIds) : undefined;
  const night = state.night;
  const field = state.career.race?.opponents ?? [];
  const [open, setOpen] = useState<RegionId | null>(null);

  const colorOf = (i: number) => {
    if (i === 0) return sideColor(state.career.affiliation, 0, true);
    const rival = field[i - 1];
    return rival ? sideColor(rival.affiliation, rival.lean, false) : UNDECIDED;
  };
  /** Shares include undecided last: grey when undecided is the biggest bloc. */
  const leaderFill = (shares: number[], withUndecided: boolean) => {
    const top = shares.indexOf(Math.max(...shares));
    const margin = shares[top]! - Math.max(...shares.filter((_, i) => i !== top), 0);
    if (withUndecided && top === shares.length - 1) return UNDECIDED;
    return leadColor(colorOf(top), margin);
  };
  const fill = (id: RegionId) => {
    if (layer === 'night') {
      if (!night?.regions[id]) return '#1f2a3d';
      const rep = reportedShares(night, id);
      return rep ? leaderFill(rep, false) : '#2a3650';
    }
    if (layer === 'vote') {
      const shares = intention[id];
      return shares ? leaderFill(shares, true) : '#253247';
    }
    if (layer === 'shift') {
      const now = intention[id];
      const before = prev[id];
      if (!now || !before) return '#253247';
      return favorabilityColor((now[0]! - before[0]!) * 30);
    }
    if (layer === 'approval') {
      const a = state.career.office?.approval[id];
      return a === undefined ? '#253247' : favorabilityColor((a - 0.5) * 3);
    }
    if (layer === 'lean') return leanColor(getRegion(id).partisanLean);
    const you = state.regions[id]!;
    return layer === 'recognition' ? recognitionColor(you.recognition) : favorabilityColor(you.favorability);
  };
  const sub = (id: RegionId): string | undefined => {
    const nr = layer === 'night' ? night?.regions[id] : undefined;
    if (nr) return nr.calledFor !== undefined ? (nr.calledFor === 0 ? 'YOU' : 'THEM') : `${Math.round(counted(nr, night!.step) * 100)}%`;
    if (layer === 'approval') {
      const a = state.career.office?.approval[id];
      return a === undefined ? undefined : `${Math.round(a * 100)}%`;
    }
    if (layer === 'vote' && intention[id]) return `You ${Math.round(decided(intention[id]!)[0]! * 100)}%`;
    if (layer === 'shift' && intention[id] && prev[id]) return delta(intention[id]![0]! - prev[id]![0]!);
    return undefined;
  };
  const dim = (id: RegionId) =>
    ((layer === 'vote' || layer === 'shift') && raceIds && !raceIds.has(id)) ||
    (layer === 'approval' && state.career.office?.approval[id] === undefined) ||
    (layer === 'night' && !night?.regions[id]);
  const label = (id: RegionId) => {
    const r = getRegion(id);
    return r.parent ? r.name.split(/ & | and /)[0]! : r.seatCity;
  };
  const order = Object.keys(geo.shapes).sort((a, b) => Number(a === selected) - Number(b === selected));
  const pick = (id: RegionId) => {
    onSelect(id);
    if (popup) setOpen(open === id ? null : id);
  };

  return (
    <div className="race-map">
      <svg className="state-map" viewBox={geo.viewBox} role="group" aria-label="Map">
        <defs>
          <filter id="map-lift" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <linearGradient id="map-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.02" />
            <stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {geo.decor.map((d, i) => (
          <path key={i} d={d.d} className={`map-decor ${d.kind}`} />
        ))}
        {order.map((id) => {
          const shape = geo.shapes[id]!;
          const s = sub(id);
          const isSelected = id === selected;
          const isHome = id === state.politician.residentRegionId;
          return (
            <g
              key={id}
              className={`map-region${isSelected ? ' selected' : ''}${hover === id ? ' drop' : ''}${dim(id) ? ' dim' : ''}`}
              role="button"
              data-region={id}
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${getRegion(id).name}${s ? ` ${s}` : ''}`}
              onClick={() => pick(id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(id);
                }
              }}
            >
              <path d={shape.d} fill={fill(id)} filter="url(#map-lift)" />
              <path d={shape.d} className="gloss" fill="url(#map-gloss)" />
              {isHome && <circle cx={shape.label[0]} cy={shape.label[1] - 12} r={3.5} className="city home" />}
              <text x={shape.label[0]} y={shape.label[1]} className="map-label" textAnchor="middle">
                {label(id)}
              </text>
              {s && ' '}
              {s && (
                <text x={shape.label[0]} y={shape.label[1] + 11} className="map-label sub" textAnchor="middle">
                  {s}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {popup && open && <AreaPopup state={state} regionId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** "Downtown: Ellis 54.1 (+1.6) · Bican 23.0 (−1.1) · Undecided 22.9 (−0.5)" */
export function AreaPopup({ state, regionId, onClose }: { state: GameState; regionId: RegionId; onClose: () => void }) {
  const race = state.career.race?.platform.length ? state.career.race : undefined;
  const region = getRegion(regionId);
  const shares = race ? poll(state, race).regions[regionId] : undefined;
  const before = race?.prevPoll?.[regionId];
  const list = names(state);
  const rows = shares
    ? shares.map((v, i) => ({ name: i < list.length ? list[i]! : 'Undecided', v, d: before ? v - before[i]! : undefined, i }))
    : [];
  const sorted = [...rows.slice(0, -1)].sort((a, b) => b.v - a.v);
  if (rows.length) sorted.push(rows.at(-1)!);
  return (
    <div className="area-popup" role="dialog" aria-label={region.name}>
      <div className="area-popup-head">
        <strong>{region.name}</strong>
        <button aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {sorted.length ? (
        <ul>
          {sorted.map((r) => (
            <li key={r.name} className={r.i === 0 ? 'you' : undefined}>
              <span
                className="swatch"
                style={{
                  background:
                    r.i === rows.length - 1
                      ? UNDECIDED
                      : r.i === 0
                        ? sideColor(state.career.affiliation, 0, true)
                        : sideColor(race!.opponents[r.i - 1]!.affiliation, race!.opponents[r.i - 1]!.lean, false),
                }}
              />
              <span className="area-name">{r.name}</span>
              <span className="num">{fmt(r.v)}</span>
              {r.d !== undefined && <span className={`num small ${r.d >= 0 ? 'pos' : 'neg'}`}>({delta(r.d)})</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Not in your race.</p>
      )}
    </div>
  );
}
