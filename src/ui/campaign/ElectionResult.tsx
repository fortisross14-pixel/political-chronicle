import { getOffice, getRegion } from '../../data';
import type { Action, ElectionRecord } from '../../engine';
import { pct } from '../format';

export function ElectionResult({ election, dispatch }: { election: ElectionRecord; dispatch: (a: Action) => void }) {
  const office = getOffice(election.officeId);
  const order = election.candidates.map((c, i) => ({ c, share: election.totalShares[i]!, i })).sort((a, b) => b.share - a.share);

  return (
    <section className={election.playerWon ? 'panel result won' : 'panel result lost'} role="dialog" aria-label="Election result">
      <h2>{election.playerWon ? `You won! ${office.name}` : `You lost the race for ${office.name}`}</h2>
      <p className="muted small">
        Election Day, November {election.year}. Your final poll: {pct(election.finalPoll)} of decided voters.
      </p>
      <div className="poll">
        {order.map(({ c, share }) => (
          <div key={c.name} className={c.isPlayer ? 'poll-row you' : 'poll-row'}>
            <span className="poll-name">{c.isPlayer ? `${c.name} (you)` : c.name}</span>
            <span className="poll-bar" aria-hidden>
              <span style={{ width: `${share * 100}%` }} />
            </span>
            <span className="num">{pct(share)}</span>
          </div>
        ))}
      </div>
      {Object.keys(election.regionShares).length > 1 && (
        <table className="table">
          <thead>
            <tr>
              <th>Region</th>
              {election.candidates.map((c) => (
                <th key={c.name}>{c.isPlayer ? 'You' : c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(election.regionShares).map(([id, shares]) => (
              <tr key={id}>
                <td>{getRegion(id).name}</td>
                {shares.map((s, i) => (
                  <td key={i}>{pct(s)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="small">
        {election.playerWon
          ? 'You take office in January. Bills land on your desk every turn; keep your promises and your approval up — at re-election you are judged on both.'
          : 'You can try again next cycle, run for a different office, or retire.'}
      </p>
      <button className="primary" onClick={() => dispatch({ type: 'DISMISS_RESULT' })}>
        Continue
      </button>
    </section>
  );
}
