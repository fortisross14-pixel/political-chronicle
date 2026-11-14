import { useEffect, useState } from 'react';
import {
  applyAction,
  buildRunConfig,
  createRun,
  createScenarioRun,
  DIFFICULTY,
  endTurnBlocker,
  isElectionTurn,
  isPrimaryTurn,
  GameError,
  recordRun,
  turnLabel,
} from '../engine';
import type { Action, GameState, Profile, RecordOutcome } from '../engine';
import { loadProfile, saveProfile } from '../storage/profile';
import { clearSave, loadAllSlots, saveGame, SLOT_COUNT } from '../storage/save';
import { Header } from './Header';
import { ICONS } from './icons';
import { cue } from './fx/sound';
import type { Cue } from './fx/sound';
import { ScenarioSelect } from './menu/ScenarioSelect';
import { SandboxSetup } from './menu/SandboxSetup';
import { HallOfRuns } from './results/HallOfRuns';
import { RunResults } from './results/RunResults';
import { StartScreen } from './StartScreen';
import { GovernmentTab } from './tabs/GovernmentTab';
import { PartyTab } from './tabs/PartyTab';
import { ProfileTab } from './tabs/ProfileTab';
import { WorldTab } from './tabs/WorldTab';
import { PackOpening } from './campaign/Packs';

type TabId = 'government' | 'profile' | 'party' | 'world';
type Screen = 'menu' | 'scenarios' | 'sandbox' | 'hall' | 'game';

const TABS: { id: TabId; label: string }[] = [
  { id: 'government', label: 'Government' },
  { id: 'profile', label: 'My profile' },
  { id: 'party', label: 'My party' },
  { id: 'world', label: 'World' },
];

/** A news-style lower third with the latest thing that happened. It fades on its own. */
function Breaking({ state }: { state: GameState }) {
  const latest = state.log.at(-1);
  if (!latest || state.night) return null;
  return (
    <div key={state.log.length} className="breaking" role="status">
      <span className="breaking-tag">Latest</span>
      <span className="breaking-text">{latest.text}</span>
    </div>
  );
}

