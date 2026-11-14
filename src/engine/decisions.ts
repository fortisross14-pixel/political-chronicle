// Decision cards: 3 per turn, apply 1–3, never 0 (DESIGN §6.3).
// Campaigning they are campaign moments (move favorability); in office they are bills and
// executive actions (move job approval, which favorability then follows).
import { reject } from './errors';
import { DECISION_CARDS, getBackground, getDecisionCard, getOffice, getRegion, STATES } from '../data';
import { activeLevel, turnNo } from './events';
import { executionMultiplier, nudgeApproval } from './governing';
import { passageChance, rollPassage, yourChamber } from './legislature';
import { effectiveSkills, hasPerk } from './people';
import { hasAbility } from './traits';
import { adjustStanding, effectivePlatform, member, PARTY, stanceAgreement } from './parties';
import { clamp, nudgeFavorability, nudgeRecognition, regionAlignment, relevance } from './opinion';
import { Rng } from './rng';
import type { DecisionCard, GameState, IssueId, Pledge, PromiseEvent, RegionId } from './types';

export const DECISIONS_PER_TURN = 3;
/** Strategy 7+ spots an extra opportunity: 4 cards dealt (you still apply at most 3). */
export const STRATEGY_EXTRA_CARD = 7;

export function handSize(state: GameState): number {
  return effectiveSkills(state).strategy >= STRATEGY_EXTRA_CARD ? DECISIONS_PER_TURN + 1 : DECISIONS_PER_TURN;
}

/** Leadership (and a veteran's calm) cut what declining a crisis costs. */
export function crisisCostMultiplier(state: GameState): number {
  const lea = clamp(1.25 - 0.05 * effectiveSkills(state).leadership, 0.6, 1.25);
  return lea * (getBackground(state.politician.backgroundId).perks.crisisCost ?? 1) * (hasPerk(state, 'fixer') ? 0.5 : 1);
}
const RECENT_MEMORY = 9;

export const DECISION_EFFECT = {
  /** Favorability (campaigning: a public stance) per unit of salience × alignment in the jurisdiction. */
  favorability: 0.05,
  /** Approval (in office: a law you sign) per unit of salience × alignment in the jurisdiction. */
  approval: 0.07,
  /** A signed law also moves how the whole jurisdiction feels about you. */
  lawFavorability: 0.03,
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
  const size = handSize(state);
  const cardIds = rng
    .shuffle(fresh.length >= size ? fresh : pool)
    .slice(0, size)
    .map((c) => c.id);
  return {
    ...state,
    rng: rng.state,
    decisions: { turnNo: now, cardIds, resolved: false, applied: [] },
    recentDecisionIds: [...state.recentDecisionIds, ...cardIds].slice(-RECENT_MEMORY),
  };
}

