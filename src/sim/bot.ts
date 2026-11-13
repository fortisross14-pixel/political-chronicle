// A simple "sensible player" bot used to measure balance (DESIGN §12).
import { BASIC_CARD_IDS, getDecisionCard, getOffice, getRegion, ISSUE_IDS } from '../data';
import {
  applyAction,
  buyError,
  offerPrice,
  autoAllocate,
  buildRunConfig,
  createRun,
  decisionImpact,
  poll,
  previewEvent,
  regionWeights,
  relevance,
} from '../engine';
import type { CreationInput, GameState, IssueId, Pledge } from '../engine';

export type BotStyle = 'sensible' | 'idle' | 'contrarian' | 'investor';

/** Platform fitted to the race's voters (or deliberately against them). */
export function botPlatform(state: GameState, style: BotStyle): Pledge[] {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const avg = (issue: IssueId, key: 'issueOpinion' | 'issueSalience') =>
    office.regionIds.reduce((sum, id) => sum + getRegion(id)[key][issue] * weights[id]!, 0);
  return ISSUE_IDS.map((issue) => ({ issue, score: avg(issue, 'issueSalience') * relevance(issue, office.level), opinion: avg(issue, 'issueOpinion') }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ issue, opinion }) => {
      const sign = (opinion < 0 ? -1 : 1) * (style === 'contrarian' ? -1 : 1);
      return { issue, stance: sign * (Math.abs(opinion) >= 1 ? 2 : 1) };
    });
}

function score(state: GameState, effects: { regionId: string; dRecognition: number; dFavorability: number }[]): number {
  const race = state.career.race;
  if (!race) return 0;
  const weights = regionWeights(race.officeId);
  return effects.reduce((sum, e) => sum + (weights[e.regionId] ?? 0) * (e.dFavorability * 2 + e.dRecognition), 0);
}

/** How much a dollar is worth, in the same units as favorability gains. */
function moneyWeight(style: BotStyle): number {
  return style === 'investor' ? 1 / 2e5 : 1 / 1e6;
}

function decide(state: GameState, style: BotStyle): string[] {
  const ids = state.decisions!.cardIds;
  if (style !== 'sensible' && style !== 'investor') return [ids[0]!];
  const weights = state.career.race ? regionWeights(state.career.race.officeId) : {};
  const ranked = ids
    .map((id) => {
      const impact = decisionImpact(state, getDecisionCard(id));
      const fav = Object.entries(impact.favorability).reduce((s, [r, v]) => s + (weights[r] ?? 0) * v, 0);
      return { id, value: fav + impact.integrity * 0.002 + impact.funds * moneyWeight(style) };
    })
    .sort((a, b) => b.value - a.value);
  const good = ranked.filter((r) => r.value > 0).map((r) => r.id);
  return good.length ? good : [ranked[0]!.id];
}

/** Best expected value of holding this card somewhere in the race, on some platform topic. */
function cardValue(state: GameState, cardId: string, style: BotStyle): number {
  const race = state.career.race;
  if (!race) return 0;
  const probe: GameState = { ...state, energy: 99, hand: [...state.hand, { uid: -1, cardId }] };
  let best = 0;
  for (const regionId of getOffice(race.officeId).regionIds) {
    for (const p of race.platform) {
      const pv = previewEvent(probe, -1, regionId, p.issue);
      if (!pv.error) best = Math.max(best, score(probe, pv.effects) + pv.fundsGain * moneyWeight(style));
    }
  }
  return best;
}

/** Shopping: the investor buys Fundraising first; everyone buys the best value-for-money events. */
function shop(state: GameState, style: BotStyle): GameState {
  let s = state;
  if (style === 'idle') return s;
  for (let guard = 0; guard < 6; guard++) {
    const offers = s.market?.offers ?? [];
    let pick: { index: number; value: number } | undefined;
    offers.forEach((o, index) => {
      if (buyError(s, index)) return;
      const price = offerPrice(o, s);
      if (o.kind === 'skill') {
        if (style === 'investor' && o.cardId === 'donor_gala') pick = { index, value: Infinity };
        return;
      }
      const value = cardValue(s, o.cardId, style) / (price + 3000);
      if (value > 1e-7 && (!pick || value > pick.value)) pick = { index, value };
    });
    if (!pick) break;
    s = applyAction(s, { type: 'BUY_CARD', offerIndex: pick.index });
  }
  return s;
}

