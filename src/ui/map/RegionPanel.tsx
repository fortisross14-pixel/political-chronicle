import { getRegion, ISSUES_BY_ID, OFFICES, populationShare } from '../../data';
import type { GameState, IssueId, MediaChannel, RegionId } from '../../engine';
import { leanLabel, pct, signed } from '../format';

const MEDIA_LABELS: Record<MediaChannel, string> = {
  tv: 'Local TV',
  cable: 'Cable news',
  social: 'Social media',
  inPerson: 'In person',
  radio: 'Radio',
};

function opinionLabel(issue: IssueId, opinion: number): string {
  const i = ISSUES_BY_ID[issue];
  if (Math.abs(opinion) < 0.35) return 'Split';
  const strength = Math.abs(opinion) >= 1.2 ? 'Strongly' : 'Leans';
  return `${strength}: ${opinion < 0 ? i.negLabel : i.posLabel}`;
}

export function RegionPanel({ state, regionId }: { state: GameState; regionId: RegionId }) {
  const region = getRegion(regionId);
  const you = state.regions[regionId]!;
  const issues = (Object.entries(region.issueSalience) as [IssueId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const offices = OFFICES.filter((o) => o.regionIds.length === 1 && o.regionIds[0] === regionId);

  return (
    <aside className="region-panel" aria-live="polite">
      <h3>{region.name}</h3>
      <p className="muted small">
        {region.seatCity} · {region.type} · {(region.population / 1_000_000).toFixed(1)}M people ({pct(populationShare(regionId))} of the
        state) · turnout {pct(region.turnout)}
        {regionId === state.politician.residentRegionId && ' · your city'}
      </p>
      <p className="small">{region.blurb}</p>

      <dl className="kv">
        <dt>Partisan lean</dt>
        <dd className={region.partisanLean < 0 ? 'lean blue' : 'lean red'}>{leanLabel(region.partisanLean)}</dd>
        <dt>Your recognition</dt>
        <dd>{pct(you.recognition)}</dd>
        <dt>Your favorability</dt>
        <dd>{signed(you.favorability)}</dd>
        <dt>Local offices</dt>
        <dd>{offices.map((o) => o.name).join(' · ') || '—'}</dd>
      </dl>

      <h4>What they care about</h4>
      <ul className="issue-list">
        {issues.map(([id, salience]) => (
          <li key={id}>
            <div className="issue-row">
              <strong>{ISSUES_BY_ID[id].name}</strong>
              <meter min={0} max={1} value={salience} aria-label={`${ISSUES_BY_ID[id].name} salience`} />
            </div>
            <span className="muted small">{opinionLabel(id, region.issueOpinion[id])}</span>
          </li>
        ))}
      </ul>

      <h4>Media mix</h4>
      <ul className="media-list">
        {(Object.entries(region.media) as [MediaChannel, number][]).map(([channel, value]) => (
          <li key={channel}>
            <span>{MEDIA_LABELS[channel]}</span>
            <meter min={0.5} max={1.5} value={value} aria-label={`${MEDIA_LABELS[channel]} effectiveness`} />
            <span className="num">×{value.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
