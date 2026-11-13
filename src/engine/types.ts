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

/** A platform topic: an issue and the stance you defend on it. */
export interface Pledge {
  issue: IssueId;
  /** −2, −1, +1 or +2. */
  stance: Stance;
}

export interface Candidate {
  id: string;
  name: string;
  affiliation: Affiliation;
  /** −1 Blue-leaning .. +1 Red-leaning; drives party fit even in nonpartisan races. */
  lean: number;
  platform: Pledge[];
  incumbent: boolean;
  /** Campaign events per turn. */
  activity: number;
  regions: Record<RegionId, RegionStanding>;
}

export interface Race {
  officeId: OfficeId;
  electionYear: number;
  /** Empty until the player picks their platform (DESIGN §2: up to 5 topics). */
  platform: Pledge[];
  opponents: Candidate[];
}

export interface Career {
  affiliation: Affiliation;
  /** Office currently held, if any. */
  office?: { officeId: OfficeId; termEndsYear: number };
  /** Race the player is currently running in, if any. */
  race?: Race;
  /** Elections lost in a row while out of office. */
  lossStreak: number;
}

// ---------- Cards ----------

export interface EventCard {
  id: string;
  name: string;
  /** Basic cards are always available and never consumed. */
  basic: boolean;
  cost: number;
  energy: number;
  medium: MediaChannel;
  /** One skill, or several that are averaged (e.g. a debate). */
  skills: SkillId[];
  reach: number;
  persuasion: number;
  /** Share of the effect heard in the state's other regions. */
  spillover: number;
  /** Can go wrong on camera. */
  gaffeRisk: boolean;
  /** Raises funds instead of (or as well as) persuading: Fundraising × this × (0.5 + R). */
  fundraising?: number;
  description: string;
}

export interface CardInstance {
  uid: number;
  cardId: string;
}

export interface DecisionCard {
  id: string;
  title: string;
  text: string;
  context: 'campaign' | 'office';
  levels: OfficeLevel[];
  /** What applying the card means. */
  tags: Pledge[];
  /** Favorability lost in the jurisdiction if you reject it. */
  rejectCost?: number;
  effects?: { funds?: number; integrity?: number };
}

export interface DecisionHand {
  /** Global turn number the hand was dealt for. */
  turnNo: number;
  cardIds: string[];
  resolved: boolean;
  applied: string[];
}

export interface MarketOffer {
  kind: 'event' | 'skill';
  cardId: string;
}

export interface Market {
  turnNo: number;
  offers: MarketOffer[];
}

export interface StaffMember {
  cardId: string;
  skill: SkillId;
  upkeep: number;
}

export interface IncomeBreakdown {
  donors: number;
  salary: number;
  upkeep: number;
  /** Staff who quit because you couldn't pay them. */
  quit: string[];
}

// ---------- Elections ----------

export interface ElectionCandidate {
  name: string;
  isPlayer: boolean;
  affiliation: Affiliation;
  lean: number;
}

export interface ElectionRecord {
  officeId: OfficeId;
  year: number;
  candidates: ElectionCandidate[];
  /** Vote share per candidate (same order), per region. */
  regionShares: Record<RegionId, number[]>;
  totalShares: number[];
  /** Final pre-election poll for the player (share of decided voters). */
  finalPoll: number;
  playerWon: boolean;
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
  /** Player's share of decided voters in the race's jurisdiction, if campaigning. */
  poll?: number;
  partyStanding?: number;
  regions: Record<RegionId, RegionStanding>;
}

export interface LogEntry {
  year: number;
  turn: number;
  text: string;
}

export interface EventPlay {
  turnNo: number;
  regionId: RegionId;
  issue: IssueId;
  /** Fundraisers don't tire voters of a topic, but they do tire donors. */
  fundraiser?: boolean;
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
  /** Your public record per issue (−2..+2), built from pledges and applied decisions. */
  record: Partial<Record<IssueId, Stance>>;
  hand: CardInstance[];
  nextCardUid: number;
  decisions?: DecisionHand;
  market?: Market;
  /** Hired staff from skill cards with upkeep. */
  staff: StaffMember[];
  /** Funds received/paid at the start of the current turn. */
  lastIncome?: IncomeBreakdown;
  /** Recently dealt decision cards, to avoid repeats. */
  recentDecisionIds: string[];
  eventHistory: EventPlay[];
  elections: ElectionRecord[];
  /** Index into `elections` of a result the player hasn't dismissed yet. */
  pendingResult?: number;
  ended?: { reason: 'retired' | 'losses' | 'age'; year: number };
  snapshots: Snapshot[];
  log: LogEntry[];
}

export type Action =
  | { type: 'END_TURN' }
  | { type: 'FILE_RACE'; officeId: OfficeId }
  | { type: 'SET_PLATFORM'; platform: Pledge[] }
  | { type: 'PLAY_EVENT'; cardUid: number | string; regionId: RegionId; issue: IssueId }
  | { type: 'RESOLVE_DECISIONS'; apply: string[] }
  | { type: 'BUY_CARD'; offerIndex: number }
  | { type: 'DISMISS_RESULT' }
  | { type: 'RETIRE' };
