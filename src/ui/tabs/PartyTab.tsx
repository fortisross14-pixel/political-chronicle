import { getOffice, ISSUES, PARTIES, PARTY_IDS, STATES } from '../../data';
import {
  effectivePlatform,
  fileRaceError,
  homeStateId,
  invitations,
  joinError,
  nominationStatus,
  partyAlignment,
  raceOptions,
} from '../../engine';
import type { Action, GameState, IssueId, PartyId } from '../../engine';
import { stanceLabel } from '../campaign/labels';
import { money, pct } from '../format';

function Axis({ marks }: { marks: { value: number; className: string; label: string }[] }) {
  return (
    <span className="record-axis">
      {marks.map((m) => (
        <span
          key={m.label}
          className={`record-dot ${m.className}`}
          title={`${m.label}: ${m.value.toFixed(1)}`}
          style={{ left: `${((m.value + 2) / 4) * 100}%` }}
        />
      ))}
    </span>
  );
}

export function PartyTab({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const stateId = homeStateId(state);
  const party = state.career.affiliation === 'IND' ? undefined : (state.career.affiliation as PartyId);
  const invites = invitations(state);

  return (
    <div className="stack">
      {party ? <Membership state={state} party={party} /> : <Independent state={state} />}

      {invites.length > 0 && (
        <section className="panel">
          <h2>{party ? 'Switch parties' : 'Invitations'}</h2>
          <p className="muted small">
            {party
              ? 'Switching costs 10 integrity and you start near the bottom of the new party’s pecking order.'
              : 'Both parties have noticed you. Your starting standing depends on how well your record fits their platform.'}
          </p>
          <div className="party-grid">
            {invites.map((inv) => {
              const p = PARTIES[inv.party];
              const error = joinError(state, inv.party);
              return (
                <article key={inv.party} className="panel party" style={{ borderTopColor: p.color }}>
                  <h3>{p.name}</h3>
                  <p className="muted small">
                    The {p.nickname} · mascot: {p.mascot}
                  </p>
                  <dl className="kv small">
                    <dt>Fit with your record</dt>
                    <dd>{pct(inv.alignment)}</dd>
                    <dt>Starting standing</dt>
                    <dd>{inv.startingStanding}</dd>
                  </dl>
                  <button
                    disabled={!!error}
                    title={error}
                    onClick={() => {
                      if (!inv.switching || window.confirm(`Switch to the ${p.name}? This costs integrity.`))
                        dispatch({ type: 'JOIN_PARTY', party: inv.party });
                    }}
                  >
                    {inv.switching ? 'Switch to' : 'Join'} the {p.nickname}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <PlatformComparison state={state} party={party} stateId={stateId} />
      <Nominations state={state} dispatch={dispatch} />
    </div>
  );
}

function Independent({ state }: { state: GameState }) {
  return (
    <section className="panel">
      <h2>You are an independent</h2>
      <p className="muted small">
        {state.elections.length
          ? 'You can stay independent: you may still run for any office, but you get no party money and voters in partisan races discount you.'
          : 'Parties will notice you once you’ve run for office.'}
      </p>
    </section>
  );
}

function Membership({ state, party }: { state: GameState; party: PartyId }) {
  const p = PARTIES[party];
  const standing = Math.round(state.career.partyStanding ?? 0);
  const alignment = partyAlignment(state, party);
  return (
    <section className="panel party" style={{ borderTopColor: p.color }}>
      <h2>{p.name}</h2>
      <p className="muted small">
        The {p.nickname} · mascot: {p.mascot}
      </p>
      <div className="party-stats">
        <div>
          <span className="big-number">{standing}</span>
          <span className="muted small"> standing</span>
          <meter min={0} max={100} value={standing} aria-label="Party standing" />
        </div>
        <div>
          <span className="big-number">{pct(alignment)}</span>
          <span className="muted small"> fit with the platform</span>
        </div>
        <div>
          <span className="big-number">{money(state.lastIncome?.party ?? 0)}</span>
          <span className="muted small"> party money this turn</span>
        </div>
      </div>
      <p className="muted small">
        Standing rises when you sign or back what the party wants (whip votes count triple), headline party events and win races; it falls
        when you vote against them. Party money grows with standing × fit², and flows to close races.
      </p>
    </section>
  );
}

function PlatformComparison({ state, party, stateId }: { state: GameState; party?: PartyId; stateId: string }) {
  const parties = party ? [party] : PARTY_IDS;
  const issues = ISSUES.filter((i) => state.record[i.id] !== undefined || parties.some((p) => PARTIES[p].platform[i.id].weight >= 0.8));
  const chapterName = STATES[stateId]!.name;
  return (
    <section className="panel">
      <h2>Your record vs. the platform{party ? '' : 's'}</h2>
      <p className="muted small">
        Each party’s effective platform here is 70% national and 30% {chapterName} chapter — the local party tolerates more deviation than
        the national one.
      </p>
      <div className="legend small">
        <span>
          <span className="record-dot you static" /> You
        </span>
        {parties.map((p) => (
          <span key={p}>
            <span className={`record-dot ${p.toLowerCase()} static`} /> {PARTIES[p].nickname}
          </span>
        ))}
      </div>
      <ul className="record">
        {issues.map((i) => {
          const marks = parties.map((p) => ({
            value: effectivePlatform(p, stateId)[i.id].position,
            className: p.toLowerCase(),
            label: PARTIES[p].nickname,
          }));
          const you = state.record[i.id as IssueId];
          if (you !== undefined) marks.push({ value: you, className: 'you', label: 'You' });
          const gap = party && you !== undefined ? Math.abs(you - effectivePlatform(party, stateId)[i.id].position) : undefined;
          return (
            <li key={i.id}>
              <span>{i.name}</span>
              <Axis marks={marks} />
              <span className="muted small">
                {you === undefined ? 'No record' : stanceLabel(i.id, Math.abs(you) >= 1.5 ? Math.sign(you) * 2 : Math.sign(you) || 1)}
                {gap !== undefined && gap >= 2 && <span className="fit bad"> far from the party</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Nominations({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const options = raceOptions(state).filter((o) => getOffice(o.officeId).partisan);
  return (
    <section className="panel">
      <h2>Nominations</h2>
      <p className="muted small">
        Uncontested nomination: House needs standing 40, Senate and Governor 60. Up to 25 below, you can force a primary among party voters,
        decided at the end of the election year’s first turn. Running for a different office puts your current seat on the line.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Office</th>
            <th>Election</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {options.map((o) => {
            const status = nominationStatus(state, o.officeId);
            const error = fileRaceError(state, o.officeId);
            const label =
              status.kind === 'nominee'
                ? 'Request nomination'
                : status.kind === 'primary'
                  ? 'Enter primary'
                  : status.kind === 'independent'
                    ? 'Run as independent'
                    : 'Denied';
            return (
              <tr key={o.officeId}>
                <td>{getOffice(o.officeId).name}</td>
                <td>Nov {o.electionYear}</td>
                <td className="small">{o.eligible ? status.text : o.reason}</td>
                <td>
                  <button disabled={!!error} title={error} onClick={() => dispatch({ type: 'FILE_RACE', officeId: o.officeId })}>
                    {label}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
