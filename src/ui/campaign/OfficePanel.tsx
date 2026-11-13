import { getOffice, getRegion, ISSUES_BY_ID } from '../../data';
import { averageApproval } from '../../engine';
import type { Action, GameState } from '../../engine';
import { pct } from '../format';
import { stanceLabel } from './labels';

export function OfficePanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const term = state.career.office!;
  const office = getOffice(term.officeId);
  const avg = averageApproval(state)!;
  const yearsLeft = term.termEndsYear - state.clock.year;
  const kept = state.promises.filter((p) => p.year >= term.startedYear && p.kept).length;
  const broken = state.promises.filter((p) => p.year >= term.startedYear && !p.kept).length;
  const campaigning = !!state.career.race;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{office.name}</h2>
        <span className="badge-soft">
          {campaigning
            ? state.career.race!.officeId === term.officeId
              ? 'Re-election year'
              : `Running for ${getOffice(state.career.race!.officeId).name} — seat at stake`
            : yearsLeft <= 1 ? `Re-election campaign starts Jan ${term.termEndsYear}` : `Term ends Nov ${term.termEndsYear}`}
        </span>
      </div>
      <div className="approval-row">
        <div>
          <span className="big-number">{pct(avg)}</span>
          <span className="muted small"> job approval</span>
        </div>
        <div className="approval-regions">
          {Object.entries(term.approval).map(([id, a]) => (
            <div key={id} className="poll-row you">
              <span className="poll-name">{getRegion(id).name}</span>
              <span className="poll-bar" aria-hidden>
                <span style={{ width: `${a * 100}%` }} />
              </span>
              <span className="num">{pct(a)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="muted small">
        Approval wears down a little every turn. Sign bills your voters like and that keep your promises; at re-election you are judged on
        it. Promises this term: <span className="pos">{kept} kept</span>, <span className="neg">{broken} broken</span>. To run for higher office, see
        My party → Nominations.
      </p>
      <details>
        <summary>The platform you won on</summary>
        <ul className="small">
          {term.platform.map((p) => (
            <li key={p.issue}>
              <strong>{ISSUES_BY_ID[p.issue].name}:</strong> {stanceLabel(p.issue, p.stance)}
            </li>
          ))}
        </ul>
      </details>
      {!campaigning && (
        <div className="row">
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('Retire from politics now? This ends the run.')) dispatch({ type: 'RETIRE' });
            }}
          >
            Retire
          </button>
        </div>
      )}
    </section>
  );
}
