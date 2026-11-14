import type { Rarity } from '../engine/types';

/** The four roles a person card can fill (DESIGN_V2 §3). */
export type Role = 'campaignManager' | 'chiefOfStaff' | 'partyLiaison' | 'legislativeDirector';
export type { Rarity };

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

/** 0–5 stars (half steps) per role: how well this person does each job. */
export type RoleStars = Record<Role, number>;

export interface Person {
  id: string;
  name: string;
  rarity: Rarity;
  stars: RoleStars;
  /** Works whenever the person holds an active role. */
  perk?: PersonPerk;
  bio: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  campaignManager: 'Campaign manager',
  chiefOfStaff: 'Chief of staff',
  partyLiaison: 'Party liaison',
  legislativeDirector: 'Legislative director',
};

export const ROLE_SHORT: Record<Role, string> = {
  campaignManager: 'Campaign',
  chiefOfStaff: 'Staff',
  partyLiaison: 'Party',
  legislativeDirector: 'Laws',
};

/** When the role does something, and what. */
export const ROLE_HINTS: Record<Role, string> = {
  campaignManager: 'While running: stronger campaign actions, more election-night tokens.',
  chiefOfStaff: 'In office: slower approval wear, stronger political events.',
  partyLiaison: 'More standing with your party; better odds when you ask to join one.',
  legislativeDirector: 'In office: your bills pass more often.',
};

export const PERK_TEXT: Record<PersonPerk, string> = {
  roadWarrior: '+1 energy every turn',
  spinDoctor: 'Gaffes cost half',
  fixer: 'Declining a crisis costs half',
  whipShield: 'Standing lost with your party is halved',
  acrossTheAisle: '+10% bill passage against an opposing chamber',
};

const stars = (cm: number, cs: number, pl: number, ld: number): RoleStars => ({
  campaignManager: cm,
  chiefOfStaff: cs,
  partyLiaison: pl,
  legislativeDirector: ld,
});

