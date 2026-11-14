// The world: who holds what, the election calendar, and every result so far.
import { getOffice, OFFICES } from '../../data';
import { campaignWindow, upcomingElections } from '../../engine';
import type { Affiliation, GameState } from '../../engine';
import { pct } from '../format';

function Chip({ a }: { a: Affiliation }) {
  return <span className={`party-chip ${a.toLowerCase()}`}>{a === 'IND' ? 'IND' : a}</span>;
}

export function WorldTab({ state }: { state: GameState }) {
  const calendar = upcomingElections(state, 5);
  const results = [...state.world.results].reverse().slice(0, 30);
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Who holds what</h2>
        </div>
        <ul className="seat-list">
          {OFFICES.map((o) => {
            const seat = state.world.seats[o.id];
            return (
              <li key={o.id} className={seat?.isPlayer ? 'mine' : undefined}>
                <span className="seat-office">{o.name}</span>
                {seat && (
                  <span className="seat-holder">
                    <Chip a={seat.affiliation} /> {seat.isPlayer ? `${seat.holder} (you)` : seat.holder}
                    <span className="muted small"> since {seat.since}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Election calendar</h2>
        </div>
        <ul className="calendar">
          {calendar.map((c) => {
            const w = campaignWindow(state, c.officeId);
            const mine = state.career.race?.officeId === c.officeId && state.career.race.electionYear === c.year;
            const status = mine
              ? 'You’re running'
              : w.electionYear === c.year
                ? w.open
                  ? 'Campaigns open now'
                  : `Opens in ${w.opensIn} turns`
                : '';
            return (
              <li key={`${c.officeId}-${c.year}`} className={mine ? 'mine' : undefined}>
                <span className="cal-year">{c.year}</span>
                <span>{getOffice(c.officeId).name}</span>
                <span className="muted small">{status}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Results</h2>
        </div>
        {results.length === 0 ? (
          <p className="muted small">No elections yet. The first results come in at the end of the year.</p>
        ) : (
          <ul className="results-list">
            {results.map((r, i) => (
              <li key={i} className={r.playerRan ? 'mine' : undefined}>
                <span className="cal-year">{r.year}</span>
                <span className="result-office">{getOffice(r.officeId).name}</span>
                <span className="result-line">
                  <Chip a={r.winnerAffiliation} /> <strong>{r.winner}</strong> {pct(r.share)}
                  <span className="muted small">
                    {' '}
                    over {r.runnerUp}
                    {r.playerRan ? (r.playerWon ? ' · your win' : ' · your loss') : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
