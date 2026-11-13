import { useEffect, useState } from 'react';
import { getOffice, STATES } from '../../data';
import type { Action, GameState, RegionId } from '../../engine';
import { CampaignPanel } from '../campaign/CampaignPanel';
import { DecisionTray } from '../campaign/DecisionTray';
import { ElectionResult } from '../campaign/ElectionResult';
import { HandPanel } from '../campaign/HandPanel';
import { MarketPanel } from '../campaign/MarketPanel';
import { PlatformBuilder } from '../campaign/PlatformBuilder';
import { RacePicker } from '../campaign/RacePicker';
import { RegionPanel } from '../map/RegionPanel';
import { MAP_LAYERS, StateMap } from '../map/StateMap';
import type { MapLayer } from '../map/StateMap';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
}

export function GovernmentTab({ state, dispatch }: Props) {
  const ny = STATES.NY!;
  const race = state.career.race;
  const campaigning = !!race?.platform.length;
  const [layer, setLayer] = useState<MapLayer>(campaigning ? 'vote' : 'lean');
  const [selected, setSelected] = useState<RegionId>(race ? getOffice(race.officeId).regionIds[0]! : state.politician.birthRegionId);
  useEffect(() => {
    if (campaigning) setLayer('vote');
  }, [campaigning]);
  const pending = state.pendingResult !== undefined ? state.elections[state.pendingResult] : undefined;

  const map = (
    <section className="panel">
      <div className="panel-head">
        <h2>{ny.name}</h2>
        <div className="segmented" role="radiogroup" aria-label="Map layer">
          {MAP_LAYERS.filter((l) => l.id !== 'vote' || campaigning).map((l) => (
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
          <StateMap state={state} layer={layer === 'vote' && !campaigning ? 'lean' : layer} selected={selected} onSelect={setSelected} />
          <p className="muted small">
            Schematic map, not to scale. Click a region for details.
            {layer === 'vote' && ' Teal: you lead the field there; orange: you trail.'}
          </p>
        </div>
        <RegionPanel state={state} regionId={selected} />
      </div>
    </section>
  );

  if (pending) {
    return (
      <div className="stack">
        <ElectionResult election={pending} dispatch={dispatch} />
        {map}
      </div>
    );
  }

  if (state.ended) {
    const wins = state.elections.filter((e) => e.playerWon).length;
    return (
      <div className="stack">
        <section className="panel">
          <h2>Career over</h2>
          <p>
            {state.ended.reason === 'retired' && `You retired in ${state.ended.year}.`}
            {state.ended.reason === 'losses' && `Three defeats in a row ended your career in ${state.ended.year}.`}
            {state.ended.reason === 'age' && `You stepped away from public life in ${state.ended.year}.`}{' '}
            Elections: {wins} won, {state.elections.length - wins} lost.
          </p>
          <p className="muted small">Career summaries and the Hall of Runs arrive in M7. Start a new run from the menu.</p>
        </section>
        {map}
      </div>
    );
  }

  return (
    <div className="stack">
      {race && !race.platform.length && <PlatformBuilder key={`${race.officeId}-${race.electionYear}`} state={state} dispatch={dispatch} />}
      {campaigning && <CampaignPanel state={state} />}
      {!race && state.career.office && (
        <section className="panel">
          <h2>{getOffice(state.career.office.officeId).name}</h2>
          <p className="muted small">
            Your term runs until {state.career.office.termEndsYear}. Governing — bills, approval ratings and re-election — arrives in M5. For now, end turns to
            serve your term.
          </p>
        </section>
      )}
      {!race && !state.career.office && <RacePicker state={state} dispatch={dispatch} />}
      {state.decisions && <DecisionTray key={state.decisions.turnNo} state={state} dispatch={dispatch} />}
      {map}
      {campaigning && (
        <HandPanel key={`${race!.officeId}-${race!.electionYear}`} state={state} dispatch={dispatch} regionId={selected} onRegionChange={setSelected} />
      )}
      <MarketPanel state={state} dispatch={dispatch} />
    </div>
  );
}
