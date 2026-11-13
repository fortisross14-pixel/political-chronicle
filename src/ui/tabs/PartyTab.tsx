import { ISSUES_BY_ID, PARTIES, PARTY_IDS } from '../../data';
import type { GameState, IssueId } from '../../engine';

export function PartyTab({ state }: { state: GameState }) {
  const independent = state.career.affiliation === 'IND';

  return (
    <div className="stack">
      <section className="panel">
        <h2>{independent ? 'You are an independent' : PARTIES[state.career.affiliation as 'DU' | 'RP'].name}</h2>
        <p className="muted">
          Parties may invite you after your first race. Alignment, standing, party funds and nomination requests arrive in
          M6.
        </p>
      </section>
      <div className="party-grid">
        {PARTY_IDS.map((id) => {
          const party = PARTIES[id];
          const priorities = (Object.entries(party.platform) as [IssueId, { position: number; weight: number }][])
            .sort((a, b) => b[1].weight - a[1].weight)
            .slice(0, 5);
          return (
            <section key={id} className="panel party" style={{ borderTopColor: party.color }}>
              <h2>{party.name}</h2>
              <p className="muted small">
                {party.nickname} · mascot: {party.mascot}
              </p>
              <h3>Top priorities</h3>
              <ul>
                {priorities.map(([issueId, plank]) => {
                  const issue = ISSUES_BY_ID[issueId];
                  return <li key={issueId}>{plank.position < 0 ? issue.negLabel : issue.posLabel}</li>;
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
