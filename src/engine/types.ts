// Core game types. The engine is pure TypeScript: no React, no DOM.

// ---------- Static world data ----------

export type IssueId =
  | 'taxes'
  | 'min_wage'
  | 'healthcare'
  | 'guns'
  | 'abortion'
  | 'lgbtq'
  | 'immigration'
  | 'climate'
  | 'industry'
  | 'policing'
  | 'education'
  | 'housing'
  | 'transit'
  | 'labor'
  | 'cannabis'
  | 'small_biz';

/** How relevant an issue is to a mayor. Every issue is fully relevant above mayor. */
export type MayorRelevance = 'full' | 'partial' | 'none';

export interface Issue {
  id: IssueId;
  name: string;
  /** Label of the −2 pole. */
  negLabel: string;
  /** Label of the +2 pole. */
  posLabel: string;
  mayorRelevance: MayorRelevance;
}

/** A position on an issue axis, −2 .. +2. */
export type Stance = number;

export type MediaChannel = 'tv' | 'cable' | 'social' | 'inPerson' | 'radio';

export type RegionType = 'urban' | 'suburban' | 'midsize' | 'rural';

export type RegionId = string;
export type StateId = string;
export type OfficeId = string;
export type PartyId = 'DU' | 'RP';
export type Affiliation = PartyId | 'IND';

export interface Region {
  id: RegionId;
  state: StateId;
  name: string;
  seatCity: string;
  type: RegionType;
  population: number;
  /** 0..1 */
  turnout: number;
  /** −1 strong DU (blue) .. +1 strong RP (red). */
  partisanLean: number;
  /** Average stance of the region's voters, −2..+2. */
  issueOpinion: Record<IssueId, Stance>;
  /** How much voters care, 0..1. */
  issueSalience: Record<IssueId, number>;
  /** Effectiveness multiplier per medium, 0.5..1.5. */
  media: Record<MediaChannel, number>;
  /** One-line flavour shown in the region panel. */
  blurb: string;
}

export interface UsState {
  id: StateId;
  name: string;
  regionIds: RegionId[];
  /** State party chapters: per-issue positions that blend 30% into the national platform. */
  chapterPlatform: Record<PartyId, Partial<Record<IssueId, Stance>>>;
}

export interface PlatformPlank {
  position: Stance;
  /** Priority weight, 0..1. */
  weight: number;
}

export interface Party {
  id: PartyId;
  name: string;
  nickname: string;
  mascot: string;
  color: string;
  platform: Record<IssueId, PlatformPlank>;
}

export type OfficeLevel = 'mayor' | 'house' | 'senate' | 'governor';

export interface Office {
  id: OfficeId;
  level: OfficeLevel;
  name: string;
  state: StateId;
  /** Regions whose voters elect this office. */
  regionIds: RegionId[];
  termYears: number;
  /** Elections happen in years where `year % every === offset`. */
  cycle: { every: number; offset: number };
  partisan: boolean;
  /** Party standing needed for an uncontested nomination (partisan offices). */
  nominationStanding?: number;
}

// ---------- Politician ----------

export type SkillId =
  | 'oratory'
  | 'charisma'
  | 'media'
  | 'digital'
  | 'policy'
  | 'negotiation'
  | 'fundraising';

export type Skills = Record<SkillId, number>;

export type Gender = 'female' | 'male' | 'nonbinary';

export interface Politician {
  name: string;
  gender: Gender;
  /** Age when the run started; current age is derived from elapsed months. */
  startAge: number;
  birthRegionId: RegionId;
  backgroundId: string;
  skills: Skills;
}

// ---------- Run state ----------

export interface RegionStanding {
  /** Share of voters who know you, 0..1. */
  recognition: number;
  /** Net opinion among those who know you, −1..1. */
  favorability: number;
}

export interface Clock {
  year: number;
  /** 0-based turn within the year. */
  turn: number;
  /** 3 in a normal year, 4 in an election year. Fixed at the start of each year. */
  turnsThisYear: number;
  /** Months elapsed since the run started. Drives aging. */
  monthsElapsed: number;
}

export interface Race {
  officeId: OfficeId;
  electionYear: number;
}

export interface Career {
  affiliation: Affiliation;
  /** Office currently held, if any. */
  office?: { officeId: OfficeId; termEndsYear: number };
  /** Race the player is currently running in, if any. */
  race?: Race;
}

export interface Snapshot {
  year: number;
  turn: number;
  turnsThisYear: number;
  age: number;
  funds: number;
  energy: number;
  integrity: number;
  skills: Skills;
  affiliation: Affiliation;
  officeId?: OfficeId;
  raceOfficeId?: OfficeId;
  partyStanding?: number;
  regions: Record<RegionId, RegionStanding>;
}

export interface LogEntry {
  year: number;
  turn: number;
  text: string;
}

export interface GameState {
  schemaVersion: number;
  runId: string;
  /** Seeded RNG state; every random draw goes through it so runs are reproducible. */
  rng: number;
  clock: Clock;
  politician: Politician;
  career: Career;
  funds: number;
  energy: number;
  integrity: number;
  regions: Record<RegionId, RegionStanding>;
  snapshots: Snapshot[];
  log: LogEntry[];
}

export type Action = { type: 'END_TURN' };
