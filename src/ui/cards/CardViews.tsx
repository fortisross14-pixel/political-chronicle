// One view per kind of card, so a card looks the same in a pack, a hand or the roster.
import type { ReactNode } from 'react';
import { getEventCard, getItem, getPerson, getPolicyCard, PERK_TEXT, ROLE_SHORT } from '../../data';
import type { Person } from '../../data';
import { isItemCard, isSkillCard, ROLES, SKILL_LABELS, skillOfCard } from '../../engine';
import type { PackKind, Rarity } from '../../engine';
import { EventArt, IssueArt, ItemArt, PortraitArt, SkillArt } from './CardArt';
import { GameCard } from './GameCard';
import { actionChips, itemChips, policyChips } from './effects';
import type { Chip } from './effects';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const foiled = (r: Rarity) => r === 'epic' || r === 'legendary';

/** The effect summary row on a card face. */
export function EffectChips({ chips }: { chips: Chip[] }) {
  if (!chips.length) return null;
  return (
    <span className="fx-chips">
      {chips.map((c) => (
        <span key={c.text} className={`fx-chip${c.tone ? ` ${c.tone}` : ''}`}>
          {c.text}
        </span>
      ))}
    </span>
  );
}

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
      foil={foiled(person.rarity)}
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
      foil={foiled(c.rarity)}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      <EffectChips chips={policyChips(id)} />
      {!v.small && <span className="muted">{c.text}</span>}
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
      tone={rarity}
      title={c.name}
      typeLine={`Campaign action, ${MEDIUM_LABEL[c.medium].toLowerCase()}`}
      art={<EventArt id={c.id} medium={c.medium} />}
      energy={c.energy}
      rarity={c.basic ? 'Basic' : RARITY_LABEL[rarity]}
      foil={foiled(rarity)}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      <EffectChips chips={actionChips(id)} />
      {!v.small && <span className="muted">{c.description}</span>}
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

export function ItemCardView({ id, ...v }: { id: string } & ViewProps) {
  const item = getItem(id);
  return (
    <GameCard
      className={v.className}
      tone={item.rarity}
      title={item.name}
      typeLine={item.window === 'night' ? 'Election night' : item.window === 'both' ? 'Campaign or election night' : 'Campaign'}
      art={<ItemArt id={item.id} />}
      rarity={RARITY_LABEL[item.rarity]}
      foil={foiled(item.rarity)}
      selected={v.selected}
      dim={v.dim}
      small={v.small}
      onClick={v.onClick}
    >
      <EffectChips chips={itemChips(id)} />
      {!v.small && <span>{item.campaignText ?? item.nightText}</span>}
      {v.children && <span className="gcard-actions">{v.children}</span>}
    </GameCard>
  );
}

/** A skill card: +1 to one skill, free, on top of what you keep from the pack. */
export function SkillCardView({ id, ...v }: { id: string } & ViewProps) {
  const skill = skillOfCard(id);
  return (
    <GameCard
      className={`skill-card ${v.className ?? ''}`}
      tone="uncommon"
      title={`${SKILL_LABELS[skill]} +1`}
      typeLine="Skill card, free"
      art={<SkillArt skill={skill} />}
      rarity="Skill"
      selected
      small={v.small}
    >
      <EffectChips
        chips={[
          { text: `${SKILL_LABELS[skill]} +1`, tone: 'pos' },
          { text: 'Free: keeps your pick', tone: 'gold' },
        ]}
      />
      {!v.small && <span className="muted">Learned for free when you close the pack.</span>}
    </GameCard>
  );
}

/** Any card out of a pack. */
export function PackCardView({ kind, id, ...v }: { kind: PackKind; id: string } & ViewProps) {
  if (isSkillCard(id)) return <SkillCardView id={id} {...v} />;
  if (kind === 'people') return <PersonCard person={getPerson(id)} {...v} />;
  if (kind === 'policy') return <PolicyCardView id={id} {...v} />;
  return <ActionCardView id={id} {...v} />;
}
