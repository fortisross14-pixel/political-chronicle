import { useEffect, useState } from 'react';
import { applyAction, createRun, defaultPolitician } from '../engine';
import type { Action, GameState } from '../engine';
import { clearSave, loadGame, saveGame } from '../storage/save';
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

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  const dispatch = (action: Action) => setState((s) => (s ? applyAction(s, action) : s));

  if (!state) {
    return (
      <StartScreen
        saved={saved}
        onContinue={() => saved && setState(saved)}
        onNewRun={() => {
          setTab('government');
          setState(createRun({ seed: randomSeed(), politician: defaultPolitician(), startingFunds: 15_000 }));
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
        {tab === 'government' && <GovernmentTab state={state} />}
        {tab === 'profile' && <ProfileTab state={state} />}
        {tab === 'party' && <PartyTab state={state} />}
      </main>
    </div>
  );
}
