import { useState } from 'react';
import { getBackground, getOffice, getScenario } from '../../data';
import type { Profile, RunSummary } from '../../engine';
import { LineChart, SERIES_COLORS } from '../charts/LineChart';
import { money } from '../format';

type Metric = 'approval' | 'recognition' | 'funds';

const METRICS: { id: Metric; label: string; format: (v: number) => string }[] = [
  { id: 'approval', label: 'Approval / poll', format: (v) => `${Math.round(v * 100)}%` },
  { id: 'recognition', label: 'Recognition', format: (v) => `${Math.round(v * 100)}%` },
  { id: 'funds', label: 'Funds', format: money },
];

function runLabel(r: RunSummary): string {
  return `${r.name} (${r.startYear})`;
}

/** Compare finished careers: sorted by legacy, overlay up to 3 on one measure. */
export function HallOfRuns({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const runs = [...profile.runs].sort((a, b) => b.legacy - a.legacy);
  const [picked, setPicked] = useState<string[]>(runs.slice(0, 2).map((r) => r.runId));
  const [metric, setMetric] = useState<Metric>('approval');
  const chosen = picked.map((id) => runs.find((r) => r.runId === id)!).filter(Boolean);
  const m = METRICS.find((x) => x.id === metric)!;

  return (
    <div className="menu-page">
      <button onClick={onBack}>‹ Menu</button>
      <h1>Hall of Runs</h1>
      <section className="panel">
        <table className="table hall">
          <thead>
            <tr>
              <th>Compare</th>
              <th>Politician</th>
              <th>Mode</th>
              <th>Years</th>
              <th>Highest office</th>
              <th>Won/lost</th>
              <th>Promises kept</th>
              <th>Legacy</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const i = picked.indexOf(r.runId);
              return (
                <tr key={r.runId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Compare ${r.name}`}
                      checked={i >= 0}
                      disabled={i < 0 && picked.length >= SERIES_COLORS.length}
                      onChange={() => setPicked(i >= 0 ? picked.filter((p) => p !== r.runId) : [...picked, r.runId])}
                    />
                    {i >= 0 && <span className="swatch" style={{ background: SERIES_COLORS[i] }} />}
                  </td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted small">{getBackground(r.backgroundId).name}</div>
                  </td>
                  <td className="small">
                    {r.mode === 'scenario' && r.scenarioId
                      ? `${getScenario(r.scenarioId).title} ${r.scenarioWon ? `★${r.stars}` : '✗'}`
                      : 'Sandbox'}
                  </td>
                  <td>
                    {r.startYear}–{r.endYear}
                  </td>
                  <td>{r.highestOffice ? getOffice(r.highestOffice).name : '—'}</td>
                  <td>
                    {r.electionsWon}/{r.electionsLost}
                  </td>
                  <td>
                    {r.promisesKept + r.promisesBroken
                      ? `${Math.round((100 * r.promisesKept) / (r.promisesKept + r.promisesBroken))}%`
                      : '—'}
                  </td>
                  <td>
                    <strong>{r.legacy}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {chosen.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Compare careers</h2>
            <div className="segmented" role="radiogroup" aria-label="Measure">
              {METRICS.map((x) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={metric === x.id}
                  className={metric === x.id ? 'active' : undefined}
                  onClick={() => setMetric(x.id)}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            title={`${m.label} by turn`}
            series={chosen.map((r, i) => ({ name: runLabel(r), values: r.series[metric], color: SERIES_COLORS[i] }))}
            format={m.format}
            yMin={metric === 'funds' ? undefined : 0}
            yMax={metric === 'funds' ? undefined : 1}
            height={220}
          />
        </section>
      )}
    </div>
  );
}
