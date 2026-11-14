import type { SkillId } from '../engine/types';

/** The four roles a person card can fill (DESIGN_V2 §3). */
export type Role = 'campaignManager' | 'chiefOfStaff' | 'partyLiaison' | 'legislativeDirector';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PersonPerk =
  /** +1 energy every turn while running. */
  | 'roadWarrior'
  /** Gaffes cost half. */
  | 'spinDoctor'
  /** Declining a crisis costs half. */
  | 'fixer'
  /** Standing you lose with your party is halved. */
  | 'whipShield'
  /** +10% bill passage when the other party controls the chamber. */
  | 'acrossTheAisle';

export interface Person {
  id: string;
  name: string;
  role: Role;
  rarity: Rarity;
  /** Skill boosts while assigned and the role is active. */
  boosts: Partial<Record<SkillId, number>>;
  perk?: PersonPerk;
  bio: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  campaignManager: 'Campaign manager',
  chiefOfStaff: 'Chief of staff',
  partyLiaison: 'Party liaison',
  legislativeDirector: 'Legislative director',
};

export const ROLE_HINTS: Record<Role, string> = {
  campaignManager: 'Active whenever you are running for office.',
  chiefOfStaff: 'Active while you hold any office.',
  partyLiaison: 'Active while you hold office as a party member.',
  legislativeDirector: 'Active as Governor, in the House or the Senate (not as mayor).',
};

export const PERK_TEXT: Record<PersonPerk, string> = {
  roadWarrior: '+1 energy every turn',
  spinDoctor: 'Gaffes cost half',
  fixer: 'Declining a crisis costs half',
  whipShield: 'Standing lost with your party is halved',
  acrossTheAisle: '+10% bill passage against an opposing chamber',
};

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 10, rare: 5, epic: 2, legendary: 0.6 };

/** One-time price in the Market. No salaries: once bought, they're yours until you discard them. */
export const PERSON_PRICE: Record<Rarity, number> = { common: 6000, rare: 15000, epic: 35000, legendary: 70000 };

export const PEOPLE: Person[] = [
  // Campaign managers
  {
    id: 'cm_kowalczyk',
    name: 'Terry Kowalczyk',
    role: 'campaignManager',
    rarity: 'common',
    boosts: { charisma: 1 },
    bio: 'Ran three county races. Knows every diner owner.',
  },
  {
    id: 'cm_amari',
    name: 'Nia Amari',
    role: 'campaignManager',
    rarity: 'common',
    boosts: { strategy: 1 },
    bio: 'Spreadsheet wizard with a field-office habit.',
  },
  {
    id: 'cm_vance',
    name: 'Rob Vance',
    role: 'campaignManager',
    rarity: 'rare',
    boosts: { charisma: 1, strategy: 1 },
    perk: 'spinDoctor',
    bio: 'Turns bad nights into good headlines.',
  },
  {
    id: 'cm_ortiz',
    name: 'Lucía Ortiz',
    role: 'campaignManager',
    rarity: 'rare',
    boosts: { strategy: 2 },
    bio: 'Reads a crosstab the way others read a novel.',
  },
  {
    id: 'cm_harlan',
    name: 'Mae Harlan',
    role: 'campaignManager',
    rarity: 'epic',
    boosts: { charisma: 2, strategy: 1 },
    perk: 'roadWarrior',
    bio: 'Never sleeps. Neither will you.',
  },
  {
    id: 'cm_king',
    name: 'Desmond “The Closer” King',
    role: 'campaignManager',
    rarity: 'legendary',
    boosts: { charisma: 2, strategy: 2 },
    perk: 'roadWarrior',
    bio: 'Has not lost a close race in twenty years.',
  },
  // Chiefs of staff
  {
    id: 'cs_pham',
    name: 'Linh Pham',
    role: 'chiefOfStaff',
    rarity: 'common',
    boosts: { administration: 1 },
    bio: 'Calendars, memos, and the occasional miracle.',
  },
  {
    id: 'cs_brooks',
    name: 'Gene Brooks',
    role: 'chiefOfStaff',
    rarity: 'common',
    boosts: { economics: 1 },
    bio: 'Former budget director. Reads line items for fun.',
  },
  {
    id: 'cs_feldman',
    name: 'Rachel Feldman',
    role: 'chiefOfStaff',
    rarity: 'rare',
    boosts: { administration: 2 },
    bio: 'Makes the trains run on time. Literally, once.',
  },
  {
    id: 'cs_osei',
    name: 'Kwame Osei',
    role: 'chiefOfStaff',
    rarity: 'rare',
    boosts: { administration: 1, leadership: 1 },
    perk: 'fixer',
    bio: 'Your 3 a.m. phone call.',
  },
  {
    id: 'cs_lindqvist',
    name: 'Ingrid Lindqvist',
    role: 'chiefOfStaff',
    rarity: 'epic',
    boosts: { administration: 2, economics: 1 },
    perk: 'fixer',
    bio: 'Ran a state agency through two recessions.',
  },
  {
    id: 'cs_monroe',
    name: 'Clara Monroe',
    role: 'chiefOfStaff',
    rarity: 'legendary',
    boosts: { administration: 3, leadership: 1 },
    perk: 'fixer',
    bio: 'Three governors called her the real governor.',
  },
  // Party liaisons
  {
    id: 'pl_doyle',
    name: 'Frank Doyle',
    role: 'partyLiaison',
    rarity: 'common',
    boosts: { leadership: 1 },
    bio: 'Knows which committee chair likes which steakhouse.',
  },
  {
    id: 'pl_reyes',
    name: 'Ana Reyes',
    role: 'partyLiaison',
    rarity: 'rare',
    boosts: { leadership: 1, diplomacy: 1 },
    perk: 'whipShield',
    bio: 'Smooths over every vote you didn’t take.',
  },
  {
    id: 'pl_whitfield',
    name: 'Senator (ret.) Hal Whitfield',
    role: 'partyLiaison',
    rarity: 'epic',
    boosts: { leadership: 2, diplomacy: 1 },
    perk: 'whipShield',
    bio: 'Forty years in the party. Everyone owes him.',
  },
  // Legislative directors
  {
    id: 'ld_cho',
    name: 'Daniel Cho',
    role: 'legislativeDirector',
    rarity: 'common',
    boosts: { law: 1 },
    bio: 'Drafts amendments in his sleep.',
  },
  {
    id: 'ld_baptiste',
    name: 'Marie Baptiste',
    role: 'legislativeDirector',
    rarity: 'rare',
    boosts: { diplomacy: 2 },
    perk: 'acrossTheAisle',
    bio: 'Has lunch with the other side every Tuesday.',
  },
  {
    id: 'ld_novak',
    name: 'Peter Novak',
    role: 'legislativeDirector',
    rarity: 'rare',
    boosts: { law: 2 },
    bio: 'Former committee counsel. Knows where the bodies are buried.',
  },
  {
    id: 'ld_sutherland',
    name: 'Grace Sutherland',
    role: 'legislativeDirector',
    rarity: 'legendary',
    boosts: { law: 2, diplomacy: 2 },
    perk: 'acrossTheAisle',
    bio: 'Passed bills under four governors of both parties.',
  },
];

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

export function getPerson(id: string): Person {
  const person = PEOPLE_BY_ID[id];
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}
