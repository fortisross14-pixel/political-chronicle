import type { Office, OfficeId, Region, RegionId, StateId, UsState } from '../engine/types';
import { NEW_YORK, NY_OFFICES, NY_REGIONS } from './newYork';

export { ISSUES, ISSUE_IDS, ISSUES_BY_ID, MAYOR_RELEVANCE_FACTOR } from './issues';
export { PARTIES, PARTY_IDS } from './parties';
export { BACKGROUNDS, BACKGROUNDS_BY_ID, getBackground } from './backgrounds';
export type { Background, BackgroundPerks } from './backgrounds';
export { US_STATES, US_STATE_NAMES } from './usStates';
export { PEOPLE, PEOPLE_BY_ID, getPerson, ROLE_LABELS, ROLE_HINTS, PERK_TEXT, RARITY_WEIGHT } from './people';
export type { Person, PersonPerk, Rarity, Role } from './people';
export { EVENT_CARDS, EVENT_CARDS_BY_ID, BASIC_CARD_IDS, STARTER_HAND, MARKET_COST_FACTOR, MARKET_WEIGHTS, getEventCard } from './eventCards';
export { SKILL_CARDS, SKILL_CARDS_BY_ID, getSkillCard } from './skillCards';
export type { SkillCard } from './skillCards';
export { DECISION_CARDS, DECISION_CARDS_BY_ID, getDecisionCard } from './decisionCards';
export { FIRST_NAMES, LAST_NAMES } from './names';

export const STATES: Record<StateId, UsState> = { NY: NEW_YORK };

export const REGIONS: Region[] = [...NY_REGIONS];
export const REGIONS_BY_ID: Record<RegionId, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const OFFICES: Office[] = [...NY_OFFICES];
export const OFFICES_BY_ID: Record<OfficeId, Office> = Object.fromEntries(OFFICES.map((o) => [o.id, o]));

export function getRegion(id: RegionId): Region {
  const region = REGIONS_BY_ID[id];
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export function getOffice(id: OfficeId): Office {
  const office = OFFICES_BY_ID[id];
  if (!office) throw new Error(`Unknown office: ${id}`);
  return office;
}

/** Share of the state's population living in a region (used to weight statewide numbers). */
export function populationShare(regionId: RegionId): number {
  const region = getRegion(regionId);
  const state = STATES[region.state];
  if (!state) throw new Error(`Unknown state: ${region.state}`);
  const total = state.regionIds.reduce((sum, id) => sum + getRegion(id).population, 0);
  return region.population / total;
}
