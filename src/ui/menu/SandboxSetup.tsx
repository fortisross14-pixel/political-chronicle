import { useState } from 'react';
import type { CreationInput, Difficulty, Profile } from '../../engine';
import { Creator } from '../Creator';
import { Loadout } from './Loadout';

interface Props {
  profile: Profile;
  onStart: (input: CreationInput, trinkets: string[], careerYears: number | undefined, difficulty: Difficulty) => void;
  onBack: () => void;
}

const LENGTHS: { years?: number; label: string }[] = [
  { years: 20, label: '20 years' },
  { years: 30, label: '30 years' },
  { years: 40, label: '40 years' },
  { label: 'Until it ends' },
];

const DIFFICULTIES: { id: Difficulty; label: string; text: string }[] = [
  { id: 'easy', label: 'Easy', text: 'Opponents are less known and campaign less.' },
  { id: 'normal', label: 'Normal', text: 'The game as tuned.' },
  { id: 'hard', label: 'Hard', text: 'Better-known opponents who campaign harder.' },
];

/** Sandbox: build any politician, then pick a loadout and a career length. */
export function SandboxSetup({ profile, onStart, onBack }: Props) {
  const [input, setInput] = useState<CreationInput | null>(null);
  const [trinkets, setTrinkets] = useState<string[]>([]);
  const [years, setYears] = useState<number | undefined>(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  if (!input) return <Creator onCreate={setInput} onCancel={onBack} />;

  return (
    <div className="menu-page">
      <button onClick={() => setInput(null)}>‹ Back to your politician</button>
      <h1>Sandbox: {input.name}</h1>
      <div className="creator-grid">
        <section className="panel">
          <Loadout profile={profile} trinkets={trinkets} onTrinkets={setTrinkets} />
        </section>
        <section className="panel stack">
          <fieldset className="field">
            <legend>Career length</legend>
            <div className="segmented">
              {LENGTHS.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  className={years === l.years ? 'active' : undefined}
                  aria-pressed={years === l.years}
                  onClick={() => setYears(l.years)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="muted small">
              Your legacy score is tallied when the career ends: by length, three losses in a row, retirement, or age 85.
            </span>
          </fieldset>
          <fieldset className="field">
            <legend>Difficulty</legend>
            <div className="segmented">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={difficulty === d.id ? 'active' : undefined}
                  aria-pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span className="muted small">{DIFFICULTIES.find((d) => d.id === difficulty)!.text}</span>
          </fieldset>
          <div className="row">
            <button className="primary" onClick={() => onStart(input, trinkets, years, difficulty)}>
              Start career
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
