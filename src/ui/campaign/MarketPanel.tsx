import { getEventCard, getPerson, getSkillCard } from '../../data';
import { EventArt, SkillArt } from '../cards/CardArt';
import { GameCard } from '../cards/GameCard';
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
        <div className="card-row">
          {offers.map((o, i) => {
            const price = offerPrice(o, state);
            const error = buyError(state, i);
            const buy = (label: string) => (
              <button className="primary" disabled={!!error} title={error} onClick={() => dispatch({ type: 'BUY_CARD', offerIndex: i })}>
                {label} {money(price)}
              </button>
            );
            if (o.kind === 'event') {
              const c = getEventCard(o.cardId);
              return (
                <GameCard
                  key={i}
                  className="market-card"
                  tone={c.medium}
                  title={c.name}
                  typeLine={`Event, ${c.fundraising ? 'raises money' : c.medium === 'inPerson' ? 'in person' : c.medium}`}
                  art={<EventArt id={c.id} medium={c.medium} />}
                  cost={money(price)}
                  energy={c.energy}
                  rarity="Event"
                  foil={c.energy >= 3}
                >
                  <span>{c.description}</span>
                  {!c.fundraising && c.spillover ? (
                    <span className="gcard-note">{Math.round(c.spillover * 100)}% heard statewide</span>
                  ) : null}
                  {buy('Buy')}
                </GameCard>
              );
            }
            if (o.kind === 'person') {
              return (
                <PersonCard key={i} person={getPerson(o.cardId)} cost={money(price)}>
                  {buy('Hire')}
                </PersonCard>
              );
            }
            const c = getSkillCard(o.cardId);
            const level = state.politician.skills[c.skill];
            return (
              <GameCard
                key={i}
                className="market-card skill"
                tone="skill"
                title={c.name}
                typeLine={`Training, ${SKILL_LABELS[c.skill]}`}
                art={<SkillArt skill={c.skill} />}
                cost={money(price)}
                energy={c.energy || undefined}
                rarity="Skill"
              >
                <span>{c.description}</span>
                <span className="gcard-note">
                  {SKILL_LABELS[c.skill]} {level} → {level + 1}
                </span>
                {buy('Train')}
              </GameCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
