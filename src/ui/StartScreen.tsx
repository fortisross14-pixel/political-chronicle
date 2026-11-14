import { getOffice, getScenario, TRINKETS } from '../data';
import { PortraitArt } from './cards/CardArt';
import { playerPortrait } from './portraits';
import { ownedTrinkets, sandboxUnlocked, totalStars, turnLabel } from '../engine';
import type { GameState, Profile } from '../engine';
import { install, useCanInstall } from './fx/install';
import { ART_IDS } from '../data/artManifest';

interface Props {
  /** One entry per save slot: a run in progress (or finished), or null. */
  slots: (GameState | null)[];
  /** About the saved game: upgraded, or why it couldn't be loaded. */
  notice?: string;
  profile: Profile;
  onContinue: (slot: number) => void;
  onDelete: (slot: number) => void;
  onScenarios: () => void;
  onSandbox: () => void;
  onHall: () => void;
}

export function StartScreen({ slots, notice, profile, onContinue, onDelete, onScenarios, onSandbox, onHall }: Props) {
  const sandbox = sandboxUnlocked(profile);
  const canInstall = useCanInstall();
  const live = slots.some((s) => s && !s.ended);
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
          <div className="save-slots" role="group" aria-label="Saved runs">
            {slots.map((s, i) =>
              s && !s.ended ? (
                <div key={i} className="save-slot">
                  <button className="save-slot-main" onClick={() => onContinue(i)}>
                    <span className="save-face" aria-hidden="true">
                      <PortraitArt id={playerPortrait(s.politician)} name={s.politician.name} role="campaignManager" />
                    </span>
                    <span className="save-text">
                      <strong>Continue — {s.politician.name}</strong>
                      <span className="small">
                        {s.scenario ? getScenario(s.scenario.id).title : 'Sandbox'} · {turnLabel(s.clock)}
                      </span>
                      <span className="small muted">
                        {s.career.office
                          ? getOffice(s.career.office.officeId).name
                          : s.career.race
                            ? `Running: ${getOffice(s.career.race.officeId).name}`
                            : 'No campaign yet'}
                      </span>
                    </span>
                  </button>
                  <button className="save-del" aria-label={`Delete slot ${i + 1}`} onClick={() => onDelete(i)}>
                    ×
                  </button>
                </div>
              ) : (
                <div key={i} className="save-slot empty">
                  <span className="small muted">Slot {i + 1} · empty</span>
                </div>
              ),
            )}
          </div>
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
