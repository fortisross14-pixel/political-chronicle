// Election night: results stream in region by region; spend ground game on what's still being
// counted (DESIGN_V2 §5.2). The true result is drawn when polls close; the night reveals it.
import { GameError, reject } from './errors';
import { getBackground, getEventCard, getItem, getOffice, getPerson, getRegion } from '../data';
import { eventPrice } from './economy';
import { GROUND_GAME } from './loot';
import { clamp } from './opinion';
import { effectiveSkills, ROLE_EFFECT } from './people';
import type { Rng } from './rng';
import type { ElectionNight, GameState, NightRegion, RegionId, RegionType } from './types';

export const NIGHT = {
  /** 8 pm to 2 am in half-hour steps. */
  steps: 13,
  closeStep: { suburban: 0, rural: 1, midsize: 1, urban: 2 } as Record<RegionType, number>,
  countSteps: { suburban: 5, rural: 4, midsize: 5, urban: 8 } as Record<RegionType, number>,
  /** Early returns skew by up to this much (rural boxes first, mail ballots last…). */
  skewSd: 0.04,
  /** Uncertainty about an uncounted region's final share. */
  regionSd: 0.06,
  callZ: 2.5,
  /** Mobilize: share points on the uncounted vote, scaled by Strategy. */
  mobilize: 0.015,
  endorsementMultiplier: 1.5,
  /** Lawyers recover part of a bad final draw (below the pre-election poll), up to a cap. */
  lawyerRecovery: 0.3,
  lawyerCap: 0.005,
  adBlitz: 0.006,
  adBlitzCost: 20000,
  /** Total weighted swing from night actions can't exceed this. */
  maxSwing: 0.01,
  /** Nor can the boost in any one area. */
  maxAreaBoost: 0.03,
  /** The count reveals areas one by one across this many half-hours. */
  revealSpan: 8,
  volunteerTokens: 2,
  /** Late voters break your way (legendary card): on the uncounted vote, outside the swing cap. */
  lateSurge: 0.015,
  /** How far the exit poll can miss the true race-wide share. */
  exitPollSd: 0.012,
};

export const HOURS = ['8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00'];

export function counted(region: NightRegion, step: number): number {
  if (step < region.closeStep) return 0;
  return clamp((step - region.closeStep + 1) / region.countSteps, 0, 1);
}

function weights(officeId: string): Record<RegionId, number> {
  const ids = getOffice(officeId).regionIds;
  const raw = ids.map((id) => getRegion(id).population * getRegion(id).turnout);
  const total = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(ids.map((id, i) => [id, raw[i]! / total]));
}

/** The final shares in a region after night actions. */
export function finalShares(night: ElectionNight, regionId: RegionId): number[] {
  const r = night.regions[regionId]!;
  let you = r.trueShares[0]! + r.boost + night.statewideBoost + (night.surge ?? 0);
  if (r.protected && r.trueShares[0]! < r.prior) you += Math.min(NIGHT.lawyerCap, (r.prior - r.trueShares[0]!) * NIGHT.lawyerRecovery);
  you = clamp(you, 0.01, 0.99);
  const othersTrue = 1 - r.trueShares[0]!;
  return [you, ...r.trueShares.slice(1).map((s) => (othersTrue > 0 ? (s / othersTrue) * (1 - you) : 0))];
}

/** What the count shows right now (skewed early, exact at 100%). */
export function reportedShares(night: ElectionNight, regionId: RegionId): number[] | undefined {
  const r = night.regions[regionId]!;
  const c = counted(r, night.step);
  if (c === 0) return undefined;
  const fin = finalShares(night, regionId);
  const you = clamp(fin[0]! + r.skew * (1 - c), 0.01, 0.99);
  const othersFin = 1 - fin[0]!;
  return [you, ...fin.slice(1).map((s) => (othersFin > 0 ? (s / othersFin) * (1 - you) : 0))];
}

function priorShares(r: NightRegion): number[] {
  // Before results, assume the pre-election poll; split the rest like the true field (the field is public).
  const others = 1 - r.trueShares[0]!;
  return [r.prior, ...r.trueShares.slice(1).map((s) => (others > 0 ? (s / others) * (1 - r.prior) : 0))];
}

export interface NightView {
  /** Per candidate (player first): the race-wide share of votes counted so far. */
  reportedTotals: number[];
  /** Race-wide share of the expected vote counted. */
  countedTotal: number;
  /** Chance the player wins, from what's counted plus the polls. */
  winProbability: number;
  margin: number;
}

