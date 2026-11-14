import { ABILITIES_BY_ID, ARTIFACTS_BY_ID, MAX_ABILITIES } from '../../data';
import { artifactSlots } from '../../engine';
import type { Profile } from '../../engine';

interface Props {
  profile: Profile;
  artifacts: string[];
  onArtifacts: (ids: string[]) => void;
  /** Abilities are Sandbox-only; omit to hide the picker. */
  abilities?: string[];
  onAbilities?: (ids: string[]) => void;
  pure?: boolean;
}

function toggle(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  return list.length >= max ? list : [...list, id];
}

/** Pick artifacts (and abilities, in Sandbox) to bring into a run. */
export function Loadout({ profile, artifacts, onArtifacts, abilities, onAbilities, pure }: Props) {
  const slots = artifactSlots(profile);
  return (
    <div className="stack">
      <div>
        <div className="panel-head">
          <h3>Artifacts</h3>
          <span className="muted small">
            {artifacts.length}/{slots} slots · more slots at 6 and 10 stars
          </span>
        </div>
        {pure ? (
          <p className="muted small">This scenario is played pure: no artifacts.</p>
        ) : profile.artifacts.length === 0 ? (
          <p className="muted small">No artifacts yet — earn them by collecting stars in scenarios.</p>
        ) : (
          <div className="loadout-grid">
            {profile.artifacts.map((id) => {
              const a = ARTIFACTS_BY_ID[id]!;
              const on = artifacts.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={on ? 'loadout-card on' : 'loadout-card'}
                  aria-pressed={on}
                  disabled={!on && artifacts.length >= slots}
                  onClick={() => onArtifacts(toggle(artifacts, id, slots))}
                >
                  <strong>{a.name}</strong>
                  <span className="small muted">{a.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {abilities && onAbilities && (
        <div>
          <div className="panel-head">
            <h3>Abilities</h3>
            <span className="muted small">
              {abilities.length}/{MAX_ABILITIES} equipped
            </span>
          </div>
          {profile.abilities.length === 0 ? (
            <p className="muted small">No abilities yet — 3-star clears and some missions award them.</p>
          ) : (
            <div className="loadout-grid">
              {profile.abilities.map((id) => {
                const a = ABILITIES_BY_ID[id]!;
                const on = abilities.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={on ? 'loadout-card ability on' : 'loadout-card ability'}
                    aria-pressed={on}
                    disabled={!on && abilities.length >= MAX_ABILITIES}
                    onClick={() => onAbilities(toggle(abilities, id, MAX_ABILITIES))}
                  >
                    <strong>{a.name}</strong>
                    <span className="small muted">{a.text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
