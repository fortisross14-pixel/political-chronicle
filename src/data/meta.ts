import { stanceAt } from '../engine/stance';
import type { CreationInput } from '../engine/creation';
import type { OfficeId, PartyId, Pledge } from '../engine/types';

// ---------- Scenarios (DESIGN_V2 §8.1) ----------

export type StarRule =
  | { kind: 'win' }
  | { kind: 'share'; min: number }
  | { kind: 'noBrokenPromises' }
  | { kind: 'approval'; min: number }
  | { kind: 'noPrimary' }
  | { kind: 'standing'; min: number }
  | { kind: 'firstTry' }
  | { kind: 'carryRegion'; regionId: string };

export interface StarGoal {
  id: string;
  text: string;
  rule: StarRule;
}

export interface Reward {
  /** Trinkets added to your collection. */
  trinkets?: string[];
}

export interface ScenarioSetup {
  /** The character (the player still chooses the name). */
  character: Omit<CreationInput, 'name' | 'allocation'> & { allocation?: CreationInput['allocation'] };
  startYear: number;
  /** Start already holding an office (won in the year before `startYear`). */
  office?: { officeId: OfficeId; approval: number; platform: Pledge[]; wonYear: number; share: number };
  party?: { id: PartyId; standing: number };
  /** Extra money on top of the background's. */
  funds?: number;
  /** <1 makes opponents less known (an easier race). */
  opponentRecognition?: number;
  /** Extra events per turn for every opponent (a harder race). */
  opponentActivity?: number;
  /** Run without trinkets. */
  pure?: boolean;
}

export interface Scenario {
  id: string;
  track: 'beginner' | 'advanced';
  order: number;
  title: string;
  tagline: string;
  description: string;
  teaches: string;
  setup: ScenarioSetup;
  objective: { officeId: OfficeId; by: number; minYear?: number; text: string };
  stars: [StarGoal, StarGoal, StarGoal];
  /** Reward for reaching 1, 2 and 3 stars (each paid once). */
  rewards: [Reward, Reward, Reward];
}

const WATERTOWN_PLATFORM: Pledge[] = [
  { issue: 'guns', stance: stanceAt(3) },
  { issue: 'taxes', stance: stanceAt(3) },
  { issue: 'small_biz', stance: stanceAt(3) },
  { issue: 'climate', stance: stanceAt(2) },
  { issue: 'industry', stance: stanceAt(-2) },
];

