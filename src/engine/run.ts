import { getOffice, getRegion, OFFICES, REGIONS } from '../data';
import { seedFromString } from './rng';
import { nextElectionYear, turnsInYear } from './time';
import type { Career, GameState, Politician, RegionId, RegionStanding, Skills, Snapshot } from './types';

export const SCHEMA_VERSION = 1;
export const DEFAULT_START_YEAR = 2027;

export const BASE_RECOGNITION = 0.05;
export const HOMETOWN_RECOGNITION = 0.3;
export const HOMETOWN_FAVORABILITY = 0.1;
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
  return { oratory: 3, charisma: 3, media: 3, digital: 3, policy: 3, negotiation: 3, fundraising: 3 };
}

/** Placeholder politician until the character creator lands (M2). */
export function defaultPolitician(): Politician {
  return {
    name: 'Jordan Hale',
    gender: 'nonbinary',
    startAge: 32,
    birthRegionId: 'ny-north',
    backgroundId: 'teacher',
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

export function initialRegions(birthRegionId: RegionId): Record<RegionId, RegionStanding> {
  return Object.fromEntries(
    REGIONS.map((r) => [
      r.id,
      r.id === birthRegionId
        ? { recognition: HOMETOWN_RECOGNITION, favorability: HOMETOWN_FAVORABILITY }
        : { recognition: BASE_RECOGNITION, favorability: 0 },
    ]),
  );
}

export function createRun(config: NewRunConfig): GameState {
  const { politician } = config;
  getRegion(politician.birthRegionId); // validates birthplace
  const earliest = config.earliestYear ?? DEFAULT_START_YEAR;

  const raceOfficeId = config.raceOfficeId ?? hometownMayoralty(politician.birthRegionId);
  const career: Career = { affiliation: 'IND' };
  let startYear = earliest;
  if (raceOfficeId) {
    startYear = nextElectionYear(getOffice(raceOfficeId), earliest);
    career.race = { officeId: raceOfficeId, electionYear: startYear };
  }

  const clock = { year: startYear, turn: 0, turnsThisYear: turnsInYear(career, startYear), monthsElapsed: 0 };
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId: `run-${config.seed}`,
    rng: seedFromString(config.seed),
    clock,
    politician: { ...politician, skills: { ...politician.skills } },
    career,
    funds: config.startingFunds,
    energy: energyForAge(politician.startAge),
    integrity: STARTING_INTEGRITY,
    regions: initialRegions(politician.birthRegionId),
    snapshots: [],
    log: [],
  };
  return {
    ...state,
    log: [{ year: clock.year, turn: 0, text: raceOfficeId ? `Filed as an independent for ${getOffice(raceOfficeId).name}.` : 'Started a new career.' }],
  };
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
    regions: Object.fromEntries(Object.entries(state.regions).map(([id, s]) => [id, { ...s }])),
  };
}
