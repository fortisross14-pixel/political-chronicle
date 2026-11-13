import type { SkillId } from '../engine/types';

export interface SkillCard {
  id: string;
  name: string;
  skill: SkillId;
  /** Price = pricePerLevel × the skill's current level. */
  pricePerLevel: number;
  /** Energy spent this turn to take the course. */
  energy: number;
  /** Staff: a recurring cost per 3 months; if you can't pay, they leave and the skill drops back. */
  upkeep?: number;
  /** Party-only cards arrive with parties (M6). */
  requiresParty?: boolean;
  /** Party standing gained. */
  standing?: number;
  description: string;
}

export const SKILL_CARDS: SkillCard[] = [
  { id: 'speech_coach', name: 'Speech coach', skill: 'oratory', pricePerLevel: 5000, energy: 0, description: 'Weekly sessions on pacing, pauses and the big applause line.' },
  { id: 'retail_workshop', name: 'Retail-politics workshop', skill: 'charisma', pricePerLevel: 5000, energy: 1, description: 'Improv drills, handshakes and remembering everyone’s name.' },
  { id: 'media_training', name: 'Media training', skill: 'media', pricePerLevel: 5000, energy: 0, description: 'Mock interviews under hot lights. Fewer gaffes on camera.' },
  { id: 'digital_director', name: 'Hire a digital director', skill: 'digital', pricePerLevel: 6000, energy: 0, upkeep: 2000, description: 'A staffer who lives online. Costs a salary every turn.' },
  { id: 'think_tank', name: 'Think-tank fellowship', skill: 'policy', pricePerLevel: 4000, energy: 2, description: 'A semester of white papers. Sharper debates, clearer previews.' },
  { id: 'donor_gala', name: 'Donor network gala', skill: 'fundraising', pricePerLevel: 8000, energy: 1, description: 'Meet the people who write the big checks — and keep writing them.' },
  { id: 'party_mentorship', name: 'Mentorship with a party elder', skill: 'negotiation', pricePerLevel: 5000, energy: 1, requiresParty: true, standing: 5, description: 'Learn how deals really get made — and get on the leadership’s radar. +5 party standing.' },
];

export const SKILL_CARDS_BY_ID: Record<string, SkillCard> = Object.fromEntries(SKILL_CARDS.map((c) => [c.id, c]));

export function getSkillCard(id: string): SkillCard {
  const card = SKILL_CARDS_BY_ID[id];
  if (!card) throw new Error(`Unknown skill card: ${id}`);
  return card;
}