/** A Red who won the North Country by staying close to the middle on what New York cares about. */
const MODERATE_RED_PLATFORM: Pledge[] = [
  { issue: 'taxes', stance: stanceAt(1) },
  { issue: 'policing', stance: stanceAt(1) },
  { issue: 'small_biz', stance: stanceAt(2) },
  { issue: 'guns', stance: stanceAt(1) },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'hometown_favorite',
    track: 'beginner',
    order: 1,
    title: 'Hometown favorite',
    tagline: 'Everyone in Watertown knows your name. Now make it official.',
    description:
      'A Watertown native and public servant, you file for mayor as the favorite. Pick a platform that fits the North Country, hold events, back the right causes, and win in November.',
    teaches: 'Platform, events, polls, election night',
    setup: {
      character: { gender: 'female', age: 34, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'public_servant' },
      startYear: 2027,
      opponentRecognition: 0.55,
    },
    objective: { officeId: 'mayor-watertown', by: 2027, text: 'Win the 2027 race for Mayor of Watertown' },
    stars: [
      { id: 'win', text: 'Win the race', rule: { kind: 'win' } },
      { id: 'share55', text: 'Win with 55% or more', rule: { kind: 'share', min: 0.55 } },
      { id: 'share60', text: 'Win with 60% or more', rule: { kind: 'share', min: 0.6 } },
    ],
    rewards: [{ trinkets: ['lucky_tie'] }, { trinkets: ['union_hall_key'] }, { trinkets: ['rapid_response'] }],
  },
  {
    id: 'keep_your_word',
    track: 'beginner',
    order: 2,
    title: 'Keep your word',
    tagline: 'You won on promises. Now keep them — and keep your job.',
    description:
      'You’re the newly elected Mayor of Watertown, and a well-funded challenger is already campaigning. Sign the bills your voters want, keep your promises, and win re-election in 2031.',
    teaches: 'Bills, approval, promises, re-election',
    setup: {
      character: { gender: 'male', age: 41, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'veteran' },
      startYear: 2028,
      office: { officeId: 'mayor-watertown', approval: 0.52, platform: WATERTOWN_PLATFORM, wonYear: 2027, share: 0.52 },
      // A well-funded challenger campaigns hard for the whole window.
      opponentActivity: 2,
    },
    objective: { officeId: 'mayor-watertown', by: 2031, minYear: 2031, text: 'Win re-election as Mayor of Watertown in 2031' },
    stars: [
      { id: 'win', text: 'Win re-election', rule: { kind: 'win' } },
      { id: 'promises', text: 'Never break a campaign promise', rule: { kind: 'noBrokenPromises' } },
      { id: 'approval60', text: 'Approval of 60%+ going into the vote', rule: { kind: 'approval', min: 0.6 } },
    ],
    rewards: [{ trinkets: ['rolodex'] }, { trinkets: ['debate_notes'] }, { trinkets: ['iron_discipline'] }],
  },
  {
    id: 'pick_a_side',
    track: 'beginner',
    order: 3,
    title: 'Pick a side',
    tagline: 'Independents can only go so far. Time to choose a team.',
    description:
      'As the independent Mayor of Watertown, the 2028 House race opens on your first turn. Ask a party to take you, launch, and win the North Country & Southern Tier seat.',
    teaches: 'Parties, standing, nominations, partisan races',
    setup: {
      character: { gender: 'nonbinary', age: 38, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'lawyer' },
      startYear: 2028,
      office: { officeId: 'mayor-watertown', approval: 0.55, platform: WATERTOWN_PLATFORM, wonYear: 2027, share: 0.54 },
      opponentRecognition: 0.3,
      opponentActivity: -1.5,
    },
    objective: { officeId: 'house-ny-north', by: 2028, text: 'Win the North Country House seat in 2028' },
    stars: [
      { id: 'win', text: 'Win the House seat', rule: { kind: 'win' } },
      { id: 'noPrimary', text: 'Get the nomination without a primary', rule: { kind: 'noPrimary' } },
      { id: 'standing70', text: 'Party standing of 70+ when you win', rule: { kind: 'standing', min: 70 } },
    ],
    rewards: [{ trinkets: ['crossover_appeal'] }, { trinkets: ['force_the_vote'] }, { trinkets: ['comeback_kid'] }],
  },
  {
    id: 'big_city_small_town',
    track: 'beginner',
    order: 4,
    title: 'Big city, small town',
    tagline: 'Upstate loves you. Now win over New York City.',
    description:
      'A moderate Republic Party congresswoman from the North Country, you set your sights on the Governor’s mansion. Win statewide by 2034 — and that means competing in NYC.',
    teaches: 'Statewide campaigns, NYC, election night',
    setup: {
      character: { gender: 'female', age: 44, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'business' },
      startYear: 2029,
      office: { officeId: 'house-ny-north', approval: 0.6, platform: MODERATE_RED_PLATFORM, wonYear: 2028, share: 0.68 },
      party: { id: 'RP', standing: 62 },
      funds: 40000,
      opponentRecognition: 0.4,
    },
    objective: { officeId: 'governor-ny', by: 2034, text: 'Become Governor of New York by 2034' },
    stars: [
      { id: 'win', text: 'Become Governor', rule: { kind: 'win' } },
      { id: 'firstTry', text: 'Win on your first try', rule: { kind: 'firstTry' } },
      { id: 'carryNyc', text: 'Carry New York City', rule: { kind: 'carryRegion', regionId: 'ny-nyc' } },
    ],
    rewards: [{ trinkets: ['star_power'] }, {}, {}],
  },
  // ---------- Advanced: harder starts, for players who have learned the loop ----------
  {
    id: 'the_underdog',
    track: 'advanced',
    order: 1,
    title: 'The underdog',
    tagline: 'New in town, no name, no money. Buffalo has never heard of you.',
    description:
      'You moved to Buffalo from Ohio two years ago. Your opponents are known, funded and busy. Win the 2029 mayoral race anyway.',
    teaches: 'Building recognition from nothing; trinkets that make it count',
    setup: {
      character: { gender: 'male', age: 29, homeState: 'OH', residentRegionId: 'ny-wny', backgroundId: 'organizer' },
      startYear: 2029,
      opponentRecognition: 1.4,
      opponentActivity: 1,
    },
    objective: { officeId: 'mayor-buffalo', by: 2029, text: 'Become Mayor of Buffalo in 2029' },
    stars: [
      { id: 'win', text: 'Become Mayor of Buffalo', rule: { kind: 'win' } },
      { id: 'firstTry', text: 'Win on your first try', rule: { kind: 'firstTry' } },
      { id: 'share55', text: 'Win with 55% or more', rule: { kind: 'share', min: 0.55 } },
    ],
    rewards: [{}, {}, {}],
  },
  {
    id: 'blue_in_the_north',
    track: 'advanced',
    order: 2,
    title: 'Blue in the North Country',
    tagline: 'A Blue Party candidate, in the reddest district in the state.',
    description:
      'The North Country votes Red and always has. As the Blue nominee, win the House seat: pick topics where the district already agrees with you, and keep the base home.',
    teaches: 'Winning against the partisan lean',
    setup: {
      character: { gender: 'female', age: 36, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'veteran' },
      startYear: 2028,
      party: { id: 'DU', standing: 60 },
      funds: 40000,
      opponentRecognition: 0.8,
    },
    objective: { officeId: 'house-ny-north', by: 2030, text: 'Win the North Country House seat as a Blue by 2030' },
    stars: [
      { id: 'win', text: 'Win the seat', rule: { kind: 'win' } },
      { id: 'firstTry', text: 'Win on your first try', rule: { kind: 'firstTry' } },
      { id: 'noBroken', text: 'Break no promises', rule: { kind: 'noBrokenPromises' } },
    ],
    rewards: [{}, {}, {}],
  },
  {
    id: 'small_town_to_the_top',
    track: 'advanced',
    order: 3,
    title: 'Small town to the top',
    tagline: 'From Watertown city hall to the Governor’s mansion.',
    description:
      'Start with nothing but a hometown. Climb: mayor, then the House or straight statewide, and be Governor of New York by 2038.',
    teaches: 'A whole career: when to move up, and what to bring',
    setup: {
      character: { gender: 'male', age: 31, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'public_servant' },
      startYear: 2027,
    },
    objective: { officeId: 'governor-ny', by: 2038, text: 'Become Governor of New York by 2038' },
    stars: [
      { id: 'win', text: 'Become Governor', rule: { kind: 'win' } },
      { id: 'noBroken', text: 'Break no promises', rule: { kind: 'noBrokenPromises' } },
      { id: 'carryNyc', text: 'Carry New York City', rule: { kind: 'carryRegion', regionId: 'ny-nyc' } },
    ],
    rewards: [{}, {}, {}],
  },
];

export const SCENARIOS_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export function getScenario(id: string): Scenario {
  const scenario = SCENARIOS_BY_ID[id];
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
