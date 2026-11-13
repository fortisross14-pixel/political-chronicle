import { useState } from 'react';
import { getOffice, getRegion, ISSUES } from '../../data';
import { alignment, MAX_PLATFORM, platformError, regionWeights } from '../../engine';
import type { Action, GameState, IssueId, Pledge } from '../../engine';
import { fitLabel, stanceLabel } from './labels';

const STANCES = [-2, -1, 1, 2] as const;
const STANCE_GLYPH: Record<number, string> = { [-2]: '◀◀', [-1]: '◀', 1: '▶', 2: '▶▶' };

export function PlatformBuilder({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const incumbent = state.career.office?.officeId === race.officeId ? state.career.office : undefined;
  const [picks, setPicks] = useState<Partial<Record<IssueId, number>>>(() =>
    incumbent ? Object.fromEntries(incumbent.platform.map((p) => [p.issue, p.stance])) : {},
  );

  const avg = (issue: IssueId, key: 'issueOpinion' | 'issueSalience') =>
    office.regionIds.reduce((sum, id) => sum + getRegion(id)[key][issue] * weights[id]!, 0);
  const rows = ISSUES.map((i) => ({ issue: i, salience: avg(i.id, 'issueSalience'), opinion: avg(i.id, 'issueOpinion') })).sort(
    (a, b) => b.salience - a.salience,
  );
  const platform: Pledge[] = Object.entries(picks).map(([issue, stance]) => ({ issue: issue as IssueId, stance: stance! }));
  const error = platformError(state, platform);
  const full = platform.length >= MAX_PLATFORM;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{incumbent ? 'Re-election platform' : 'Your platform'} — {office.name}</h2>
        <span className={full ? 'muted' : 'points-left'}>
          {platform.length}/{MAX_PLATFORM} topics
        </span>
      </div>
      {incumbent && (
        <p className="small">Pre-filled with the platform you won on. Changing sides on a topic reads as a flip-flop.</p>
      )}
      <p className="muted small">
        Pick up to {MAX_PLATFORM} topics and a side on each. Every event you hold is about one of them, and the decisions you take will be judged
        against these promises. Sorted by how much {office.regionIds.length === 1 ? getRegion(office.regionIds[0]!).seatCity : 'the electorate'}{' '}
        cares.
      </p>
      <ul className="platform-list">
        {rows.map(({ issue, salience, opinion }) => {
          const chosen = picks[issue.id];
          const relevanceNote = office.level === 'mayor' && issue.mayorRelevance !== 'full' ? (issue.mayorRelevance === 'none' ? 'Little effect as mayor' : 'Partly a local issue') : '';
          const record = state.record[issue.id];
          return (
            <li key={issue.id} className={chosen !== undefined ? 'chosen' : undefined}>
              <div className="platform-issue">
                <strong>{issue.name}</strong>
                <meter min={0} max={1} value={salience} aria-label={`${issue.name}: how much voters care`} />
                <span className="muted small">
                  Voters: {Math.abs(opinion) < 0.35 ? 'split' : stanceLabel(issue.id, opinion < 0 ? (opinion <= -1.2 ? -2 : -1) : opinion >= 1.2 ? 2 : 1)}
                  {relevanceNote && ` · ${relevanceNote}`}
                </span>
              </div>
              <div className="stance-picker" role="radiogroup" aria-label={`${issue.name} stance`}>
                <span className="pole small">{issue.negLabel}</span>
                {STANCES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    role="radio"
                    aria-checked={chosen === s}
                    aria-label={stanceLabel(issue.id, s)}
                    title={stanceLabel(issue.id, s)}
                    className={chosen === s ? 'active' : undefined}
                    disabled={chosen === undefined && full}
                    onClick={() => {
                      const next = { ...picks };
                      if (chosen === s) delete next[issue.id];
                      else next[issue.id] = s;
                      setPicks(next);
                    }}
                  >
                    {STANCE_GLYPH[s]}
                  </button>
                ))}
                <span className="pole small">{issue.posLabel}</span>
              </div>
              <div className="platform-fit small">
                {chosen !== undefined && (
                  <>
                    <span className={`fit ${fitLabel(alignment(chosen, opinion)).tone}`}>{fitLabel(alignment(chosen, opinion)).text}</span>
                    {record !== undefined && Math.sign(record) !== Math.sign(chosen) && <span className="fit bad">Flip-flop vs your record</span>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="row sticky-actions">
        <button className="primary" disabled={!!error} onClick={() => dispatch({ type: 'SET_PLATFORM', platform })}>
          Lock in platform
        </button>
        {error && platform.length > 0 && <span className="muted small">{error}</span>}
      </div>
    </section>
  );
}
