// Public opinion and vote model (DESIGN §5).
import { getOffice, getRegion, ISSUES_BY_ID, MAYOR_RELEVANCE_FACTOR } from '../data';
import type { Affiliation, Candidate, GameState, IssueId, OfficeLevel, Race, RegionId, RegionStanding, SkillId, Skills, Stance } from './types';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Distance (in stance units) at which a message stops helping. */
export const ALIGNMENT_SCALE = 1.5;

/** 1 − |x − o| / 1.5, clamped to −1..+1: +1 is an exact match, 0 is 1.5 points apart. */
export function alignment(stance: Stance, opinion: number): number {
  return clamp(1 - Math.abs(stance - opinion) / ALIGNMENT_SCALE, -1, 1);
}

export function regionAlignment(regionId: RegionId, issue: IssueId, stance: Stance): number {
  return alignment(stance, getRegion(regionId).issueOpinion[issue]);
}

/** How much an issue matters at this level of office (DESIGN §4.4). */
export function relevance(issue: IssueId, level: OfficeLevel): number {
  return level === 'mayor' ? MAYOR_RELEVANCE_FACTOR[ISSUES_BY_ID[issue].mayorRelevance] : 1;
}

/** 0.6 + 0.08 × skill: 1 → 0.68, 5 → 1.0, 10 → 1.4. */
export function skillMult(skills: Skills, ids: SkillId[]): number {
  const avg = ids.reduce((sum, id) => sum + skills[id], 0) / ids.length;
  return 0.6 + 0.08 * avg;
}

/** Moves favorability with diminishing returns toward the extreme it is heading to. */
export function nudgeFavorability(current: number, delta: number): number {
  const headroom = 1 - Math.max(0, current * Math.sign(delta));
  return clamp(current + delta * headroom, -1, 1);
}

export function nudgeRecognition(current: number, gain: number): number {
  return clamp(current + gain * (1 - current), 0, 1);
}

// ---------- Vote model ----------

export const VOTE_WEIGHTS = {
  liked: 1.6,
  known: 0.6,
  incumbent: 0.3,
  /** Party fit matters less in nonpartisan mayoral races. */
  partyNonpartisan: 0.4,
  partyPartisan: 1.2,
  undecided: 0.45,
  temperature: 0.5,
};

const INDEPENDENT_PENALTY: Record<OfficeLevel, number> = { mayor: 0, house: 0.3, senate: 0.5, governor: 0.5 };

export interface VoterView {
  standing: RegionStanding;
  lean: number;
  affiliation: Affiliation;
  incumbent: boolean;
}

export function utility(view: VoterView, regionId: RegionId, level: OfficeLevel, partisan: boolean): number {
  const { recognition: R, favorability: F } = view.standing;
  const w = VOTE_WEIGHTS;
  const partyFit = view.lean * getRegion(regionId).partisanLean;
  const indep = view.affiliation === 'IND' ? INDEPENDENT_PENALTY[level] : 0;
  return (
    w.liked * F * R +
    w.known * R +
    (partisan ? w.partyPartisan : w.partyNonpartisan) * partyFit +
    (view.incumbent ? w.incumbent : 0) -
    indep
  );
}

/** Shares for each candidate plus a final "undecided" entry; sums to 1. */
export function regionIntention(views: VoterView[], regionId: RegionId, level: OfficeLevel, partisan: boolean): number[] {
  const t = VOTE_WEIGHTS.temperature;
  const exps = views.map((v) => Math.exp(utility(v, regionId, level, partisan) / t));
  exps.push(Math.exp(VOTE_WEIGHTS.undecided / t));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

/** Removes "undecided" and renormalizes: how the decided vote splits. */
export function decided(intention: number[]): number[] {
  const shares = intention.slice(0, -1);
  const total = shares.reduce((a, b) => a + b, 0);
  return shares.map((s) => s / total);
}

/** Player first, then opponents. */
export function raceViews(state: GameState, race: Race, regionId: RegionId): VoterView[] {
  const player: VoterView = {
    standing: state.regions[regionId]!,
    lean: affiliationLean(state.career.affiliation),
    affiliation: state.career.affiliation,
    incumbent: state.career.office?.officeId === race.officeId,
  };
  return [player, ...race.opponents.map((c) => candidateView(c, regionId))];
}

export function candidateView(c: Candidate, regionId: RegionId): VoterView {
  return { standing: c.regions[regionId]!, lean: c.lean, affiliation: c.affiliation, incumbent: c.incumbent };
}

export function affiliationLean(a: Affiliation): number {
  return a === 'DU' ? -1 : a === 'RP' ? 1 : 0;
}

/** Weight of each region in the race: population × turnout. */
export function regionWeights(officeId: string): Record<RegionId, number> {
  const office = getOffice(officeId);
  const raw = office.regionIds.map((id) => {
    const r = getRegion(id);
    return [id, r.population * r.turnout] as const;
  });
  const total = raw.reduce((sum, [, w]) => sum + w, 0);
  return Object.fromEntries(raw.map(([id, w]) => [id, w / total]));
}

export interface Poll {
  /** Per region: candidate shares + undecided. */
  regions: Record<RegionId, number[]>;
  /** Jurisdiction-wide, candidates + undecided. */
  total: number[];
  /** Jurisdiction-wide share of decided voters per candidate. */
  decided: number[];
}

export function poll(state: GameState, race: Race): Poll {
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const regions: Record<RegionId, number[]> = {};
  const total = new Array<number>(race.opponents.length + 2).fill(0);
  for (const id of office.regionIds) {
    const shares = regionIntention(raceViews(state, race, id), id, office.level, office.partisan);
    regions[id] = shares;
    shares.forEach((s, i) => (total[i]! += s * weights[id]!));
  }
  return { regions, total, decided: decided(total) };
}
