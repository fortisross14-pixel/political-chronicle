import { useState } from 'react';
import { ABILITIES_BY_ID, ARTIFACTS_BY_ID, getBackground, getRegion, SCENARIOS } from '../../data';
import type { Reward, Scenario } from '../../data';
import { scenarioStars, scenarioUnlocked } from '../../engine';
import type { Profile } from '../../engine';
import { Loadout } from './Loadout';

interface Props {
  profile: Profile;
  onStart: (scenarioId: string, name: string, artifacts: string[]) => void;
  onBack: () => void;
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="stars" aria-label={`${n} of ${of} stars`}>
      {'★'.repeat(n)}
      <span className="muted">{'☆'.repeat(of - n)}</span>
    </span>
  );
}

function rewardText(r: Reward): string {
  const parts = [...(r.artifacts ?? []).map((a) => ARTIFACTS_BY_ID[a]!.name), ...(r.abilities ?? []).map((a) => `ability: ${ABILITIES_BY_ID[a]!.name}`)];
  return parts.join(', ') || '—';
}

export function ScenarioSelect({ profile, onStart, onBack }: Props) {
  const beginner = SCENARIOS.filter((s) => s.track === 'beginner').sort((a, b) => a.order - b.order);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [name, setName] = useState('');
  const [artifacts, setArtifacts] = useState<string[]>([]);

  if (selected) {
    const ch = selected.setup.character;
    const earned = profile.scenarios[selected.id]?.stars ?? [];
    return (
      <div className="menu-page">
        <button onClick={() => setSelected(null)}>‹ All scenarios</button>
        <h1>{selected.title}</h1>
        <p className="tagline">{selected.tagline}</p>
        <div className="creator-grid">
          <section className="panel stack">
            <p>{selected.description}</p>
            <dl className="kv">
              <dt>You are</dt>
              <dd>
                {getBackground(ch.backgroundId).name}, {ch.age}, from {getRegion(ch.residentRegionId).seatCity}
              </dd>
              <dt>Objective</dt>
              <dd>{selected.objective.text}</dd>
              <dt>Teaches</dt>
              <dd>{selected.teaches}</dd>
            </dl>
            <h3>Stars</h3>
            <ul className="star-goals">
              {selected.stars.map((g, i) => (
                <li key={g.id} className={earned.includes(g.id) ? 'done' : undefined}>
                  <span>{earned.includes(g.id) ? '★' : '☆'}</span> {g.text}
                  <span className="muted small"> · reward at {i + 1}★: {rewardText(selected.rewards[i]!)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel stack">
            <label className="field">
              <span>Your name</span>
              <input value={name} maxLength={40} placeholder="e.g. Sam Ortega" onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <Loadout profile={profile} artifacts={artifacts} onArtifacts={setArtifacts} pure={selected.setup.pure} />
            <div className="row">
              <button className="primary" disabled={!name.trim()} onClick={() => onStart(selected.id, name.trim(), artifacts)}>
                Start scenario
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <button onClick={onBack}>‹ Menu</button>
      <h1>Scenarios</h1>
      <p className="tagline">Finish the beginner track to unlock Sandbox. Stars earn artifacts and abilities.</p>
      <div className="scenario-grid">
        {beginner.map((s) => {
          const open = scenarioUnlocked(profile, s.id);
          return (
            <button key={s.id} className={open ? 'scenario-card' : 'scenario-card locked'} disabled={!open} onClick={() => setSelected(s)}>
              <span className="muted small">Beginner · {s.order}</span>
              <strong>{s.title}</strong>
              <span className="small">{s.tagline}</span>
              <Stars n={scenarioStars(profile, s.id)} />
              {!open && <span className="muted small">🔒 Earn a star in the previous scenario</span>}
            </button>
          );
        })}
      </div>
      <p className="muted small">Advanced scenarios (The Underdog Superstar, Blue in a red district…) arrive with the expansion.</p>
    </div>
  );
}
