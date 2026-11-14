import { useState } from 'react';
import { getBackground, getOffice, getRegion, ISSUES, ISSUES_BY_ID, STATES, US_STATE_NAMES } from '../../data';
import { stanceLabel } from '../campaign/labels';
import { pct } from '../format';
import { ageOf, effectiveSkills, energyForAge, native, newcomerPenalty, skillCap, SKILL_CODES, SKILL_HINTS, SKILL_IDS, SKILL_LABELS } from '../../engine';
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
  const effective = effectiveSkills(state);

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
            <dt>Born in</dt>
            <dd>{US_STATE_NAMES[p.homeState]}</dd>
            <dt>Lives in</dt>
            <dd>
              {getRegion(p.residentRegionId).seatCity}, {STATES[getRegion(p.residentRegionId).state]!.name} ·{' '}
              {native(state) ? 'native' : `transplant (newcomer doubt −${Math.round(newcomerPenalty(state) * 100)})`}
            </dd>
            <dt>Background</dt>
            <dd>{getBackground(p.backgroundId).name}</dd>
            <dt>Perk</dt>
            <dd>{getBackground(p.backgroundId).perkText}</dd>
            <dt>Weakness</dt>
            <dd>{getBackground(p.backgroundId).weaknessText}</dd>
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
                <span title={SKILL_HINTS[id]}>
                  <span className="code">{SKILL_CODES[id]}</span> {SKILL_LABELS[id]}
                </span>
                <meter min={0} max={10} value={p.skills[id]} />
                <span className="num">{p.skills[id]}/10</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Skill cards in the Market raise a skill by 1. At your current level you can train up to {skillCap(state)} (House: 8, Senate/Governor: 10).
          </p>
          {SKILL_IDS.some((id) => effective[id] !== p.skills[id]) && (
            <p className="small">
              With your team: {SKILL_IDS.filter((id) => effective[id] !== p.skills[id]).map((id) => `${SKILL_CODES[id]} ${effective[id]}`).join(' · ')}
            </p>
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
          ) : state.career.office ? null : (
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
          {state.career.office && (
            <>
              <h3>Platform you won on — {getOffice(state.career.office.officeId).name}</h3>
              <ul>
                {state.career.office.platform.map((p) => (
                  <li key={p.issue}>
                    <strong>{ISSUES_BY_ID[p.issue].name}:</strong> {stanceLabel(p.issue, p.stance)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>Promises</h3>
          {state.promises.length === 0 ? (
            <p className="muted small">Nothing you've backed has touched a promise yet.</p>
          ) : (
            <>
              <p className="small">
                <span className="pos">{state.promises.filter((p) => p.kept).length} kept</span> ·{' '}
                <span className="neg">{state.promises.filter((p) => !p.kept).length} broken</span>
              </p>
              <ul className="log">
                {[...state.promises].reverse().map((p, i) => (
                  <li key={i}>
                    <span className="muted">
                      {p.year} T{p.turn + 1}
                    </span>{' '}
                    <span className={p.kept ? 'pos' : 'neg'}>{p.kept ? 'Kept' : 'Broke'}</span> your {ISSUES_BY_ID[p.issue].name} promise — “{p.title}”
                  </li>
                ))}
              </ul>
            </>
          )}
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
                    <td>
                      {getOffice(e.officeId).name}
                      {e.kind === 'primary' && <span className="muted small"> (primary)</span>}
                    </td>
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
