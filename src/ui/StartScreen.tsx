import { getScenario, TRINKETS } from '../data';
import { ownedTrinkets, sandboxUnlocked, totalStars, turnLabel } from '../engine';
import type { GameState, Profile } from '../engine';
import { install, useCanInstall } from './fx/install';
import { ART_IDS } from '../data/artManifest';

interface Props {
  saved: GameState | null;
  /** About the saved game: upgraded, or why it couldn't be loaded. */
  notice?: string;
  profile: Profile;
  onContinue: () => void;
  onScenarios: () => void;
  onSandbox: () => void;
  onHall: () => void;
}

export function StartScreen({ saved, notice, profile, onContinue, onScenarios, onSandbox, onHall }: Props) {
  const sandbox = sandboxUnlocked(profile);
  const canInstall = useCanInstall();
  const live = saved && !saved.ended ? saved : null;
  return (
    <div className="start">
      {ART_IDS.has('hero_menu') && (
        <img className="start-hero" src={`${import.meta.env.BASE_URL}art/hero_menu.webp`} alt="" aria-hidden="true" />
      )}
      <div className="start-logo" aria-hidden="true">
        <span className="live">LIVE</span>
      </div>
      <h1>
        Political <span>Chronicle</span>
      </h1>
      <p className="tagline">Start as an independent. Win your town. Then win the state.</p>
      {notice && (
        <p className="save-notice small" role="status">
          {notice}
        </p>
      )}
      <div className="start-actions">
        {live && (
          <button className="primary" onClick={onContinue}>
            Continue — {live.politician.name}, {turnLabel(live.clock)}
            {live.scenario ? ` · ${getScenario(live.scenario.id).title}` : ''}
          </button>
        )}
        <button className={live ? '' : 'primary'} onClick={onScenarios}>
          Missions <span className="muted small">· {totalStars(profile)} ★ earned</span>
        </button>
        <button
          disabled={!sandbox}
          title={sandbox ? undefined : 'Finish the four beginner scenarios to unlock Sandbox'}
          onClick={onSandbox}
        >
          Sandbox{sandbox ? '' : ' (locked)'}
        </button>
        {canInstall && <button onClick={() => void install()}>Install the app (plays offline)</button>}
        <button disabled={profile.runs.length === 0} onClick={onHall}>
          Hall of Runs {profile.runs.length ? `(${profile.runs.length})` : ''}
        </button>
      </div>
      <p className="muted small">
        {ownedTrinkets(profile).length} of {TRINKETS.length} trinkets collected
        {!sandbox && ' · Sandbox unlocks after the beginner track'}
      </p>
    </div>
  );
}
