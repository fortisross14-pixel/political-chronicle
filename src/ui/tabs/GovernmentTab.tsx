import { useEffect, useState } from 'react';
import { getOffice, getRegion, STATES } from '../../data';
import { raceBoard } from '../../engine';
import type { Action, GameState, RegionId } from '../../engine';
import { CampaignPanel } from '../campaign/CampaignPanel';
import { DecisionTray } from '../campaign/DecisionTray';
import { ElectionResult } from '../campaign/ElectionResult';
import { HandPanel } from '../campaign/HandPanel';
import { TrinketBar } from '../campaign/TrinketBar';
import { LaunchScreen, LaunchButton } from '../campaign/LaunchFlow';
import { PackShop } from '../campaign/Packs';
import { PolicyHand } from '../campaign/PolicyHand';
import { OfficePanel } from '../campaign/OfficePanel';
import { ScenarioHud } from '../campaign/ScenarioHud';
import { TeamPanel } from '../campaign/TeamPanel';
import { ElectionNight } from '../night/ElectionNight';
import { RegionPanel } from '../map/RegionPanel';
import { MAP_LAYERS, mapIdFor, mapRegions, StateMap } from '../map/StateMap';
import { TrailChart } from '../map/TrailChart';
import type { MapLayer } from '../map/StateMap';
import { ICONS } from '../icons';

type Section = 'desk' | 'map' | 'cards' | 'packs' | 'team';

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
  const [section, setSection] = useState<Section>('desk');
  const [launching, setLaunching] = useState<string | null>(null);
  const [picked, setSelected] = useState<RegionId>(race ? getOffice(race.officeId).regionIds[0]! : state.politician.residentRegionId);
  // Keep the selection on the map being shown (a city's neighborhoods, or the state's districts).
  const onMap = mapRegions(state);
  const selected = onMap.includes(picked)
    ? picked
    : (onMap.find((id) => getRegion(id).parent === state.politician.residentRegionId) ?? onMap[0]!);
  useEffect(() => {
    if (campaigning) setLayer('vote');
    else if (inOffice) setLayer('approval');
  }, [campaigning, inOffice]);
  const available = MAP_LAYERS.filter((l) => ((l.id !== 'vote' && l.id !== 'shift') || campaigning) && (l.id !== 'approval' || inOffice));
  const shownLayer = available.some((l) => l.id === layer) ? layer : 'lean';
  const pending = state.pendingResult !== undefined ? state.elections[state.pendingResult] : undefined;

  const map = (
    <section className="panel">
      <div className="panel-head">
        <h2>{mapTitle(state, ny.name)}</h2>
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
          <div className="map-stage">
            <StateMap state={state} layer={shownLayer} selected={selected} onSelect={setSelected} popup />
          </div>
          <TrailChart state={state} regionId={selected} layer={shownLayer} />
          <p className="muted small">
            {shownLayer === 'vote' && 'Colour of whoever leads; grey where undecided voters are the biggest bloc. Tap an area.'}
            {shownLayer === 'shift' && 'Teal: you gained this turn; orange: you slipped. Tap an area for the numbers.'}
            {shownLayer === 'approval' && 'Teal: voters approve of your job; orange: they don’t.'}
          </p>
        </div>
        <RegionPanel state={state} regionId={selected} />
      </div>
    </section>
  );

  if (state.night) return <ElectionNight state={state} dispatch={dispatch} />;

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
            {state.ended.reason === 'age' && `You stepped away from public life in ${state.ended.year}.`} Elections: {wins} won,{' '}
            {state.elections.length - wins} lost.
          </p>
          <p className="muted small">Your career summary is next.</p>
        </section>
        {map}
      </div>
    );
  }

  const todo = !!state.decisions && !state.decisions.resolved;
  const canLaunch = !race && raceBoardHasOpen(state);
  const sections: { id: Section; label: string; badge?: string; alert?: boolean }[] = [
    { id: 'desk', label: 'Government', badge: todo || canLaunch ? '!' : undefined, alert: true },
    { id: 'map', label: 'Map' },
    {
      id: 'cards',
      label: 'Campaign',
      badge: state.energy > 0 && (canHoldEvents || state.policyHand.length) ? String(state.energy) : undefined,
    },
    { id: 'packs', label: 'Packs' },
    { id: 'team', label: 'Team', badge: state.team.cards.length ? String(state.team.cards.length) : undefined },
  ];
  const shown = sections.some((x) => x.id === section) ? section : 'desk';

  return (
    <div className="stack">
      <nav className="section-nav" aria-label="Government sections">
        {sections.map((x) => (
          <button
            key={x.id}
            className={shown === x.id ? 'section active' : 'section'}
            aria-pressed={shown === x.id}
            onClick={() => setSection(x.id)}
          >
            {ICONS[x.id]}
            <span>{x.label}</span>
            {x.badge && <span className={x.alert ? 'pip alert' : 'pip'}>{x.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="stack section-body" key={shown}>
        {shown === 'desk' && (
          <>
            {state.scenario && <ScenarioHud state={state} />}
            {state.decisions && <DecisionTray key={state.decisions.turnNo} state={state} dispatch={dispatch} />}
            {!race && (
              <LaunchButton
                state={state}
                label={inOffice ? 'Launch your next campaign' : 'Launch a campaign'}
                onPick={(id) => setLaunching(id)}
              />
            )}
            {inOffice && <TrinketBar state={state} dispatch={dispatch} windows={['governing']} />}
            {inOffice && <OfficePanel state={state} dispatch={dispatch} />}
            {(canHoldEvents || state.policyHand.length > 0) && state.energy > 0 && (!state.decisions || state.decisions.resolved) && (
              <button className="next-step" onClick={() => setSection('cards')}>
                {state.energy} energy left: go campaign
              </button>
            )}
          </>
        )}
        {shown === 'map' && map}
        {shown === 'cards' && (
          <>
            {campaigning && <CampaignPanel state={state} />}
            <TrinketBar state={state} dispatch={dispatch} windows={['campaign', 'mobilize']} />
            {canHoldEvents ? (
              <HandPanel
                key={race ? `${race.officeId}-${race.electionYear}` : `office-${state.career.office!.termEndsYear}`}
                state={state}
                dispatch={dispatch}
                regionId={selected}
                onRegionChange={setSelected}
              />
            ) : (
              <section className="panel">
                <h2>Campaign actions</h2>
                <p className="muted small">Launch a campaign to play them.</p>
              </section>
            )}
            <PolicyHand state={state} dispatch={dispatch} regionId={selected} />
          </>
        )}
        {shown === 'packs' && <PackShop state={state} dispatch={dispatch} />}
        {shown === 'team' && <TeamPanel state={state} dispatch={dispatch} />}
      </div>
      {launching && <LaunchScreen state={state} officeId={launching} dispatch={dispatch} onClose={() => setLaunching(null)} />}
    </div>
  );
}

/** "Watertown" for a city map, else the state's name. */
function mapTitle(state: GameState, stateName: string): string {
  const id = mapIdFor(state);
  return id.startsWith('mayor-') ? getOffice(id).name.replace('Mayor of ', '') : stateName;
}

function raceBoardHasOpen(state: GameState): boolean {
  return raceBoard(state).some((r) => r.status === 'open');
}
