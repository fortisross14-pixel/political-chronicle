import { useState } from 'react';
import { getBackground, getOffice, getRegion, getTrinket, PARTIES, SCENARIOS, US_STATE_NAMES } from '../../data';
import type { Reward, Scenario } from '../../data';
import {
  extraPointsError,
  MISSION_EXTRA_POINTS,
  MISSION_SKILL_CAP,
  missionBaseSkills,
  scenarioStars,
  scenarioUnlocked,
  SKILL_HINTS,
  SKILL_IDS,
  SKILL_LABELS,
  wealthRange,
} from '../../engine';
import type { Profile, SkillId } from '../../engine';
import { money } from '../format';
import { Loadout } from './Loadout';

interface Props {
  profile: Profile;
  onStart: (scenarioId: string, name: string, trinkets: string[], extra: Partial<Record<SkillId, number>>) => void;
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
  return (r.trinkets ?? []).map((a) => getTrinket(a).name).join(', ') || '—';
}

export function ScenarioSelect({ profile, onStart, onBack }: Props) {
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [name, setName] = useState('');
  const [trinkets, setTrinkets] = useState<string[]>([]);
  const [extra, setExtra] = useState<Partial<Record<SkillId, number>>>({});

  if (selected) {
    const ch = selected.setup.character;
    const bg = getBackground(ch.backgroundId);
    const earned = profile.scenarios[selected.id]?.stars ?? [];
    const region = getRegion(ch.residentRegionId);
    const native = region.state === ch.homeState;
    const wealth = wealthRange(ch.backgroundId, ch.age);
    const base = missionBaseSkills(selected.id);
    const spent = Object.values(extra).reduce((a: number, b) => a + (b ?? 0), 0);
    const left = MISSION_EXTRA_POINTS - spent;
    const bump = (id: SkillId, d: number) => {
      const next = { ...extra, [id]: Math.max(0, (extra[id] ?? 0) + d) };
      if (!extraPointsError(selected.id, next)) setExtra(next);
    };
    const tries = profile.scenarios[selected.id]?.attempts ?? 0;
    return (
      <div className="menu-page">
        <button onClick={() => setSelected(null)}>‹ All missions</button>
        <h1>{selected.title}</h1>
        <p className="tagline">{selected.tagline}</p>
        <div className="creator-grid">
          <section className="panel stack">
            <p>{selected.description}</p>
            <h3>Your character</h3>
            <dl className="kv dossier">
              <dt>Background</dt>
              <dd>
                <strong>{bg.name}</strong> · <span className="muted">{bg.blurb}</span>
              </dd>
              <dt>Age</dt>
              <dd>
                {ch.age}, {ch.gender === 'female' ? 'woman' : ch.gender === 'male' ? 'man' : 'nonbinary'}
              </dd>
              <dt>From</dt>
              <dd>
                Born in {US_STATE_NAMES[ch.homeState]}, lives in {region.seatCity} ({region.name}) ·{' '}
                <span className={native ? 'pos' : 'neg'}>
                  {native ? 'a native: voters trust you' : 'a transplant: voters need convincing'}
                </span>
              </dd>
              <dt>Money</dt>
              <dd>
                {money(wealth.min)}–{money(wealth.max)} of your own
                {selected.setup.funds ? `, plus ${money(selected.setup.funds)} raised` : ''}
              </dd>
              {selected.setup.party && (
                <>
                  <dt>Party</dt>
                  <dd>
                    {PARTIES[selected.setup.party.id].name}, standing {selected.setup.party.standing}
                  </dd>
                </>
              )}
              {selected.setup.office && (
                <>
                  <dt>In office</dt>
                  <dd>
                    {getOffice(selected.setup.office.officeId).name}, approval {Math.round(selected.setup.office.approval * 100)}%
                  </dd>
                </>
              )}
              <dt>Objective</dt>
              <dd>{selected.objective.text}</dd>
              <dt>Teaches</dt>
              <dd>{selected.teaches}</dd>
              {tries > 0 && (
                <>
                  <dt>Tries</dt>
                  <dd>{tries}</dd>
                </>
              )}
            </dl>
            <h3>Stars</h3>
            <ul className="star-goals">
              {selected.stars.map((g, i) => (
                <li key={g.id} className={earned.includes(g.id) ? 'done' : undefined}>
                  <span>{earned.includes(g.id) ? '★' : '☆'}</span> {g.text}
                  <span className="muted small">
                    {' '}
                    · reward at {i + 1}★: {rewardText(selected.rewards[i]!)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel stack">
            <label className="field">
              <span>Your name</span>
              <input value={name} maxLength={40} placeholder="e.g. Sam Ortega" onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <div className="panel-head">
              <h3>Skills</h3>
              <span className={left > 0 ? 'points-left' : 'muted'}>
                {left} of {MISSION_EXTRA_POINTS} extra points left
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
                    <button type="button" aria-label={`Lower ${SKILL_LABELS[id]}`} disabled={!extra[id]} onClick={() => bump(id, -1)}>
                      −
                    </button>
                    <span className="num">
                      {base[id] + (extra[id] ?? 0)}
                      {extra[id] ? <span className="pos small"> +{extra[id]}</span> : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Raise ${SKILL_LABELS[id]}`}
                      disabled={left <= 0 || base[id] + (extra[id] ?? 0) >= MISSION_SKILL_CAP}
                      onClick={() => bump(id, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Loadout profile={profile} trinkets={trinkets} onTrinkets={setTrinkets} pure={selected.setup.pure} />
            <div className="row">
              <button className="primary" disabled={!name.trim()} onClick={() => onStart(selected.id, name.trim(), trinkets, extra)}>
                {tries > 0 ? 'Try again' : 'Start mission'}
              </button>
              {left > 0 && (
                <span className="muted small">
                  {left} point{left === 1 ? '' : 's'} unspent
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <button onClick={onBack}>‹ Menu</button>
      <h1>Missions</h1>
      <p className="tagline">Finish the beginner track to unlock Sandbox. Stars earn trinkets.</p>
      {[
        { track: 'beginner' as const, label: 'Beginner', lock: '🔒 Earn a star in the previous mission' },
        { track: 'advanced' as const, label: 'Advanced', lock: '🔒 Finish the beginner track first' },
      ].map(({ track, label, lock }) => (
        <section key={track} className="stack">
          <h2>{label}</h2>
          <div className="scenario-grid">
            {SCENARIOS.filter((s) => s.track === track)
              .sort((a, b) => a.order - b.order)
              .map((s) => {
                const open = scenarioUnlocked(profile, s.id);
                return (
                  <button
                    key={s.id}
                    className={open ? 'scenario-card' : 'scenario-card locked'}
                    disabled={!open}
                    onClick={() => setSelected(s)}
                  >
                    <span className="muted small">
                      {label} · {s.order}
                    </span>
                    <strong>{s.title}</strong>
                    <span className="small">{s.tagline}</span>
                    <Stars n={scenarioStars(profile, s.id)} />
                    {!open && <span className="muted small">{lock}</span>}
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
