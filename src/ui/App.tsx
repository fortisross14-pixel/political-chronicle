import { useEffect, useState } from 'react';
import { applyAction, buildRunConfig, createRun, createScenarioRun, recordRun } from '../engine';
import type { Action, GameState, Profile, RecordOutcome } from '../engine';
import { loadProfile, saveProfile } from '../storage/profile';
import { clearSave, loadGame, saveGame } from '../storage/save';
import { Header } from './Header';
import { ScenarioSelect } from './menu/ScenarioSelect';
import { SandboxSetup } from './menu/SandboxSetup';
import { HallOfRuns } from './results/HallOfRuns';
import { RunResults } from './results/RunResults';
import { StartScreen } from './StartScreen';
import { GovernmentTab } from './tabs/GovernmentTab';
import { PartyTab } from './tabs/PartyTab';
import { ProfileTab } from './tabs/ProfileTab';

type TabId = 'government' | 'profile' | 'party';
type Screen = 'menu' | 'scenarios' | 'sandbox' | 'hall' | 'game';

const TABS: { id: TabId; label: string }[] = [
  { id: 'government', label: 'Government' },
  { id: 'profile', label: 'My profile' },
  { id: 'party', label: 'My party' },
];

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => loadGame());
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [tab, setTab] = useState<TabId>('government');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);
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

  const begin = (s: GameState) => {
    setOutcome(null);
    setTab('government');
    setState(s);
    setScreen('game');
  };
  const toMenu = () => {
    if (state?.ended) {
      clearSave();
      setSaved(null);
    } else if (state) setSaved(state);
    setState(null);
    setOutcome(null);
    setScreen('menu');
  };
  const confirmReplace = () => !saved || saved.ended || window.confirm('Starting a new run replaces your saved run. Continue?');

  const dispatch = (action: Action) => {
    if (!state) return;
    try {
      setState(applyAction(state, action));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (screen === 'scenarios')
    return (
      <ScenarioSelect
        profile={profile}
        onBack={() => setScreen('menu')}
        onStart={(id, name, artifacts) => confirmReplace() && begin(createScenarioRun(id, { name, artifacts, seed: randomSeed() }))}
      />
    );
  if (screen === 'sandbox')
    return (
      <SandboxSetup
        profile={profile}
        onBack={() => setScreen('menu')}
        onStart={(input, artifacts, abilities, careerYears) => {
          if (!confirmReplace()) return;
          const config = buildRunConfig(input, randomSeed());
          begin(createRun({ ...config, politician: { ...config.politician, abilities }, artifacts, careerYears }));
        }}
      />
    );
  if (screen === 'hall') return <HallOfRuns profile={profile} onBack={() => setScreen(state ? 'game' : 'menu')} />;

  if (!state || screen === 'menu') {
    return (
      <StartScreen
        saved={saved}
        profile={profile}
        onContinue={() => saved && begin(saved)}
        onScenarios={() => setScreen('scenarios')}
        onSandbox={() => setScreen('sandbox')}
        onHall={() => setScreen('hall')}
      />
    );
  }

  if (finished) return <RunResults state={state} outcome={outcome} onMenu={toMenu} onHall={() => setScreen('hall')} />;

  return (
    <div className="shell">
      <Header
        state={state}
        onEndTurn={() => dispatch({ type: 'END_TURN' })}
        onMainMenu={toMenu}
        onAbandon={() => {
          if (!window.confirm('Abandon this run? It will be deleted.')) return;
          clearSave();
          setSaved(null);
          setState(null);
          setScreen('menu');
        }}
      />
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="content">
        {error && (
          <div className="toast" role="alert">
            {error} <button onClick={() => setError(null)}>OK</button>
          </div>
        )}
        {tab === 'government' && <GovernmentTab state={state} dispatch={dispatch} />}
        {tab === 'profile' && <ProfileTab state={state} />}
        {tab === 'party' && <PartyTab state={state} dispatch={dispatch} />}
      </main>
    </div>
  );
}
