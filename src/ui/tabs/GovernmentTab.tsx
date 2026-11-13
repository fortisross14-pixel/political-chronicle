import { useState } from 'react';
import { OFFICES, STATES } from '../../data';
import { nextElectionYear } from '../../engine';
import type { GameState, RegionId } from '../../engine';
import { RegionPanel } from '../map/RegionPanel';
import { MAP_LAYERS, StateMap } from '../map/StateMap';
import type { MapLayer } from '../map/StateMap';

export function GovernmentTab({ state }: { state: GameState }) {
  const ny = STATES.NY!;
  const [layer, setLayer] = useState<MapLayer>('lean');
  const [selected, setSelected] = useState<RegionId>(state.politician.birthRegionId);
  const raceOffice = state.career.race?.officeId;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>{ny.name}</h2>
          <div className="segmented" role="radiogroup" aria-label="Map layer">
            {MAP_LAYERS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={layer === l.id}
                className={layer === l.id ? 'active' : undefined}
                onClick={() => setLayer(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="map-layout">
          <div>
            <StateMap state={state} layer={layer} selected={selected} onSelect={setSelected} />
            <p className="muted small">Schematic map, not to scale. Click a region for details. The vote-intention layer arrives with campaigns (M3).</p>
          </div>
          <RegionPanel state={state} regionId={selected} />
        </div>
      </section>

      <section className="panel">
        <h2>Offices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Office</th>
              <th>Term</th>
              <th>Next election</th>
            </tr>
          </thead>
          <tbody>
            {OFFICES.filter((o) => o.state === ny.id).map((o) => (
              <tr key={o.id} className={o.id === raceOffice ? 'highlight' : undefined}>
                <td>{o.name}</td>
                <td>{o.termYears} yrs</td>
                <td>{nextElectionYear(o, state.clock.year)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Decisions this turn</h2>
        <p className="muted small">Three decision cards per turn (apply 1–3) arrive in M3.</p>
      </section>
    </div>
  );
}
