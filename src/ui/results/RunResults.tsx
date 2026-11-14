import { ABILITIES_BY_ID, ARTIFACTS_BY_ID, getBackground, getOffice, getScenario } from '../../data';
import { buildRunSummary } from '../../engine';
import type { GameState, RecordOutcome } from '../../engine';
import { CareerCharts } from '../charts/CareerCharts';
import { Stars } from '../menu/ScenarioSelect';
import { pct } from '../format';

interface Props {
  state: GameState;
  outcome: RecordOutcome | null;
  onMenu: () => void;
  onHall: () => void;
}

const END_TEXT: Record<string, string> = {
  retired: 'You retired from politics.',
  losses: 'Three defeats in a row ended your career.',
  age: 'You stepped away from public life.',
  length: 'Your career has run its course.',
  scenario: '',
};

export function RunResults({ state, outcome, onMenu, onHall }: Props) {
  const summary = buildRunSummary(state);
  const scenario = state.scenario ? getScenario(state.scenario.id) : undefined;
  const result = state.scenario?.result;

  return (
    <div className="menu-page">
      <div className={`panel results-hero ${result ? (result.won ? 'won' : 'lost') : ''}`}>
        <span className="muted small">{scenario ? `Scenario · ${scenario.title}` : 'Sandbox career'}</span>
        <h1>{result ? (result.won ? 'Mission accomplished' : 'Mission failed') : `${state.politician.name}: career over`}</h1>
        <p>{result?.reason ?? END_TEXT[state.ended?.reason ?? ''] ?? ''}</p>
        {scenario && result && (
          <>
            <Stars n={result.stars.length} />
            <ul className="star-goals">
              {scenario.stars.map((g) => (
                <li key={g.id} className={result.stars.includes(g.id) ? 'done' : undefined}>
                  <span>{result.stars.includes(g.id) ? '★' : '☆'}</span> {g.text}
                </li>
              ))}
            </ul>
          </>
        )}
        {outcome && (outcome.newArtifacts.length > 0 || outcome.newAbilities.length > 0 || outcome.unlockedSandbox) && (
          <div className="rewards">
            <h3>Rewards</h3>
            {outcome.newArtifacts.map((a) => (
              <div key={a}>
                🎁 Artifact: {ARTIFACTS_BY_ID[a]!.name} — {ARTIFACTS_BY_ID[a]!.text}
              </div>
            ))}
            {outcome.newAbilities.map((a) => (
              <div key={a}>
                ✨ Ability: {ABILITIES_BY_ID[a]!.name} — {ABILITIES_BY_ID[a]!.text}
              </div>
            ))}
            {outcome.unlockedSandbox && <div>🔓 Sandbox unlocked!</div>}
          </div>
        )}
      </div>

      <section className="panel">
        <div className="results-stats">
          <div>
            <span className="big-number">{summary.legacy}</span>
            <span className="muted small"> legacy</span>
          </div>
          <dl className="kv">
            <dt>Politician</dt>
            <dd>
              {state.politician.name} · {getBackground(state.politician.backgroundId).name}
            </dd>
            <dt>Years</dt>
            <dd>
              {summary.startYear}–{summary.endYear}
            </dd>
            <dt>Highest office</dt>
            <dd>{summary.highestOffice ? getOffice(summary.highestOffice).name : 'None'}</dd>
            <dt>Elections</dt>
            <dd>
              {summary.electionsWon} won · {summary.electionsLost} lost
            </dd>
            <dt>Promises</dt>
            <dd>
              {summary.promisesKept} kept · {summary.promisesBroken} broken
            </dd>
            <dt>Peak approval</dt>
            <dd>{summary.peakApproval ? pct(summary.peakApproval) : '—'}</dd>
          </dl>
        </div>
        <CareerCharts snapshots={state.snapshots} />
      </section>

      <div className="row">
        <button className="primary" onClick={onMenu}>
          Back to menu
        </button>
        <button onClick={onHall}>Hall of Runs</button>
      </div>
    </div>
  );
}
