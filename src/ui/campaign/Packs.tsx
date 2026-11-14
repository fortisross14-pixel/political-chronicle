// The pack shop and the pack-opening overlay (DESIGN_V2 §3b).
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { PACK_KEEP, PACK_KIND_LABEL, PACK_ODDS, PACK_TIER_LABEL } from '../../data';
import {
  buyPackError,
  cardName,
  isSkillCard,
  keepError,
  packPrice,
  POLICY_HAND_LIMIT,
  CAMPAIGN_HAND_LIMIT,
  ROSTER_LIMIT,
} from '../../engine';
import type { Action, GameState, PackKind, PackTier } from '../../engine';
import { PackCardView } from '../cards/CardViews';
import { money } from '../format';
import { cue } from '../fx/sound';
import { Painted } from '../cards/CardArt';
import { ICONS } from '../icons';

const KINDS: PackKind[] = ['campaign', 'policy', 'people'];
const TIERS: PackTier[] = ['regular', 'golden', 'elite'];
const KIND_ICON = { people: ICONS.team, policy: ICONS.desk, campaign: ICONS.cards } as const;

/** The painted card on each pack's wrapper, by tier. */
const PACK_ART: Record<PackKind, string[]> = {
  campaign: ['town_hall', 'arena_rally', 'national_tv_interview'],
  policy: ['ribbon_cutting', 'infrastructure_law', 'popular_law'],
  people: ['cm_kowalczyk', 'cm_vance', 'cm_king'],
};

function bestOdds(tier: PackTier): string {
  const o = PACK_ODDS[tier];
  return o.legendary ? `${o.legendary}% legendary` : `${o.epic}% epic`;
}

export function PackShop({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Packs</h2>
        <span className="muted small">Campaign funds {money(state.funds)}</span>
      </div>
      <div className="pack-grid">
        {KINDS.map((kind) => (
          <div key={kind} className="pack-row">
            <h3>{PACK_KIND_LABEL[kind]}</h3>
            <span className="muted small">
              {kind === 'people'
                ? `Keep any · roster ${state.team.cards.length}/${ROSTER_LIMIT}`
                : kind === 'policy'
                  ? `Keep one · hand ${state.policyHand.length}/${POLICY_HAND_LIMIT}`
                  : `Keep one · hand ${state.hand.length + state.items.length}/${CAMPAIGN_HAND_LIMIT}`}
            </span>
            <div className="pack-tiers">
              {TIERS.map((tier) => {
                const error = buyPackError(state, kind, tier);
                return (
                  <button
                    key={tier}
                    className={`pack ${tier} ${kind}`}
                    disabled={!!error}
                    title={error}
                    onClick={() => {
                      cue('coin');
                      dispatch({ type: 'BUY_PACK', kind, tier });
                    }}
                  >
                    <span className="pack-art" aria-hidden="true">
                      <Painted id={PACK_ART[kind][TIERS.indexOf(tier)]!} />
                    </span>
                    <span className="pack-icon">{KIND_ICON[kind]}</span>
                    <span className="pack-tier">{PACK_TIER_LABEL[tier]}</span>
                    <span className="pack-price">{money(packPrice(kind, tier))}</span>
                    <span className="pack-odds">{bestOdds(tier)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Opens the first waiting pack: cards flip in, you choose what to keep. */
export function PackOpening({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const pack = state.packs[0]!;
  const any = PACK_KEEP[pack.kind] === 'any';
  const [keep, setKeep] = useState<number[]>(() => (any ? pack.cards.map((_, i) => i).filter((i) => !isSkillCard(pack.cards[i]!)) : []));
  const error = keep.length ? keepError(state, keep) : undefined;
  const hasSkill = pack.cards.some(isSkillCard);
  const toggle = (i: number) => {
    if (isSkillCard(pack.cards[i]!)) return;
    cue('tap');
    if (any) setKeep(keep.includes(i) ? keep.filter((k) => k !== i) : [...keep, i]);
    else setKeep(keep[0] === i ? [] : [i]);
  };
  const hand =
    pack.kind === 'policy'
      ? state.policyHand.map((c) => ({ zone: 'policy' as const, uid: c.uid, name: cardName('policy', c.cardId) }))
      : pack.kind === 'campaign'
        ? [
            ...state.hand.map((c) => ({ zone: 'campaign' as const, uid: c.uid, name: cardName('campaign', c.cardId) })),
            ...state.items.map((c) => ({ zone: 'item' as const, uid: c.uid, name: cardName('campaign', `item:${c.itemId}`) })),
          ]
        : [];
  return (
    <div
      className="overlay pack-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${PACK_TIER_LABEL[pack.tier]} ${PACK_KIND_LABEL[pack.kind]} pack`}
    >
      <div className="overlay-sheet">
        <div className="sheet-head">
          <div>
            <span className={`pack-badge ${pack.tier}`}>{pack.free ? 'Free' : PACK_TIER_LABEL[pack.tier]} pack</span>
            <h2>{PACK_KIND_LABEL[pack.kind]}</h2>
          </div>
          <span className="muted small">
            {any ? 'Keep any' : 'Keep one'}
            {hasSkill ? ' · plus the free skill card' : ''}
          </span>
        </div>
        <div className="card-row reveal" key={state.packs.length}>
          {pack.cards.map((id, i) => (
            <div key={id} className="flip" style={{ '--i': i } as CSSProperties}>
              <PackCardView kind={pack.kind} id={id} selected={keep.includes(i)} onClick={() => toggle(i)} />
            </div>
          ))}
        </div>
        {error && (
          <div className="hand-full">
            <span className="neg small">{error}</span>
            <span className="chips">
              {hand.map((h) => (
                <button
                  key={`${h.zone}-${h.uid}`}
                  className="chip-btn"
                  onClick={() => dispatch({ type: 'DISCARD_CARD', zone: h.zone, uid: h.uid })}
                >
                  Discard {h.name}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className="sheet-foot">
          <button onClick={() => dispatch({ type: 'KEEP_FROM_PACK', keep: [] })}>{hasSkill ? 'Only the skill' : 'Keep none'}</button>
          <button
            className="primary"
            disabled={!keep.length || !!error}
            onClick={() => {
              cue('deal');
              dispatch({ type: 'KEEP_FROM_PACK', keep });
            }}
          >
            Keep {keep.length > 1 ? `${keep.length} cards` : keep.length ? 'this card' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
