import type { SkillId } from '../engine/types';

export interface SkillCard {
  id: string;
  name: string;
  skill: SkillId;
  /** Price = pricePerLevel × the skill's current level. */
  pricePerLevel: number;
  /** Energy spent this turn to take the course. */
  energy: number;
  /** Party-only cards arrive with parties (M6). */
  requiresParty?: boolean;
  /** Party standing gained. */
  standing?: number;
  description: string;
}

export const SKILL_CARDS: SkillCard[] = [
  {
    id: 'speech_coach',
    name: 'Speech & debate coach',
    skill: 'charisma',
    pricePerLevel: 5000,
    energy: 0,
    description: 'Pacing, pauses, the big applause line — and how to land a punch in a debate.',
  },
  {
    id: 'donor_gala',
    name: 'Donor network gala',
    skill: 'economics',
    pricePerLevel: 10000,
    energy: 1,
    description: 'Meet the people who write the big checks, and learn how money really moves.',
  },
  {
    id: 'coalition_retreat',
    name: 'Bipartisan retreat',
    skill: 'diplomacy',
    pricePerLevel: 5000,
    energy: 1,
    description: 'A weekend with the other side. You come back with phone numbers.',
  },
  {
    id: 'war_room',
    name: 'War-room simulation',
    skill: 'strategy',
    pricePerLevel: 5000,
    energy: 1,
    description: 'Veteran strategists game out your next three campaigns.',
  },
  {
    id: 'management_course',
    name: 'Public-management course',
    skill: 'administration',
    pricePerLevel: 4000,
    energy: 2,
    description: 'How to run an agency without it running you.',
  },
  {
    id: 'leadership_retreat',
    name: 'Leadership retreat',
    skill: 'leadership',
    pricePerLevel: 5000,
    energy: 1,
    description: 'Crisis drills and hard calls. Your team notices.',
  },
  {
    id: 'think_tank',
    name: 'Think-tank fellowship',
    skill: 'law',
    pricePerLevel: 4000,
    energy: 2,
    description: 'A semester of white papers. Sharper on policy and the law.',
  },
  {
    id: 'party_mentorship',
    name: 'Mentorship with a party elder',
    skill: 'leadership',
    pricePerLevel: 5000,
    energy: 1,
    requiresParty: true,
    standing: 5,
    description: 'Learn how the party really works — and get on the leadership’s radar. +5 party standing.',
  },
];

export const SKILL_CARDS_BY_ID: Record<string, SkillCard> = Object.fromEntries(SKILL_CARDS.map((c) => [c.id, c]));

export function getSkillCard(id: string): SkillCard {
  const card = SKILL_CARDS_BY_ID[id];
  if (!card) throw new Error(`Unknown skill card: ${id}`);
  return card;
}
