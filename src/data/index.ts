import type { Office, OfficeId, Region, RegionId, StateId, UsState } from '../engine/types';
import { NEW_YORK, NY_OFFICES, NY_REGIONS } from './newYork';

export { ISSUES, ISSUE_IDS, ISSUES_BY_ID, MAYOR_RELEVANCE_FACTOR } from './issues';
export { PARTIES, PARTY_IDS } from './parties';
export { BACKGROUNDS, BACKGROUNDS_BY_ID, getBackground } from './backgrounds';
export type { Background, BackgroundPerks } from './backgrounds';
export { US_STATES, US_STATE_NAMES } from './usStates';
export { PEOPLE, PEOPLE_BY_ID, getPerson, bestRole, ROLE_LABELS, ROLE_SHORT, ROLE_HINTS, PERK_TEXT } from './people';
export type { Person, PersonPerk, Rarity, Role, RoleStars } from './people';
export { RARITIES, PACK_SIZE, PACK_ODDS, PACK_PRICE, PACK_KIND_LABEL, PACK_TIER_LABEL, PACK_KEEP } from './packs';
export { POLICY_CARDS, POLICY_CARDS_BY_ID, getPolicyCard } from './policyCards';
export type { PolicyCard, PolicyEffect } from './policyCards';
export { ITEMS, ITEMS_BY_ID, getItem, MILESTONES, MILESTONES_BY_ID } from './items';
export type { Item, Milestone } from './items';
export { SCENARIOS, SCENARIOS_BY_ID, getScenario } from './meta';
export { STARTER_TRINKETS, TRINKETS, TRINKETS_BY_ID, TRINKET_WINDOW_LABEL, getTrinket } from './trinkets';
export type { Trinket, TrinketWindow } from './trinkets';
export type { Reward, Scenario, ScenarioSetup, StarGoal, StarRule } from './meta';
export { EVENT_CARDS, EVENT_CARDS_BY_ID, BASIC_CARD_IDS, PACK_EVENT_IDS, MARKET_COST_FACTOR, getEventCard } from './eventCards';
export { DECISION_CARDS, DECISION_CARDS_BY_ID, getDecisionCard } from './decisionCards';
export { FEMALE_FIRST_NAMES, FIRST_NAMES, LAST_NAMES } from './names';

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

/** State-level districts (no neighborhoods). */
export const DISTRICTS: Region[] = REGIONS.filter((r) => !r.parent);

/** The district a region sits in (a district is its own). */
export function districtOf(id: RegionId): RegionId {
  return getRegion(id).parent ?? id;
}

/** Neighborhoods of a district. */
export function neighborhoodsOf(id: RegionId): RegionId[] {
  return REGIONS.filter((r) => r.parent === id).map((r) => r.id);
}

/** The city a neighborhood belongs to: every neighborhood of its mayoralty. Empty for districts. */
export function cityRegionsOf(id: RegionId): RegionId[] {
  if (!getRegion(id).parent) return [];
  return OFFICES.find((o) => o.level === 'mayor' && o.regionIds.includes(id))?.regionIds ?? [];
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
