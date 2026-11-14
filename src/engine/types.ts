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

/** A position on an issue axis, −2 .. +2. Player platforms use 7 steps of 2/3 (see stance.ts). */
export type Stance = number;

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PackKind = 'people' | 'policy' | 'campaign';
export type PackTier = 'regular' | 'golden' | 'elite';

/** A pack waiting to be opened: its cards are drawn, the player keeps one (or any, for people). */
export interface OpenPack {
  kind: PackKind;
  tier: PackTier;
  /** Person ids, political event ids, or campaign action ids ("item:" prefix for items). */
  cards: string[];
  /** Free packs: the starter people pack and the two dealt at launch. */
  free?: boolean;
}

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

export type SkillId = 'charisma' | 'economics' | 'diplomacy' | 'strategy' | 'administration' | 'leadership' | 'law';

export type Skills = Record<SkillId, number>;

export type Gender = 'female' | 'male' | 'nonbinary';

export interface Politician {
  name: string;
  gender: Gender;
  /** Age when the run started; current age is derived from elapsed months. */
  startAge: number;
  /** USPS code of the state you were born in: any of the 50. */
  homeState: string;
  /** Where your career happens: a region of a playable state (your city). */
  residentRegionId: RegionId;
  backgroundId: string;
  skills: Skills;
  /** Special abilities earned in missions (Sandbox loadout). */
  abilities?: string[];
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
  /** A party primary you must win first (DESIGN §7). Decided at the end of the election year's first turn. */
  primary?: Primary;
  /** Running as your party's nominee (vs an independent run). */
  nominee?: PartyId;
  /** Ground-game tokens for election night (DESIGN_V2 §5). */
  tokens: number;
  /** Loot milestones already earned this race. */
  milestones: string[];
  doorKnocks: number;
  /** Money raised by fundraising events this turn (for the "haul" milestone). */
  raisedThisTurn: number;
  /** Once-per-campaign effects already used (abilities, artifacts). */
  used?: string[];
  /** Personal money put into this campaign. */
  selfFunded?: number;
  /** Turns left until Election Day when you launched (7 at the earliest, 4 at the latest). */
  launchedWith?: number;
}

export type ItemWindow = 'campaign' | 'night' | 'both';

export interface ItemCard {
  uid: number;
  itemId: string;
}

/** One region's count on election night. */
export interface NightRegion {
  /** True final player share (decided vote), before night actions. Hidden from the player. */
  trueShares: number[];
  /** Pre-election poll share for the player (the prior the needle starts from). */
  prior: number;
  /** Early-count skew: reported share differs by this × (1 − counted). Hidden. */
  skew: number;
  /** Step at which polls close here. */
  closeStep: number;
  /** Steps it takes to count everything after closing. */
  countSteps: number;
  /** Player share points added by night actions (applied to the uncounted part). */
  boost: number;
  /** Lawyers protect against a bad final draw here. */
  protected: boolean;
  calledFor?: number;
}

export interface ElectionNight {
  officeId: OfficeId;
  year: number;
  step: number;
  steps: number;
  regions: Record<RegionId, NightRegion>;
  tokens: number;
  /** Statewide late-ad nudge (share points on the uncounted vote). */
  statewideBoost: number;
  adBought: boolean;
  /** Late-surge points (legendary card), outside the night-action cap. */
  surge?: number;
  calledFor?: number;
  finalPoll: number;
  /** Things that happened, for the ticker. */
  ticker: string[];
}

export interface Primary {
  party: PartyId;
  challenger: string;
  /** How close the challenger is to the party platform, 0..1. */
  challengerAlignment: number;
  challengerRecognition: number;
}

export interface OfficeTerm {
  officeId: OfficeId;
  /** Year of the election that ends this term. */
  termEndsYear: number;
  /** Job approval per region of the jurisdiction, 0..1. */
  approval: Record<RegionId, number>;
  /** The platform you won on: what your promises are judged against. */
  platform: Pledge[];
  startedYear: number;
}

export interface PromiseEvent {
  year: number;
  turn: number;
  title: string;
  issue: IssueId;
  kept: boolean;
}

export interface Career {
  affiliation: Affiliation;
  /** Office currently held, if any. */
  office?: OfficeTerm;
  /** Race the player is currently running in, if any. */
  race?: Race;
  /** Elections lost in a row while out of office. */
  lossStreak: number;
  /** Relationship with your party, 0..100 (members only). */
  partyStanding?: number;
  /** Your platform from your last campaign: the next one can only change it a little. */
  platform?: Pledge[];
  /** Year you last asked each party to take you; one ask per party per year. */
  joinAsked?: Partial<Record<PartyId, number>>;
}

// ---------- Cards ----------

export interface EventCard {
  id: string;
  name: string;
  /** Pack rarity; basic cards have none. */
  rarity?: Rarity;
  /** Persuasion ×1.4 on these topics. */
  issueBonus?: IssueId[];
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
  /** Raises party standing by this × the Negotiation multiplier. Members only. */
  partyStanding?: number;
  requiresParty?: boolean;
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
  /** A whip vote: the party expects members to apply it (or reject it, if its stance opposes the platform). */
  partyPriority?: PartyId;
  effects?: { funds?: number; integrity?: number };
}

export interface DecisionHand {
  /** Global turn number the hand was dealt for. */
  turnNo: number;
  cardIds: string[];
  resolved: boolean;
  applied: string[];
  /** Applied bills that failed to pass the legislature. */
  failed?: string[];
}

export type RoleId = 'campaignManager' | 'chiefOfStaff' | 'partyLiaison' | 'legislativeDirector';

export interface TeamCard {
  uid: number;
  personId: string;
}