function playEvents(state: GameState, style: BotStyle): GameState {
  let s = state;
  const race = s.career.race;
  if (!race) return s;
  const office = getOffice(race.officeId);
  for (let guard = 0; guard < 20; guard++) {
    let best: { ref: number | string; regionId: string; issue: IssueId; value: number } | undefined;
    const refs: (number | string)[] = [...s.hand.map((c) => c.uid), ...BASIC_CARD_IDS];
    for (const ref of refs) {
      for (const regionId of office.regionIds) {
        for (const p of race.platform) {
          const pv = previewEvent(s, ref, regionId, p.issue);
          if (pv.error) continue;
          // Value per energy, with money only worth spending if it buys a real effect.
          const value = (score(s, pv.effects) + pv.fundsGain * moneyWeight(style)) / pv.energy;
          if (value > 0 && (!best || value > best.value)) best = { ref, regionId, issue: p.issue, value };
        }
      }
    }
    if (!best) break;
    s = applyAction(s, { type: 'PLAY_EVENT', cardUid: best.ref, regionId: best.regionId, issue: best.issue });
  }
  return s;
}

/** One full turn: dismiss results, file/platform if needed, decide, shop, campaign, end turn. */
export function playTurn(state: GameState, style: BotStyle): GameState {
  let s = state;
  if (s.ended) return s;
  if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
  if (s.ended) return s;
  if (!s.career.race && !s.career.office) {
    const officeId = s.elections.at(-1)?.officeId ?? 'mayor-watertown';
    s = applyAction(s, { type: 'FILE_RACE', officeId });
  }
  if (s.career.race && !s.career.race.platform.length) s = applyAction(s, { type: 'SET_PLATFORM', platform: botPlatform(s, style) });
  if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: decide(s, style) });
  s = shop(s, style);
  if (style !== 'idle') s = playEvents(s, style);
  return applyAction(s, { type: 'END_TURN' });
}

/** Funds over a multi-year career. */
export function careerFunds(input: CreationInput, style: BotStyle, turns: number, seed: string): { funds: number; peak: number; fundraising: number } {
  let s = createRun(buildRunConfig(input, seed));
  let peak = s.funds;
  for (let i = 0; i < turns && !s.ended; i++) {
    s = playTurn(s, style);
    peak = Math.max(peak, s.funds);
  }
  return { funds: s.funds, peak, fundraising: s.politician.skills.fundraising };
}

export interface BotResult {
  won: boolean;
  share: number;
  finalPoll: number;
  officeId: string;
}

/** Plays one campaign from filing to Election Day. */
export function playCampaign(state: GameState, style: BotStyle): { state: GameState; result: BotResult } {
  let s = state;
  if (!s.career.race) throw new Error('No race to play');
  s = applyAction(s, { type: 'SET_PLATFORM', platform: botPlatform(s, style) });
  const target = s.elections.length + 1;
  for (let guard = 0; guard < 40 && s.elections.length < target; guard++) s = playTurn(s, style);
  const e = s.elections.at(-1)!;
  return { state: s, result: { won: e.playerWon, share: e.totalShares[0]!, finalPoll: e.finalPoll, officeId: e.officeId } };
}

export function botCharacter(birthRegionId: string, backgroundId = 'teacher', age = 35): CreationInput {
  return { name: 'Bot', gender: 'female', age, birthRegionId, backgroundId, allocation: autoAllocate(backgroundId, age) };
}

/** Win rate for a character's hometown mayoral race across seeds. */
export function hometownWinRate(input: CreationInput, style: BotStyle, runs: number): { winRate: number; avgShare: number } {
  let wins = 0;
  let share = 0;
  for (let i = 0; i < runs; i++) {
    const start = createRun(buildRunConfig(input, `sim-${style}-${input.birthRegionId}-${input.backgroundId}-${i}`));
    const { result } = playCampaign(start, style);
    if (result.won) wins++;
    share += result.share;
  }
  return { winRate: wins / runs, avgShare: share / runs };
}

export { poll };
