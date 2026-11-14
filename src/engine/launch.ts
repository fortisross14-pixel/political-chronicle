// Launching a campaign (DESIGN_V2 §2): pick the race, a campaign manager, up to 5 topics and how
// much of your own money goes in. Campaigns open 7 turns before Election Day and close at 4.
import { trailPoint } from './trail';
import { reject } from './errors';
import { getOffice, getRegion, OFFICES, PARTIES } from '../data';
import { fileRace, MAX_PLATFORM, setPlatform } from './campaign';
import { grantPack } from './packs';
import { joinParty, nominationStatus, partyAlignment } from './parties';
import { assignPerson, ROLE_EFFECT, roleStars } from './people';
import { clamp, nudgeFavorability, regionWeights } from './opinion';
import { onScale, positionOf } from './stance';
import { nextElectionYear } from './time';
import { Rng } from './rng';
import type { Action, GameState, OfficeId, OfficeLevel, PartyId, Pledge } from './types';

export const WINDOW = { opens: 7, closes: 4 };
/** Turns in a year before the election year, and in the election year itself. */
const NORMAL_TURNS = 3;
const ELECTION_TURNS = 4;

export interface CampaignWindow {
  electionYear: number;
  /** Turns from now until Election Day, this turn included. */
  turnsLeft: number;
  open: boolean;
  /** Turns until the window opens (0 when open). */
  opensIn: number;
}

function turnsUntil(state: GameState, electionYear: number): number {
  const { year, turn, turnsThisYear } = state.clock;
  if (electionYear === year) return turn === 0 ? ELECTION_TURNS : turnsThisYear - turn;
  return turnsThisYear - turn + NORMAL_TURNS * (electionYear - year - 1) + ELECTION_TURNS;
}

/** When you could launch for this office: the next election you can still make. */
export function campaignWindow(state: GameState, officeId: OfficeId): CampaignWindow {
  const office = getOffice(officeId);
  let electionYear = nextElectionYear(office, state.clock.year);
  let turnsLeft = turnsUntil(state, electionYear);
  if (turnsLeft < WINDOW.closes) {
    electionYear = nextElectionYear(office, electionYear + 1);
    turnsLeft = turnsUntil(state, electionYear);
  }
  const open = turnsLeft <= WINDOW.opens && turnsLeft >= WINDOW.closes;
  return { electionYear, turnsLeft, open, opensIn: open ? 0 : turnsLeft - WINDOW.opens };
}

export type RaceStatus = 'open' | 'later' | 'locked';

export interface RaceSlot {
  officeId: OfficeId;
  window: CampaignWindow;
  status: RaceStatus;
  reason?: string;
}

const STATEWIDE: OfficeLevel[] = ['senate', 'governor'];
/** Statewide races need an office behind you, or this much statewide recognition. */
export const STATEWIDE_REACH = 0.35;

function statewideRecognition(state: GameState, officeId: OfficeId): number {
  const w = regionWeights(officeId);
  return Object.entries(w).reduce((s, [id, x]) => s + x * state.regions[id]!.recognition, 0);
}

/** Every race in your state, with whether you can launch for it now. */
export function raceBoard(state: GameState): RaceSlot[] {
  const homeState = getRegion(state.politician.residentRegionId).state;
  const held = state.career.office;
  return OFFICES.filter((o) => o.state === homeState).map((office) => {
    const window = campaignWindow(state, office.id);
    const slot: RaceSlot = { officeId: office.id, window, status: window.open ? 'open' : 'later' };
    const lock = (reason: string) => Object.assign(slot, { status: 'locked' as const, reason });
    if (state.career.race) return lock('You are already running.');
    if (held && held.officeId !== office.id && !office.partisan) return lock('Not while you hold another office.');
    if (STATEWIDE.includes(office.level) && !held && !state.elections.some((e) => e.playerWon)) {
      if (statewideRecognition(state, office.id) < STATEWIDE_REACH)
        return lock('Out of reach: win an office first, or get known statewide.');
    }
    const nomination = nominationStatus(state, office.id);
    if (nomination.kind === 'denied') return lock(nomination.text);
    return slot;
  });
}

// ---------- Platform rules ----------

/**
 * Your first platform is free. After that, each campaign may drop one topic, add topics up to
 * five, and move one existing topic by one step.
 */
export function platformError(state: GameState, platform: Pledge[]): string | undefined {
  if (platform.length < 1) return 'Choose at least one topic.';
  if (platform.length > MAX_PLATFORM) return `Choose at most ${MAX_PLATFORM} topics.`;
  if (new Set(platform.map((p) => p.issue)).size !== platform.length) return 'Each topic can be chosen once.';
  if (platform.some((p) => !onScale(p.stance))) return 'Pick a position on every topic.';
  const prev = state.career.platform;
  if (!prev?.length) return undefined;
  const dropped = prev.filter((p) => !platform.some((q) => q.issue === p.issue));
  if (dropped.length > 1) return 'You can drop only one topic from your last platform.';
  const moved = platform.filter((q) => {
    const old = prev.find((p) => p.issue === q.issue);
    return old && positionOf(old.stance) !== positionOf(q.stance);
  });
  if (moved.length > 1) return 'You can change only one existing position.';
  const m = moved[0];
  if (m && Math.abs(positionOf(m.stance) - positionOf(prev.find((p) => p.issue === m.issue)!.stance)) > 1)
    return 'A position can move only one step per campaign.';
  return undefined;
}

// ---------- Self-donation ----------

