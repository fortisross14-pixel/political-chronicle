// Parties: platform fit, standing, funds, nominations and primaries (DESIGN §7, §8).
import { getOffice, getRegion, ISSUE_IDS, PARTIES, STATES } from '../data';
import { clamp } from './opinion';
import type { Rng } from './rng';
import { monthsFactor } from './time';
import type { GameState, IssueId, OfficeId, OfficeLevel, PartyId, PlatformPlank, StateId } from './types';

export const PARTY = {
  /** Share of the national platform in the effective one; the rest is the state chapter. */
  nationalShare: 0.7,
  joinBase: 20,
  joinPerAlignment: 40,
  switchBase: 10,
  switchPerAlignment: 30,
  switchIntegrity: -10,
  /** Standing per applied card tag: × weight × agreement (−1..+1). */
  perTag: 1.5,
  /** Whip votes count this many times over. */
  priorityMultiplier: 3,
  /** Rejecting a whip card the party wanted applied. */
  priorityRejected: -4,
  wonRace: 8,
  wonMayor: 3,
  lostRace: -5,
  /** Primaries are this many standing points below the nomination threshold. */
  primaryWindow: 25,
};

/** Party money per 3 months by the level you're running for or serving at. */
export const PARTY_FUNDS_BASE: Record<OfficeLevel, number> = { mayor: 3000, house: 8000, senate: 20000, governor: 20000 };

export function homeStateId(state: GameState): StateId {
  return getRegion(state.politician.birthRegionId).state;
}

/** 70% national platform, 30% state chapter (where the chapter has a position). */
export function effectivePlatform(party: PartyId, stateId: StateId): Record<IssueId, PlatformPlank> {
  const national = PARTIES[party].platform;
  const chapter = STATES[stateId]?.chapterPlatform[party] ?? {};
  return Object.fromEntries(
    ISSUE_IDS.map((id) => {
      const local = chapter[id];
      const position = local === undefined ? national[id].position : PARTY.nationalShare * national[id].position + (1 - PARTY.nationalShare) * local;
      return [id, { position, weight: national[id].weight }];
    }),
  ) as Record<IssueId, PlatformPlank>;
}

/** 1 − Σ w·|record − platform| / (4 Σ w), over issues in your record. 0.5 with no record. */
export function partyAlignment(state: GameState, party: PartyId): number {
  const platform = effectivePlatform(party, homeStateId(state));
  let num = 0;
  let den = 0;
  for (const [issue, value] of Object.entries(state.record) as [IssueId, number][]) {
    const plank = platform[issue];
    num += plank.weight * Math.abs(value - plank.position);
    den += plank.weight;
  }
  return den === 0 ? 0.5 : 1 - num / (4 * den);
}

/** −1..+1: how much the party likes this stance on this issue. */
export function stanceAgreement(state: GameState, party: PartyId, issue: IssueId, stance: number): number {
  return clamp(1 - Math.abs(stance - effectivePlatform(party, homeStateId(state))[issue].position) / 2, -1, 1);
}

export function negotiationMultiplier(state: GameState): number {
  return 0.8 + 0.05 * state.politician.skills.negotiation;
}

/** Applies a standing change; gains scale with Negotiation. */
export function adjustStanding(state: GameState, delta: number): GameState {
  if (state.career.affiliation === 'IND' || state.career.partyStanding === undefined) return state;
  const scaled = delta > 0 ? delta * negotiationMultiplier(state) : delta;
  return { ...state, career: { ...state.career, partyStanding: clamp(state.career.partyStanding + scaled, 0, 100) } };
}

export function member(state: GameState): PartyId | undefined {
  return state.career.affiliation === 'IND' ? undefined : state.career.affiliation;
}

// ---------- Joining ----------

export interface Invitation {
  party: PartyId;
  alignment: number;
  startingStanding: number;
  switching: boolean;
}

/** Parties notice you once you've run for office. */
export function invitations(state: GameState): Invitation[] {
  if (state.ended || !state.elections.length) return [];
  return (Object.keys(PARTIES) as PartyId[])
    .filter((p) => p !== state.career.affiliation)
    .map((party) => {
      const alignment = partyAlignment(state, party);
      const switching = state.career.affiliation !== 'IND';
      const startingStanding = Math.round(
        switching ? PARTY.switchBase + PARTY.switchPerAlignment * alignment : PARTY.joinBase + PARTY.joinPerAlignment * alignment,
      );
      return { party, alignment, startingStanding, switching };
    });
}

