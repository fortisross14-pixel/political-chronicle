import type { Snapshot } from '../../engine';
import { money } from '../format';
import { LineChart } from './LineChart';

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;

function label(s: Snapshot): string {
  return `${s.year} T${s.turn + 1}`;
}

/** Small multiples of a career over time — one measure per chart, never a second axis. */
export function CareerCharts({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return <p className="muted small">Play a few turns to see your charts.</p>;
  const xLabels = snapshots.map(label);
  const recognition = snapshots.map((s) => {
    const v = Object.values(s.regions);
    return v.reduce((a, r) => a + r.recognition, 0) / Math.max(1, v.length);
  });
  const standing = snapshots.map((s) => s.partyStanding ?? 0);
  const approvalOrPoll = snapshots.map((s) => s.approval ?? s.poll ?? 0);
  return (
    <div className="chart-grid-2">
      <LineChart title="Approval in office (or your poll while running)" series={[{ name: 'Approval / poll', values: approvalOrPoll }]} format={pctFmt} xLabels={xLabels} yMin={0} yMax={1} />
      <LineChart title="Recognition (average across regions)" series={[{ name: 'Recognition', values: recognition }]} format={pctFmt} xLabels={xLabels} yMin={0} yMax={1} />
      <LineChart title="Funds" series={[{ name: 'Funds', values: snapshots.map((s) => s.funds) }]} format={money} xLabels={xLabels} />
      {standing.some((v) => v > 0) && (
        <LineChart title="Party standing" series={[{ name: 'Standing', values: standing }]} format={(v) => `${Math.round(v)}`} xLabels={xLabels} yMin={0} yMax={100} />
      )}
    </div>
  );
}
