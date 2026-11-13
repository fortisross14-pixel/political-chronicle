import { ISSUES_BY_ID, OFFICES, REGIONS, STATES } from '../../data';
import { nextElectionYear } from '../../engine';
import type { GameState, IssueId, Region } from '../../engine';
import { leanLabel, pct, signed } from '../format';

function topIssues(region: Region, n = 3): IssueId[] {
  return (Object.entries(region.issueSalience) as [IssueId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);
}

export function GovernmentTab({ state }: { state: GameState }) {
  const ny = STATES.NY!;
  const regions = REGIONS.filter((r) => r.state === ny.id);
  const raceOffice = state.career.race?.officeId;

  return (
    <div className="stack">
      <section className="panel">
        <h2>{ny.name}</h2>
        <p className="muted small">The interactive map and vote-intention layers arrive in M2–M3.</p>
        <div className="region-grid">
          {regions.map((r) => {
            const you = state.regions[r.id]!;
            const isHome = r.id === state.politician.birthRegionId;
            return (
              <article key={r.id} className="region-card">
                <header>
                  <h3>{r.name}</h3>
                  <span className={`lean ${r.partisanLean < 0 ? 'blue' : 'red'}`}>{leanLabel(r.partisanLean)}</span>
                </header>
                <p className="muted small">
                  {r.seatCity} · {r.type} · {(r.population / 1_000_000).toFixed(1)}M people{isHome && ' · your hometown'}
                </p>
                <p className="small">{r.blurb}</p>
                <dl className="kv">
                  <dt>Recognition</dt>
                  <dd>{pct(you.recognition)}</dd>
                  <dt>Favorability</dt>
                  <dd>{signed(you.favorability)}</dd>
                  <dt>Top issues</dt>
                  <dd>{topIssues(r).map((id) => ISSUES_BY_ID[id].name).join(', ')}</dd>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Offices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Office</th>
              <th>Term</th>
              <th>Next election</th>
            </tr>
          </thead>
          <tbody>
            {OFFICES.filter((o) => o.state === ny.id).map((o) => (
              <tr key={o.id} className={o.id === raceOffice ? 'highlight' : undefined}>
                <td>{o.name}</td>
                <td>{o.termYears} yrs</td>
                <td>{nextElectionYear(o, state.clock.year)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Decisions this turn</h2>
        <p className="muted small">Three decision cards per turn (apply 1–3) arrive in M3.</p>
      </section>
    </div>
  );
}
