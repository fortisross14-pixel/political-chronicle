import type { IssueId, Rarity, SkillId } from '../engine/types';

/** What a political event does. Approval and favorability are in your jurisdiction. */
export interface PolicyEffect {
  /** Job approval in every region you govern (in office only). */
  approval?: number;
  /** Job approval in one region you choose (in office only). */
  regionApproval?: number;
  favorability?: number;
  recognition?: number;
  /** Recognition and favorability apply statewide instead of only in your jurisdiction. */
  statewide?: boolean;
  funds?: number;
  standing?: number;
  integrity?: number;
  /** Training: +1 to this skill (up to your current cap). */
  skill?: SkillId;
}

/** Political events (DESIGN_V2 §3b): held in a hand of 5, played for their effect. */
export interface PolicyCard {
  id: string;
  name: string;
  rarity: Rarity;
  energy: number;
  /** Only while you hold an office. */
  needsOffice?: boolean;
  /** Party members only. */
  needsParty?: boolean;
  /** Asks for a region of your jurisdiction. */
  targetsRegion?: boolean;
  effect: PolicyEffect;
  text: string;
  /** Picture on the card: an issue emblem or a skill emblem. */
  art: { issue: IssueId } | { skill: SkillId };
}

export const POLICY_CARDS: PolicyCard[] = [
  // Common
  {
    id: 'ribbon_cutting',
    name: 'Ribbon cutting',
    rarity: 'common',
    energy: 1,
    needsOffice: true,
    targetsRegion: true,
    effect: { regionApproval: 0.05, recognition: 0.02 },
    text: 'Big scissors, local news. +approval in one region.',
    art: { issue: 'small_biz' },
  },
  {
    id: 'press_conference',
    name: 'Press conference',
    rarity: 'common',
    energy: 1,
    effect: { recognition: 0.05 },
    text: 'Podium, flags, cameras. +recognition.',
    art: { skill: 'charisma' },
  },
  {
    id: 'donor_breakfast',
    name: 'Donor breakfast',
    rarity: 'common',
    energy: 1,
    effect: { funds: 8_000 },
    text: 'Coffee and checks. +$8k.',
    art: { skill: 'economics' },
  },
  {
    id: 'newsletter',
    name: 'Constituent newsletter',
    rarity: 'common',
    energy: 1,
    needsOffice: true,
    effect: { approval: 0.025 },
    text: 'Remind everyone what you got done. +approval.',
    art: { skill: 'administration' },
  },
  {
    id: 'op_ed',
    name: 'Op-ed in the local paper',
    rarity: 'common',
    energy: 1,
    effect: { integrity: 3, favorability: 0.015 },
    text: 'Say what you believe, in print. +integrity.',
    art: { skill: 'law' },
  },
  {
    id: 'speech_coach',
    name: 'Speech & debate coach',
    rarity: 'common',
    energy: 2,
    effect: { skill: 'charisma' },
    text: 'Training: +1 Charisma.',
    art: { skill: 'charisma' },
  },
  // Rare
  {
    id: 'federal_grant',
    name: 'Federal grant secured',
    rarity: 'rare',
    energy: 2,
    needsOffice: true,
    effect: { approval: 0.05, funds: 10_000 },
    text: 'Money for the roads, credit for you. +approval, +$10k.',
    art: { issue: 'transit' },
  },
  {
    id: 'bipartisan_deal',
    name: 'Bipartisan deal',
    rarity: 'rare',
    energy: 2,
    needsOffice: true,
    effect: { approval: 0.04, standing: 4 },
    text: 'Both sides sign, everyone claps. +approval, +standing.',
    art: { skill: 'diplomacy' },
  },
  {
    id: 'crisis_response',
    name: 'Crisis handled well',
    rarity: 'rare',
    energy: 2,
    needsOffice: true,
    effect: { approval: 0.07 },
    text: 'The storm hit; you were there first. +approval.',
    art: { skill: 'leadership' },
  },
  {
    id: 'think_tank',
    name: 'Think-tank fellowship',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'law' },
    text: 'Training: +1 Law & Policy.',
    art: { skill: 'law' },
  },
  {
    id: 'donor_gala',
    name: 'Donor network gala',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'economics', funds: 5_000 },
    text: 'Training: +1 Economics, +$5k.',
    art: { skill: 'economics' },
  },
  {
    id: 'war_room',
    name: 'War-room simulation',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'strategy' },
    text: 'Training: +1 Strategy.',
    art: { skill: 'strategy' },
  },
  {
    id: 'management_course',
    name: 'Public-management course',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'administration' },
    text: 'Training: +1 Administration.',
    art: { skill: 'administration' },
  },
  {
    id: 'coalition_retreat',
    name: 'Bipartisan retreat',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'diplomacy' },
    text: 'Training: +1 Diplomacy.',
    art: { skill: 'diplomacy' },
  },
  {
    id: 'leadership_retreat',
    name: 'Leadership retreat',
    rarity: 'rare',
    energy: 2,
    effect: { skill: 'leadership' },
    text: 'Training: +1 Leadership.',
    art: { skill: 'leadership' },
  },
  // Epic
  {
    id: 'infrastructure_law',
    name: 'Landmark infrastructure law',
    rarity: 'epic',
    energy: 3,
    needsOffice: true,
    effect: { approval: 0.12, integrity: 2 },
    text: 'Bridges, buses, broadband. Big +approval.',
    art: { issue: 'transit' },
  },
  {
    id: 'convention_speech',
    name: 'Party convention speech',
    rarity: 'epic',
    energy: 2,
    needsParty: true,
    effect: { standing: 8, recognition: 0.06, statewide: true },
    text: 'Prime time, your party’s stage. +standing, +recognition statewide.',
    art: { skill: 'leadership' },
  },
  {
    id: 'ethics_reform',
    name: 'Ethics reform',
    rarity: 'epic',
    energy: 2,
    needsOffice: true,
    effect: { integrity: 10, approval: 0.03 },
    text: 'Clean up city hall, starting with yourself. Big +integrity.',
    art: { issue: 'policing' },
  },
  // Legendary
  {
    id: 'popular_law',
    name: 'Pass a very popular law',
    rarity: 'legendary',
    energy: 3,
    needsOffice: true,
    effect: { approval: 0.2, favorability: 0.05 },
    text: 'Everyone wanted it; you got it done. Approval through the roof.',
    art: { issue: 'healthcare' },
  },
  {
    id: 'national_spotlight',
    name: 'National spotlight',
    rarity: 'legendary',
    energy: 2,
    effect: { recognition: 0.15, favorability: 0.04, statewide: true },
    text: 'The Sunday shows want you. Huge +recognition statewide.',
    art: { skill: 'charisma' },
  },
];

export const POLICY_CARDS_BY_ID: Record<string, PolicyCard> = Object.fromEntries(POLICY_CARDS.map((c) => [c.id, c]));

export function getPolicyCard(id: string): PolicyCard {
  const card = POLICY_CARDS_BY_ID[id];
  if (!card) throw new Error(`Unknown political event: ${id}`);
  return card;
}
