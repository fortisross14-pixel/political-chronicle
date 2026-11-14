import type { ItemWindow, Rarity } from '../engine/types';

export interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  window: ItemWindow;
  /** Whether using it needs a target region. */
  targetsRegion: boolean;
  campaignText?: string;
  nightText?: string;
}

/** One-shot loot from campaign milestones (DESIGN_V2 §5.1). Unused items expire with the window. */
export const ITEMS: Item[] = [
  {
    id: 'volunteer_list',
    name: 'Volunteer list',
    rarity: 'common',
    window: 'night',
    targetsRegion: false,
    nightText: '+2 ground-game tokens',
  },
  {
    id: 'oppo_dossier',
    rarity: 'uncommon',
    name: 'Opposition research dossier',
    window: 'campaign',
    targetsRegion: true,
    campaignText: 'Your leading opponent loses favorability in a region',
  },
  {
    id: 'endorsement',
    rarity: 'uncommon',
    name: 'Local endorsement',
    window: 'both',
    targetsRegion: true,
    campaignText: '+recognition and favorability in a region',
    nightText: 'A free, stronger mobilization in an uncounted region',
  },
  {
    id: 'ad_reservation',
    rarity: 'rare',
    name: 'Last-minute ad reservation',
    window: 'night',
    targetsRegion: false,
    nightText: 'A free late ad blitz across the race',
  },
  {
    id: 'turnout_vans',
    rarity: 'uncommon',
    name: 'Vans to the polls',
    window: 'campaign',
    targetsRegion: false,
    campaignText: 'Mobilize voters: +0.8 points on Election Day',
  },
  {
    id: 'poll_watchers',
    rarity: 'common',
    name: 'Poll-watcher network',
    window: 'night',
    targetsRegion: true,
    nightText: 'Free lawyers at the count in one region',
  },
  {
    id: 'oppo_scandal',
    rarity: 'epic',
    name: 'Scandal published',
    window: 'campaign',
    targetsRegion: false,
    campaignText: 'Your leading opponent loses favorability everywhere',
  },
  {
    id: 'celebrity_endorsement',
    rarity: 'epic',
    name: 'Celebrity endorsement',
    window: 'campaign',
    targetsRegion: false,
    campaignText: '+recognition and favorability across the race',
  },
  {
    id: 'late_surge',
    rarity: 'legendary',
    name: 'Late voters break your way',
    window: 'night',
    targetsRegion: false,
    nightText: '+1.5 points on every uncounted vote, beyond your ground-game limit',
  },
];

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): Item {
  const item = ITEMS_BY_ID[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

/** Campaign milestones and what they pay out. Each can be earned once per race. */
export interface Milestone {
  id: string;
  name: string;
  reward: { item?: string; money?: number; card?: string };
  text: string;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'frontrunner',
    name: 'Front-runner',
    reward: { item: 'endorsement' },
    text: 'You lead the polls for the first time — a local leader endorses you.',
  },
  { id: 'momentum', name: 'Momentum', reward: { money: 6000 }, text: 'Up 3+ points in a turn — small donors pour in.' },
  {
    id: 'debate_win',
    name: 'Debate win',
    reward: { item: 'oppo_dossier' },
    text: 'You won the debate — and someone slipped you a dossier.',
  },
  {
    id: 'fundraising_haul',
    name: 'Fundraising haul',
    reward: { item: 'ad_reservation' },
    text: 'A $10k+ fundraising turn — you lock in late ad time.',
  },
  { id: 'ground_game', name: 'Ground game', reward: { item: 'volunteer_list' }, text: 'Three door-knocking days — volunteers sign up.' },
  {
    id: 'party_machine',
    name: 'Party machine',
    reward: { item: 'poll_watchers' },
    text: 'Your party (standing 60+) lends you its poll watchers.',
  },
  { id: 'underdog', name: 'Underdog', reward: { card: 'town_hall' }, text: 'Down 10+ points — a town hall slot opens up for you.' },
];

export const MILESTONES_BY_ID: Record<string, Milestone> = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));
