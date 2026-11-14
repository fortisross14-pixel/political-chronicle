import { getBackground, getOffice, getRegion, OFFICES } from '../data';
import { averageApproval } from './governing';
import { grantPack } from './packs';
import { poll } from './opinion';
import { Rng, seedFromString } from './rng';
import { rollChambers } from './legislature';
import { emptyTeam, grantPerson } from './people';
import { initialRegions } from './traits';
import { nextElectionYear, turnsInYear } from './time';
import { initWorld } from './world';
import type { Career, GameState, Politician, RegionId, RunModifiers, Skills, Snapshot } from './types';

export const SCHEMA_VERSION = 12;
export const MAX_AGE_ENDS_RUN = 85;
export const DEFAULT_START_YEAR = 2027;

export const STARTING_INTEGRITY = 60;

export interface NewRunConfig {
  seed: string;
  politician: Politician;
  /** Personal wealth (see `wealthFor`). The campaign war chest starts empty. */
  wealth: number;
  /** Earliest election the run is built around: it starts the year before (campaigns open 7 turns out). */
  earliestYear?: number;
  /** The race the start is timed for. Defaults to the hometown's mayoralty. */
  raceOfficeId?: string;
  /** Start exactly in `earliestYear` (scenarios that begin in office). */
  exactYear?: boolean;
  /** Artifacts equipped for the run (DESIGN_V2 §8.3). */
  artifacts?: string[];
  modifiers?: Partial<RunModifiers>;
  /** Sandbox: end the career after this many years. */
  careerYears?: number;
}

export const DEFAULT_MODIFIERS: RunModifiers = { opponentRecognition: 1, extraTokens: 0, safeFirstDebate: false };

export type Difficulty = 'easy' | 'normal' | 'hard';

/** Sandbox difficulty: how known and how busy your opponents are. */
export const DIFFICULTY: Record<Difficulty, Partial<RunModifiers>> = {
  easy: { opponentRecognition: 0.85, opponentActivity: -0.5 },
  normal: {},
  hard: { opponentRecognition: 1.1, opponentActivity: 0.5 },
};

/** Artifacts change the opening state; some set run-wide modifiers. */
export function applyArtifacts(state: GameState, artifacts: string[]): GameState {
  let s = state;
  for (const id of artifacts) {
    switch (id) {
      case 'campaign_button': {
        const r = s.regions[s.politician.residentRegionId]!;
        s = { ...s, regions: { ...s.regions, [s.politician.residentRegionId]: { ...r, recognition: Math.min(1, r.recognition + 0.05) } } };
        break;
      }
      case 'rolodex':
        if (!s.team.cards.some((c) => c.personId === 'cm_kowalczyk')) s = grantPerson(s, 'cm_kowalczyk', 'campaignManager');
        break;
      case 'union_hall_key':
        s = { ...s, modifiers: { ...s.modifiers, extraTokens: s.modifiers.extraTokens + 1 } };
        break;
      case 'war_chest':
        s = { ...s, funds: s.funds + 15000 };
        break;
      case 'lucky_tie':
        s = { ...s, integrity: Math.min(100, s.integrity + 5) };
        break;
      case 'debate_notes':
        s = { ...s, modifiers: { ...s.modifiers, safeFirstDebate: true } };
        break;
    }
  }
  return { ...s, artifacts: [...artifacts] };
}

export function defaultSkills(): Skills {
  return { charisma: 3, economics: 3, diplomacy: 3, strategy: 3, administration: 3, leadership: 3, law: 3 };
}

/** A neutral test politician: a Watertown native public servant with 3 in every skill. */
export function defaultPolitician(): Politician {
  return {
    name: 'Jordan Hale',
    gender: 'nonbinary',
    startAge: 32,
    homeState: 'NY',
    residentRegionId: 'ny-north',
    backgroundId: 'public_servant',
    skills: defaultSkills(),
  };
}

