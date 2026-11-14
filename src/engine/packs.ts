// Card packs (DESIGN_V2 §3b): three kinds (people, political events, campaign actions) in three
// tiers. A pack shows 3 cards: keep any people (roster permitting), or one event or action.
import { reject } from './errors';
import {
  getEventCard,
  getItem,
  getPerson,
  getPolicyCard,
  ITEMS,
  PACK_EVENT_IDS,
  PACK_KEEP,
  PACK_ODDS,
  PACK_PRICE,
  PACK_SIZE,
  PEOPLE,
  POLICY_CARDS,
} from '../data';
import { acquirePerson, ROSTER_LIMIT } from './people';
import { Rng } from './rng';
import type { GameState, OpenPack, PackKind, PackTier, Rarity } from './types';

export const POLICY_HAND_LIMIT = 5;
/** Campaign actions (event cards + items) you can hold. */
export const CAMPAIGN_HAND_LIMIT = 8;

const ITEM_PREFIX = 'item:';

export function isItemCard(id: string): boolean {
  return id.startsWith(ITEM_PREFIX);
}

/** Rarity of any pack card id. */
export function cardRarity(kind: PackKind, id: string): Rarity {
  if (kind === 'people') return getPerson(id).rarity;
  if (kind === 'policy') return getPolicyCard(id).rarity;
  return isItemCard(id) ? getItem(id.slice(ITEM_PREFIX.length)).rarity : getEventCard(id).rarity!;
}

/** Every card a pack of this kind can hold, with its rarity. */
function pool(state: GameState, kind: PackKind): { id: string; rarity: Rarity }[] {
  if (kind === 'people') {
    const owned = new Set(state.team.cards.map((c) => c.personId));
    return PEOPLE.filter((p) => !owned.has(p.id)).map((p) => ({ id: p.id, rarity: p.rarity }));
  }
  if (kind === 'policy') return POLICY_CARDS.map((c) => ({ id: c.id, rarity: c.rarity }));
  return [
    ...PACK_EVENT_IDS.map((id) => ({ id, rarity: getEventCard(id).rarity! })),
    ...ITEMS.map((i) => ({ id: `${ITEM_PREFIX}${i.id}`, rarity: i.rarity })),
  ];
}

/** Draws a pack: each card rolls a rarity by the tier's odds, then a card of that rarity (no repeats). */
export function drawPack(state: GameState, rng: Rng, kind: PackKind, tier: PackTier): string[] {
  const odds = PACK_ODDS[tier];
  const all = pool(state, kind);
  const picked: string[] = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const left = all.filter((c) => !picked.includes(c.id));
    if (!left.length) break;
    let roll = rng.float() * 100;
    let rarity: Rarity = 'common';
    for (const r of ['common', 'rare', 'epic', 'legendary'] as Rarity[]) {
      roll -= odds[r];
      if (roll <= 0) {
        rarity = r;
        break;
      }
    }
    // Fall back to the nearest rarity that still has cards (people packs run dry as you collect).
    const order: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
    const at = order.indexOf(rarity);
    const byDistance = [...order].sort((a, b) => Math.abs(order.indexOf(a) - at) - Math.abs(order.indexOf(b) - at));
    const tierOk = byDistance.filter((r) => odds[r] > 0);
    const rar = tierOk.find((r) => left.some((c) => c.rarity === r));
    if (!rar) break;
    picked.push(rng.pick(left.filter((c) => c.rarity === rar)).id);
  }
  return picked;
}

/** Adds an unopened pack to the queue. */
export function grantPack(state: GameState, kind: PackKind, tier: PackTier, free = false): GameState {
  const rng = new Rng(state.rng);
  const cards = drawPack(state, rng, kind, tier);
  if (!cards.length) return { ...state, rng: rng.state };
  const pack: OpenPack = { kind, tier, cards, ...(free ? { free: true } : {}) };
  return { ...state, rng: rng.state, packs: [...state.packs, pack] };
}

export function packPrice(kind: PackKind, tier: PackTier): number {
  return PACK_PRICE[kind][tier];
}

