import type { IssueId, SkillId } from '../engine/types';

export interface Background {
  id: string;
  name: string;
  blurb: string;
  /** Added on top of the base 1 in every skill. */
  skillBonus: Partial<Record<SkillId, number>>;
  /** Starting funds at age 25; older politicians have more savings and contacts. */
  baseFunds: number;
  /** Issues where this background makes you more credible (used by persuasion from M3). */
  credibleIssues: IssueId[];
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'lawyer',
    name: 'Lawyer',
    blurb: 'Sharp in a debate and well connected, but voters have heard lawyers before.',
    skillBonus: { policy: 2, oratory: 1, negotiation: 1 },
    baseFunds: 40_000,
    credibleIssues: ['policing', 'immigration'],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    blurb: 'Patient, trusted and used to a tough room. Not a lot of money.',
    skillBonus: { charisma: 2, oratory: 1, policy: 1 },
    baseFunds: 10_000,
    credibleIssues: ['education', 'labor'],
  },
  {
    id: 'small_business',
    name: 'Small-business owner',
    blurb: 'Knows payroll, permits and every customer by name.',
    skillBonus: { fundraising: 2, charisma: 1, negotiation: 1 },
    baseFunds: 35_000,
    credibleIssues: ['small_biz', 'taxes'],
  },
  {
    id: 'veteran',
    name: 'Veteran',
    blurb: 'Discipline and a story people respect, across the aisle.',
    skillBonus: { oratory: 2, charisma: 1, negotiation: 1 },
    baseFunds: 15_000,
    credibleIssues: ['guns', 'immigration'],
  },
  {
    id: 'doctor',
    name: 'Doctor',
    blurb: 'Credible and comfortable, but new to the cameras.',
    skillBonus: { policy: 2, fundraising: 1, charisma: 1 },
    baseFunds: 50_000,
    credibleIssues: ['healthcare', 'abortion'],
  },
  {
    id: 'union_organizer',
    name: 'Union organizer',
    blurb: 'Built coalitions one shift at a time. Can fill a hall on short notice.',
    skillBonus: { negotiation: 2, oratory: 1, charisma: 1 },
    baseFunds: 12_000,
    credibleIssues: ['labor', 'min_wage', 'industry'],
  },
  {
    id: 'activist',
    name: 'Activist',
    blurb: 'Grassroots energy and a big online following. Few donors.',
    skillBonus: { digital: 2, oratory: 1, charisma: 1 },
    baseFunds: 8_000,
    credibleIssues: ['climate', 'lgbtq', 'housing'],
  },
  {
    id: 'tech_founder',
    name: 'Tech founder',
    blurb: 'Deep pockets and a slick feed, but can come off as out of touch.',
    skillBonus: { digital: 2, fundraising: 2 },
    baseFunds: 80_000,
    credibleIssues: ['industry', 'transit'],
  },
];

export const BACKGROUNDS_BY_ID: Record<string, Background> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

export function getBackground(id: string): Background {
  const background = BACKGROUNDS_BY_ID[id];
  if (!background) throw new Error(`Unknown background: ${id}`);
  return background;
}
