import { useMemo, useState } from 'react';
import { BACKGROUNDS, getBackground, getOffice, ISSUES_BY_ID, REGIONS } from '../data';
import {
  autoAllocate,
  CREATION_SKILL_CAP,
  creationErrors,
  energyForAge,
  finalSkills,
  hometownMayoralty,
  MAX_AGE,
  MIN_AGE,
  nextElectionYear,
  pointsSpent,
  preAllocationSkills,
  SKILL_HINTS,
  SKILL_IDS,
  SKILL_LABELS,
  skillPointsForAge,
  startingFundsFor,
  DEFAULT_START_YEAR,
} from '../engine';
import type { CreationInput, Gender, SkillId } from '../engine';
import { money } from './format';

interface Props {
  onCreate: (input: CreationInput) => void;
  onCancel: () => void;
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'nonbinary', label: 'Non-binary' },
];

export function Creator({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [age, setAge] = useState(32);
  const [birthRegionId, setBirthRegionId] = useState('ny-north');
  const [backgroundId, setBackgroundId] = useState('teacher');
  const [allocation, setAllocation] = useState<Partial<Record<SkillId, number>>>(() => autoAllocate('teacher', 32));

  const input: CreationInput = { name, gender, age, birthRegionId, backgroundId, allocation };
  const errors = creationErrors(input);
  const total = skillPointsForAge(age);
  const left = total - pointsSpent(allocation);
  const base = useMemo(() => preAllocationSkills(backgroundId), [backgroundId]);
  const skills = finalSkills(input);
  const background = getBackground(backgroundId);
  const mayoralty = hometownMayoralty(birthRegionId);
  const firstRace = mayoralty ? getOffice(mayoralty) : undefined;

  // Background or age changes invalidate the allocation, so re-spread the points.
  const resetAllocation = (bg: string, a: number) => setAllocation(autoAllocate(bg, a));

  const bump = (id: SkillId, delta: number) => {
    const current = allocation[id] ?? 0;
    const next = current + delta;
    if (next < 0 || (delta > 0 && (left <= 0 || skills[id] >= CREATION_SKILL_CAP))) return;
    setAllocation({ ...allocation, [id]: next });
  };

  return (
    <div className="creator">
      <h1>New politician</h1>
      <form
        className="creator-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!errors.length) onCreate(input);
        }}
      >
        <section className="panel stack">
          <label className="field">
            <span>Name</span>
            <input value={name} maxLength={40} placeholder="e.g. Sam Ortega" onChange={(e) => setName(e.target.value)} autoFocus />
          </label>

          <fieldset className="field">
            <legend>Gender</legend>
            <div className="segmented">
              {GENDERS.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className={gender === g.id ? 'active' : undefined}
                  aria-pressed={gender === g.id}
                  onClick={() => setGender(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <span className="muted small">Cosmetic only — no effect on how voters treat you.</span>
          </fieldset>

          <label className="field">
            <span>
              Age: <strong>{age}</strong>
            </span>
            <input
              type="range"
              min={MIN_AGE}
              max={MAX_AGE}
              value={age}
              onChange={(e) => {
                const a = Number(e.target.value);
                setAge(a);
                resetAllocation(backgroundId, a);
              }}
            />
            <span className="muted small">
              Older: more skill points and savings. Younger: more energy and a longer career.
            </span>
          </label>

          <label className="field">
            <span>Place of birth</span>
            <select value={birthRegionId} onChange={(e) => setBirthRegionId(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.seatCity} — {r.name}
                </option>
              ))}
            </select>
            <span className="muted small">Your hometown knows you (30% recognition) and likes you a little.</span>
          </label>

          <fieldset className="field">
            <legend>Background</legend>
            <div className="background-grid">
              {BACKGROUNDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={backgroundId === b.id ? 'background active' : 'background'}
                  aria-pressed={backgroundId === b.id}
                  onClick={() => {
                    setBackgroundId(b.id);
                    resetAllocation(b.id, age);
                  }}
                >
                  <strong>{b.name}</strong>
                  <span className="small muted">{b.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="panel stack">
          <div className="panel-head">
            <h2>Skills</h2>
            <span className={left === 0 ? 'muted' : 'points-left'}>
              {left} of {total} points left
            </span>
          </div>
          <ul className="skill-alloc">
            {SKILL_IDS.map((id) => (
              <li key={id}>
                <div>
                  <strong>{SKILL_LABELS[id]}</strong>
                  <span className="muted small">{SKILL_HINTS[id]}</span>
                </div>
                <div className="stepper">
                  <button type="button" aria-label={`Lower ${SKILL_LABELS[id]}`} disabled={!(allocation[id] ?? 0)} onClick={() => bump(id, -1)}>
                    −
                  </button>
                  <span className="num" title={`${base[id]} from background, +${allocation[id] ?? 0} allocated`}>
                    {skills[id]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Raise ${SKILL_LABELS[id]}`}
                    disabled={left <= 0 || skills[id] >= CREATION_SKILL_CAP}
                    onClick={() => bump(id, 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" onClick={() => resetAllocation(backgroundId, age)}>
              Auto-assign
            </button>
            <button type="button" onClick={() => setAllocation({})}>
              Clear
            </button>
          </div>
          <p className="muted small">Max {CREATION_SKILL_CAP} per skill at creation. Skill cards raise them later.</p>

          <h2>Starting position</h2>
          <dl className="kv">
            <dt>Funds</dt>
            <dd>{money(startingFundsFor(backgroundId, age))}</dd>
            <dt>Energy per turn</dt>
            <dd>{energyForAge(age)}</dd>
            <dt>Credible on</dt>
            <dd>{background.credibleIssues.map((i) => ISSUES_BY_ID[i].name).join(', ')}</dd>
            <dt>First race</dt>
            <dd>
              {firstRace
                ? `${firstRace.name}, ${nextElectionYear(firstRace, DEFAULT_START_YEAR)} (as an independent)`
                : 'No mayoralty in this region yet — choosing a race arrives in M3.'}
            </dd>
          </dl>

          {errors.length > 0 && (
            <ul className="errors">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="row">
            <button type="submit" className="primary" disabled={errors.length > 0}>
              Start career
            </button>
            <button type="button" onClick={onCancel}>
              Back
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
