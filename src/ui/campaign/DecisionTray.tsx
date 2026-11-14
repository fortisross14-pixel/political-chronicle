import { useState } from 'react';
import { getDecisionCard, getRegion, ISSUES_BY_ID, PARTIES } from '../../data';
import { decisionError, decisionImpact, DECISIONS_PER_TURN, yourChamber } from '../../engine';
import type { Action, GameState } from '../../engine';
import { money } from '../format';
import { effectLabel, PRECISE_PREVIEW_POLICY, stanceLabel } from './labels';

export function DecisionTray({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const hand = state.decisions!;
  const [chosen, setChosen] = useState<string[]>([]);
  const precise = state.politician.skills.strategy >= PRECISE_PREVIEW_POLICY;
  const inOffice = !!state.career.office;
  const title = inOffice ? 'Bills on your desk' : 'Decisions this turn';

  if (hand.resolved) {
    return (
      <section className="panel">
        <h2>{title}</h2>
        <p className="muted small">
          You {inOffice ? 'signed' : 'backed'} {hand.applied.map((id) => `“${getDecisionCard(id).title}”`).join(', ')}.
          {hand.failed?.length ? ` Failed to pass: ${hand.failed.map((id) => `“${getDecisionCard(id).title}”`).join(', ')}.` : ''} New cards next turn.
        </p>
      </section>
    );
  }

  const error = decisionError(state, chosen);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="muted small">
          {inOffice ? `Sign 1–${DECISIONS_PER_TURN}; the rest are shelved.` : `Back 1–${DECISIONS_PER_TURN}; the rest are declined.`}
        </span>
      </div>
      <div className="decision-grid">
        {hand.cardIds.map((id) => {
          const card = getDecisionCard(id);
          const impact = decisionImpact(state, card);
          const on = chosen.includes(id);
          // Approval first (in office), then how the rest of the state hears it.
          const regions: [string, number, string][] = [
            ...Object.entries(impact.approval).map(([r, v]) => [r, v, 'approval'] as [string, number, string]),
            ...Object.entries(impact.favorability)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .map(([r, v]) => [r, v, ''] as [string, number, string]),
          ];
          return (
            <article key={id} className={on ? 'decision-card on' : 'decision-card'}>
              <h3>{card.title}</h3>
              {card.partyPriority && <span className={`whip ${card.partyPriority.toLowerCase()}`}>{PARTIES[card.partyPriority].nickname} whip vote</span>}
              {impact.rejectStanding < 0 && <p className="muted small">Your party expects you to sign this ({impact.rejectStanding} standing if you don’t).</p>}
              <p className="small">{card.text}</p>
              <ul className="tags small">
                {card.tags.map((t) => (
                  <li key={t.issue}>
                    {ISSUES_BY_ID[t.issue].name}: {stanceLabel(t.issue, t.stance)}
                  </li>
                ))}
              </ul>
              <dl className="kv small">
                {regions.slice(0, 4).map(([r, v, kind]) => (
                  <div key={r} className="kv-row">
                    <dt>
                      {getRegion(r).seatCity}
                      {kind && ' approval'}
                    </dt>
                    <dd className={v >= 0 ? 'pos' : 'neg'}>{effectLabel(v, precise)}</dd>
                  </div>
                ))}
                {impact.integrity !== 0 && (
                  <div className="kv-row">
                    <dt>Integrity</dt>
                    <dd className={impact.integrity > 0 ? 'pos' : 'neg'}>{impact.integrity > 0 ? `+${impact.integrity}` : impact.integrity}</dd>
                  </div>
                )}
                {impact.standing !== 0 && (
                  <div className="kv-row">
                    <dt>Party standing</dt>
                    <dd className={impact.standing > 0 ? 'pos' : 'neg'}>{impact.standing > 0 ? `+${impact.standing.toFixed(1)}` : impact.standing.toFixed(1)}</dd>
                  </div>
                )}
                {impact.funds !== 0 && (
                  <div className="kv-row">
                    <dt>Funds</dt>
                    <dd className={impact.funds > 0 ? 'pos' : 'neg'}>{money(impact.funds)}</dd>
                  </div>
                )}
              </dl>
              {impact.passage < 1 && (
                <p className={`small ${impact.passage >= 0.7 ? 'pos' : impact.passage >= 0.45 ? '' : 'neg'}`}>
                  {Math.round(impact.passage * 100)}% chance to pass {yourChamber(state)?.name}
                </p>
              )}
              {impact.promisesKept.length > 0 && <p className="fit good small">Keeps a campaign promise</p>}
              {impact.promisesBroken.length > 0 && <p className="fit bad small">Breaks a campaign promise</p>}
              {card.rejectCost && <p className="muted small">{inOffice ? 'Shelving this will cost approval.' : 'Declining costs you some goodwill.'}</p>}
              <button
                className={on ? 'primary' : undefined}
                aria-pressed={on}
                onClick={() => setChosen(on ? chosen.filter((c) => c !== id) : [...chosen, id])}
              >
                {on ? (inOffice ? 'Signing ✓' : 'Backing ✓') : inOffice ? 'Sign this' : 'Back this'}
              </button>
            </article>
          );
        })}
      </div>
      <div className="row">
        <button className="primary" disabled={!!error} onClick={() => dispatch({ type: 'RESOLVE_DECISIONS', apply: chosen })}>
          Confirm {chosen.length || ''} decision{chosen.length === 1 ? '' : 's'}
        </button>
        {!precise && <span className="muted small">Raise Strategy to {PRECISE_PREVIEW_POLICY} to see exact effects.</span>}
      </div>
    </section>
  );
}
