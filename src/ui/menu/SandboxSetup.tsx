import { useState } from 'react';
import type { CreationInput, Profile } from '../../engine';
import { Creator } from '../Creator';
import { Loadout } from './Loadout';

interface Props {
  profile: Profile;
  onStart: (input: CreationInput, artifacts: string[], abilities: string[], careerYears?: number) => void;
  onBack: () => void;
}

const LENGTHS: { years?: number; label: string }[] = [
  { years: 20, label: '20 years' },
  { years: 30, label: '30 years' },
  { years: 40, label: '40 years' },
  { label: 'Until it ends' },
];

/** Sandbox: build any politician, then pick a loadout and a career length. */
export function SandboxSetup({ profile, onStart, onBack }: Props) {
  const [input, setInput] = useState<CreationInput | null>(null);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [abilities, setAbilities] = useState<string[]>([]);
  const [years, setYears] = useState<number | undefined>(30);

  if (!input) return <Creator onCreate={setInput} onCancel={onBack} />;

  return (
    <div className="menu-page">
      <button onClick={() => setInput(null)}>‹ Back to your politician</button>
      <h1>Sandbox: {input.name}</h1>
      <div className="creator-grid">
        <section className="panel">
          <Loadout profile={profile} artifacts={artifacts} onArtifacts={setArtifacts} abilities={abilities} onAbilities={setAbilities} />
        </section>
        <section className="panel stack">
          <fieldset className="field">
            <legend>Career length</legend>
            <div className="segmented">
              {LENGTHS.map((l) => (
                <button key={l.label} type="button" className={years === l.years ? 'active' : undefined} aria-pressed={years === l.years} onClick={() => setYears(l.years)}>
                  {l.label}
                </button>
              ))}
            </div>
            <span className="muted small">Your legacy score is tallied when the career ends: by length, three losses in a row, retirement, or age 85.</span>
          </fieldset>
          <div className="row">
            <button className="primary" onClick={() => onStart(input, artifacts, abilities, years)}>
              Start career
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
