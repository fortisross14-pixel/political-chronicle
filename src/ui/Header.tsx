import { getOffice, PARTIES } from '../data';
import { ageOf, averageApproval, endTurnBlocker, isElectionYear, turnLabel } from '../engine';
import type { GameState } from '../engine';
import { money } from './format';

interface Props {
  state: GameState;
  onEndTurn: () => void;
  onMainMenu: () => void;
  onAbandon: () => void;
}

export function Header({ state, onEndTurn, onMainMenu, onAbandon }: Props) {
  const { clock, career, politician } = state;
  const electionYear = isElectionYear(career, clock.year);
  const blocker = endTurnBlocker(state);
  const approval = averageApproval(state);
  const status = career.office
    ? `${getOffice(career.office.officeId).name} · ${Math.round(approval! * 100)}% approval${career.race ? (career.race.officeId === career.office.officeId ? ' · running again' : ` · running for ${getOffice(career.race.officeId).name}`) : ''}`
    : career.race
      ? `Candidate · ${getOffice(career.race.officeId).name}`
      : 'Private citizen';

  return (
    <header className="header">
      <div className="who">
        <strong>{politician.name}</strong>
        <span className="muted">
          {Math.floor(ageOf(state))} · {career.affiliation === 'IND' ? 'Independent' : PARTIES[career.affiliation].name} · {status}
        </span>
      </div>
      <div className="clock">
        <span className="date">{turnLabel(clock)}</span>
        <span className="muted">
          Turn {clock.turn + 1}/{clock.turnsThisYear}
          {electionYear && <span className="badge">Election year</span>}
        </span>
      </div>
      {blocker && !state.ended && <span className="blocker small">{blocker}</span>}
      <dl className="stats">
        <div
          title={
            state.lastIncome
              ? `This turn: donors +${money(state.lastIncome.donors)}, salary +${money(state.lastIncome.salary)}, party +${money(state.lastIncome.party)}, staff −${money(state.lastIncome.upkeep)}`
              : undefined
          }
        >
          <dt>Funds</dt>
          <dd>
            {money(state.funds)}
            {state.lastIncome && (
              <span className="income small"> +{money(state.lastIncome.donors + state.lastIncome.salary + state.lastIncome.party - state.lastIncome.upkeep)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Energy</dt>
          <dd>{state.energy}</dd>
        </div>
        <div>
          <dt>Integrity</dt>
          <dd>{state.integrity}</dd>
        </div>
      </dl>
      <div className="header-actions">
        <button className="primary" onClick={onEndTurn} disabled={!!blocker} title={blocker}>
          End turn
        </button>
        <button onClick={onMainMenu}>Menu</button>
        <button className="danger" onClick={onAbandon}>
          Abandon
        </button>
      </div>
    </header>
  );
}