/** What voters consider a normal amount to put into your own race. Above it, they grumble. */
export function donationNorm(officeId: OfficeId): number {
  const office = getOffice(officeId);
  if (office.level === 'senate' || office.level === 'governor') return 5_000_000;
  if (office.level === 'house') return 500_000;
  const type = getRegion(office.regionIds[0]!).type;
  return type === 'urban' ? 1_000_000 : type === 'suburban' ? 300_000 : type === 'midsize' ? 150_000 : 100_000;
}

/** Favorability lost in the race for self-funding past the norm (0 up to it, at most 0.12). */
export function selfFundingPenalty(officeId: OfficeId, donation: number): number {
  const norm = donationNorm(officeId);
  return donation <= norm ? 0 : Math.min(0.12, 0.04 * Math.log2(donation / norm));
}

// ---------- Launch ----------

type LaunchAction = Extract<Action, { type: 'LAUNCH_CAMPAIGN' }>;

export function launchError(state: GameState, a: Omit<LaunchAction, 'type'>): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.packs.length) return 'Open your pack first.';
  if (state.pendingResult !== undefined) return 'Review the last election first.';
  const slot = raceBoard(state).find((s) => s.officeId === a.officeId);
  if (!slot) return 'That office isn’t on the ballot here.';
  if (slot.status === 'locked') return slot.reason;
  if (slot.status === 'later') return `Campaigns for this race open in ${slot.window.opensIn} turn${slot.window.opensIn === 1 ? '' : 's'}.`;
  if (!Number.isFinite(a.donation) || a.donation < 0) return 'Donate zero or more.';
  if (a.donation > state.wealth) return 'You don’t have that much.';
  if (a.managerUid !== undefined && !state.team.cards.some((c) => c.uid === a.managerUid)) return 'Pick a manager from your roster.';
  return platformError(state, a.platform);
}

export function launchCampaign(state: GameState, a: Omit<LaunchAction, 'type'>): GameState {
  reject(launchError(state, a));
  const window = campaignWindow(state, a.officeId);
  const donation = Math.round(a.donation);
  let s: GameState = a.managerUid !== undefined ? assignPerson(state, a.managerUid, 'campaignManager') : state;
  s = { ...s, wealth: s.wealth - donation, funds: s.funds + donation };
  s = fileRace(s, a.officeId, window.electionYear, window.turnsLeft);
  s = setPlatform(s, a.platform);
  // The race's trail starts here: turn one's starting point.
  s = { ...s, career: { ...s.career, race: { ...s.career.race!, trail: [trailPoint(s, a.officeId, true)] } } };
  const penalty = selfFundingPenalty(a.officeId, donation);
  const regions = { ...s.regions };
  if (penalty > 0)
    for (const id of getOffice(a.officeId).regionIds)
      regions[id] = { ...regions[id]!, favorability: nudgeFavorability(regions[id]!.favorability, -penalty) };
  const race = { ...s.career.race!, selfFunded: donation, launchedWith: window.turnsLeft };
  s = {
    ...s,
    regions,
    career: { ...s.career, race, platform: a.platform.map((p) => ({ ...p })) },
    log: [
      ...s.log,
      ...(donation
        ? [
            {
              year: s.clock.year,
              turn: s.clock.turn,
              text: `You put $${donation.toLocaleString('en-US')} of your own money in.${penalty > 0 ? ' Voters grumble that you are buying the race.' : ''}`,
            },
          ]
        : []),
    ],
  };
  // Launch packs: one campaign action and one political event, free.
  return grantPack(grantPack(s, 'campaign', 'regular', true), 'policy', 'regular', true);
}

// ---------- Asking a party ----------

export const JOIN = { base: 0.15, perAlignment: 0.6, switching: -0.2, inOffice: 0.3, wonBefore: 0.05, min: 0.05, max: 0.97 };

/** Your record, with a draft platform folded in (what the party sees when you ask). */
function recordWith(state: GameState, platform?: Pledge[]): GameState {
  if (!platform?.length) return state;
  const record = { ...state.record };
  for (const p of platform) record[p.issue] = record[p.issue] === undefined ? p.stance : (record[p.issue]! + p.stance) / 2;
  return { ...state, record };
}

/** Chance a party says yes. Elected officials are almost always welcome. */
export function joinChance(state: GameState, party: PartyId, platform?: Pledge[]): number {
  const alignment = partyAlignment(recordWith(state, platform), party);
  const switching = state.career.affiliation !== 'IND';
  return clamp(
    JOIN.base +
      JOIN.perAlignment * alignment +
      (switching ? JOIN.switching : 0) +
      (state.career.office ? JOIN.inOffice : 0) +
      (state.elections.some((e) => e.playerWon) ? JOIN.wonBefore : 0) +
      ROLE_EFFECT.joinPerStar * roleStars(state, 'partyLiaison'),
    JOIN.min,
    JOIN.max,
  );
}

export function askError(state: GameState, party: PartyId): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.career.affiliation === party) return 'You are already a member.';
  if (state.career.race && getOffice(state.career.race.officeId).partisan) return 'Not in the middle of a partisan race.';
  if (state.career.joinAsked?.[party] === state.clock.year) return `The ${PARTIES[party].nickname} said no this year. Ask again next year.`;
  return undefined;
}

export function askToJoin(state: GameState, party: PartyId, platform?: Pledge[]): GameState {
  reject(askError(state, party));
  const rng = new Rng(state.rng);
  const yes = rng.chance(joinChance(state, party, platform));
  const asked = {
    ...state,
    rng: rng.state,
    career: { ...state.career, joinAsked: { ...state.career.joinAsked, [party]: state.clock.year } },
  };
  if (yes) return joinParty(asked, party);
  return {
    ...asked,
    log: [
      ...asked.log,
      { year: state.clock.year, turn: state.clock.turn, text: `The ${PARTIES[party].name} turned you down. Try again next year.` },
    ],
  };
}
