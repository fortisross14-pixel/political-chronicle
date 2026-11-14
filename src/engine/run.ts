import { getBackground, getOffice, getRegion, OFFICES } from '../data';
import { fileRace } from './campaign';
import { dealMarket } from './economy';
import { averageApproval } from './governing';
import { poll } from './opinion';
import { Rng, seedFromString } from './rng';
import { rollChambers } from './legislature';
import { emptyTeam, grantPerson } from './people';
import { initialRegions } from './traits';
import { nextElectionYear, turnsInYear } from './time';
import type { Career, GameState, Politician, RegionId, Skills, Snapshot } from './types';

export const SCHEMA_VERSION = 8;
export const MAX_AGE_ENDS_RUN = 85;
export const DEFAULT_START_YEAR = 2027;

export const STARTING_INTEGRITY = 60;

export interface NewRunConfig {
  seed: string;
  politician: Politician;
  startingFunds: number;
  /** Earliest calendar year the run may start. The run starts in the first race's election year. */
  earliestYear?: number;
  /** First race to file for. Defaults to the hometown's mayoralty, if there is one. */
  raceOfficeId?: string;
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
  return OFFICES.find((o) => o.level === 'mayor' && o.regionIds.includes(regionId))?.id;
}


export function createRun(config: NewRunConfig): GameState {
  const { politician } = config;
  getRegion(politician.residentRegionId); // validates birthplace
  const earliest = config.earliestYear ?? DEFAULT_START_YEAR;
  const raceOfficeId = config.raceOfficeId ?? hometownMayoralty(politician.residentRegionId);
  // Start in the first race's election year, so the career opens with a campaign.
  const startYear = raceOfficeId ? nextElectionYear(getOffice(raceOfficeId), earliest) : earliest;

  const career: Career = { affiliation: 'IND', lossStreak: 0 };
  const base: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId: `run-${config.seed}`,
    rng: seedFromString(config.seed),
    clock: { year: startYear, turn: 0, turnsThisYear: turnsInYear(career, startYear), monthsElapsed: 0 },
    politician: { ...politician, skills: { ...politician.skills } },
    career,
    funds: config.startingFunds,
    energy: Math.max(1, energyForAge(politician.startAge) - (getBackground(politician.backgroundId).perks.energyPenalty?.amount ?? 0)),
    integrity: getBackground(politician.backgroundId).perks.startingIntegrity ?? STARTING_INTEGRITY,
    regions: initialRegions(politician),
    record: {},
    hand: [],
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
  };
  // Public servants bring someone from their old job.
  const staffed = politician.backgroundId === 'public_servant' ? grantPerson(base, 'cs_pham') : base;
  return dealMarket(raceOfficeId ? fileRace(staffed, raceOfficeId) : staffed);
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