export const PEOPLE: Person[] = [
  // Common
  {
    id: 'cm_kowalczyk',
    name: 'Terry Kowalczyk',
    rarity: 'common',
    stars: stars(2, 1, 1.5, 0.5),
    bio: 'Ran three county races. Knows every diner owner.',
  },
  {
    id: 'cm_amari',
    name: 'Nia Amari',
    rarity: 'common',
    stars: stars(2, 1.5, 0.5, 1),
    bio: 'Spreadsheet wizard with a field-office habit.',
  },
  {
    id: 'cs_pham',
    name: 'Linh Pham',
    rarity: 'common',
    stars: stars(1, 2, 0.5, 1.5),
    bio: 'Calendars, memos, and the occasional miracle.',
  },
  {
    id: 'cs_brooks',
    name: 'Gene Brooks',
    rarity: 'common',
    stars: stars(0.5, 2, 1, 2),
    bio: 'Former budget director. Reads line items for fun.',
  },
  {
    id: 'pl_doyle',
    name: 'Frank Doyle',
    rarity: 'common',
    stars: stars(1.5, 1, 2.5, 1),
    bio: 'Knows which committee chair likes which steakhouse.',
  },
  { id: 'ld_cho', name: 'Daniel Cho', rarity: 'common', stars: stars(0.5, 1.5, 1, 2.5), bio: 'Drafts amendments in his sleep.' },
  { id: 'vol_ruiz', name: 'Marisol Ruiz', rarity: 'common', stars: stars(2.5, 0.5, 1, 0), bio: 'Ran the phone bank out of her garage.' },
  {
    id: 'intern_park',
    name: 'Ben Park',
    rarity: 'common',
    stars: stars(1.5, 1.5, 1, 1.5),
    bio: 'Overqualified intern. Will be your boss someday.',
  },
  {
    id: 'press_okafor',
    name: 'Tobi Okafor',
    rarity: 'common',
    stars: stars(2, 1.5, 0.5, 0.5),
    bio: 'Ex-reporter. Knows every deadline in town.',
  },
  { id: 'union_mcbride', name: 'Pat McBride', rarity: 'common', stars: stars(1.5, 0.5, 2, 1), bio: 'Can fill a union hall by Thursday.' },
  { id: 'clerk_alvarez', name: 'Rosa Alvarez', rarity: 'common', stars: stars(0.5, 2.5, 1, 2), bio: 'Has the town code memorized.' },
  // Rare
  {
    id: 'cm_vance',
    name: 'Rob Vance',
    rarity: 'rare',
    stars: stars(3, 1.5, 2, 1),
    perk: 'spinDoctor',
    bio: 'Turns bad nights into good headlines.',
  },
  {
    id: 'cm_ortiz',
    name: 'Lucía Ortiz',
    rarity: 'rare',
    stars: stars(3.5, 2, 1, 1.5),
    bio: 'Reads a crosstab the way others read a novel.',
  },
  {
    id: 'cs_feldman',
    name: 'Rachel Feldman',
    rarity: 'rare',
    stars: stars(1.5, 3.5, 1, 2),
    bio: 'Makes the trains run on time. Literally, once.',
  },
  { id: 'cs_osei', name: 'Kwame Osei', rarity: 'rare', stars: stars(2, 3, 2, 1), perk: 'fixer', bio: 'Your 3 a.m. phone call.' },
  {
    id: 'pl_reyes',
    name: 'Ana Reyes',
    rarity: 'rare',
    stars: stars(2, 1.5, 3, 2),
    perk: 'whipShield',
    bio: 'Smooths over every vote you didn’t take.',
  },
  {
    id: 'ld_baptiste',
    name: 'Marie Baptiste',
    rarity: 'rare',
    stars: stars(1, 2, 2.5, 3),
    perk: 'acrossTheAisle',
    bio: 'Has lunch with the other side every Tuesday.',
  },
  {
    id: 'ld_novak',
    name: 'Peter Novak',
    rarity: 'rare',
    stars: stars(1, 2, 1, 3.5),
    bio: 'Former committee counsel. Knows where the bodies are buried.',
  },
  {
    id: 'pollster_greene',
    name: 'Avery Greene',
    rarity: 'rare',
    stars: stars(3.5, 1.5, 1.5, 1),
    bio: 'Called the last four races to the decimal.',
  },
  { id: 'lobbyist_hart', name: 'Victor Hart', rarity: 'rare', stars: stars(1, 2, 3, 3), bio: 'Reformed lobbyist. Mostly reformed.' },
  {
    id: 'budget_iyer',
    name: 'Priya Iyer',
    rarity: 'rare',
    stars: stars(1, 3, 1, 3),
    bio: 'Can find $40 million in a budget nobody else could.',
  },
  // Epic
  {
    id: 'cm_harlan',
    name: 'Mae Harlan',
    rarity: 'epic',
    stars: stars(4, 2.5, 2, 1),
    perk: 'roadWarrior',
    bio: 'Never sleeps. Neither will you.',
  },
  {
    id: 'cs_lindqvist',
    name: 'Ingrid Lindqvist',
    rarity: 'epic',
    stars: stars(2, 4.5, 1.5, 3),
    perk: 'fixer',
    bio: 'Ran a state agency through two recessions.',
  },
  {
    id: 'pl_whitfield',
    name: 'Senator (ret.) Hal Whitfield',
    rarity: 'epic',
    stars: stars(2.5, 2, 4.5, 3),
    perk: 'whipShield',
    bio: 'Forty years in the party. Everyone owes him.',
  },
  {
    id: 'digital_lee',
    name: 'Jae Lee',
    rarity: 'epic',
    stars: stars(4.5, 2, 1, 1),
    perk: 'spinDoctor',
    bio: 'Made three candidates go viral on purpose.',
  },
  {
    id: 'judge_okoro',
    name: 'Hon. Adaeze Okoro',
    rarity: 'epic',
    stars: stars(1, 3, 2.5, 4.5),
    bio: 'Retired appellate judge. Writes laws that survive court.',
  },
  // Legendary
  {
    id: 'cm_king',
    name: 'Desmond “The Closer” King',
    rarity: 'legendary',
    stars: stars(5, 3, 3.5, 2),
    perk: 'roadWarrior',
    bio: 'Has not lost a close race in twenty years.',
  },
  {
    id: 'cs_monroe',
    name: 'Clara Monroe',
    rarity: 'legendary',
    stars: stars(3, 5, 3.5, 4),
    perk: 'fixer',
    bio: 'Three governors called her the real governor.',
  },
  {
    id: 'ld_sutherland',
    name: 'Grace Sutherland',
    rarity: 'legendary',
    stars: stars(2, 3.5, 3, 5),
    perk: 'acrossTheAisle',
    bio: 'Passed bills under four governors of both parties.',
  },
  {
    id: 'fixer_vale',
    name: 'Simone Vale',
    rarity: 'legendary',
    stars: stars(4.5, 4.5, 4, 3),
    perk: 'fixer',
    bio: 'Has run a campaign, a city hall and a party. Sometimes at once.',
  },
];

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

export function getPerson(id: string): Person {
  const person = PEOPLE_BY_ID[id];
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}

/** The role this person is best at. */
export function bestRole(person: Person): Role {
  return (Object.entries(person.stars) as [Role, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}
