import { useMemo, useState } from 'react';
import { BACKGROUNDS, getBackground, getOffice, ISSUES_BY_ID, REGIONS, STATES, US_STATE_NAMES, US_STATES } from '../data';
import {
  autoAllocate,
  creationCap,
  creationErrors,
  DEFAULT_START_YEAR,
  energyForAge,
  finalSkills,
  hometownMayoralty,
  initialRegions,
  MAX_AGE,
  MIN_AGE,
  nextElectionYear,
  pointsSpent,
  preAllocationSkills,
  SKILL_CODES,
  SKILL_HINTS,
  SKILL_IDS,
  SKILL_LABELS,
  skillPointsForAge,
  spendablePoints,
  startingFundsFor,
  TRAITS,
} from '../engine';
import type { CreationInput, Gender, SkillId } from '../engine';
import { money, pct } from './format';

interface Props {
  onCreate: (input: CreationInput) => void;
  onCancel: () => void;
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'nonbinary', label: 'Non-binary' },
];

const PLAYABLE = Object.values(STATES);

export function Creator({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [age, setAge] = useState(32);
  const [homeState, setHomeState] = useState('NY');
  const [residentStateId, setResidentStateId] = useState(PLAYABLE[0]!.id);
  const [residentRegionId, setResidentRegionId] = useState('ny-north');
  const [backgroundId, setBackgroundId] = useState('public_servant');
  const [allocation, setAllocation] = useState<Partial<Record<SkillId, number>>>(() => autoAllocate('public_servant', 32));

  const input: CreationInput = { name, gender, age, homeState, residentRegionId, backgroundId, allocation };
  const errors = creationErrors(input);
  const total = spendablePoints(backgroundId, age);
  const lost = skillPointsForAge(age) - total;
  const left = total - pointsSpent(allocation);
  const base = useMemo(() => preAllocationSkills(backgroundId), [backgroundId]);
  const skills = finalSkills(input);
  const background = getBackground(backgroundId);
  const native = homeState === residentStateId;
  const regionsHere = REGIONS.filter((r) => r.state === residentStateId);
  const mayoralty = hometownMayoralty(residentRegionId);
  const firstRace = mayoralty ? getOffice(mayoralty) : undefined;
  const start = initialRegions({ name, gender, startAge: age, homeState, residentRegionId, backgroundId, skills });
  const cityStart = start[residentRegionId]!;
  const fit = background.favoredStates.includes(residentStateId)
    ? 'favored'
    : background.disfavoredStates?.includes(residentStateId)
      ? 'disfavored'
      : 'neutral';

  // Background or age changes invalidate the allocation, so re-spread the points.
  const resetAllocation = (bg: string, a: number) => setAllocation(autoAllocate(bg, a));

  const bump = (id: SkillId, delta: number) => {
    const current = allocation[id] ?? 0;
    const next = current + delta;
    if (next < 0 || (delta > 0 && (left <= 0 || skills[id] >= creationCap(backgroundId, id)))) return;
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
            <span className="muted small">Older: more skill points and savings. Younger: more energy and a longer career.</span>
          </label>

          <fieldset className="field">
            <legend>Origins</legend>
            <div className="origin-grid">
              <label className="field">
                <span className="small">Home state (born)</span>
                <select aria-label="Home state" value={homeState} onChange={(e) => setHomeState(e.target.value)}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="small">Resident state (career)</span>
                <select
                  aria-label="Resident state"
                  value={residentStateId}
                  onChange={(e) => {
                    setResidentStateId(e.target.value);
                    setResidentRegionId(STATES[e.target.value]!.regionIds[0]!);
                  }}
                >
                  {PLAYABLE.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option disabled>California — coming soon</option>
                </select>
              </label>
              <label className="field">
                <span className="small">Your city</span>
                <select aria-label="Your city" value={residentRegionId} onChange={(e) => setResidentRegionId(e.target.value)}>
                  {regionsHere.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.seatCity} — {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={native ? 'origin-card native' : 'origin-card transplant'}>
              {native ? (
                <>
                  <strong>Native {US_STATE_NAMES[homeState]}er</strong>
                  <span className="small">
                    Your city knows you ({pct(TRAITS.nativeRecognition)} recognition, vs {pct(TRAITS.transplantRecognition)} for a newcomer)
                    and likes you; +{TRAITS.nativeStanding} standing when you join a party.
                  </span>
                </>
              ) : (
                <>
                  <strong>Transplant from {US_STATE_NAMES[homeState]}</strong>
                  <span className="small">
                    Newcomer doubt: −{Math.round(TRAITS.newcomerPenalty * 100)} favorability (milder in big cities, harsher in small towns),
                    fading over {TRAITS.newcomerYears} years. Outside donors from your home state: +{money(TRAITS.outsideDonorBase)} a
                    quarter (more with Economics). Later, a presidential run gets a home-state bonus in both states.
                  </span>
                </>
              )}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend>Background</legend>
            <div className="background-grid">
              {BACKGROUNDS.map((b) => {
                const here = b.favoredStates.includes(residentStateId)
                  ? 'good'
                  : b.disfavoredStates?.includes(residentStateId)
                    ? 'bad'
                    : undefined;
                return (
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
                    <strong>
                      {b.name}
                      {here && (
                        <span className={`fit ${here}`}>
                          {here === 'good' ? `Favored in ${residentStateId}` : `Disliked in ${residentStateId}`}
                        </span>
                      )}
                    </strong>
                    <span className="small muted">{b.blurb}</span>
                    <span className="chips">
                      {(Object.entries(b.skillBonus) as [SkillId, number][]).map(([id, v]) => (
                        <span key={id} className="chip">
                          {SKILL_CODES[id]} +{v}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="perk-box small">
              <div>
                <span className="pos">Perk:</span> {background.perkText}
              </div>
              <div>
                <span className="neg">Weakness:</span> {background.weaknessText}
              </div>
              <div className="muted">
                Favored in {background.favoredStates.join(', ')}
                {background.disfavoredStates?.length ? ` · disliked in ${background.disfavoredStates.join(', ')}` : ''}
              </div>
            </div>
          </fieldset>
        </section>

        <section className="panel stack">
          <div className="panel-head">
            <h2>Skills</h2>
            <span className={left === 0 ? 'muted' : 'points-left'}>
              {left} of {total} points left
              {lost > 0 && <span className="muted small"> ({lost} lost to your background’s caps)</span>}
            </span>
          </div>
          <ul className="skill-alloc">
            {SKILL_IDS.map((id) => {
              const cap = creationCap(backgroundId, id);
              return (
                <li key={id}>
                  <div>
                    <strong>
                      <span className="code">{SKILL_CODES[id]}</span> {SKILL_LABELS[id]}
                      {cap < 5 && <span className="fit bad">max {cap}</span>}
                    </strong>
                    <span className="muted small">{SKILL_HINTS[id]}</span>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`Lower ${SKILL_LABELS[id]}`}
                      disabled={!(allocation[id] ?? 0)}
                      onClick={() => bump(id, -1)}
                    >
                      −
                    </button>
                    <span className="num" title={`${base[id]} from background, +${allocation[id] ?? 0} allocated`}>
                      {skills[id]}
                    </span>
                    <button
                      type="button"
                      aria-label={`Raise ${SKILL_LABELS[id]}`}
                      disabled={left <= 0 || skills[id] >= cap}
                      onClick={() => bump(id, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="row">
            <button type="button" onClick={() => resetAllocation(backgroundId, age)}>
              Auto-assign
            </button>
            <button type="button" onClick={() => setAllocation({})}>
              Clear
            </button>
          </div>
          <p className="muted small">Max 5 per skill at creation (less where your background is weak). Skill cards raise them later.</p>

          <h2>Starting position</h2>
          <dl className="kv">
            <dt>Funds</dt>
            <dd>{money(startingFundsFor(backgroundId, age))}</dd>
            <dt>Energy per turn</dt>
            <dd>
              {Math.max(1, energyForAge(age) - (background.perks.energyPenalty?.amount ?? 0))}
              {background.perks.energyPenalty && <span className="muted small"> (+1 after year 4)</span>}
            </dd>
            <dt>Integrity</dt>
            <dd>{background.perks.startingIntegrity ?? 60}</dd>
            <dt>In your city</dt>
            <dd>
              {pct(cityStart.recognition)} know you · favorability {cityStart.favorability >= 0 ? '+' : ''}
              {Math.round(cityStart.favorability * 100)}
            </dd>
            <dt>Statewide fit</dt>
            <dd className={fit === 'favored' ? 'pos' : fit === 'disfavored' ? 'neg' : undefined}>
              {fit === 'favored'
                ? `+${TRAITS.favoredState * 100} favorability (favored state)`
                : fit === 'disfavored'
                  ? `${TRAITS.disfavoredState * 100} favorability (disliked)`
                  : 'Neutral'}
            </dd>
            <dt>Credible on</dt>
            <dd>{background.credibleIssues.map((i) => ISSUES_BY_ID[i].name).join(', ')}</dd>
            <dt>First race</dt>
            <dd>
              {firstRace
                ? `${firstRace.name}, ${nextElectionYear(firstRace, DEFAULT_START_YEAR)} (as an independent)`
                : 'No mayoralty in this area — pick a race once you start.'}
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