export interface Team {
  /** Everyone you hold, assigned or in reserve ("back pocket"). */
  cards: TeamCard[];
  assigned: Partial<Record<RoleId, number>>;
  nextUid: number;
}

export type ChamberControl = PartyId | 'split';

export interface Chambers {
  /** State legislatures, by state. */
  state: Record<StateId, ChamberControl>;
  congress: ChamberControl;
  rolledYear: number;
}

export interface IncomeBreakdown {
  donors: number;
  salary: number;
  party: number;
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
  kind: 'general' | 'primary';
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
  /** Average job approval across the jurisdiction, if in office. */
  approval?: number;
  partyStanding?: number;
  regions: Record<RegionId, RegionStanding>;
}

// ---------- The world: who holds what, and every result ----------

export interface Seat {
  holder: string;
  affiliation: Affiliation;
  /** Year the holder last won. */
  since: number;
  isPlayer?: boolean;
}

export interface WorldResult {
  officeId: OfficeId;
  year: number;
  winner: string;
  winnerAffiliation: Affiliation;
  share: number;
  runnerUp: string;
  runnerUpAffiliation: Affiliation;
  playerRan: boolean;
  playerWon: boolean;
}

export interface World {
  seats: Record<OfficeId, Seat>;
  results: WorldResult[];
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

export interface RunModifiers {
  /** Multiplier on every opponent's starting recognition. */
  opponentRecognition: number;
  /** Extra ground-game tokens at the start of each campaign. */
  extraTokens: number;
  /** Your first debate of each campaign can't go wrong. */
  safeFirstDebate: boolean;
  /** Extra campaign events per turn for every opponent (scenario difficulty, Sandbox difficulty). */
  opponentActivity?: number;
}

export interface ScenarioRun {
  id: string;
  startYear: number;
  result?: { won: boolean; stars: string[]; year: number; reason: string };
}

export interface GameState {
  schemaVersion: number;
  runId: string;
  /** Seeded RNG state; every random draw goes through it so runs are reproducible. */
  rng: number;
  clock: Clock;
  politician: Politician;
  career: Career;
  /** Campaign war chest: what packs, ads and night actions are paid from. */
  funds: number;
  /** Personal money. Goes into a campaign only as a self-donation at launch. */
  wealth: number;
  energy: number;
  integrity: number;
  regions: Record<RegionId, RegionStanding>;
  /** Your public record per issue (−2..+2), built from pledges and applied decisions. */
  record: Partial<Record<IssueId, Stance>>;
  /** Campaign actions (event cards); items below are campaign actions too. */
  hand: CardInstance[];
  /** Political events: up to 5, played for their effect. */
  policyHand: CardInstance[];
  /** Packs bought or granted and not opened yet; the first is the one on screen. */
  packs: OpenPack[];
  world: World;
  /** Loot items (one-shot) from campaign milestones and campaign-action packs. */
  items: ItemCard[];
  nextItemUid: number;
  /** Election night in progress. */
  night?: ElectionNight;
  nextCardUid: number;
  decisions?: DecisionHand;
  /** People cards: the roster and who fills each role (DESIGN_V2 §3). From people packs. */
  team: Team;
  /** Who controls each legislature this cycle. */
  chambers: Chambers;
  /** Funds received/paid at the start of the current turn. */
  lastIncome?: IncomeBreakdown;
  /** Recently dealt decision cards, to avoid repeats. */
  recentDecisionIds: string[];
  eventHistory: EventPlay[];
  elections: ElectionRecord[];
  /** Every applied decision that kept or broke a platform promise. */
  promises: PromiseEvent[];
  /** Index into `elections` of a result the player hasn't dismissed yet. */
  pendingResult?: number;
  ended?: { reason: 'retired' | 'losses' | 'age' | 'length' | 'scenario'; year: number };
  /** Run-wide modifiers from artifacts and scenario setups. */
  modifiers: RunModifiers;
  /** Present when this run is a scenario (mission). */
  scenario?: ScenarioRun;
  /** Sandbox: the career ends after this many years. */
  careerYears?: number;
  startYear: number;
  /** Artifacts equipped for this run. */
  artifacts: string[];
  snapshots: Snapshot[];
  log: LogEntry[];
}

export type Action =
  | { type: 'END_TURN' }
  | { type: 'LAUNCH_CAMPAIGN'; officeId: OfficeId; platform: Pledge[]; donation: number; managerUid?: number }
  | { type: 'PLAY_EVENT'; cardUid: number | string; regionId: RegionId; issue: IssueId }
  | { type: 'RESOLVE_DECISIONS'; apply: string[] }
  | { type: 'BUY_PACK'; kind: PackKind; tier: PackTier }
  | { type: 'KEEP_FROM_PACK'; keep: number[] }
  | { type: 'PLAY_POLICY'; uid: number; regionId?: RegionId }
  | { type: 'DISCARD_CARD'; zone: 'policy' | 'campaign' | 'item'; uid: number }
  | { type: 'DISMISS_RESULT' }
  | { type: 'RETIRE' }
  | { type: 'ASK_TO_JOIN'; party: PartyId; platform?: Pledge[] }
  | { type: 'ASSIGN_PERSON'; uid: number; role: RoleId }
  | { type: 'UNASSIGN_ROLE'; role: RoleId }
  | { type: 'DISCARD_PERSON'; uid: number }
  | { type: 'USE_ITEM'; uid: number; regionId?: RegionId }
  | { type: 'NIGHT_ADVANCE' }
  | { type: 'NIGHT_MOBILIZE'; regionId: RegionId }
  | { type: 'NIGHT_LAWYERS'; regionId: RegionId }
  | { type: 'NIGHT_AD_BLITZ' }
  | { type: 'NIGHT_FINISH' };
