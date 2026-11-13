import { useState } from 'react';
import { getBackground, getOffice, getRegion, ISSUES, ISSUES_BY_ID } from '../../data';
import { stanceLabel } from '../campaign/labels';
import { pct } from '../format';
import { getSkillCard } from '../../data';
import { ageOf, energyForAge, skillCap, SKILL_HINTS, SKILL_IDS, SKILL_LABELS } from '../../engine';
import { money } from '../format';
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
          <p className="muted small">
            Skill cards in the Market raise a skill by 1. At your current level you can train up to {skillCap(state)} (House: 8, Senate/Governor: 10).
          </p>
          {state.staff.length > 0 && (
            <>
              <h3>Staff</h3>
              <ul>
                {state.staff.map((m) => (
                  <li key={m.cardId}>
                    {getSkillCard(m.cardId).name.replace(/^Hire an? /, '')} — {money(m.upkeep)} per 3 months
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {sub === 'ideals' && (
        <section className="panel">
          <h2>Ideals & record</h2>
          {state.career.race?.platform.length ? (
            <>
              <h3>Current platform — {getOffice(state.career.race.officeId).name}</h3>
              <ul>
                {state.career.race.platform.map((p) => (
                  <li key={p.issue}>
                    <strong>{ISSUES_BY_ID[p.issue].name}:</strong> {stanceLabel(p.issue, p.stance)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted small">No active platform.</p>
          )}
          <h3>Public record</h3>
          <p className="muted small">Built from your pledges and the decisions you backed. Straying from it makes you less credible.</p>
          <ul className="record">
            {ISSUES.filter((i) => state.record[i.id] !== undefined).map((i) => {
              const v = state.record[i.id]!;
              return (
                <li key={i.id}>
                  <span>{i.name}</span>
                  <span className="record-axis" aria-label={`${i.name} record ${v.toFixed(1)}`}>
                    <span className="record-dot" style={{ left: `${((v + 2) / 4) * 100}%` }} />
                  </span>
                  <span className="muted small">{Math.abs(v) < 0.35 ? 'Mixed' : stanceLabel(i.id, Math.abs(v) >= 1.5 ? Math.sign(v) * 2 : Math.sign(v))}</span>
                </li>
              );
            })}
          </ul>
          {Object.keys(state.record).length === 0 && <p className="muted">No record yet.</p>}
          <p className="small">Integrity: {state.integrity}/100</p>
        </section>
      )}

      {sub === 'history' && (
        <section className="panel">
          <h2>Election history</h2>
          {state.elections.length === 0 ? (
            <p className="muted">No elections yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Office</th>
                  <th>Result</th>
                  <th>Your share</th>
                  <th>Final poll</th>
                </tr>
              </thead>
              <tbody>
                {[...state.elections].reverse().map((e, i) => (
                  <tr key={i}>
                    <td>{e.year}</td>
                    <td>{getOffice(e.officeId).name}</td>
                    <td className={e.playerWon ? 'pos' : 'neg'}>{e.playerWon ? 'Won' : 'Lost'}</td>
                    <td>{pct(e.totalShares[0]!)}</td>
                    <td>{pct(e.finalPoll)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
