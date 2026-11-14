// Money: income, upkeep, the Market and skill growth (DESIGN §6.2, §9).
import { EVENT_CARDS, getEventCard, getOffice, getRegion, getSkillCard, MARKET_COST_FACTOR, MARKET_WEIGHTS, SKILL_CARDS } from '../data';
import type { SkillCard } from '../data';
import { turnNo } from './events';
import { poll } from './opinion';
import { adjustStanding, partyFunds } from './parties';
import { native, TRAITS } from './traits';
import { Rng } from './rng';
import { monthsFactor } from './time';
import type { EventCard, GameState, IncomeBreakdown, MarketOffer, OfficeLevel, RegionId } from './types';

export const HAND_LIMIT = 8;
export const MARKET_SIZE = 6;
export const MARKET_SKILL_OFFERS = 2;

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

export function skillPrice(card: SkillCard, state: GameState): number {
  return card.pricePerLevel * state.politician.skills[card.skill];
}

export function offerPrice(offer: MarketOffer, state: GameState): number {
  return offer.kind === 'event' ? eventPrice(getEventCard(offer.cardId), state) : skillPrice(getSkillCard(offer.cardId), state);
}

// ---------- Income ----------

/** Parties spend where races are close: 1 for a toss-up, down to 0.3 for a blowout; 0.6 between races. */
export function competitiveness(state: GameState): number {
  const race = state.career.race;
  if (!race?.platform.length) return 0.6;
  const you = poll(state, race).decided[0]!;
  return Math.max(0.3, 1 - Math.abs(you - 0.5) * 1.2);
}

export function projectedIncome(state: GameState): Omit<IncomeBreakdown, 'quit'> {
  const f = monthsFactor(state.clock);
  const regions = economicJurisdiction(state);
  const outsiders = native(state) ? 0 : (TRAITS.outsideDonorBase * state.politician.skills.economics) / 3;
  const recognition = weightsOf(regions).reduce((s, [id, w]) => s + w * state.regions[id]!.recognition, 0);
  const phase = state.career.race ? INCOME.campaignMultiplier : state.career.office ? INCOME.officeMultiplier : INCOME.idleMultiplier;
  const statewide = regions.length > 1;
  const donors =
    (INCOME.donorBase + INCOME.donorPerFundraisingRecognition * state.politician.skills.economics * recognition + outsiders) *
    (statewide ? INCOME.statewideMultiplier : 1) *
    phase *
    f;
  const salary = state.career.office ? SALARY[getOffice(state.career.office.officeId).level] * f : 0;
  const upkeep = state.staff.reduce((s, m) => s + m.upkeep, 0) * f;
  const round = (v: number) => Math.round(v / 100) * 100;
  return { donors: round(donors), salary: round(salary), upkeep: round(upkeep), party: partyFunds(state, competitiveness(state)) };
}

/** Start-of-turn money: donors and salary in, staff salaries out. Unpaid staff quit. */
export function collectIncome(state: GameState): GameState {
  if (state.ended) return state;
  const income = projectedIncome(state);
  let funds = state.funds + income.donors + income.salary + income.party;
  let staff = [...state.staff];
  const skills = { ...state.politician.skills };
  const quit: string[] = [];
  const f = monthsFactor(state.clock);
  while (staff.length && funds < staff.reduce((s, m) => s + m.upkeep * f, 0)) {
    const leaving = staff.pop()!;
    quit.push(leaving.cardId);
    skills[leaving.skill] = Math.max(1, skills[leaving.skill] - 1);
  }
  const upkeep = Math.round(staff.reduce((s, m) => s + m.upkeep * f, 0) / 100) * 100;
  funds -= upkeep;
  const log = quit.length
    ? [...state.log, { year: state.clock.year, turn: state.clock.turn, text: `Couldn’t make payroll: ${quit.map((id) => getSkillCard(id).name.replace(/^Hire an? /, '')).join(', ')} quit.` }]
    : state.log;
  return {
    ...state,
    funds,
    staff,
    politician: { ...state.politician, skills },
    lastIncome: { donors: income.donors, salary: income.salary, upkeep, party: income.party, quit },
    log,
  };
}

