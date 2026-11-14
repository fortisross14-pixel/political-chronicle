import { getOffice, getRegion } from '../../data';
import { counted, decided, poll, reportedShares } from '../../engine';
import type { GameState, RegionId } from '../../engine';
import { favorabilityColor, leadColor, leanColor, recognitionColor, sideColor } from './colors';
import { NY_SHAPES, NY_VIEWBOX } from './nyShapes';

export type MapLayer = 'vote' | 'approval' | 'lean' | 'recognition' | 'favorability' | 'night';

export const MAP_LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'vote', label: 'Vote intention' },
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
}

export function StateMap({ state, layer, selected, onSelect }: Props) {
  const race = state.career.race?.platform.length ? state.career.race : undefined;
  const intention = race ? poll(state, race).regions : {};
  const inRace = (id: RegionId) => !race || getOffice(race.officeId).regionIds.includes(id);
  const night = state.night;
  const field = state.career.race?.opponents ?? [];
  /** Colour by who leads: index 0 is the player. */
  const leaderFill = (shares: number[]) => {
    const top = shares.indexOf(Math.max(...shares));
    const margin = shares[top]! - Math.max(...shares.filter((_, i) => i !== top), 0);
    const rival = field[top - 1];
    const base = top === 0 || !rival ? sideColor(state.career.affiliation, 0, true) : sideColor(rival.affiliation, rival.lean, false);
    return leadColor(base, margin);
  };
  const fill = (id: RegionId) => {
    if (layer === 'night') {
      const r = night?.regions[id];
      if (!r) return '#1f2a3d';
      const rep = reportedShares(night!, id);
      if (!rep) return '#2a3650';
      return leaderFill(rep);
    }
    if (layer === 'vote') {
      const shares = intention[id];
      if (!shares) return '#253247';
      return leaderFill(decided(shares));
    }
    if (layer === 'approval') {
      const a = state.career.office?.approval[id];
      return a === undefined ? '#253247' : favorabilityColor((a - 0.5) * 3);
    }
    if (layer === 'lean') return leanColor(getRegion(id).partisanLean);
    const you = state.regions[id]!;
    return layer === 'recognition' ? recognitionColor(you.recognition) : favorabilityColor(you.favorability);
  };
  // Draw the selected region last so its outline sits on top.
  const order = Object.keys(NY_SHAPES).sort((a, b) => Number(a === selected) - Number(b === selected));

  return (
    <svg className="state-map" viewBox={NY_VIEWBOX} role="group" aria-label="Map of New York regions">
      <defs>
        <filter id="map-lift" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <linearGradient id="map-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {order.map((id) => {
        const shape = NY_SHAPES[id]!;
        const region = getRegion(id);
        const isSelected = id === selected;
        const isHome = id === state.politician.residentRegionId;
        return (
          <g
            key={id}
            className={`map-region${isSelected ? ' selected' : ''}${(layer === 'vote' && !inRace(id)) || (layer === 'approval' && state.career.office?.approval[id] === undefined) || (layer === 'night' && !night?.regions[id]) ? ' dim' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={region.name}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(id);
              }
            }}
          >
            <g filter="url(#map-lift)">
              {shape.polygons.map((points, i) => (
                <polygon key={i} points={points} fill={fill(id)} />
              ))}
            </g>
            {shape.polygons.map((points, i) => (
              <polygon key={`g${i}`} className="gloss" points={points} fill="url(#map-gloss)" />
            ))}
            <circle cx={shape.city.x} cy={shape.city.y} r={isHome ? 4.5 : 3} className={isHome ? 'city home' : 'city'} />
            <text x={shape.label.x} y={shape.label.y} className="map-label" textAnchor="middle">
              {region.seatCity === 'New York City' ? 'NYC' : region.seatCity}
            </text>
            {layer === 'approval' && state.career.office?.approval[id] !== undefined && (
              <text x={shape.label.x} y={shape.label.y + 14} className="map-label sub" textAnchor="middle">
                {Math.round(state.career.office.approval[id]! * 100)}% approve
              </text>
            )}
            {layer === 'night' && night?.regions[id] && (
              <text x={shape.label.x} y={shape.label.y + 14} className="map-label sub" textAnchor="middle">
                {night.regions[id]!.calledFor !== undefined
                  ? night.regions[id]!.calledFor === 0
                    ? 'YOU WIN'
                    : 'THEY WIN'
                  : `${Math.round(counted(night.regions[id]!, night.step) * 100)}% in`}
              </text>
            )}
            {layer === 'vote' && intention[id] && (
              <text x={shape.label.x} y={shape.label.y + 14} className="map-label sub" textAnchor="middle">
                You {Math.round(decided(intention[id]!)[0]! * 100)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
