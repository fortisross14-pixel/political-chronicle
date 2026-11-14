import type { IssueId, RegionType, SkillId } from '../engine/types';

/** Mechanical perks and weaknesses. Every field is optional; the engine reads what's present. */
export interface BackgroundPerks {
  /** Recognition in every region of your resident state at the start (at least this). */
  statewideRecognition?: number;
  /** Starting integrity (default 60). */
  startingIntegrity?: number;
  /** Your party standing never starts below this when you join. */
  partyStandingFloor?: number;
  /** Multiplier on what declining a crisis card costs you. */
  crisisCost?: number;
  /** Multiplier on door-knocking effects. */
  doorKnocking?: number;
  /** Multiplier on televised-debate persuasion. */
  debate?: number;
  /** Credibility multiplier on issues outside `credibleIssues` (celebrities aren't taken seriously on policy). */
  policyCredibility?: number;
  /** Energy lost per turn for this many months at the start of the career. */
  energyPenalty?: { amount: number; months: number };
}

export interface Background {
  id: string;
  name: string;
  blurb: string;
  /** Fixed points, added on top of the base 1 in every skill. */
  skillBonus: Partial<Record<SkillId, number>>;
  /** Weaknesses: these skills can't be raised above this value at creation. */
  creationCaps?: Partial<Record<SkillId, number>>;
  /** Personal wealth at age 25 (log-uniform between min and max); older politicians have more. */
  wealth: { min: number; max: number; /** Chance of a fortune 20–60× the max. */ fortune?: number };
  /** Issues where this background makes you more credible. */
  credibleIssues: IssueId[];
  /** Issues where voters doubt you (×0.85 credibility). */
  doubtedIssues?: IssueId[];
  /** +0.08 favorability statewide if your resident state is one of these. */
  favoredStates: string[];
  /** −0.05 favorability statewide in these. */
  disfavoredStates?: string[];
  /** Extra starting favorability in regions of this type. */
  regionAffinity?: Partial<Record<RegionType, number>>;
  perks: BackgroundPerks;
  perkText: string;
  weaknessText: string;
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'veteran',
    name: 'Army veteran',
    blurb: 'Discipline, a story people respect, and calm in a crisis.',
    skillBonus: { leadership: 2, administration: 1 },
    creationCaps: { diplomacy: 2 },
    wealth: { min: 40_000, max: 150_000 },
    credibleIssues: ['guns', 'immigration', 'policing'],
    favoredStates: ['TX', 'GA', 'NC', 'AZ', 'WY'],
    disfavoredStates: ['MA', 'VT'],
    regionAffinity: { rural: 0.05 },
    perks: { crisisCost: 0.5 },
    perkText: 'Declining a crisis costs half. Liked in rural regions.',
    weaknessText: 'Diplomacy capped at 2 at creation.',
  },
  {
    id: 'public_servant',
    name: 'Public servant',
    blurb: 'Years inside government. You know how things get done — and everyone knows you.',
    skillBonus: { administration: 2, strategy: 2 },
    wealth: { min: 60_000, max: 250_000 },
    credibleIssues: ['transit', 'education'],
    favoredStates: ['NY', 'IL', 'MA'],
    perks: { partyStandingFloor: 40 },
    perkText: 'Join a party with at least 40 standing; starts with a chief of staff from your old job.',
    weaknessText: 'Establishment: outsider scenarios penalize you.',
  },
  {
    id: 'celebrity',
    name: 'Celebrity',
    blurb: 'Everybody knows your face. Nobody knows your policies.',
    skillBonus: { charisma: 4, strategy: 1 },
    creationCaps: { administration: 2, economics: 2, law: 2 },
    wealth: { min: 1_500_000, max: 25_000_000 },
    credibleIssues: ['lgbtq', 'climate'],
    favoredStates: ['CA', 'NY', 'FL'],
    disfavoredStates: ['WY', 'ND'],
    regionAffinity: { urban: 0.05 },
    perks: { statewideRecognition: 0.25, policyCredibility: 0.8 },
    perkText: 'Starts with 25% recognition across the state. Loved in big cities.',
    weaknessText: 'Administration, Economics and Law capped at 2; less credible on policy.',
  },
  {
    id: 'lawyer',
    name: 'Lawyer',
    blurb: 'Sharp in a debate and well connected, but voters have heard lawyers before.',
    skillBonus: { law: 3, diplomacy: 1 },
    creationCaps: { charisma: 2 },
    wealth: { min: 300_000, max: 2_500_000 },
    credibleIssues: ['policing', 'immigration', 'abortion'],
    favoredStates: ['MA', 'IL', 'NY'],
    perks: { debate: 1.25 },
    perkText: 'Debates persuade 25% more.',
    weaknessText: 'Charisma capped at 2 at creation.',
  },
  {
    id: 'business',
    name: 'Business executive',
    blurb: 'You’ve run payrolls and boardrooms. You can write your own first check.',
    skillBonus: { economics: 3, administration: 1 },
    wealth: { min: 3_000_000, max: 60_000_000, fortune: 0.04 },
    credibleIssues: ['small_biz', 'taxes', 'industry'],
    doubtedIssues: ['labor', 'min_wage'],
    favoredStates: ['NY', 'TX', 'FL'],
    perks: {},
    perkText: 'Self-funding: starts with $70k.',
    weaknessText: 'Doubted on labor and the minimum wage.',
  },
  {
    id: 'organizer',
    name: 'Community organizer',
    blurb: 'You built coalitions block by block. You can fill a hall on short notice.',
    skillBonus: { leadership: 1, charisma: 1, diplomacy: 1 },
    creationCaps: { economics: 2 },
    wealth: { min: 15_000, max: 60_000 },
    credibleIssues: ['labor', 'housing', 'min_wage'],
    favoredStates: ['IL', 'MI', 'PA', 'OH'],
    disfavoredStates: ['WY'],
    perks: { doorKnocking: 1.2 },
    perkText: 'Door-knocking is 20% stronger. (Extra election-night ground game arrives with election night.)',
    weaknessText: 'Economics capped at 2; few donors.',
  },
  {
    id: 'doctor',
    name: 'Doctor / scientist',
    blurb: 'Trusted, careful and credible — and still finishing your shifts.',
    skillBonus: { law: 1, administration: 1, economics: 1 },
    wealth: { min: 250_000, max: 1_500_000 },
    credibleIssues: ['healthcare', 'climate', 'abortion'],
    favoredStates: ['MA', 'CO', 'WA'],
    perks: { startingIntegrity: 75, energyPenalty: { amount: 1, months: 48 } },
    perkText: 'High trust: integrity starts at 75.',
    weaknessText: '−1 energy for the first four years (still at the clinic).',
  },
];

export const BACKGROUNDS_BY_ID: Record<string, Background> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

export function getBackground(id: string): Background {
  const background = BACKGROUNDS_BY_ID[id];
  if (!background) throw new Error(`Unknown background: ${id}`);
  return background;
}
