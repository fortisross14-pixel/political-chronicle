// Decision cards: 3 per turn, apply 1–3, never 0 (DESIGN §6.3).
// Campaigning they are campaign moments (move favorability); in office they are bills and
// executive actions (move job approval, which favorability then follows).
import { DECISION_CARDS, getDecisionCard, getOffice, getRegion, STATES } from '../data';
import { activeLevel, turnNo } from './events';
import { nudgeApproval } from './governing';
import { clamp, nudgeFavorability, nudgeRecognition, regionAlignment, relevance } from './opinion';
import { Rng } from './rng';
import type { DecisionCard, GameState, IssueId, Pledge, PromiseEvent, RegionId } from './types';

export const DECISIONS_PER_TURN = 3;
const RECENT_MEMORY = 9;

export const DECISION_EFFECT = {
  /** Favorability (campaigning) per unit of salience × alignment in the jurisdiction. */
  favorability: 0.05,
  /** Approval (in office) per unit of salience × alignment in the jurisdiction. */
  approval: 0.04,
  spillover: 0.3,
  press: 0.01,
  promiseKeptIntegrity: 2,
  promiseKeptEffect: 0.02,
  promiseBrokenIntegrity: -5,
  promiseBrokenEffect: -0.08,
  /** How far one applied card pulls your record toward its stance. */
  recordPull: 0.3,
};

export function decisionContext(state: GameState): DecisionCard['context'] | undefined {
  if (state.career.office) return 'office';
  if (state.career.race?.platform.length) return 'campaign';
  return undefined;
}

export function decisionPool(state: GameState): DecisionCard[] {
  const ctx = decisionContext(state);
  if (!ctx) return [];
  const level = ctx === 'office' ? getOffice(state.career.office!.officeId).level : activeLevel(state);
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

function jurisdictionOffice(state: GameState): string | undefined {
  return state.career.office?.officeId ?? state.career.race?.officeId;
}

/** In office, promises are what you won on; campaigning, what you're running on. */
export function promisesInForce(state: GameState): Pledge[] {
  return state.career.office?.platform ?? state.career.race?.platform ?? [];
}

export interface DecisionImpact {
  /** Favorability change per region (campaigning: jurisdiction + spillover; in office: spillover only). */
  favorability: Record<RegionId, number>;
  /** Approval change per region of the office's jurisdiction (in office only). */
  approval: Record<RegionId, number>;
  integrity: number;
  funds: number;
  promisesKept: IssueId[];
  promisesBroken: IssueId[];
}

/** What applying one card does (before diminishing returns). Used for previews and resolution. */
export function decisionImpact(state: GameState, card: DecisionCard): DecisionImpact {
  const impact: DecisionImpact = {
    favorability: {},
    approval: {},
    integrity: card.effects?.integrity ?? 0,
    funds: card.effects?.funds ?? 0,
    promisesKept: [],
    promisesBroken: [],
  };
  const officeId = jurisdictionOffice(state);
  if (!officeId) return impact;
  const inOffice = !!state.career.office;
  const office = getOffice(officeId);
  const home = office.regionIds;
  const level = office.level;

  for (const id of STATES[office.state]!.regionIds) {
    const region = getRegion(id);
    let fit = 0;
    for (const tag of card.tags) fit += region.issueSalience[tag.issue] * regionAlignment(id, tag.issue, tag.stance) * relevance(tag.issue, level);
    if (home.includes(id)) {
      if (inOffice) impact.approval[id] = DECISION_EFFECT.approval * fit;
      else impact.favorability[id] = DECISION_EFFECT.favorability * fit;
    } else {
      impact.favorability[id] = DECISION_EFFECT.favorability * fit * DECISION_EFFECT.spillover;
    }
  }

  for (const tag of card.tags) {
    const pledge = promisesInForce(state).find((p) => p.issue === tag.issue);
    if (!pledge) continue;
    const kept = Math.sign(pledge.stance) === Math.sign(tag.stance);
    (kept ? impact.promisesKept : impact.promisesBroken).push(tag.issue);
    impact.integrity += kept ? DECISION_EFFECT.promiseKeptIntegrity : DECISION_EFFECT.promiseBrokenIntegrity;
    const bump = kept ? DECISION_EFFECT.promiseKeptEffect : DECISION_EFFECT.promiseBrokenEffect;
    const target = inOffice ? impact.approval : impact.favorability;
    for (const id of home) target[id] = (target[id] ?? 0) + bump;
  }
  return impact;
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
  const office = state.career.office;
  const approval = office ? { ...office.approval } : undefined;
  const record = { ...state.record };
  const promises: PromiseEvent[] = [...state.promises];
  let integrity = state.integrity;
  let funds = state.funds;
  const officeId = jurisdictionOffice(state);
  const home = officeId ? getOffice(officeId).regionIds : [];
  const notes: string[] = [];
  const at = { year: state.clock.year, turn: state.clock.turn };

  for (const id of hand.cardIds) {
    const card = getDecisionCard(id);
    if (!apply.includes(id)) {
      if (card.rejectCost) {
        for (const r of home) {
          if (approval) approval[r] = nudgeApproval(approval[r]!, -card.rejectCost);
          else regions[r] = { ...regions[r]!, favorability: nudgeFavorability(regions[r]!.favorability, -card.rejectCost) };
        }
      }
      continue;
    }
    const impact = decisionImpact(state, card);
    for (const [r, dF] of Object.entries(impact.favorability)) {
      regions[r] = { ...regions[r]!, favorability: nudgeFavorability(regions[r]!.favorability, dF) };
    }
    if (approval) for (const [r, dA] of Object.entries(impact.approval)) approval[r] = nudgeApproval(approval[r]!, dA);
    for (const r of home) regions[r] = { ...regions[r]!, recognition: nudgeRecognition(regions[r]!.recognition, DECISION_EFFECT.press) };
    for (const tag of card.tags) {
      const old = record[tag.issue];
      record[tag.issue] = old === undefined ? tag.stance : old + (tag.stance - old) * DECISION_EFFECT.recordPull;
    }
    integrity += impact.integrity;
    funds += impact.funds;
    for (const issue of impact.promisesKept) promises.push({ ...at, title: card.title, issue, kept: true });
    for (const issue of impact.promisesBroken) promises.push({ ...at, title: card.title, issue, kept: false });
    if (impact.promisesBroken.length) notes.push(`broke a promise with “${card.title}”`);
    else if (impact.promisesKept.length) notes.push(`kept a promise with “${card.title}”`);
  }

  const verb = office ? 'Signed' : 'Backed';
  const titles = apply.map((id) => getDecisionCard(id).title).join(', ');
  return {
    ...state,
    regions,
    record,
    funds,
    promises,
    integrity: clamp(Math.round(integrity), 0, 100),
    career: office && approval ? { ...state.career, office: { ...office, approval } } : state.career,
    decisions: { ...hand, resolved: true, applied: [...apply] },
    log: [...state.log, { ...at, text: `${verb}: ${titles}.${notes.length ? ` You ${notes.join('; ')}.` : ''}` }],
  };
}
