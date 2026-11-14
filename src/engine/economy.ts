// Money: income and prices (DESIGN §6.2, §9). Cards come from packs (packs.ts).
import { getOffice, getRegion, MARKET_COST_FACTOR } from '../data';
import { poll } from './opinion';
import { partyFunds } from './parties';
import { effectiveSkills } from './people';
import { native, TRAITS } from './traits';
import { monthsFactor } from './time';
import type { EventCard, GameState, IncomeBreakdown, OfficeLevel, RegionId } from './types';

export const INCOME = {
  donorBase: 1000,
  donorPerFundraisingRecognition: 1500,
  statewideMultiplier: 3,
  /** Donors give most while you're running. */
  campaignMultiplier: 1,
  officeMultiplier: 0.5,
  idleMultiplier: 0.25,
};

/** Per 3 months in office; a token amount you can put toward politics. */
export const SALARY: Record<OfficeLevel, number> = { mayor: 1000, house: 1500, senate: 2000, governor: 2000 };

/** Skill cap from the highest office you hold (DESIGN §6.2). */
export const SKILL_CAP: Record<OfficeLevel | 'none', number> = { none: 6, mayor: 6, house: 8, senate: 10, governor: 10 };

/** The regions your money and donors come from: the race you're in, your office, or home. */
export function economicJurisdiction(state: GameState): RegionId[] {
  const id = state.career.race?.officeId ?? state.career.office?.officeId;
  return id ? getOffice(id).regionIds : [state.politician.residentRegionId];
}

function weightsOf(regionIds: RegionId[]): [RegionId, number][] {
  const raw = regionIds.map((id) => [id, getRegion(id).population * getRegion(id).turnout] as [RegionId, number]);
  const total = raw.reduce((s, [, w]) => s + w, 0);
  return raw.map(([id, w]) => [id, w / total]);
}

export function skillCap(state: GameState): number {
  return SKILL_CAP[state.career.office ? getOffice(state.career.office.officeId).level : 'none'];
}

// ---------- Prices ----------

/** Media-market price level of your jurisdiction: NYC ×1.5, Watertown ×0.6. */
export function priceFactor(state: GameState): number {
  return weightsOf(economicJurisdiction(state)).reduce((s, [id, w]) => s + w * MARKET_COST_FACTOR[getRegion(id).type], 0);
}

export function eventPrice(card: EventCard, state: GameState): number {
  return Math.round((card.cost * priceFactor(state)) / 500) * 500;
}

// ---------- Income ----------

/** Parties spend where races are close: 1 for a toss-up, down to 0.3 for a blowout; 0.6 between races. */
export function competitiveness(state: GameState): number {
  const race = state.career.race;
  if (!race?.platform.length) return 0.6;
  const you = poll(state, race).decided[0]!;
  return Math.max(0.3, 1 - Math.abs(you - 0.5) * 1.2);
}

export function projectedIncome(state: GameState): IncomeBreakdown {
  const f = monthsFactor(state.clock);
  const regions = economicJurisdiction(state);
  const eco = effectiveSkills(state).economics;
  const outsiders = native(state) ? 0 : (TRAITS.outsideDonorBase * eco) / 3;
  const recognition = weightsOf(regions).reduce((s, [id, w]) => s + w * state.regions[id]!.recognition, 0);
  const phase = state.career.race ? INCOME.campaignMultiplier : state.career.office ? INCOME.officeMultiplier : INCOME.idleMultiplier;
  const statewide = regions.length > 1;
  const donors =
    (INCOME.donorBase + INCOME.donorPerFundraisingRecognition * eco * recognition + outsiders) *
    (statewide ? INCOME.statewideMultiplier : 1) *
    phase *
    f;
  const salary = state.career.office ? SALARY[getOffice(state.career.office.officeId).level] * f : 0;
  const round = (v: number) => Math.round(v / 100) * 100;
  return { donors: round(donors), salary: round(salary), party: partyFunds(state, competitiveness(state)) };
}

/** Start-of-turn money: donors, salary and party funds. */
export function collectIncome(state: GameState): GameState {
  if (state.ended) return state;
  const income = projectedIncome(state);
  return { ...state, funds: state.funds + income.donors + income.salary + income.party, lastIncome: income };
}
