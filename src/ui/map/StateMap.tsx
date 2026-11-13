import { getOffice, getRegion } from '../../data';
import { decided, poll } from '../../engine';
import type { GameState, RegionId } from '../../engine';
import { favorabilityColor, leanColor, recognitionColor } from './colors';
import { NY_SHAPES, NY_VIEWBOX } from './nyShapes';

export type MapLayer = 'vote' | 'approval' | 'lean' | 'recognition' | 'favorability';

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
  const fill = (id: RegionId) => {
    if (layer === 'vote') {
      const shares = intention[id];
      if (!shares) return '#253247';
      const d = decided(shares);
      return favorabilityColor((d[0]! - Math.max(...d.slice(1))) * 2);
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
      {order.map((id) => {
        const shape = NY_SHAPES[id]!;
        const region = getRegion(id);
        const isSelected = id === selected;
        const isHome = id === state.politician.birthRegionId;
        return (
          <g
            key={id}
            className={`map-region${isSelected ? ' selected' : ''}${(layer === 'vote' && !inRace(id)) || (layer === 'approval' && state.career.office?.approval[id] === undefined) ? ' dim' : ''}`}
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
            {shape.polygons.map((points, i) => (
              <polygon key={i} points={points} fill={fill(id)} />
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