export function jurisdictionOffice(state: GameState): string | undefined {
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
  /** Party standing change (members only). */
  standing: number;
  /** Rejecting this card costs standing (a whip vote the party wants applied). */
  rejectStanding: number;
  /** Chance it passes the legislature (1 when no vote is needed). */
  passage: number;
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
    standing: 0,
    rejectStanding: 0,
    passage: passageChance(state, card),
    promisesKept: [],
    promisesBroken: [],
  };
  const officeId = jurisdictionOffice(state);
  if (!officeId) return impact;
  const inOffice = !!state.career.office;
  const office = getOffice(officeId);
  const home = office.regionIds;
  const level = office.level;

  // The jurisdiction (districts or a city's neighborhoods), plus the rest of the state for spillover;
  // a city's own district hears about it through its neighborhoods (levels.ts).
  const parents = new Set(home.map((id) => getRegion(id).parent).filter(Boolean));
  const areas = [...new Set([...home, ...STATES[office.state]!.regionIds.filter((id) => !parents.has(id))])];
  for (const id of areas) {
    const region = getRegion(id);
    let fit = 0;
    for (const tag of card.tags)
      fit += region.issueSalience[tag.issue] * regionAlignment(id, tag.issue, tag.stance) * relevance(tag.issue, level);
    if (home.includes(id)) {
      if (inOffice) {
        const exec = executionMultiplier(
          state,
          card.tags.some((t) => t.issue === 'taxes'),
        );
        impact.approval[id] = DECISION_EFFECT.approval * fit * exec;
        impact.favorability[id] = DECISION_EFFECT.lawFavorability * fit * exec;
      } else impact.favorability[id] = DECISION_EFFECT.favorability * fit;
    } else {
      impact.favorability[id] = DECISION_EFFECT.favorability * fit * DECISION_EFFECT.spillover;
    }
  }

  const party = member(state);
  if (party) {
    const platform = effectivePlatform(party, office.state);
    const whip = card.partyPriority === party ? PARTY.priorityMultiplier : 1;
    let agreement = 0;
    for (const tag of card.tags) {
      const a = stanceAgreement(state, party, tag.issue, tag.stance);
      impact.standing += PARTY.perTag * platform[tag.issue].weight * a * whip;
      agreement += a;
    }
    if (card.partyPriority === party && agreement > 0) impact.rejectStanding = PARTY.priorityRejected;
  }

  for (const tag of card.tags) {
    const pledge = promisesInForce(state).find((p) => p.issue === tag.issue);
    // A neutral position promises nothing either way.
    if (!pledge || Math.abs(pledge.stance) < 1e-6) continue;
    const kept = Math.sign(pledge.stance) === Math.sign(tag.stance);
    (kept ? impact.promisesKept : impact.promisesBroken).push(tag.issue);
    impact.integrity += kept
      ? DECISION_EFFECT.promiseKeptIntegrity
      : DECISION_EFFECT.promiseBrokenIntegrity * (hasAbility(state, 'iron_discipline') ? 0.5 : 1);
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
  reject(error);
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
  let standing = 0;
  const rng = new Rng(state.rng);
  const failed: string[] = [];

  for (const id of hand.cardIds) {
    const card = getDecisionCard(id);
    if (!apply.includes(id)) {
      standing += decisionImpact(state, card).rejectStanding;
      if (card.rejectCost) {
        const cost = card.rejectCost * crisisCostMultiplier(state);
        for (const r of home) {
          if (approval) approval[r] = nudgeApproval(approval[r]!, -cost);
          else regions[r] = { ...regions[r]!, favorability: nudgeFavorability(regions[r]!.favorability, -cost) };
        }
      }
      continue;
    }
    const impact = decisionImpact(state, card);
    if (!rollPassage(state, card, rng)) {
      // It died in the legislature: no policy effect, but you get half credit for fighting for it.
      failed.push(id);
      standing += impact.standing;
      integrity += impact.promisesKept.length * Math.round(DECISION_EFFECT.promiseKeptIntegrity / 2);
      if (approval)
        for (const r of home)
          approval[r] = nudgeApproval(approval[r]!, impact.promisesKept.length * DECISION_EFFECT.promiseKeptEffect * 0.5);
      notes.push(`“${card.title}” failed in ${yourChamber(state)?.name ?? 'the legislature'}`);
      continue;
    }
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
    standing += impact.standing;
    for (const issue of impact.promisesKept) promises.push({ ...at, title: card.title, issue, kept: true });
    for (const issue of impact.promisesBroken) promises.push({ ...at, title: card.title, issue, kept: false });
    if (impact.promisesBroken.length) notes.push(`broke a promise with “${card.title}”`);
    else if (impact.promisesKept.length) notes.push(`kept a promise with “${card.title}”`);
  }

  // Force the vote is spent on the first bill that needed the chamber.
  const forced = !!office?.forceVote && apply.some((id) => getDecisionCard(id).context === 'office' && getDecisionCard(id).tags.length > 0);
  const verb = office ? 'Signed' : 'Backed';
  const titles = apply.map((id) => getDecisionCard(id).title).join(', ');
  return adjustStanding(
    {
      ...state,
      regions,
      record,
      funds,
      promises,
      integrity: clamp(Math.round(integrity), 0, 100),
      career:
        office && approval ? { ...state.career, office: { ...office, approval, ...(forced ? { forceVote: false } : {}) } } : state.career,
      rng: rng.state,
      decisions: { ...hand, resolved: true, applied: [...apply], failed },
      log: [
        ...state.log,
        {
          ...at,
          text: `${verb}: ${titles}.${notes.length ? ` ${notes.map((n) => (n.startsWith('“') ? n : `You ${n}`)).join('; ')}.` : ''}`,
        },
      ],
    },
    standing,
  );
}
