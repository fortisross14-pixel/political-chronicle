// One view per kind of card, so a card looks the same in a pack, a hand or the roster.
import type { ReactNode } from 'react';
import { getEventCard, getItem, getPerson, getPolicyCard, PERK_TEXT, ROLE_SHORT } from '../../data';
import type { Person } from '../../data';
import { isItemCard, ROLES } from '../../engine';
import type { PackKind, Rarity } from '../../engine';
import { EventArt, IssueArt, ItemArt, PortraitArt, SkillArt } from './CardArt';
import { GameCard } from './GameCard';

export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

const MEDIUM_LABEL = { tv: 'TV', cable: 'Cable', social: 'Social', inPerson: 'In person', radio: 'Radio' } as const;

const STAR = 'M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.5 5.5 21l2-7.5L2 9h7z';

/** 0–5 stars in half steps. */
export function Stars({ value, label }: { value: number; label?: string }) {
  return (
    <span className="stars-row" role="img" aria-label={`${label ? `${label}: ` : ''}${value} of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="star">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} className="star-empty" />
            </svg>
            {fill > 0 && (
              <span className="star-fill" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={STAR} />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

interface ViewProps {
  selected?: boolean;
  dim?: boolean;
  small?: boolean;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
  cost?: string;
}

export function PersonCard({ person, ...v }: { person: Person } & ViewProps) {
  return (
    <GameCard
      className={`person-card ${v.className ?? ''}`}
      tone={person.rarity}
      title={person.name}
      typeLine={RARITY_LABEL[person.rarity]}
      art={<PortraitArt name={person.name} role={bestOf(person)} />}
      rarity={RARITY_LABEL[person.rarity]}
      foil={person.rarity === 'epic' || person.rarity === 'legendary'}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      cost={v.cost}
      onClick={v.onClick}
    >
      <span className="role-stars">
        {ROLES.map((r) => (
          <span key={r} className="role-star-row">
            <span>{ROLE_SHORT[r]}</span>
            <Stars value={person.stars[r]} label={ROLE_SHORT[r]} />
          </span>
        ))}
      </span>
      {person.perk && <span className="chip perk">{PERK_TEXT[person.perk]}</span>}
      {!v.small && <span className="muted">{person.bio}</span>}
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

function bestOf(person: Person): string {
  return ROLES.reduce((a, b) => (person.stars[b] > person.stars[a] ? b : a));
}

export function PolicyCardView({ id, ...v }: { id: string } & ViewProps) {
  const c = getPolicyCard(id);
  return (
    <GameCard
      className={v.className}
      tone={c.rarity}
      title={c.name}
      typeLine={`Political event${c.needsOffice ? ', in office' : ''}`}
      art={'issue' in c.art ? <IssueArt issue={c.art.issue} /> : <SkillArt skill={c.art.skill} />}
      energy={c.energy}
      rarity={RARITY_LABEL[c.rarity]}
      foil={c.rarity === 'epic' || c.rarity === 'legendary'}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      <span>{c.text}</span>
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

export function ActionCardView({ id, ...v }: { id: string } & ViewProps) {
  if (isItemCard(id)) return <ItemCardView id={id.slice(5)} {...v} />;
  const c = getEventCard(id);
  const rarity = c.rarity ?? 'common';
  return (
    <GameCard
      className={v.className}
      tone={c.medium}
      title={c.name}
      typeLine={`Campaign action, ${MEDIUM_LABEL[c.medium].toLowerCase()}`}
      art={<EventArt id={c.id} medium={c.medium} />}
      energy={c.energy}
      rarity={c.basic ? 'Basic' : RARITY_LABEL[rarity]}
      foil={rarity === 'epic' || rarity === 'legendary'}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      {!v.small && <span>{c.description}</span>}
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

export function ItemCardView({ id, ...v }: { id: string } & ViewProps) {
  const item = getItem(id);
  return (
    <GameCard
      className={v.className}
      tone="item"
      title={item.name}
      typeLine={item.window === 'night' ? 'Election night' : item.window === 'both' ? 'Campaign or election night' : 'Campaign'}
      art={<ItemArt id={item.id} />}
      rarity={RARITY_LABEL[item.rarity]}
      foil={item.rarity === 'epic' || item.rarity === 'legendary'}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      {!v.small && <span>{item.campaignText ?? item.nightText}</span>}
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

/** Any card out of a pack. */
export function PackCardView({ kind, id, ...v }: { kind: PackKind; id: string } & ViewProps) {
  if (kind === 'people') return <PersonCard person={getPerson(id)} {...v} />;
  if (kind === 'policy') return <PolicyCardView id={id} {...v} />;
  return <ActionCardView id={id} {...v} />;
}
