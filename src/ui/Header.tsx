import { getOffice, PARTIES } from '../data';
import { ART_IDS } from '../data/artManifest';
import { PortraitArt } from './cards/CardArt';
import { playerPortrait } from './portraits';
import { ageOf, averageApproval, isElectionYear, turnLabel } from '../engine';
import type { GameState } from '../engine';
import { Bolt } from './cards/GameCard';
import { money } from './format';
import { CountUp } from './fx/CountUp';
import { setFxSettings, useFxSettings } from './fx/settings';

interface Props {
  state: GameState;
  onMainMenu: () => void;
  onAbandon: () => void;
}

export function Header({ state, onMainMenu, onAbandon }: Props) {
  const { clock, career, politician } = state;
  const fx = useFxSettings();
  const electionYear = isElectionYear(career, clock.year);
  const approval = averageApproval(state);
  const status = career.office
    ? `${getOffice(career.office.officeId).name} · ${Math.round(approval! * 100)}% approval${career.race ? (career.race.officeId === career.office.officeId ? ' · running again' : ` · running for ${getOffice(career.race.officeId).name}`) : ''}`
    : career.race
      ? `Candidate · ${getOffice(career.race.officeId).name}`
      : 'Private citizen';
  const side = career.affiliation === 'IND' ? 'ind' : career.affiliation.toLowerCase();
  const initials = politician.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="header">
      <div className="header-id">
        <span className={`avatar ${side}`} aria-hidden="true">
          {ART_IDS.has(playerPortrait(politician)) ? (
            <PortraitArt id={playerPortrait(politician)} name={politician.name} role="campaignManager" />
          ) : (
            initials
          )}
        </span>
        <div className="who">
          <strong>{politician.name}</strong>
          <span className="muted who-line">
            {Math.floor(ageOf(state))} · {career.affiliation === 'IND' ? 'Independent' : PARTIES[career.affiliation].name} · {status}
          </span>
        </div>
      </div>
      <div className="clock">
        <span className="date">{turnLabel(clock)}</span>
        <span className="muted">
          Turn {clock.turn + 1}/{clock.turnsThisYear}
          {electionYear && <span className="badge">Election year</span>}
        </span>
      </div>
      <dl className="stats">
        <div
          className="stat gold"
          title={
            state.lastIncome
              ? `This turn: donors +${money(state.lastIncome.donors)}, salary +${money(state.lastIncome.salary)}, party +${money(state.lastIncome.party)}`
              : undefined
          }
        >
          <dt>Campaign</dt>
          <dd>
            <CountUp value={state.funds} format={money} />
            {state.lastIncome && (
              <span className="income small"> +{money(state.lastIncome.donors + state.lastIncome.salary + state.lastIncome.party)}</span>
            )}
          </dd>
        </div>
        <div className="stat" title="Personal money: goes into a campaign only when you launch it">
          <dt>Wealth</dt>
          <dd>
            <CountUp value={state.wealth} format={money} />
          </dd>
        </div>
        <div className="stat">
          <dt>Energy</dt>
          <dd>
            <Bolt /> <CountUp value={state.energy} />
          </dd>
        </div>
        <div className="stat">
          <dt>Integrity</dt>
          <dd>
            <CountUp value={state.integrity} />
          </dd>
        </div>
      </dl>
      <details className="header-menu">
        <summary aria-label="Game menu">Menu</summary>
        <div className="header-menu-items">
          <label className="toggle">
            <input type="checkbox" checked={fx.sound} onChange={(e) => setFxSettings({ sound: e.target.checked })} />
            <span>Sound effects</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={fx.haptics} onChange={(e) => setFxSettings({ haptics: e.target.checked })} />
            <span>Vibration</span>
          </label>
          <button onClick={onMainMenu}>Save and go to the main menu</button>
          <button className="danger" onClick={onAbandon}>
            Abandon this run
          </button>
        </div>
      </details>
    </header>
  );
}
