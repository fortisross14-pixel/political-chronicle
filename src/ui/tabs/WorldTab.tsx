// The world: who holds what, the election calendar, and every result so far.
import { getOffice, OFFICES } from '../../data';
import { campaignWindow, upcomingElections } from '../../engine';
import type { Affiliation, GameState } from '../../engine';
import { pct } from '../format';
import { PortraitArt } from '../cards/CardArt';
import { opponentPortrait, playerPortrait } from '../portraits';

/** "House · North Country" instead of "U.S. House — North Country & Southern Tier". */
function shortOffice(name: string): string {
  return name
    .replace('U.S. House — ', 'House · ')
    .replace('U.S. Senate — ', 'Senate · ')
    .replace('Mayor of ', 'Mayor · ')
    .replace('Governor of ', 'Governor · ')
    .replace(/ & .*$/, '');
}

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
        <ul className="seat-wall">
          {OFFICES.map((o) => {
            const seat = state.world.seats[o.id];
            return (
              <li key={o.id} className={`seat-card ${seat?.affiliation.toLowerCase() ?? 'ind'}${seat?.isPlayer ? ' mine' : ''}`}>
                <span className="seat-face" aria-hidden="true">
                  {seat && (
                    <PortraitArt
                      id={seat.isPlayer ? playerPortrait(state.politician) : opponentPortrait(seat.holder)}
                      name={seat.holder}
                      role="chiefOfStaff"
                    />
                  )}
                </span>
                <span className="seat-office">{shortOffice(o.name)}</span>
                {seat && (
                  <span className="seat-holder">
                    {seat.isPlayer ? 'You' : seat.holder} <Chip a={seat.affiliation} />
                  </span>
                )}
                {seat && <span className="muted small">since {seat.since}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Election calendar</h2>
        </div>
        <div className="cal-years" role="region" aria-label="Election calendar" tabIndex={0}>
          {[...new Set(calendar.map((c) => c.year))].map((year) => (
            <div key={year} className="cal-col">
              <span className="cal-year">{year}</span>
              {calendar
                .filter((c) => c.year === year)
                .map((c) => {
                  const w = campaignWindow(state, c.officeId);
                  const mine = state.career.race?.officeId === c.officeId && state.career.race.electionYear === c.year;
                  const open = !mine && w.electionYear === c.year && w.open;
                  return (
                    <span key={c.officeId} className={`cal-chip${mine ? ' mine' : open ? ' open' : ''}`}>
                      {shortOffice(getOffice(c.officeId).name)}
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
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