function phi(x: number): number {
  // Abramowitz–Stegun approximation of the normal CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function nightView(night: ElectionNight): NightView {
  const w = weights(night.officeId);
  const n = Object.values(night.regions)[0]!.trueShares.length;
  const estimate = new Array<number>(n).fill(0);
  const reported = new Array<number>(n).fill(0);
  let countedTotal = 0;
  let variance = 0;
  for (const [id, r] of Object.entries(night.regions)) {
    const c = counted(r, night.step);
    const rep = reportedShares(night, id);
    const prior = priorShares(r);
    for (let i = 0; i < n; i++) {
      estimate[i]! += w[id]! * (rep ? c * rep[i]! + (1 - c) * prior[i]! : prior[i]!);
      if (rep) reported[i]! += w[id]! * c * rep[i]!;
    }
    countedTotal += w[id]! * c;
    variance += (w[id]! * (1 - c) * NIGHT.regionSd) ** 2;
  }
  const margin = estimate[0]! - Math.max(...estimate.slice(1));
  const sd = Math.sqrt(variance) + 0.004;
  const allIn = countedTotal >= 0.999;
  const winProbability = allIn ? (margin > 0 ? 1 : 0) : phi(margin / sd);
  return { reportedTotals: reported.map((v) => (countedTotal ? v / countedTotal : 0)), countedTotal, winProbability, margin };
}

// ---------- Start, advance, finish ----------

/** Election-day draw → a night to reveal it. `regionShares` are the true final shares. */
export function startNight(
  state: GameState,
  rng: Rng,
  regionShares: Record<RegionId, number[]>,
  priors: Record<RegionId, number>,
  finalPoll: number,
): GameState {
  const race = state.career.race!;
  const regions: Record<RegionId, NightRegion> = {};
  const order = revealOrder(Object.keys(regionShares), rng);
  for (const [id, shares] of Object.entries(regionShares)) {
    const type = getRegion(id).type;
    const many = order.length > 4;
    regions[id] = {
      trueShares: shares,
      prior: priors[id]!,
      skew: rng.gaussian(0, NIGHT.skewSd),
      // Many areas: they report one after another; a few big regions: by type, as before.
      closeStep: many ? 1 + Math.floor((order.indexOf(id) * NIGHT.revealSpan) / order.length) : NIGHT.closeStep[type],
      countSteps: many ? 2 + (type === 'urban' ? 2 : 1) : NIGHT.countSteps[type],
      boost: 0,
      protected: false,
    };
  }
  const unspentTokens = Math.floor(state.energy / 2);
  const night: ElectionNight = {
    officeId: race.officeId,
    year: race.electionYear,
    step: 0,
    steps: NIGHT.steps,
    regions,
    tokens: race.tokens + unspentTokens,
    statewideBoost: 0,
    adBought: false,
    finalPoll,
    phase: 'exit',
    exitPoll: 0,
    ticker: ['Polls are closed. Here are the exit polls.'],
  };
  const w = weights(race.officeId);
  const trueShare = Object.entries(regionShares).reduce((s, [id, sh]) => s + w[id]! * sh[0]!, 0);
  night.exitPoll = clamp(trueShare + rng.gaussian(0, NIGHT.exitPollSd), 0.01, 0.99);
  // Campaign-only items expire on Election Day.
  const items = state.items.filter((i) => getItem(i.itemId).window !== 'campaign');
  return updateCalls({ ...state, rng: rng.state, night, items });
}

