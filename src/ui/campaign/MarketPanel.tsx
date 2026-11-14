import { getEventCard, getPerson, getSkillCard } from '../../data';
import { PersonCard } from './TeamPanel';
import { buyError, HAND_LIMIT, offerPrice, skillCap, SKILL_LABELS } from '../../engine';
import type { Action, GameState } from '../../engine';
import { money } from '../format';

export function MarketPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const offers = state.market?.offers ?? [];
  const cap = skillCap(state);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Market</h2>
        <span className="muted small">
          New offers every turn · hand {state.hand.length}/{HAND_LIMIT} · skills capped at {cap} at your level · funds {money(state.funds)}
        </span>
      </div>
      {offers.length === 0 ? (
        <p className="muted small">Sold out this turn.</p>
      ) : (
        <div className="hand">
          {offers.map((o, i) => {
            const price = offerPrice(o, state);
            const error = buyError(state, i);
            if (o.kind === 'event') {
              const c = getEventCard(o.cardId);
              return (
                <article key={i} className="market-card">
                  <span className="kind">Event</span>
                  <strong>{c.name}</strong>
                  <span className="muted small">{c.description}</span>
                  <span className="small">
                    ⚡{c.energy} to play · {c.fundraising ? 'raises money' : `${c.medium === 'inPerson' ? 'in person' : c.medium}${c.spillover ? `, ${Math.round(c.spillover * 100)}% statewide` : ''}`}
                  </span>
                  <button disabled={!!error} title={error} onClick={() => dispatch({ type: 'BUY_CARD', offerIndex: i })}>
                    Buy {money(price)}
                  </button>
                </article>
              );
            }
            if (o.kind === 'person') {
              return (
                <PersonCard key={i} person={getPerson(o.cardId)}>
                  <button disabled={!!error} title={error} onClick={() => dispatch({ type: 'BUY_CARD', offerIndex: i })}>
                    Hire {money(price)}
                  </button>
                </PersonCard>
              );
            }
            const c = getSkillCard(o.cardId);
            const level = state.politician.skills[c.skill];
            return (
              <article key={i} className="market-card skill">
                <span className="kind">Skill</span>
                <strong>{c.name}</strong>
                <span className="muted small">{c.description}</span>
                <span className="small">
                  {SKILL_LABELS[c.skill]} {level} → {level + 1}
                  {c.energy ? ` · ⚡${c.energy} now` : ''}
                </span>
                <button disabled={!!error} title={error} onClick={() => dispatch({ type: 'BUY_CARD', offerIndex: i })}>
                  Buy {money(price)}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