// ---------- Market ----------

function availableSkillCards(state: GameState): SkillCard[] {
  const cap = skillCap(state);
  return SKILL_CARDS.filter(
    (c) => (!c.requiresParty || state.career.affiliation !== 'IND') && state.politician.skills[c.skill] < cap && !state.staff.some((m) => m.cardId === c.id),
  );
}

function weightedPick(rng: Rng, weights: [string, number][]): string {
  let roll = rng.float() * weights.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of weights) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return weights.at(-1)![0];
}

/** Deals this turn's 6 offers if not dealt yet. */
export function dealMarket(state: GameState): GameState {
  const now = turnNo(state);
  if (state.ended || state.market?.turnNo === now) return state;
  const rng = new Rng(state.rng);
  const skills = rng.shuffle(availableSkillCards(state)).slice(0, MARKET_SKILL_OFFERS);
  const offers: MarketOffer[] = skills.map((c) => ({ kind: 'skill', cardId: c.id }));
  const eventWeights = EVENT_CARDS.filter((c) => MARKET_WEIGHTS[c.id] && (!c.requiresParty || state.career.affiliation !== 'IND')).map(
    (c) => [c.id, MARKET_WEIGHTS[c.id]!] as [string, number],
  );
  while (offers.length < MARKET_SIZE) offers.push({ kind: 'event', cardId: weightedPick(rng, eventWeights) });
  return { ...state, rng: rng.state, market: { turnNo: now, offers: rng.shuffle(offers) } };
}

export function buyError(state: GameState, offerIndex: number): string | undefined {
  if (state.ended) return 'Your career is over.';
  const offer = state.market?.offers[offerIndex];
  if (!offer) return 'That offer is gone.';
  if (offerPrice(offer, state) > state.funds) return 'Not enough funds.';
  if (offer.kind === 'event') {
    if (state.hand.length >= HAND_LIMIT) return `Your hand is full (${HAND_LIMIT} cards). Play some first.`;
  } else {
    const card = getSkillCard(offer.cardId);
    if (state.politician.skills[card.skill] >= skillCap(state)) return `Skill capped at ${skillCap(state)} at your current office.`;
    if (card.energy > state.energy) return 'Not enough energy this turn.';
    if (card.requiresParty && state.career.affiliation === 'IND') return 'Party members only.';
  }
  return undefined;
}

export function buyOffer(state: GameState, offerIndex: number): GameState {
  const error = buyError(state, offerIndex);
  if (error) throw new Error(error);
  const offer = state.market!.offers[offerIndex]!;
  const price = offerPrice(offer, state);
  const offers = state.market!.offers.filter((_, i) => i !== offerIndex);
  const base = { ...state, funds: state.funds - price, market: { ...state.market!, offers } };
  const entry = (text: string) => [...state.log, { year: state.clock.year, turn: state.clock.turn, text }];

  if (offer.kind === 'event') {
    return {
      ...base,
      hand: [...state.hand, { uid: state.nextCardUid, cardId: offer.cardId }],
      nextCardUid: state.nextCardUid + 1,
      log: entry(`Bought ${getEventCard(offer.cardId).name} for $${price.toLocaleString('en-US')}.`),
    };
  }
  const card = getSkillCard(offer.cardId);
  const skills = { ...state.politician.skills, [card.skill]: state.politician.skills[card.skill] + 1 };
  const withStanding = card.standing ? adjustStanding(base, card.standing) : base;
  return {
    ...withStanding,
    energy: state.energy - card.energy,
    politician: { ...state.politician, skills },
    staff: card.upkeep ? [...state.staff, { cardId: card.id, skill: card.skill, upkeep: card.upkeep }] : state.staff,
    log: entry(`${card.name}: ${card.skill} is now ${skills[card.skill]}.`),
  };
}
