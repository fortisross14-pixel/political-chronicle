import { stanceAt } from '../engine/stance';
import type { CreationInput } from '../engine/creation';
import type { OfficeId, PartyId, Pledge } from '../engine/types';

// ---------- Artifacts: passive perks equipped before a run (DESIGN_V2 §8.3) ----------

export interface Artifact {
  id: string;
  name: string;
  text: string;
}

export const ARTIFACTS: Artifact[] = [
  { id: 'campaign_button', name: 'Grandfather’s campaign button', text: '+5% recognition in your city' },
  { id: 'rolodex', name: 'The Rolodex', text: 'Start with a common campaign manager' },
  { id: 'union_hall_key', name: 'Union hall key', text: '+1 ground-game token every campaign' },
  { id: 'war_chest', name: 'War chest', text: '+$15k starting funds' },
  { id: 'lucky_tie', name: 'Lucky tie', text: '+5 starting integrity' },
  { id: 'debate_notes', name: 'Dog-eared debate notes', text: 'Your first debate each campaign can’t gaffe' },
];

export const ARTIFACTS_BY_ID: Record<string, Artifact> = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

// ---------- Abilities: special moves earned in missions, for Sandbox (DESIGN_V2 §5.3) ----------

export interface Ability {
  id: string;
  name: string;
  text: string;
}

export const ABILITIES: Ability[] = [
  { id: 'rapid_response', name: 'Rapid response', text: 'Once per campaign, the next gaffe is cancelled' },
  { id: 'iron_discipline', name: 'Iron discipline', text: 'Breaking a promise costs half the integrity' },
  { id: 'crossover_appeal', name: 'Crossover appeal', text: 'The partisan lean of a region counts 25% less against you' },
  { id: 'comeback_kid', name: 'Comeback kid', text: 'Trailing by 5+ points on the final turn: +1 energy and +1 token' },
];

export const ABILITIES_BY_ID: Record<string, Ability> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

export const MAX_ABILITIES = 2;

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
  artifacts?: string[];
  abilities?: string[];
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
  /** Run without artifacts. */
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
      opponentRecognition: 0.8,
    },
    objective: { officeId: 'mayor-watertown', by: 2027, text: 'Win the 2027 race for Mayor of Watertown' },
    stars: [
      { id: 'win', text: 'Win the race', rule: { kind: 'win' } },
      { id: 'share55', text: 'Win with 55% or more', rule: { kind: 'share', min: 0.55 } },
      { id: 'share60', text: 'Win with 60% or more', rule: { kind: 'share', min: 0.6 } },
    ],
    rewards: [{ artifacts: ['campaign_button'] }, { artifacts: ['war_chest'] }, { abilities: ['rapid_response'] }],
  },
  {
    id: 'keep_your_word',
    track: 'beginner',
    order: 2,
    title: 'Keep your word',
    tagline: 'You won on promises. Now keep them — and keep your job.',
    description:
      'You’re the newly elected Mayor of Watertown. Bills land on your desk every turn; sign the ones your voters want and that keep your campaign promises, then win re-election in 2031.',
    teaches: 'Bills, approval, promises, re-election',
    setup: {
      character: { gender: 'male', age: 41, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'veteran' },
      startYear: 2028,
      office: { officeId: 'mayor-watertown', approval: 0.45, platform: WATERTOWN_PLATFORM, wonYear: 2027, share: 0.52 },
    },
    objective: { officeId: 'mayor-watertown', by: 2031, minYear: 2031, text: 'Win re-election as Mayor of Watertown in 2031' },
    stars: [
      { id: 'win', text: 'Win re-election', rule: { kind: 'win' } },
      { id: 'promises', text: 'Never break a campaign promise', rule: { kind: 'noBrokenPromises' } },
      { id: 'approval60', text: 'Approval of 60%+ going into the vote', rule: { kind: 'approval', min: 0.6 } },
    ],
    rewards: [{ artifacts: ['lucky_tie'] }, { artifacts: ['rolodex'] }, { abilities: ['iron_discipline'] }],
  },
  {
    id: 'pick_a_side',
    track: 'beginner',
    order: 3,
    title: 'Pick a side',
    tagline: 'Independents can only go so far. Time to choose a team.',
    description:
      'As the independent Mayor of Watertown, join a party, earn its trust, and win the North Country & Southern Tier House seat by 2030.',
    teaches: 'Parties, standing, nominations, partisan races',
    setup: {
      character: { gender: 'nonbinary', age: 38, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'lawyer' },
      startYear: 2028,
      office: { officeId: 'mayor-watertown', approval: 0.55, platform: WATERTOWN_PLATFORM, wonYear: 2027, share: 0.54 },
      opponentRecognition: 1.2,
    },
    objective: { officeId: 'house-ny-north', by: 2030, text: 'Win the North Country House seat by 2030' },
    stars: [
      { id: 'win', text: 'Win the House seat', rule: { kind: 'win' } },
      { id: 'noPrimary', text: 'Get the nomination without a primary', rule: { kind: 'noPrimary' } },
      { id: 'standing70', text: 'Party standing of 70+ when you win', rule: { kind: 'standing', min: 70 } },
    ],
    rewards: [{ artifacts: ['union_hall_key'] }, { abilities: ['crossover_appeal'] }, { artifacts: ['debate_notes'] }],
  },
  {
    id: 'big_city_small_town',
    track: 'beginner',
    order: 4,
    title: 'Big city, small town',
    tagline: 'Upstate loves you. Now win over New York City.',
    description:
      'A Republic Party congresswoman from the North Country, you set your sights on the Governor’s mansion. Win statewide by 2034 — and that means competing in NYC.',
    teaches: 'Statewide campaigns, NYC, election night',
    setup: {
      character: { gender: 'female', age: 44, homeState: 'NY', residentRegionId: 'ny-north', backgroundId: 'business' },
      startYear: 2029,
      office: { officeId: 'house-ny-north', approval: 0.6, platform: WATERTOWN_PLATFORM, wonYear: 2028, share: 0.68 },
      party: { id: 'RP', standing: 62 },
      funds: 40000,
      opponentRecognition: 0.8,
    },
    objective: { officeId: 'governor-ny', by: 2034, text: 'Become Governor of New York by 2034' },
    stars: [
      { id: 'win', text: 'Become Governor', rule: { kind: 'win' } },
      { id: 'firstTry', text: 'Win on your first try', rule: { kind: 'firstTry' } },
      { id: 'carryNyc', text: 'Carry New York City', rule: { kind: 'carryRegion', regionId: 'ny-nyc' } },
    ],
    rewards: [{ abilities: ['comeback_kid'] }, { artifacts: [] }, { artifacts: [] }],
  },
];

export const SCENARIOS_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export function getScenario(id: string): Scenario {
  const scenario = SCENARIOS_BY_ID[id];
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
