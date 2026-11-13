// Decision cards: 3 per turn, apply 1–3, never 0 (DESIGN §6.3).
import { DECISION_CARDS, getDecisionCard, getOffice, getRegion, STATES } from '../data';
import { activeLevel, turnNo } from './events';
import { clamp, nudgeFavorability, nudgeRecognition, regionAlignment, relevance } from './opinion';
import { Rng } from './rng';
import type { DecisionCard, GameState, IssueId, RegionId } from './types';

export const DECISIONS_PER_TURN = 3;
const RECENT_MEMORY = 6;

export const DECISION_EFFECT = {
  /** Favorability per unit of salience × alignment in the jurisdiction. */
  favorability: 0.05,
  spillover: 0.3,
  press: 0.01,
  promiseKeptIntegrity: 2,
  promiseKeptFavorability: 0.02,
  promiseBrokenIntegrity: -5,
  promiseBrokenFavorability: -0.04,
  /** How far one applied card pulls your record toward its stance. */
  recordPull: 0.3,
};

function context(state: GameState): DecisionCard['context'] | undefined {
  if (state.career.race?.platform.length) return 'campaign';
  if (state.career.office) return 'office';
  return undefined;
}

export function decisionPool(state: GameState): DecisionCard[] {
  const ctx = context(state);
  if (!ctx) return [];
  const level = activeLevel(state);
  return DECISION_CARDS.filter((c) => c.context === ctx && c.levels.includes(level));
}

/** Deals this turn's hand if it hasn't been dealt yet. */
export function dealDecisions(state: GameState): GameState {
  const now = turnNo(state);
  if (state.decisions?.turnNo === now) return state;
  const pool = decisionPool(state);
  if (!pool.length) return { ...state, decisions: undefined };
  const rng = new Rng(state.rng);
  const fresh = pool.filter((c) => !state.recentDecisionIds.includes(c.id));
  const source = fresh.length >= DECISIONS_PER_TURN ? fresh : pool;
  const cardIds = rng.shuffle(source).slice(0, DECISIONS_PER_TURN).map((c) => c.id);
  return {
    ...state,
    rng: rng.state,
    decisions: { turnNo: now, cardIds, resolved: false, applied: [] },
    recentDecisionIds: [...state.recentDecisionIds, ...cardIds].slice(-RECENT_MEMORY),
  };
}

function jurisdiction(state: GameState): RegionId[] {
  const id = state.career.race?.officeId ?? state.career.office?.officeId;
  return id ? getOffice(id).regionIds : [];
}

export interface DecisionImpact {
  favorability: Record<RegionId, number>;
  integrity: number;
  funds: number;
  promisesKept: IssueId[];
  promisesBroken: IssueId[];
}

/** What applying one card does (before diminishing returns). Used for previews and resolution. */
export function decisionImpact(state: GameState, card: DecisionCard): DecisionImpact {
  const level = activeLevel(state);
  const home = jurisdiction(state);
  const stateRegions = home.length ? STATES[getOffice(state.career.race?.officeId ?? state.career.office!.officeId).state]!.regionIds : [];
  const platform = state.career.race?.platform ?? [];
  const impact: DecisionImpact = {
    favorability: {},
    integrity: card.effects?.integrity ?? 0,
    funds: card.effects?.funds ?? 0,
    promisesKept: [],
    promisesBroken: [],
  };

  for (const id of stateRegions) {
    const share = home.includes(id) ? 1 : DECISION_EFFECT.spillover;
    let dF = 0;
    for (const tag of card.tags) {
      const r = regionAlignment(id, tag.issue, tag.stance);
      const salience = getRegionSalience(id, tag.issue);
      dF += DECISION_EFFECT.favorability * salience * r * relevance(tag.issue, level);
    }
    impact.favorability[id] = dF * share;
  }

  for (const tag of card.tags) {
    const pledge = platform.find((p) => p.issue === tag.issue);
    if (!pledge) continue;
    const kept = Math.sign(pledge.stance) === Math.sign(tag.stance);
    if (kept) impact.promisesKept.push(tag.issue);
    else impact.promisesBroken.push(tag.issue);
    impact.integrity += kept ? DECISION_EFFECT.promiseKeptIntegrity : DECISION_EFFECT.promiseBrokenIntegrity;
    for (const id of home) {
      impact.favorability[id] = (impact.favorability[id] ?? 0) + (kept ? DECISION_EFFECT.promiseKeptFavorability : DECISION_EFFECT.promiseBrokenFavorability);
    }
  }
  return impact;
}

function getRegionSalience(regionId: RegionId, issue: IssueId): number {
  return getRegion(regionId).issueSalience[issue];
}

export function decisionError(state: GameState, apply: string[]): string | undefined {
  const hand = state.decisions;
  if (!hand || hand.resolved) return 'No decisions to resolve.';
  if (apply.length < 1) return 'Apply at least one card.';
  if (apply.length > DECISIONS_PER_TURN) return `Apply at most ${DECISIONS_PER_TURN} cards.`;
  if (new Set(apply).size !== apply.length) return 'Each card can be applied once.';
  if (apply.some((id) => !hand.cardIds.includes(id))) return 'That card is not in this turn’s hand.';
  return undefined;
}

export function resolveDecisions(state: GameState, apply: string[]): GameState {
  const error = decisionError(state, apply);
  if (error) throw new Error(error);
  const hand = state.decisions!;
  const regions = { ...state.regions };
  const record = { ...state.record };
  let integrity = state.integrity;
  let funds = state.funds;
  const home = jurisdiction(state);
  const notes: string[] = [];

  for (const id of hand.cardIds) {
    const card = getDecisionCard(id);
    if (!apply.includes(id)) {
      if (card.rejectCost) {
        for (const r of home) regions[r] = { ...regions[r]!, favorability: nudgeFavorability(regions[r]!.favorability, -card.rejectCost) };
      }
      continue;
    }
    const impact = decisionImpact(state, card);
    for (const [r, dF] of Object.entries(impact.favorability)) {
      const cur = regions[r]!;
      regions[r] = {
        recognition: home.includes(r) ? nudgeRecognition(cur.recognition, DECISION_EFFECT.press) : cur.recognition,
        favorability: nudgeFavorability(cur.favorability, dF),
      };
    }
    for (const tag of card.tags) {
      const old = record[tag.issue];
      record[tag.issue] = old === undefined ? tag.stance : old + (tag.stance - old) * DECISION_EFFECT.recordPull;
    }
    integrity += impact.integrity;
    funds += impact.funds;
    if (impact.promisesBroken.length) notes.push(`broke a promise with “${card.title}”`);
    else if (impact.promisesKept.length) notes.push(`kept a promise with “${card.title}”`);
  }

  const titles = apply.map((id) => getDecisionCard(id).title).join(', ');
  return {
    ...state,
    regions,
    record,
    funds,
    integrity: clamp(Math.round(integrity), 0, 100),
    decisions: { ...hand, resolved: true, applied: [...apply] },
    log: [
      ...state.log,
      { year: state.clock.year, turn: state.clock.turn, text: `Backed: ${titles}.${notes.length ? ` You ${notes.join('; ')}.` : ''}` },
    ],
  };
}
