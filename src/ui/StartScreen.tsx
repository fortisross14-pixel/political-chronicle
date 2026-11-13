import { turnLabel } from '../engine';
import type { GameState } from '../engine';

interface Props {
  saved: GameState | null;
  onContinue: () => void;
  onNewRun: () => void;
}

export function StartScreen({ saved, onContinue, onNewRun }: Props) {
  return (
    <div className="start">
      <h1>Political Chronicle</h1>
      <p className="tagline">Start as an independent. Win your town. Then win the state.</p>
      <div className="start-actions">
        {saved && (
          <button className="primary" onClick={onContinue}>
            Continue — {saved.politician.name}, {turnLabel(saved.clock)}
          </button>
        )}
        <button className={saved ? '' : 'primary'} onClick={onNewRun}>
          New run
        </button>
        <button disabled title="Arrives in M7">
          Hall of Runs
        </button>
      </div>
      <p className="muted small">Milestone 1 build: a placeholder politician is used until the creator lands in M2.</p>
    </div>
  );
}
