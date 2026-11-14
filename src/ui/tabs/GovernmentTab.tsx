import { useEffect, useState } from 'react';
import { getOffice, STATES } from '../../data';
import type { Action, GameState, RegionId } from '../../engine';
import { CampaignPanel } from '../campaign/CampaignPanel';
import { DecisionTray } from '../campaign/DecisionTray';
import { ElectionResult } from '../campaign/ElectionResult';
import { HandPanel } from '../campaign/HandPanel';
import { MarketPanel } from '../campaign/MarketPanel';
import { OfficePanel } from '../campaign/OfficePanel';
import { TeamPanel } from '../campaign/TeamPanel';
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
  const inOffice = !!state.career.office;
  const canHoldEvents = campaigning || (inOffice && !race);
  const [layer, setLayer] = useState<MapLayer>(campaigning ? 'vote' : inOffice ? 'approval' : 'lean');
  const [selected, setSelected] = useState<RegionId>(race ? getOffice(race.officeId).regionIds[0]! : state.politician.residentRegionId);
  useEffect(() => {
    if (campaigning) setLayer('vote');
    else if (inOffice) setLayer('approval');
  }, [campaigning, inOffice]);
  const available = MAP_LAYERS.filter((l) => (l.id !== 'vote' || campaigning) && (l.id !== 'approval' || inOffice));
  const shownLayer = available.some((l) => l.id === layer) ? layer : 'lean';
  const pending = state.pendingResult !== undefined ? state.elections[state.pendingResult] : undefined;

  const map = (
    <section className="panel">
      <div className="panel-head">
        <h2>{ny.name}</h2>
        <div className="segmented" role="radiogroup" aria-label="Map layer">
          {available.map((l) => (
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
          <StateMap state={state} layer={shownLayer} selected={selected} onSelect={setSelected} />
          <p className="muted small">
            Schematic map, not to scale. Click a region for details.
            {shownLayer === 'vote' && ' Teal: you lead the field there; orange: you trail.'}
            {shownLayer === 'approval' && ' Teal: voters approve of your job; orange: they don’t.'}
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
      {inOffice && <OfficePanel state={state} dispatch={dispatch} />}
      {!race && !state.career.office && <RacePicker state={state} dispatch={dispatch} />}
      {state.decisions && <DecisionTray key={state.decisions.turnNo} state={state} dispatch={dispatch} />}
      {map}
      {canHoldEvents && (
        <HandPanel
          key={race ? `${race.officeId}-${race.electionYear}` : `office-${state.career.office!.termEndsYear}`}
          state={state}
          dispatch={dispatch}
          regionId={selected}
          onRegionChange={setSelected}
        />
      )}
      <MarketPanel state={state} dispatch={dispatch} />
      <TeamPanel state={state} dispatch={dispatch} />
    </div>
  );
}