export function joinError(state: GameState, party: PartyId): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.career.affiliation === party) return 'You are already a member.';
  if (!state.elections.length) return 'Parties notice you once you’ve run for office.';
  if (state.career.race && getOffice(state.career.race.officeId).partisan) return 'You can’t change parties in the middle of a partisan race.';
  return undefined;
}

export function joinParty(state: GameState, party: PartyId): GameState {
  const error = joinError(state, party);
  if (error) throw new Error(error);
  const inv = invitations(state).find((i) => i.party === party)!;
  const text = inv.switching
    ? `Switched to the ${PARTIES[party].name}. Old allies call it betrayal.`
    : `Joined the ${PARTIES[party].name} (the ${PARTIES[party].nickname}).`;
  return {
    ...state,
    integrity: inv.switching ? clamp(state.integrity + PARTY.switchIntegrity, 0, 100) : state.integrity,
    career: { ...state.career, affiliation: party, partyStanding: inv.startingStanding },
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }],
  };
}

// ---------- Money ----------

export function partyFunds(state: GameState, competitiveness: number): number {
  const party = member(state);
  if (!party) return 0;
  const id = state.career.race?.officeId ?? state.career.office?.officeId;
  if (!id) return 0;
  const level = getOffice(id).level;
  const alignment = partyAlignment(state, party);
  const amount = PARTY_FUNDS_BASE[level] * ((state.career.partyStanding ?? 0) / 100) * alignment ** 2 * competitiveness * monthsFactor(state.clock);
  return Math.round(amount / 100) * 100;
}

// ---------- Nominations ----------

export type NominationKind = 'nonpartisan' | 'independent' | 'nominee' | 'primary' | 'denied';

export interface NominationStatus {
  kind: NominationKind;
  required?: number;
  standing?: number;
  text: string;
}

export function nominationStatus(state: GameState, officeId: OfficeId): NominationStatus {
  const office = getOffice(officeId);
  if (!office.partisan) return { kind: 'nonpartisan', text: 'Nonpartisan race — open to anyone.' };
  const party = member(state);
  if (!party) return { kind: 'independent', text: 'Run as an independent: no party money and a penalty with voters.' };
  const required = office.nominationStanding ?? 50;
  const standing = Math.round(state.career.partyStanding ?? 0);
  if (standing >= required) return { kind: 'nominee', required, standing, text: `The ${PARTIES[party].nickname} will back you (standing ${standing} ≥ ${required}).` };
  if (standing >= required - PARTY.primaryWindow)
    return { kind: 'primary', required, standing, text: `You’ll have to win a primary first (standing ${standing}, ${required} for an uncontested nomination).` };
  return { kind: 'denied', required, standing, text: `The party won’t let you on its ballot (standing ${standing}; primaries need ${required - PARTY.primaryWindow}).` };
}

// ---------- Primaries ----------

export const PRIMARY = {
  alignment: 4,
  standing: 2,
  recognition: 1.5,
  favorability: 1.2,
  noise: 0.04,
  challengerAlignment: 0.72,
  challengerAlignmentSpread: 0.12,
  challengerRecognition: 0.3,
};

/** Your expected share of the primary vote among party voters. */
export function primaryShare(state: GameState): number {
  const race = state.career.race!;
  const primary = race.primary!;
  const office = getOffice(race.officeId);
  const weights = office.regionIds.map((id) => getRegion(id).population * getRegion(id).turnout);
  const total = weights.reduce((a, b) => a + b, 0);
  let R = 0;
  let F = 0;
  office.regionIds.forEach((id, i) => {
    R += (state.regions[id]!.recognition * weights[i]!) / total;
    F += (state.regions[id]!.favorability * weights[i]!) / total;
  });
  const x =
    PRIMARY.alignment * (partyAlignment(state, primary.party) - primary.challengerAlignment) +
    (PRIMARY.standing * ((state.career.partyStanding ?? 0) - 50)) / 50 +
    PRIMARY.recognition * (R - primary.challengerRecognition) +
    PRIMARY.favorability * F;
  return 1 / (1 + Math.exp(-x));
}

export function newPrimary(rng: Rng, party: PartyId, challenger: string): NonNullable<GameState['career']['race']>['primary'] {
  return {
    party,
    challenger,
    challengerAlignment: clamp(PRIMARY.challengerAlignment + (rng.float() - 0.5) * PRIMARY.challengerAlignmentSpread * 2, 0.4, 0.95),
    challengerRecognition: PRIMARY.challengerRecognition + rng.float() * 0.15,
  };
}
