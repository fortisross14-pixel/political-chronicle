import type { Rarity } from '../engine/types';

/**
 * Trinkets (DESIGN_V2 §13): keepsakes you equip before every try. Each grants a skill that
 * fires in one window, a few times per race or term, or works all the time (passive).
 * - campaign: any campaign turn
 * - mobilize: Election Day, before the polls open
 * - lateVoters: election night, after the exit polls and before the count
 * - governing: while in office
 */
export type TrinketWindow = 'campaign' | 'mobilize' | 'lateVoters' | 'governing' | 'passive';

export interface Trinket {
  id: string;
  name: string;
  rarity: Rarity;
  window: TrinketWindow;
  /** Uses per race (campaign / election windows) or per term (governing). 0 for passive. */
  uses: number;
  targetsRegion?: boolean;
  text: string;
}

export const TRINKETS: Trinket[] = [
  // Common: everyone starts with these six.
  {
    id: 'get_out_the_vote',
    name: 'Get-out-the-vote binder',
    rarity: 'common',
    window: 'mobilize',
    uses: 1,
    text: 'Election Day, before the polls open: mobilize your voters (+1 point).',
  },
  {
    id: 'phone_bank',
    name: 'Phone bank',
    rarity: 'common',
    window: 'lateVoters',
    uses: 1,
    text: 'After the exit polls: call the last voters in line (+0.8 points).',
  },
  {
    id: 'surprise_appearance',
    name: 'Season tickets',
    rarity: 'common',
    window: 'campaign',
    uses: 2,
    targetsRegion: true,
    text: 'Surprise appearance at the game: a little more known and liked in one region.',
  },
  {
    id: 'office_hours',
    name: 'Open-door sign',
    rarity: 'common',
    window: 'governing',
    uses: 2,
    targetsRegion: true,
    text: 'Office hours: +3 approval in one region you govern.',
  },
  {
    id: 'campaign_button',
    name: 'Grandfather’s campaign button',
    rarity: 'common',
    window: 'passive',
    uses: 0,
    text: '+5% recognition at home.',
  },
  { id: 'war_chest', name: 'War chest', rarity: 'common', window: 'passive', uses: 0, text: '+$15k campaign funds at the start.' },
  // Uncommon
  { id: 'lucky_tie', name: 'Lucky tie', rarity: 'uncommon', window: 'passive', uses: 0, text: '+5 starting integrity.' },
  { id: 'rolodex', name: 'The Rolodex', rarity: 'uncommon', window: 'passive', uses: 0, text: 'Start with a campaign manager.' },
  {
    id: 'union_hall_key',
    name: 'Union hall key',
    rarity: 'uncommon',
    window: 'passive',
    uses: 0,
    text: '+1 ground-game token every campaign.',
  },
  {
    id: 'debate_notes',
    name: 'Dog-eared debate notes',
    rarity: 'uncommon',
    window: 'passive',
    uses: 0,
    text: 'Your first debate each campaign can’t go wrong.',
  },
  // Rare
  {
    id: 'rapid_response',
    name: 'Rapid-response pager',
    rarity: 'rare',
    window: 'passive',
    uses: 0,
    text: 'Once per campaign, a gaffe is cancelled.',
  },
  {
    id: 'iron_discipline',
    name: 'Iron discipline',
    rarity: 'rare',
    window: 'passive',
    uses: 0,
    text: 'Breaking a promise costs half the integrity.',
  },
  // Epic
  {
    id: 'crossover_appeal',
    name: 'Crossover appeal',
    rarity: 'epic',
    window: 'passive',
    uses: 0,
    text: 'The other side’s voters hold your party against you 25% less.',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback kid',
    rarity: 'epic',
    window: 'passive',
    uses: 0,
    text: 'Trailing by 5+ on the final turn: +1 energy and +1 token.',
  },
  {
    id: 'force_the_vote',
    name: 'Gavel of the house',
    rarity: 'epic',
    window: 'governing',
    uses: 1,
    text: 'Force the vote: your next bill passes even without the votes in the chamber.',
  },
  // Legendary
  {
    id: 'star_power',
    name: 'Star power',
    rarity: 'legendary',
    window: 'campaign',
    uses: 1,
    text: 'Once per campaign: a huge rally, known and liked across the whole race.',
  },
];

export const TRINKETS_BY_ID: Record<string, Trinket> = Object.fromEntries(TRINKETS.map((t) => [t.id, t]));

/** Owned by every new profile. */
export const STARTER_TRINKETS = TRINKETS.filter((t) => t.rarity === 'common').map((t) => t.id);

export function getTrinket(id: string): Trinket {
  const t = TRINKETS_BY_ID[id];
  if (!t) throw new Error(`Unknown trinket: ${id}`);
  return t;
}

export const TRINKET_WINDOW_LABEL: Record<TrinketWindow, string> = {
  campaign: 'Campaign',
  mobilize: 'Election Day',
  lateVoters: 'Election night',
  governing: 'Governing',
  passive: 'Always on',
};
