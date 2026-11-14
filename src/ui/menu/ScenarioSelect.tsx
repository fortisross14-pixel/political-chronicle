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
import { Info, Pips } from '../Info';
import { GameCard } from '../cards/GameCard';
import { Painted, PortraitArt } from '../cards/CardArt';
import { playerPortrait } from '../portraits';

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

/** The painted scene on each mission's card. */
const MISSION_ART: Record<string, string> = {
  hometown_favorite: 'door_knocking',
  keep_your_word: 'town_hall',
  pick_a_side: 'party_unity',
  big_city_small_town: 'arena_rally',
  the_underdog: 'union_rally',
  blue_in_the_north: 'debate',
  small_town_to_the_top: 'hero_menu',
};

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
        <header className="mission-banner">
          <span className="mission-banner-art" aria-hidden="true">
            <Painted id={MISSION_ART[selected.id] ?? 'hero_menu'} />
          </span>
          <button className="cs-back" onClick={() => setSelected(null)} aria-label="All missions">
            ‹
          </button>
          <div className="mission-banner-text">
            <span className="live">{selected.track === 'beginner' ? 'Beginner' : 'Advanced'}</span>
            <h1>{selected.title}</h1>
            <p>{selected.objective.text}</p>
          </div>
        </header>
        <div className="mission-grid">
          <aside className="mission-dossier">
            <GameCard
              tone={selected.track === 'beginner' ? 'rare' : 'epic'}
              title={name.trim() || 'You'}
              typeLine={`${bg.name} · ${ch.age}`}
              art={<PortraitArt id={playerPortrait({ gender: ch.gender, startAge: ch.age })} name={name || 'You'} role="campaignManager" />}
              rarity={native ? 'Native' : 'Transplant'}
            >
              <span className="cs-home">
                {region.seatCity}, {US_STATE_NAMES[region.state] ?? region.state}
              </span>
              <span className="dossier-chips">
                <span className={`dossier-chip ${native ? 'pos' : 'neg'}`}>{native ? 'Native' : `From ${ch.homeState}`}</span>
                <span className="dossier-chip">{money(wealth.min)}+</span>
                {selected.setup.party && <span className="dossier-chip">{PARTIES[selected.setup.party.id].nickname}</span>}
                {selected.setup.office && (
                  <span className="dossier-chip gold">
                    {getOffice(selected.setup.office.officeId).name.replace('Mayor of ', 'Mayor · ').replace('U.S. House — ', 'House · ')}{' '}
                    {Math.round(selected.setup.office.approval * 100)}%
                  </span>
                )}
              </span>
            </GameCard>
            <Info label="this mission" align="left">
              {selected.description} {bg.name}: {bg.blurb} Teaches: {selected.teaches}.
            </Info>
            <ul className="mission-stars">
              {selected.stars.map((g, i) => (
                <li key={g.id} className={earned.includes(g.id) ? 'done' : undefined}>
                  <span className="star-mark">{earned.includes(g.id) ? '★' : '☆'}</span>
                  <span>{g.text}</span>
                  <span className="muted small">{rewardText(selected.rewards[i]!)}</span>
                </li>
              ))}
            </ul>
            {tries > 0 && <span className="muted small">Try {tries + 1}</span>}
          </aside>
          <section className="cs-step stack">
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
            <ul className="cs-skills">
              {SKILL_IDS.map((id) => (
                <li key={id}>
                  <span className="cs-skill-name">
                    {SKILL_LABELS[id]}
                    <Info label={SKILL_LABELS[id]} align="left">
                      {SKILL_HINTS[id]}
                    </Info>
                  </span>
                  <Pips value={base[id] + (extra[id] ?? 0)} max={MISSION_SKILL_CAP} label={SKILL_LABELS[id]} />
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
                    <span className="mission-art" aria-hidden="true">
                      <Painted id={MISSION_ART[s.id] ?? 'hero_menu'} />
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
