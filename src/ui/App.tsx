import { useEffect, useState } from 'react';
import { applyAction, buildRunConfig, createRun } from '../engine';
import type { Action, GameState } from '../engine';
import { clearSave, loadGame, saveGame } from '../storage/save';
import { Creator } from './Creator';
import { Header } from './Header';
import { StartScreen } from './StartScreen';
import { GovernmentTab } from './tabs/GovernmentTab';
import { PartyTab } from './tabs/PartyTab';
import { ProfileTab } from './tabs/ProfileTab';

type TabId = 'government' | 'profile' | 'party';

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
  const [tab, setTab] = useState<TabId>('government');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  const [error, setError] = useState<string | null>(null);
  const dispatch = (action: Action) => {
    if (!state) return;
    try {
      setState(applyAction(state, action));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!state && creating) {
    return (
      <Creator
        onCancel={() => setCreating(false)}
        onCreate={(input) => {
          setTab('government');
          setCreating(false);
          setState(createRun(buildRunConfig(input, randomSeed())));
        }}
      />
    );
  }

  if (!state) {
    return (
      <StartScreen
        saved={saved}
        onContinue={() => saved && setState(saved)}
        onNewRun={() => {
          if (saved && !window.confirm('Starting a new run replaces your saved run. Continue?')) return;
          setCreating(true);
        }}
      />
    );
  }

  return (
    <div className="shell">
      <Header
        state={state}
        onEndTurn={() => dispatch({ type: 'END_TURN' })}
        onMainMenu={() => {
          setSaved(state);
          setState(null);
        }}
        onAbandon={() => {
          if (!window.confirm('Abandon this run? It will be deleted.')) return;
          clearSave();
          setSaved(null);
          setState(null);
        }}
      />
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
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
