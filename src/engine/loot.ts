// Campaign loot: milestones pay out money, cards and one-shot items (DESIGN_V2 §5.1).
import { GameError, reject } from './errors';
import { getEventCard, getItem, getOffice, MILESTONES_BY_ID } from '../data';
import { nudgeFavorability, nudgeRecognition, poll } from './opinion';
import type { GameState, RegionId } from './types';

export const GROUND_GAME = {
  /** Every campaign starts with this many election-night tokens. */
  base: 2,
  perDoorKnock: 1,
  maxFromDoorKnocks: 4,
  /** Organizers bring their own volunteers. */
  organizerBonus: 0,
  /** Each 2 energy left unspent on the final turn becomes a token. */
  energyPerToken: 2,
  doorKnocksForMilestone: 3,
  momentum: 0.03,
  underdog: 0.1,
  haul: 10000,
};

export const ITEM_EFFECT = {
  dossierFavorability: -0.08,
  endorsementRecognition: 0.05,
  endorsementFavorability: 0.04,
  scandalFavorability: -0.08,
  celebrityRecognition: 0.06,
  celebrityFavorability: 0.03,
};

/** Awards a milestone once per race. */
export function award(state: GameState, milestoneId: string): GameState {
  const race = state.career.race;
  if (!race || race.milestones.includes(milestoneId)) return state;
  const m = MILESTONES_BY_ID[milestoneId]!;
  let s: GameState = { ...state, career: { ...state.career, race: { ...race, milestones: [...race.milestones, milestoneId] } } };
  if (m.reward.money) s = { ...s, funds: s.funds + m.reward.money };
  if (m.reward.item) s = { ...s, items: [...s.items, { uid: s.nextItemUid, itemId: m.reward.item }], nextItemUid: s.nextItemUid + 1 };
  if (m.reward.card) s = { ...s, hand: [...s.hand, { uid: s.nextCardUid, cardId: m.reward.card }], nextCardUid: s.nextCardUid + 1 };
  const reward = m.reward.item
    ? getItem(m.reward.item).name
    : m.reward.card
      ? getEventCard(m.reward.card).name
      : `$${m.reward.money!.toLocaleString('en-US')}`;
  return { ...s, log: [...s.log, { year: s.clock.year, turn: s.clock.turn, text: `🏅 ${m.name}: ${m.text} (+${reward})` }] };
}

/** Checked at the end of every campaign turn, after opponents move. */
export function checkTurnMilestones(state: GameState): GameState {
  const race = state.career.race;
  if (!race?.platform.length) return state;
  let s = state;
  const p = poll(s, race).decided;
  const you = p[0]!;
  const best = Math.max(...p.slice(1));
  const last = [...s.snapshots].reverse().find((snap) => snap.raceOfficeId === race.officeId && snap.poll !== undefined)?.poll;
  if (you > best) s = award(s, 'frontrunner');
  if (last !== undefined && you - last >= GROUND_GAME.momentum) s = award(s, 'momentum');
  if (best - you >= GROUND_GAME.underdog) s = award(s, 'underdog');
  if (race.raisedThisTurn >= GROUND_GAME.haul) s = award(s, 'fundraising_haul');
  if (race.doorKnocks >= GROUND_GAME.doorKnocksForMilestone) s = award(s, 'ground_game');
  if (race.nominee && (s.career.partyStanding ?? 0) >= 60) s = award(s, 'party_machine');
  const after = s.career.race!;
  return { ...s, career: { ...s.career, race: { ...after, raisedThisTurn: 0 } } };
}

export function itemError(state: GameState, uid: number, regionId?: RegionId): string | undefined {
  const card = state.items.find((i) => i.uid === uid);
  if (!card) return 'You don’t have that item.';
  const item = getItem(card.itemId);
  if (state.night) {
    if (item.window === 'campaign') return 'That item only works during the campaign.';
  } else {
    if (item.window === 'night') return 'Save it for election night.';
    if (!state.career.race?.platform.length) return 'You need an active campaign.';
  }
  if (item.targetsRegion) {
    const officeId = state.night?.officeId ?? state.career.race?.officeId;
    if (!regionId || !officeId || !getOffice(officeId).regionIds.includes(regionId)) return 'Pick a region in this race.';
  }
  return undefined;
}

/** Uses a campaign-window item. Night use goes through the election-night actions. */
export function applyCampaignItem(state: GameState, uid: number, regionId?: RegionId): GameState {
  const error = itemError(state, uid, regionId);
  reject(error);
  const card = state.items.find((i) => i.uid === uid)!;
  const race = state.career.race!;
  const items = state.items.filter((i) => i.uid !== uid);
  const at = { year: state.clock.year, turn: state.clock.turn };
  if (card.itemId === 'oppo_dossier') {
    const p = poll(state, race).decided;
    const leader = p.slice(1).indexOf(Math.max(...p.slice(1)));
    const opponents = race.opponents.map((c, i) => {
      if (i !== leader) return c;
      const cur = c.regions[regionId!]!;
      return {
        ...c,
        regions: {
          ...c.regions,
          [regionId!]: { ...cur, favorability: nudgeFavorability(cur.favorability, ITEM_EFFECT.dossierFavorability) },
        },
      };
    });
    return {
      ...state,
      items,
      career: { ...state.career, race: { ...race, opponents } },
      log: [...state.log, { ...at, text: `You leaked the dossier on ${race.opponents[leader]!.name}.` }],
    };
  }
  if (card.itemId === 'endorsement') {
    const cur = state.regions[regionId!]!;
    return {
      ...state,
      items,
      regions: {
        ...state.regions,
        [regionId!]: {
          recognition: nudgeRecognition(cur.recognition, ITEM_EFFECT.endorsementRecognition),
          favorability: nudgeFavorability(cur.favorability, ITEM_EFFECT.endorsementFavorability),
        },
      },
      log: [...state.log, { ...at, text: 'You rolled out a local endorsement.' }],
    };
  }
  if (card.itemId === 'oppo_scandal') {
    const p = poll(state, race).decided;
    const leader = p.slice(1).indexOf(Math.max(...p.slice(1)));
    const opponents = race.opponents.map((c, i) =>
      i !== leader
        ? c
        : {
            ...c,
            regions: Object.fromEntries(
              Object.entries(c.regions).map(([id, r]) => [
                id,
                { ...r, favorability: nudgeFavorability(r.favorability, ITEM_EFFECT.scandalFavorability) },
              ]),
            ),
          },
    );
    return {
      ...state,
      items,
      career: { ...state.career, race: { ...race, opponents } },
      log: [...state.log, { ...at, text: `The scandal about ${race.opponents[leader]!.name} is front-page news.` }],
    };
  }
  if (card.itemId === 'celebrity_endorsement') {
    const regions = { ...state.regions };
    for (const id of getOffice(race.officeId).regionIds) {
      const cur = regions[id]!;
      regions[id] = {
        recognition: nudgeRecognition(cur.recognition, ITEM_EFFECT.celebrityRecognition),
        favorability: nudgeFavorability(cur.favorability, ITEM_EFFECT.celebrityFavorability),
      };
    }
    return { ...state, items, regions, log: [...state.log, { ...at, text: 'A celebrity endorses you on every channel.' }] };
  }
  throw new GameError('That item does nothing during the campaign.');
}
