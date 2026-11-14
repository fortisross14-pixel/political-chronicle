import { getScenario } from '../../data';
import type { GameState } from '../../engine';

/** Always-visible mission brief while playing a scenario. */
export function ScenarioHud({ state }: { state: GameState }) {
  const run = state.scenario!;
  const scenario = getScenario(run.id);
  const yearsLeft = scenario.objective.by - state.clock.year;
  return (
    <section className="panel scenario-hud">
      <div className="panel-head">
        <div>
          <span className="muted small">Scenario · {scenario.title}</span>
          <h2>{scenario.objective.text}</h2>
        </div>
        <span className="badge-soft">{yearsLeft > 0 ? `${yearsLeft} year${yearsLeft === 1 ? '' : 's'} left` : 'Final year'}</span>
      </div>
      <ul className="star-goals inline small">
        {scenario.stars.map((g) => (
          <li key={g.id}>☆ {g.text}</li>
        ))}
      </ul>
    </section>
  );
}
