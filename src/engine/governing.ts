// In office: approval, the term clock and re-election (DESIGN §6.3, §7).
import { getOffice } from '../data';
import { clamp, nudgeFavorability } from './opinion';
import { monthsFactor } from './time';
import type { GameState, OfficeTerm, Pledge, RegionId } from './types';

export const GOVERNING = {
  /** Approval starts near your vote share, plus a honeymoon. */
  honeymoon: 0.08,
  seedSlope: 0.6,
  minSeed: 0.3,
  maxSeed: 0.8,
  /** Governing wears you down: approval lost per 3 months if you do nothing. */
  wear: 0.025,
  /** Favorability drifts toward what approval implies, at this rate per turn. */
  drift: 0.25,
  /** Favorability implied by approval: (A − 0.5) × this. */
  approvalToFavorability: 1.5,
  /** Integrity moves the implied favorability: (integrity − 50) / this. */
  integrityDivisor: 250,
  /** Events in office move approval by this share of their favorability effect. */
  eventApprovalShare: 0.5,
};

export function seedApproval(regionShares: Record<RegionId, number[]>): Record<RegionId, number> {
  return Object.fromEntries(
    Object.entries(regionShares).map(([id, shares]) => [
      id,
      clamp(0.5 + (shares[0]! - 0.5) * GOVERNING.seedSlope + GOVERNING.honeymoon, GOVERNING.minSeed, GOVERNING.maxSeed),
    ]),
  );
}

export function newTerm(officeId: string, electionYear: number, regionShares: Record<RegionId, number[]>, platform: Pledge[]): OfficeTerm {
  return {
    officeId,
    termEndsYear: electionYear + getOffice(officeId).termYears,
    approval: seedApproval(regionShares),
    platform: platform.map((p) => ({ ...p })),
    startedYear: electionYear + 1,
  };
}

/** Administration slows approval wear: 1.25× at ADM 0, 1.0 at 5, 0.75 at 10. */
export function administrationWear(state: GameState): number {
  return clamp(1.25 - 0.05 * state.politician.skills.administration, 0.6, 1.25);
}

/** How hard a signed bill lands: ADM, plus ECO on budget and tax bills. 1.0 at 5. */
export function executionMultiplier(state: GameState, budgetBill: boolean): number {
  const adm = 0.8 + 0.04 * state.politician.skills.administration;
  const eco = budgetBill ? 0.8 + 0.04 * state.politician.skills.economics : 1;
  return adm * eco;
}

/** Moves approval with diminishing returns toward 0 or 1. */
export function nudgeApproval(current: number, delta: number): number {
  const headroom = delta > 0 ? 1 - current : current;
  return clamp(current + delta * headroom * 2, 0.02, 0.98);
}

/** Population × turnout weighted average approval. */
export function averageApproval(state: GameState): number | undefined {
  const office = state.career.office;
  if (!office) return undefined;
  const ids = Object.keys(office.approval);
  return ids.reduce((s, id) => s + office.approval[id]!, 0) / ids.length;
}

/** Once per turn in office: approval wears down and favorability follows approval. */
export function governTick(state: GameState): GameState {
  const office = state.career.office;
  if (!office) return state;
  const f = monthsFactor(state.clock);
  const approval: Record<RegionId, number> = {};
  const regions = { ...state.regions };
  for (const [id, a] of Object.entries(office.approval)) {
    const next = clamp(a - GOVERNING.wear * f * administrationWear(state), 0.02, 0.98);
    approval[id] = next;
    const target = clamp((next - 0.5) * GOVERNING.approvalToFavorability + (state.integrity - 50) / GOVERNING.integrityDivisor, -1, 1);
    const cur = regions[id]!;
    regions[id] = { ...cur, favorability: nudgeFavorability(cur.favorability, (target - cur.favorability) * GOVERNING.drift) };
  }
  return { ...state, regions, career: { ...state.career, office: { ...office, approval } } };
}

export function isReelectionYear(state: GameState): boolean {
  const office = state.career.office;
  return !!office && state.clock.year === office.termEndsYear;
}
