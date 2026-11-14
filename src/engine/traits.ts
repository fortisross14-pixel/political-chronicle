// The four core traits: home state, resident state, background and age (DESIGN_V2 §2).
import { getBackground, getRegion, REGIONS, STATES } from '../data';
import type { Background } from '../data';
import { isNative } from './creation';
import { clamp } from './opinion';
import type { GameState, Politician, RegionId, RegionStanding } from './types';

export const TRAITS = {
  baseRecognition: 0.05,
  /** Native: your home region knows you and likes you a little. */
  nativeRecognition: 0.3,
  nativeFavorability: 0.1,
  /** Transplant: people in your city have seen you around, but don't know you yet. */
  transplantRecognition: 0.25,
  /** Newcomer trust penalty statewide, fading to 0 over this many years of residency. */
  newcomerPenalty: 0.1,
  newcomerYears: 8,
  /** Big cities are full of newcomers; small towns notice them. Multiplier on the newcomer penalty by region type. */
  newcomerByType: { urban: 0.4, suburban: 0.7, midsize: 1, rural: 1.2 } as Record<string, number>,
  /** Transplants raise extra money from home-state contacts: a flat network, per 3 months, × ECO/3. */
  outsideDonorBase: 1000,
  /** Natives start a little ahead with their state party. */
  nativeStanding: 5,
  favoredState: 0.08,
  disfavoredState: -0.05,
};

export function backgroundOf(state: Pick<GameState, 'politician'>): Background {
  return getBackground(state.politician.backgroundId);
}

export function residentState(politician: Pick<Politician, 'residentRegionId'>): string {
  return getRegion(politician.residentRegionId).state;
}

export function native(state: Pick<GameState, 'politician'>): boolean {
  return isNative(state.politician);
}

/** Starting recognition & favorability everywhere, from residency and background. */
export function initialRegions(politician: Politician): Record<RegionId, RegionStanding> {
  const bg = getBackground(politician.backgroundId);
  const home = residentState(politician);
  const isNativeHere = isNative(politician);
  const stateRegions = new Set(STATES[home]?.regionIds ?? []);
  const stateBias = bg.favoredStates.includes(home) ? TRAITS.favoredState : bg.disfavoredStates?.includes(home) ? TRAITS.disfavoredState : 0;
  return Object.fromEntries(
    REGIONS.map((r) => {
      let recognition = TRAITS.baseRecognition;
      let favorability = 0;
      if (r.id === politician.residentRegionId) {
        recognition = isNativeHere ? TRAITS.nativeRecognition : TRAITS.transplantRecognition;
        favorability = isNativeHere ? TRAITS.nativeFavorability : 0;
      }
      if (stateRegions.has(r.id)) {
        favorability += stateBias + (bg.regionAffinity?.[r.type] ?? 0);
        recognition = Math.max(recognition, bg.perks.statewideRecognition ?? 0);
      }
      return [r.id, { recognition, favorability: clamp(favorability, -1, 1) }];
    }),
  );
}

/**
 * Voters' doubt about a newcomer: −0.10 favorability (scaled by region type), fading over
 * 8 years. 0 for natives. Without a region, the statewide base value.
 */
export function newcomerPenalty(state: Pick<GameState, 'politician' | 'clock'>, regionId?: RegionId): number {
  if (isNative(state.politician)) return 0;
  const years = state.clock.monthsElapsed / 12;
  const byType = regionId ? (TRAITS.newcomerByType[getRegion(regionId).type] ?? 1) : 1;
  return TRAITS.newcomerPenalty * byType * Math.max(0, 1 - years / TRAITS.newcomerYears);
}

/** Energy lost to the background (e.g. a doctor still working shifts). */
export function backgroundEnergyPenalty(state: Pick<GameState, 'politician' | 'clock'>): number {
  const penalty = getBackground(state.politician.backgroundId).perks.energyPenalty;
  return penalty && state.clock.monthsElapsed < penalty.months ? penalty.amount : 0;
}

export function hasAbility(state: Pick<GameState, 'politician'>, ability: string): boolean {
  return state.politician.abilities?.includes(ability) ?? false;
}
