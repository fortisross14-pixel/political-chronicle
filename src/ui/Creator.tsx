import { useMemo, useState } from 'react';
import { BACKGROUNDS, getBackground, getOffice, ISSUES_BY_ID, DISTRICTS, STATES, US_STATE_NAMES, US_STATES } from '../data';
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
  wealthRange,
  TRAITS,
} from '../engine';
import type { CreationInput, Gender, SkillId } from '../engine';
import { money, pct } from './format';
import { GameCard } from './cards/GameCard';
import { Painted, PortraitArt, SkillArt } from './cards/CardArt';
import { Info, Pips } from './Info';

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
  const regionsHere = DISTRICTS.filter((r) => r.state === residentStateId);
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

  const wealth = wealthRange(backgroundId, age);
  const energy = Math.max(1, energyForAge(age) - (background.perks.energyPenalty?.amount ?? 0));
  const portrait = `you_${gender === 'female' ? 'f' : gender === 'male' ? 'm' : 'n'}${age >= 45 ? 2 : 1}`;
  const home = regionsHere.find((r) => r.id === residentRegionId)!;

  return (
    <div className="char-select">
      <header className="cs-head">
        <button type="button" className="cs-back" onClick={onCancel} aria-label="Back">
          ‹
        </button>
        <h1>New politician</h1>
      </header>
      <form
        className="cs-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!errors.length) onCreate(input);
        }}
      >
        <aside className="cs-preview" aria-label="Your politician">
          <GameCard
            tone="legendary"
            foil
            title={name.trim() || 'Your name'}
            typeLine={`${background.name} · ${age}`}
            art={<PortraitArt id={portrait} name={name || 'You'} role="campaignManager" />}
            rarity={native ? 'Native' : 'Transplant'}
          >
            <span className="cs-home">
              {home.seatCity}, {US_STATE_NAMES[residentStateId] ?? residentStateId}
            </span>
            <span className="cs-gems">
              <span className="cs-gem">
                <small>Wealth</small>
                {money(wealth.min)}+
              </span>
              <span className="cs-gem">
                <small>Energy</small>
                {energy}
              </span>
              <span className="cs-gem">
                <small>Integrity</small>
                {background.perks.startingIntegrity ?? 60}
              </span>
            </span>
            <span className="cs-mini-skills">
              {SKILL_IDS.map((id) => (
                <span key={id} className="cs-mini">
                  <b>{SKILL_CODES[id]}</b>
                  <Pips value={skills[id]} max={7} label={SKILL_LABELS[id]} />
                </span>
              ))}
            </span>
          </GameCard>
          <p className="cs-first muted small">
            {firstRace
              ? `First race: ${firstRace.name}, ${nextElectionYear(firstRace, DEFAULT_START_YEAR)}`
              : 'Pick your first race once you start'}
          </p>
        </aside>

        <div className="cs-steps">
          <section className="cs-step">
            <input
              className="cs-name"
              value={name}
              maxLength={40}
              placeholder="e.g. Sam Ortega"
              aria-label="Name"
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div className="cs-row">
              <div className="segmented" role="group" aria-label="Gender">
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
              <label className="cs-age">
                <span>Age</span>
                <input
                  type="range"
                  min={MIN_AGE}
                  max={MAX_AGE}
                  value={age}
                  aria-label="Age"
                  onChange={(e) => {
                    const a = Number(e.target.value);
                    setAge(a);
                    resetAllocation(backgroundId, a);
                  }}
                />
                <strong>{age}</strong>
              </label>
              <Info label="age">Older: more skill points and savings. Younger: more energy and a longer career. Gender is cosmetic.</Info>
            </div>
          </section>

          <section className="cs-step">
            <h2>Background</h2>
            <div className="cs-backgrounds">
              {BACKGROUNDS.map((b) => {
                const here = b.favoredStates.includes(residentStateId)
                  ? 'good'
                  : b.disfavoredStates?.includes(residentStateId)
                    ? 'bad'
                    : undefined;
                const top = (Object.entries(b.skillBonus) as [SkillId, number][]).sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'charisma';
                return (
                  <div key={b.id} className={`cs-bg${backgroundId === b.id ? ' active' : ''}${here ? ` ${here}` : ''}`}>
                    <button
                      type="button"
                      aria-pressed={backgroundId === b.id}
                      onClick={() => {
                        setBackgroundId(b.id);
                        resetAllocation(b.id, age);
                      }}
                    >
                      <span className="cs-bg-art">
                        <Painted id={`bg_${b.id}`}>
                          <SkillArt skill={top} />
                        </Painted>
                      </span>
                      <span className="cs-bg-name">{b.name}</span>
                      <span className="cs-bg-bonus">
                        {(Object.entries(b.skillBonus) as [SkillId, number][]).map(([id, v]) => `${SKILL_CODES[id]}+${v}`).join(' ')}
                      </span>
                    </button>
                    <Info label={b.name}>
                      <strong>{b.blurb}</strong>
                      <br />
                      Perk: {b.perkText}
                      <br />
                      Weakness: {b.weaknessText}
                      <br />
                      Credible on {b.credibleIssues.map((i) => ISSUES_BY_ID[i].name).join(', ')}.
                      {here ? ` ${here === 'good' ? 'Favored' : 'Disliked'} in ${residentStateId}.` : ''}
                    </Info>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="cs-step">
            <h2>Home</h2>
            <div className="cs-row">
              <label className="cs-select">
                <span>Born in</span>
                <select aria-label="Home state" value={homeState} onChange={(e) => setHomeState(e.target.value)}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cs-select">
                <span>Career in</span>
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
              <label className="cs-select">
                <span>Lives in</span>
                <select aria-label="Your city" value={residentRegionId} onChange={(e) => setResidentRegionId(e.target.value)}>
                  {regionsHere.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.seatCity} — {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className={`cs-badge ${native ? 'native' : 'transplant'}`}>{native ? 'Native' : 'Transplant'}</span>
              <Info label={native ? 'natives' : 'transplants'} align="right">
                {native
                  ? `Your city knows you (${pct(TRAITS.nativeRecognition)} recognition) and likes you; +${TRAITS.nativeStanding} standing when you join a party.`
                  : `Voters doubt a newcomer (−${Math.round(TRAITS.newcomerPenalty * 100)} favorability, fading over ${TRAITS.newcomerYears} years), but donors back home send ${money(TRAITS.outsideDonorBase)} a quarter.`}
                {` In your city: ${pct(cityStart.recognition)} know you. Statewide fit: ${fit}.`}
              </Info>
            </div>
          </section>

          <section className="cs-step">
            <div className="cs-step-head">
              <h2>Skills</h2>
              <span className={left === 0 ? 'muted' : 'points-left'}>
                {left} of {total} points left
              </span>
              {lost > 0 && <Info label="lost points">{lost} points don’t fit under your background’s caps.</Info>}
            </div>
            <ul className="cs-skills">
              {SKILL_IDS.map((id) => {
                const cap = creationCap(backgroundId, id);
                return (
                  <li key={id}>
                    <span className="cs-skill-name">
                      {SKILL_LABELS[id]}
                      <Info label={SKILL_LABELS[id]} align="left">
                        {SKILL_HINTS[id]}
                        {cap < 5 ? ` Your background caps it at ${cap}.` : ''}
                      </Info>
                    </span>
                    <Pips value={skills[id]} max={5} cap={cap} label={SKILL_LABELS[id]} />
                    <span className="stepper">
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
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="cs-row">
              <button type="button" onClick={() => resetAllocation(backgroundId, age)}>
                Auto-assign
              </button>
              <button type="button" onClick={() => setAllocation({})}>
                Clear
              </button>
            </div>
          </section>

          <footer className="cs-foot">
            {errors.length > 0 && <span className="cs-error">{errors[0]}</span>}
            <button type="submit" className="primary big" disabled={errors.length > 0}>
              Start career
            </button>
          </footer>
        </div>
      </form>
    </div>
  );
}