/** The sound each action makes when it succeeds. */
const ACTION_CUES: Partial<Record<Action['type'], Cue>> = {
  PLAY_EVENT: 'play',
  RESOLVE_DECISIONS: 'stamp',
  END_TURN: 'turn',
  ASSIGN_PERSON: 'deal',
  UNASSIGN_ROLE: 'deal',
  DISCARD_PERSON: 'deal',
  USE_ITEM: 'play',
  NIGHT_MOBILIZE: 'play',
  NIGHT_LAWYERS: 'stamp',
  NIGHT_AD_BLITZ: 'coin',
  NIGHT_ADVANCE: 'tick',
  LAUNCH_CAMPAIGN: 'turn',
  BUY_PACK: 'coin',
  KEEP_FROM_PACK: 'deal',
  PLAY_POLICY: 'play',
  ASK_TO_JOIN: 'stamp',
  DISMISS_RESULT: 'tap',
};

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  // Load once: every save slot (upgraded from older formats if needed) and a note for the menu.
  const [initial] = useState(() => loadAllSlots());
  const [slots, setSlots] = useState<(GameState | null)[]>(() => initial.map((r) => r.state));
  /** When each slot was last played, to pick which one to replace when all are full. */
  const [playedAt, setPlayedAt] = useState<number[]>(() =>
    initial.map((r) => ('savedAt' in r && r.savedAt ? Date.parse(r.savedAt) || 0 : 0)),
  );
  const [active, setActive] = useState(0);
  const saveNotice = initial.some((r) => 'migratedFrom' in r && r.migratedFrom)
    ? 'Your saved games were upgraded to this version.'
    : initial.map((r) => ('reason' in r ? r.reason : undefined)).find(Boolean);
  const setSlot = (i: number, s: GameState | null) => setSlots((all) => all.map((x, k) => (k === i ? s : x)));
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [tab, setTab] = useState<TabId>('government');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state) saveGame(state, active);
  }, [state, active]);
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // A run is over once its last result has been seen: file it in the profile (once).
  const finished = !!state?.ended && state.pendingResult === undefined && !state.night;
  useEffect(() => {
    if (!state || !finished || outcome) return;
    const recorded = recordRun(profile, state);
    setOutcome(recorded);
    setProfile(recorded.profile);
  }, [finished, state, outcome, profile]);

  const begin = (s: GameState, slot = active) => {
    setActive(slot);
    setPlayedAt((all) => all.map((x, k) => (k === slot ? Date.now() : x)));
    setOutcome(null);
    setTab('government');
    setState(s);
    setScreen('game');
  };
  const toMenu = () => {
    if (state?.ended) {
      clearSave(active);
      setSlot(active, null);
    } else if (state) setSlot(active, state);
    setState(null);
    setOutcome(null);
    setScreen('menu');
  };
  /** The slot a new run goes into: the first free one, or (after asking) the one played longest ago. */
  const freeSlot = (): number | undefined => {
    const free = slots.findIndex((s) => !s || s.ended);
    if (free >= 0) return free;
    const oldest = playedAt.indexOf(Math.min(...playedAt));
    const who = slots[oldest]!;
    return window.confirm(`All ${SLOT_COUNT} slots are in use. Replace slot ${oldest + 1} (${who.politician.name})?`) ? oldest : undefined;
  };
  const startNew = (make: () => GameState) => {
    const slot = freeSlot();
    if (slot === undefined) return;
    begin(make(), slot);
  };

  const dispatch = (action: Action) => {
    if (!state) return;
    try {
      const next = applyAction(state, action);
      setState(next);
      setError(null);
      const called = state.night && next.night && state.night.calledFor === undefined ? next.night.calledFor : undefined;
      if (called !== undefined) cue(called === 0 ? 'call-win' : 'call-lose');
      else if (state.pendingResult === undefined && next.pendingResult !== undefined)
        cue(next.elections[next.pendingResult]!.playerWon ? 'call-win' : 'call-lose');
      else {
        const sound = ACTION_CUES[action.type];
        if (sound) cue(sound);
      }
    } catch (e) {
      cue('error');
      // Rule violations are shown to the player; anything else is a bug.
      if (e instanceof GameError) setError(e.message);
      else {
        console.error(e);
        setError('Something went wrong. Your game is saved; try again or reload.');
      }
    }
  };

  if (screen === 'scenarios')
    return (
      <ScenarioSelect
        profile={profile}
        onBack={() => setScreen('menu')}
        onStart={(id, name, trinkets, extra) =>
          startNew(() => createScenarioRun(id, { name, artifacts: trinkets, extra, seed: randomSeed() }))
        }
      />
    );
  if (screen === 'sandbox')
    return (
      <SandboxSetup
        profile={profile}
        onBack={() => setScreen('menu')}
        onStart={(input, trinkets, careerYears, difficulty) => {
          const config = buildRunConfig(input, randomSeed());
          startNew(() =>
            createRun({
              ...config,
              artifacts: trinkets,
              careerYears,
              modifiers: DIFFICULTY[difficulty],
            }),
          );
        }}
      />
    );
  if (screen === 'hall') return <HallOfRuns profile={profile} onBack={() => setScreen(state ? 'game' : 'menu')} />;

  if (!state || screen === 'menu') {
    return (
      <StartScreen
        slots={slots}
        notice={saveNotice}
        profile={profile}
        onContinue={(i) => slots[i] && begin(slots[i]!, i)}
        onDelete={(i) => {
          if (!window.confirm(`Delete the run in slot ${i + 1}?`)) return;
          clearSave(i);
          setSlot(i, null);
        }}
        onScenarios={() => setScreen('scenarios')}
        onSandbox={() => setScreen('sandbox')}
        onHall={() => setScreen('hall')}
      />
    );
  }

  if (finished) return <RunResults state={state} outcome={outcome} onMenu={toMenu} onHall={() => setScreen('hall')} />;

  const blocker = endTurnBlocker(state);
  const electionDay =
    !state.night && !!state.career.race?.platform.length && isElectionTurn(state.clock, state.career) && !isPrimaryTurn(state);
  const turnKey = `${state.clock.year}-${state.clock.turn}`;

  return (
    <div className="shell">
      <Header
        state={state}
        onMainMenu={toMenu}
        onAbandon={() => {
          if (!window.confirm('Abandon this run? It will be deleted.')) return;
          clearSave(active);
          setSlot(active, null);
          setState(null);
          setScreen('menu');
        }}
      />
      {/* A wipe with the new date each time the turn changes. */}
      <div key={turnKey} className="turn-splash" aria-hidden="true">
        <span>{turnLabel(state.clock)}</span>
      </div>
      <main className="content" key={tab}>
        {error && (
          <div className="toast" role="alert">
            {error} <button onClick={() => setError(null)}>OK</button>
          </div>
        )}
        {tab === 'government' && <GovernmentTab state={state} dispatch={dispatch} />}
        {tab === 'profile' && <ProfileTab state={state} />}
        {tab === 'party' && <PartyTab state={state} dispatch={dispatch} />}
        {tab === 'world' && <WorldTab state={state} />}
      </main>
      {state.packs.length > 0 && !state.night && (
        <PackOpening key={`${state.packs.length}-${state.packs[0]!.cards.join()}`} state={state} dispatch={dispatch} />
      )}
      <footer className="dock">
        <Breaking state={state} />
        {blocker && !state.ended && !state.night && <p className="dock-hint small">{blocker}</p>}
        <div className="dock-bar">
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'tab active' : 'tab'}
                onClick={() => setTab(t.id)}
              >
                {ICONS[t.id]}
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <button className="primary end-turn" onClick={() => dispatch({ type: 'END_TURN' })} disabled={!!blocker} title={blocker}>
            {electionDay ? 'Start election day' : 'End turn'}
          </button>
        </div>
      </footer>
    </div>
  );
}
