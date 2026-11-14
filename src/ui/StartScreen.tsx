import { getScenario } from '../data';
import { sandboxUnlocked, totalStars, turnLabel } from '../engine';
import type { GameState, Profile } from '../engine';

interface Props {
  saved: GameState | null;
  profile: Profile;
  onContinue: () => void;
  onScenarios: () => void;
  onSandbox: () => void;
  onHall: () => void;
}

export function StartScreen({ saved, profile, onContinue, onScenarios, onSandbox, onHall }: Props) {
  const sandbox = sandboxUnlocked(profile);
  const live = saved && !saved.ended ? saved : null;
  return (
    <div className="start">
      <h1>Political Chronicle</h1>
      <p className="tagline">Start as an independent. Win your town. Then win the state.</p>
      <div className="start-actions">
        {live && (
          <button className="primary" onClick={onContinue}>
            Continue — {live.politician.name}, {turnLabel(live.clock)}
            {live.scenario ? ` · ${getScenario(live.scenario.id).title}` : ''}
          </button>
        )}
        <button className={live ? '' : 'primary'} onClick={onScenarios}>
          Scenarios <span className="muted small">· {totalStars(profile)} ★ earned</span>
        </button>
        <button
          disabled={!sandbox}
          title={sandbox ? undefined : 'Finish the four beginner scenarios to unlock Sandbox'}
          onClick={onSandbox}
        >
          Sandbox {sandbox ? '' : '🔒'}
        </button>
        <button disabled={profile.runs.length === 0} onClick={onHall}>
          Hall of Runs {profile.runs.length ? `(${profile.runs.length})` : ''}
        </button>
      </div>
      <p className="muted small">
        {profile.artifacts.length} artifact{profile.artifacts.length === 1 ? '' : 's'} · {profile.abilities.length} abilit
        {profile.abilities.length === 1 ? 'y' : 'ies'} collected
        {!sandbox && ' · Sandbox unlocks after the beginner track'}
      </p>
    </div>
  );
}
