import { getOffice, ISSUES_BY_ID } from '../../data';
import { PARTIES } from '../../data';
import { poll, primaryShare } from '../../engine';
import type { GameState } from '../../engine';
import { pct } from '../format';
import { candidateTag, stanceLabel } from './labels';

export function CampaignPanel({ state }: { state: GameState }) {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const p = poll(state, race);
  const { clock } = state;
  const turnsLeft = clock.year === race.electionYear ? clock.turnsThisYear - clock.turn : undefined;
  const names = ['You', ...race.opponents.map((c) => c.name)];
  const history = state.snapshots.filter((s) => s.raceOfficeId === race.officeId && s.poll !== undefined).slice(-8);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{office.name}</h2>
        <span className="badge-soft">
          {turnsLeft === undefined
            ? `Election in Nov ${race.electionYear}`
            : turnsLeft === 1
              ? 'Election Day at the end of this turn'
              : `Election in ${turnsLeft} turns`}
        </span>
      </div>
      {race.primary && (
        <div className="primary-banner">
          <strong>{PARTIES[race.primary.party].name} primary</strong> vs {race.primary.challenger}, decided at the end of Mar {race.electionYear}. Party voters
          weigh your fit with the platform, your standing and how well they know you. Your expected share:{' '}
          <b className={primaryShare(state) >= 0.5 ? 'pos' : 'neg'}>{pct(primaryShare(state))}</b>.
        </div>
      )}
      {race.nominee && <p className="small">You are the {PARTIES[race.nominee].name} nominee.</p>}
      <div className="poll">
        {names.map((name, i) => (
          <div key={name} className={i === 0 ? 'poll-row you' : 'poll-row'}>
            <span className="poll-name">
              {name}
              {i > 0 && <span className="muted small"> · {candidateTag(race.opponents[i - 1]!)}</span>}
            </span>
            <span className="poll-bar" aria-hidden>
              <span style={{ width: `${p.decided[i]! * 100}%` }} />
            </span>
            <span className="num">{pct(p.decided[i]!)}</span>
          </div>
        ))}
        <p className="muted small">
          Share of decided voters. Undecided: {pct(p.total.at(-1)!)}.
          {history.length > 1 && ` Your trend: ${history.map((h) => pct(h.poll!)).join(' → ')} → ${pct(p.decided[0]!)}`}
        </p>
      </div>
      <details>
        <summary>Platforms</summary>
        <div className="platforms">
          <div>
            <h4>You</h4>
            <ul>
              {race.platform.map((pl) => (
                <li key={pl.issue}>
                  <strong>{ISSUES_BY_ID[pl.issue].name}:</strong> {stanceLabel(pl.issue, pl.stance)}
                </li>
              ))}
            </ul>
          </div>
          {race.opponents.map((c) => (
            <div key={c.id}>
              <h4>{c.name}</h4>
              <ul>
                {c.platform.map((pl) => (
                  <li key={pl.issue}>
                    <strong>{ISSUES_BY_ID[pl.issue].name}:</strong> {stanceLabel(pl.issue, pl.stance)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
