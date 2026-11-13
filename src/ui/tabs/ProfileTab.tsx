import { useState } from 'react';
import { getBackground, getRegion, ISSUES_BY_ID } from '../../data';
import { ageOf, energyForAge, SKILL_HINTS, SKILL_IDS, SKILL_LABELS } from '../../engine';
import type { GameState } from '../../engine';

type SubTab = 'overview' | 'skills' | 'ideals' | 'history' | 'stats';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skills' },
  { id: 'ideals', label: 'Ideals & record' },
  { id: 'history', label: 'Election history' },
  { id: 'stats', label: 'Stats' },
];

export function ProfileTab({ state }: { state: GameState }) {
  const [sub, setSub] = useState<SubTab>('overview');
  const p = state.politician;
  const age = ageOf(state);

  return (
    <div className="stack">
      <nav className="subtabs">
        {SUB_TABS.map((t) => (
          <button key={t.id} className={sub === t.id ? 'subtab active' : 'subtab'} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {sub === 'overview' && (
        <section className="panel">
          <h2>{p.name}</h2>
          <dl className="kv">
            <dt>Age</dt>
            <dd>{age.toFixed(1)}</dd>
            <dt>Gender</dt>
            <dd>{p.gender === 'nonbinary' ? 'Non-binary' : p.gender === 'female' ? 'Female' : 'Male'}</dd>
            <dt>Hometown</dt>
            <dd>{getRegion(p.birthRegionId).seatCity}</dd>
            <dt>Background</dt>
            <dd>{getBackground(p.backgroundId).name}</dd>
            <dt>Credible on</dt>
            <dd>{getBackground(p.backgroundId).credibleIssues.map((i) => ISSUES_BY_ID[i].name).join(', ')}</dd>
            <dt>Energy per turn</dt>
            <dd>{energyForAge(age)}</dd>
          </dl>
          <h3>Activity</h3>
          <ul className="log">
            {[...state.log].reverse().map((entry, i) => (
              <li key={i}>
                <span className="muted">
                  {entry.year} T{entry.turn + 1}
                </span>{' '}
                {entry.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sub === 'skills' && (
        <section className="panel">
          <h2>Skills</h2>
          <ul className="skills">
            {SKILL_IDS.map((id) => (
              <li key={id}>
                <span title={SKILL_HINTS[id]}>{SKILL_LABELS[id]}</span>
                <meter min={0} max={10} value={p.skills[id]} />
                <span className="num">{p.skills[id]}/10</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sub === 'ideals' && (
        <section className="panel">
          <h2>Ideals & record</h2>
          <p className="muted">Your 5 platform topics and voting record arrive with the first campaign (M3).</p>
        </section>
      )}

      {sub === 'history' && (
        <section className="panel">
          <h2>Election history</h2>
          <p className="muted">No elections yet.</p>
        </section>
      )}

      {sub === 'stats' && (
        <section className="panel">
          <h2>Stats</h2>
          <p className="muted">
            {state.snapshots.length} turn snapshot{state.snapshots.length === 1 ? '' : 's'} recorded. Charts arrive in M7.
          </p>
        </section>
      )}
    </div>
  );
}