export function buyPackError(state: GameState, kind: PackKind, tier: PackTier): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.packs.length) return 'Open the pack you have first.';
  if (packPrice(kind, tier) > state.funds) return 'Not enough campaign funds.';
  if (kind === 'people' && state.team.cards.length >= ROSTER_LIMIT) return `Your roster is full (${ROSTER_LIMIT}).`;
  return undefined;
}

export function buyPack(state: GameState, kind: PackKind, tier: PackTier): GameState {
  reject(buyPackError(state, kind, tier));
  const paid = { ...state, funds: state.funds - packPrice(kind, tier) };
  return grantPack(paid, kind, tier);
}

/** Room left for what this pack would add. */
export function roomFor(state: GameState, kind: PackKind): number {
  if (kind === 'people') return ROSTER_LIMIT - state.team.cards.length;
  if (kind === 'policy') return POLICY_HAND_LIMIT - state.policyHand.length;
  return CAMPAIGN_HAND_LIMIT - state.hand.length - state.items.length;
}

export function keepError(state: GameState, keep: number[]): string | undefined {
  const pack = state.packs[0];
  if (!pack) return 'There is no pack to open.';
  if (new Set(keep).size !== keep.length || keep.some((i) => i < 0 || i >= pack.cards.length || !Number.isInteger(i)))
    return 'Pick cards from this pack.';
  if (PACK_KEEP[pack.kind] === 'one' && keep.length > 1) return 'Keep one card from this pack.';
  if (keep.length > 0 && keep.length > roomFor(state, pack.kind))
    return pack.kind === 'people' ? `Your roster holds ${ROSTER_LIMIT}.` : 'Your hand is full: play or discard a card first.';
  return undefined;
}

/** Keeps the chosen cards of the first pack and throws the rest away. Keeping none is allowed. */
export function keepFromPack(state: GameState, keep: number[]): GameState {
  reject(keepError(state, keep));
  const pack = state.packs[0]!;
  let s: GameState = { ...state, packs: state.packs.slice(1) };
  for (const i of keep) {
    const id = pack.cards[i]!;
    if (pack.kind === 'people') s = acquirePerson(s, id);
    else if (pack.kind === 'policy')
      s = { ...s, policyHand: [...s.policyHand, { uid: s.nextCardUid, cardId: id }], nextCardUid: s.nextCardUid + 1 };
    else if (isItemCard(id))
      s = { ...s, items: [...s.items, { uid: s.nextItemUid, itemId: id.slice(ITEM_PREFIX.length) }], nextItemUid: s.nextItemUid + 1 };
    else s = { ...s, hand: [...s.hand, { uid: s.nextCardUid, cardId: id }], nextCardUid: s.nextCardUid + 1 };
  }
  const names = keep.map((i) => cardName(pack.kind, pack.cards[i]!));
  return names.length ? { ...s, log: [...s.log, { year: s.clock.year, turn: s.clock.turn, text: `Kept ${names.join(', ')}.` }] } : s;
}

export function cardName(kind: PackKind, id: string): string {
  if (kind === 'people') return getPerson(id).name;
  if (kind === 'policy') return getPolicyCard(id).name;
  return isItemCard(id) ? getItem(id.slice(ITEM_PREFIX.length)).name : getEventCard(id).name;
}

export function discardError(state: GameState, zone: 'policy' | 'campaign' | 'item', uid: number): string | undefined {
  const list = zone === 'policy' ? state.policyHand : zone === 'campaign' ? state.hand : state.items;
  return list.some((c) => c.uid === uid) ? undefined : 'You don’t have that card.';
}

export function discardCard(state: GameState, zone: 'policy' | 'campaign' | 'item', uid: number): GameState {
  reject(discardError(state, zone, uid));
  if (zone === 'policy') return { ...state, policyHand: state.policyHand.filter((c) => c.uid !== uid) };
  if (zone === 'campaign') return { ...state, hand: state.hand.filter((c) => c.uid !== uid) };
  return { ...state, items: state.items.filter((c) => c.uid !== uid) };
}