/** Small, rural and suburban areas report first; big-city boxes come in last (with some luck). */
function revealOrder(ids: RegionId[], rng: Rng): RegionId[] {
  const rank: Record<string, number> = { rural: 0, suburban: 1, midsize: 2, urban: 3 };
  return ids
    .map((id) => ({ id, key: rank[getRegion(id).type]! + rng.float() * 2.5 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.id);
}

function updateCalls(state: GameState): GameState {
  const night = state.night!;
  const w = weights(night.officeId);
  const regions = { ...night.regions };
  const ticker = [...night.ticker];
  const office = getOffice(night.officeId);
  for (const [id, r] of Object.entries(regions)) {
    const c = counted(r, night.step);
    if (night.step === r.closeStep && office.regionIds.length > 1) ticker.push(`First returns from ${getRegion(id).name}.`);
    if (r.calledFor !== undefined || c < 0.3) continue;
    const rep = reportedShares(night, id)!;
    const est = rep.map((v, i) => c * v + (1 - c) * priorShares(r)[i]!);
    const leader = est.indexOf(Math.max(...est));
    const runnerUp = Math.max(...est.filter((_, i) => i !== leader));
    if (c >= 1 || est[leader]! - runnerUp > NIGHT.callZ * (1 - c) * NIGHT.regionSd + 0.005) {
      regions[id] = { ...r, calledFor: leader };
      if (office.regionIds.length > 1) ticker.push(`${getRegion(id).name} called for ${leader === 0 ? 'you' : 'your opponent'}.`);
    }
  }
  let next: ElectionNight = { ...night, regions, ticker };
  // Nobody calls the race off the exit polls: the count decides.
  if (next.calledFor === undefined && next.phase !== 'exit') {
    const view = nightView(next);
    const sd =
      Math.sqrt(Object.entries(regions).reduce((s, [id, r]) => s + (w[id]! * (1 - counted(r, next.step)) * NIGHT.regionSd) ** 2, 0)) +
      0.004;
    if (view.countedTotal >= 0.999 || Math.abs(view.margin) > NIGHT.callZ * sd) {
      next = {
        ...next,
        calledFor: view.margin > 0 ? 0 : 1,
        ticker: [...next.ticker, view.margin > 0 ? 'The race is called: YOU WIN!' : 'The race is called for your opponent.'],
      };
    }
  }
  return { ...state, night: next };
}

export function nightFinished(night: ElectionNight): boolean {
  return night.step >= night.steps - 1 || Object.values(night.regions).every((r) => counted(r, night.step) >= 1);
}

export function advanceNight(state: GameState): GameState {
  const night = state.night;
  if (!night) throw new GameError('No election night.');
  if (night.phase === 'exit')
    return {
      ...state,
      night: { ...night, phase: 'count', ticker: [...night.ticker, `The count begins. You have ${night.tokens} ground-game tokens.`] },
    };
  if (nightFinished(night)) return state;
  return updateCalls({ ...state, night: { ...night, step: night.step + 1 } });
}

// ---------- Actions ----------

function totalSwing(night: ElectionNight): number {
  const w = weights(night.officeId);
  return Object.entries(night.regions).reduce((s, [id, r]) => s + w[id]! * r.boost, 0) + night.statewideBoost;
}

export function mobilizeError(state: GameState, regionId: RegionId, free = false): string | undefined {
  const night = state.night;
  if (!night) return 'No election night.';
  const r = night.regions[regionId];
  if (!r) return 'Not in this race.';
  if (counted(r, night.step) >= 1) return 'Already fully counted.';
  if (!free && night.tokens < 1) return 'No ground-game tokens left.';
  if (totalSwing(night) >= NIGHT.maxSwing - 1e-9) return 'Your ground game is stretched to the limit.';
  if (r.boost >= NIGHT.maxAreaBoost - 1e-9) return 'Every volunteer you have is already there.';
  return undefined;
}

/** Share points a mobilization adds here now (bigger early, when more is uncounted). */
export function mobilizeEffect(state: GameState, regionId: RegionId, multiplier = 1): number {
  const night = state.night!;
  const c = counted(night.regions[regionId]!, night.step);
  const str = effectiveSkills(state).strategy;
  const raw = NIGHT.mobilize * (0.6 + 0.08 * str) * (1 - c) * multiplier;
  const w = weights(night.officeId)[regionId]!;
  const room = Math.max(0, NIGHT.maxSwing - totalSwing(night));
  return Math.max(0, Math.min(raw, room / w, NIGHT.maxAreaBoost - night.regions[regionId]!.boost));
}

export function mobilize(
  state: GameState,
  regionId: RegionId,
  opts: { free?: boolean; multiplier?: number; label?: string } = {},
): GameState {
  const error = mobilizeError(state, regionId, opts.free);
  reject(error);
  const night = state.night!;
  const effect = mobilizeEffect(state, regionId, opts.multiplier);
  const r = night.regions[regionId]!;
  return {
    ...state,
    night: {
      ...night,
      tokens: opts.free ? night.tokens : night.tokens - 1,
      regions: { ...night.regions, [regionId]: { ...r, boost: r.boost + effect } },
      ticker: [
        ...night.ticker,
        `${opts.label ?? 'Volunteers knock doors'} in ${getRegion(regionId).name} (+${(effect * 100).toFixed(1)} pts on the uncounted vote).`,
      ],
    },
  };
}

export function lawyersError(state: GameState, regionId: RegionId, free = false): string | undefined {
  const night = state.night;
  if (!night) return 'No election night.';
  const r = night.regions[regionId];
  if (!r) return 'Not in this race.';
  if (r.protected) return 'Lawyers are already there.';
  if (counted(r, night.step) >= 1) return 'Already fully counted.';
  if (!free && night.tokens < 1) return 'No ground-game tokens left.';
  return undefined;
}

export function sendLawyers(state: GameState, regionId: RegionId, free = false): GameState {
  const error = lawyersError(state, regionId, free);
  reject(error);
  const night = state.night!;
  return {
    ...state,
    night: {
      ...night,
      tokens: free ? night.tokens : night.tokens - 1,
      regions: { ...night.regions, [regionId]: { ...night.regions[regionId]!, protected: true } },
      ticker: [...night.ticker, `Lawyers head to the count in ${getRegion(regionId).name}.`],
    },
  };
}

export function adBlitzCost(state: GameState): number {
  return eventPrice({ ...getEventCard('local_tv_ad'), cost: NIGHT.adBlitzCost }, state);
}

export function adBlitzError(state: GameState, free = false): string | undefined {
  const night = state.night;
  if (!night) return 'No election night.';
  if (night.adBought) return 'Your late ads are already running.';
  if (nightView(night).countedTotal > 0.9) return 'Too late — almost everything is counted.';
  if (!free && state.funds < adBlitzCost(state)) return 'Not enough funds.';
  return undefined;
}

export function adBlitz(state: GameState, free = false): GameState {
  const error = adBlitzError(state, free);
  reject(error);
  const night = state.night!;
  const effect = Math.min(NIGHT.adBlitz * (1 - nightView(night).countedTotal), Math.max(0, NIGHT.maxSwing - totalSwing(night)));
  return {
    ...state,
    funds: free ? state.funds : state.funds - adBlitzCost(state),
    night: {
      ...night,
      adBought: true,
      statewideBoost: night.statewideBoost + effect,
      ticker: [...night.ticker, 'Your late ads hit every channel.'],
    },
  };
}

/** Night-window items. */
export function applyNightItem(state: GameState, uid: number, regionId?: RegionId): GameState {
  const card = state.items.find((i) => i.uid === uid);
  if (!card || !state.night) throw new GameError('You can’t use that now.');
  const items = state.items.filter((i) => i.uid !== uid);
  const base = { ...state, items };
  switch (card.itemId) {
    case 'volunteer_list':
      return {
        ...base,
        night: {
          ...base.night!,
          tokens: base.night!.tokens + NIGHT.volunteerTokens,
          ticker: [...base.night!.ticker, 'Fresh volunteers arrive (+2 tokens).'],
        },
      };
    case 'endorsement':
      return mobilize(base, regionId!, { free: true, multiplier: NIGHT.endorsementMultiplier, label: 'Your endorser rallies voters' });
    case 'poll_watchers':
      return sendLawyers(base, regionId!, true);
    case 'ad_reservation':
      return adBlitz(base, true);
    case 'late_surge': {
      const effect = NIGHT.lateSurge * (1 - nightView(base.night!).countedTotal);
      return {
        ...base,
        night: {
          ...base.night!,
          surge: (base.night!.surge ?? 0) + effect,
          ticker: [...base.night!.ticker, 'Late voters break your way!'],
        },
      };
    }
  }
  throw new GameError('That item does nothing tonight.');
}

/** Ends the night (skipping ahead if needed) and returns the final region shares. */
export function finalNightShares(night: ElectionNight): Record<RegionId, number[]> {
  return Object.fromEntries(Object.keys(night.regions).map((id) => [id, finalShares(night, id)]));
}

/** Organizers bring volunteers: extra starting tokens. */
export function startingTokens(state: GameState): number {
  const manager = Math.floor(managerStars(state) / ROLE_EFFECT.starsPerToken);
  return GROUND_GAME.base + (getBackground(state.politician.backgroundId).id === 'organizer' ? GROUND_GAME.organizerBonus : 0) + manager;
}

/** The campaign manager's stars (the race may not exist yet when tokens are counted at launch). */
function managerStars(state: GameState): number {
  const uid = state.team.assigned.campaignManager;
  const card = uid !== undefined ? state.team.cards.find((c) => c.uid === uid) : undefined;
  return card ? getPerson(card.personId).stars.campaignManager : 0;
}