export function ageOf(state: Pick<GameState, 'politician' | 'clock'>): number {
  return state.politician.startAge + state.clock.monthsElapsed / 12;
}

/** Energy per turn: 6 up to age 40, −1 per full decade after (DESIGN §3.2). */
export function energyForAge(age: number): number {
  return Math.max(1, 6 - Math.floor(Math.max(0, age - 40) / 10));
}

export function hometownMayoralty(regionId: RegionId): string | undefined {
  const district = getRegion(regionId).parent ?? regionId;
  return OFFICES.find((o) => o.level === 'mayor' && o.regionIds.some((id) => (getRegion(id).parent ?? id) === district))?.id;
}

export function createRun(config: NewRunConfig): GameState {
  const { politician } = config;
  getRegion(politician.residentRegionId); // validates birthplace
  const earliest = config.earliestYear ?? DEFAULT_START_YEAR;
  const raceOfficeId = config.raceOfficeId ?? hometownMayoralty(politician.residentRegionId);
  // You start blank, the year before your first natural race: its campaign window opens on turn one.
  const startYear = config.exactYear ? earliest : raceOfficeId ? nextElectionYear(getOffice(raceOfficeId), earliest) - 1 : earliest;

  const career: Career = { affiliation: 'IND', lossStreak: 0 };
  const rng = new Rng(seedFromString(`${config.seed}:world`));
  const base: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId: `run-${config.seed}`,
    rng: seedFromString(config.seed),
    clock: { year: startYear, turn: 0, turnsThisYear: turnsInYear(career, startYear), monthsElapsed: 0 },
    politician: { ...politician, skills: { ...politician.skills } },
    career,
    funds: 0,
    wealth: config.wealth,
    energy: Math.max(1, energyForAge(politician.startAge) - (getBackground(politician.backgroundId).perks.energyPenalty?.amount ?? 0)),
    integrity: getBackground(politician.backgroundId).perks.startingIntegrity ?? STARTING_INTEGRITY,
    regions: initialRegions(politician),
    record: {},
    hand: [],
    policyHand: [],
    packs: [],
    world: initWorld(rng, startYear),
    items: [],
    nextItemUid: 1,
    nextCardUid: 1,
    recentDecisionIds: [],
    team: emptyTeam(),
    chambers: rollChambers(new Rng(seedFromString(`${config.seed}:chambers`)), startYear),
    eventHistory: [],
    elections: [],
    promises: [],
    snapshots: [],
    log: [{ year: startYear, turn: 0, text: `${politician.name} enters public life.` }],
    modifiers: { ...DEFAULT_MODIFIERS, ...config.modifiers },
    startYear,
    artifacts: [],
    ...(config.careerYears ? { careerYears: config.careerYears } : {}),
  };
  // Public servants bring someone from their old job.
  const staffed = politician.backgroundId === 'public_servant' ? grantPerson(base, 'cs_pham') : base;
  const equipped = applyArtifacts(staffed, config.artifacts ?? []);
  // Your first people: a free pack, keep all three.
  return grantPack(equipped, 'people', 'regular', true);
}

export function takeSnapshot(state: GameState): Snapshot {
  return {
    year: state.clock.year,
    turn: state.clock.turn,
    turnsThisYear: state.clock.turnsThisYear,
    age: Math.round(ageOf(state) * 100) / 100,
    funds: state.funds,
    energy: state.energy,
    integrity: state.integrity,
    skills: { ...state.politician.skills },
    affiliation: state.career.affiliation,
    officeId: state.career.office?.officeId,
    raceOfficeId: state.career.race?.officeId,
    poll: state.career.race?.platform.length ? poll(state, state.career.race).decided[0] : undefined,
    approval: averageApproval(state),
    partyStanding: state.career.partyStanding,
    regions: Object.fromEntries(Object.entries(state.regions).map(([id, s]) => [id, { ...s }])),
  };
}

export { initialRegions };
