import { getOffice } from '../data';
import { ageOf, isElectionYear, turnLabel } from '../engine';
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
  const status = career.office
    ? getOffice(career.office.officeId).name
    : career.race
      ? `Candidate · ${getOffice(career.race.officeId).name}`
      : 'Private citizen';

  return (
    <header className="header">
      <div className="who">
        <strong>{politician.name}</strong>
        <span className="muted">
          {Math.floor(ageOf(state))} · {career.affiliation === 'IND' ? 'Independent' : career.affiliation} · {status}
        </span>
      </div>
      <div className="clock">
        <span className="date">{turnLabel(clock)}</span>
        <span className="muted">
          Turn {clock.turn + 1}/{clock.turnsThisYear}
          {electionYear && <span className="badge">Election year</span>}
        </span>
      </div>
      <dl className="stats">
        <div>
          <dt>Funds</dt>
          <dd>{money(state.funds)}</dd>
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
        <button className="primary" onClick={onEndTurn}>
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
