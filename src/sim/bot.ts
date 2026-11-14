// A simple "sensible player" bot used to measure balance (DESIGN §12).
import { BASIC_CARD_IDS, getDecisionCard, getItem, getOffice, getPerson, getRegion, ISSUE_IDS } from '../data';
import {
  activePlatform,
  applyAction,
  counted,
  createScenarioRun,
  fileRaceError,
  lawyersError,
  mobilizeError,
  nightFinished,
  nightView,
  hometownMayoralty,
  invitations,
  joinError,
  raceOptions,
  buyError,
  offerPrice,
  autoAllocate,
  buildRunConfig,
  createRun,
  decisionImpact,
  DECISIONS_PER_TURN,
  previewEvent,
  regionWeights,
  relevance,
} from '../engine';
import type { CreationInput, GameState, IssueId, PartyId, Pledge } from '../engine';

/** 'flipflop' campaigns sensibly but, in office, signs bills that break its promises. */
/** 'climber' plays like 'sensible', joins its best-fitting party and runs for higher office. */
export type BotStyle = 'sensible' | 'idle' | 'contrarian' | 'investor' | 'flipflop' | 'climber';

/** Platform fitted to the race's voters (or deliberately against them). */
export function botPlatform(state: GameState, style: BotStyle): Pledge[] {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const avg = (issue: IssueId, key: 'issueOpinion' | 'issueSalience') =>
    office.regionIds.reduce((sum, id) => sum + getRegion(id)[key][issue] * weights[id]!, 0);
  return ISSUE_IDS.map((issue) => ({
    issue,
    score: avg(issue, 'issueSalience') * relevance(issue, office.level),
    opinion: avg(issue, 'issueOpinion'),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ issue, opinion }) => {
      const sign = (opinion < 0 ? -1 : 1) * (style === 'contrarian' ? -1 : 1);
      return { issue, stance: sign * (Math.abs(opinion) >= 1 ? 2 : 1) };
    });
}

function jurisdictionId(state: GameState): string | undefined {
  return state.career.race?.officeId ?? state.career.office?.officeId;
}

function score(state: GameState, effects: { regionId: string; dRecognition: number; dFavorability: number }[]): number {
  const id = jurisdictionId(state);
  if (!id) return 0;
  const weights = regionWeights(id);
  return effects.reduce((sum, e) => sum + (weights[e.regionId] ?? 0) * (e.dFavorability * 2 + e.dRecognition), 0);
}

/** How much a dollar is worth, in the same units as favorability gains. */
function moneyWeight(style: BotStyle): number {
  return style === 'investor' ? 1 / 2e5 : 1 / 1e6;
}

function decide(state: GameState, style: BotStyle): string[] {
  const ids = state.decisions!.cardIds;
  if (style === 'idle' || style === 'contrarian') return [ids[0]!];
  const jid = jurisdictionId(state);
  const weights = jid ? regionWeights(jid) : {};
  if (style === 'flipflop' && state.career.office) {
    const breakers = ids.filter((id) => decisionImpact(state, getDecisionCard(id)).promisesBroken.length > 0);
    if (breakers.length) return breakers.slice(0, DECISIONS_PER_TURN);
  }
  const ranked = ids
    .map((id) => {
      const impact = decisionImpact(state, getDecisionCard(id));
      const fav = Object.entries(impact.favorability).reduce((s, [r, v]) => s + (weights[r] ?? 0) * v, 0);
      const appr = Object.entries(impact.approval).reduce((s, [r, v]) => s + (weights[r] ?? 0) * v, 0);
      const party = style === 'climber' ? impact.standing * 0.004 : 0;
      return { id, value: fav + appr + party + impact.integrity * 0.002 + impact.funds * moneyWeight(style) };
    })
    .sort((a, b) => b.value - a.value);
  const good = ranked.filter((r) => r.value > 0).map((r) => r.id);
  return (good.length ? good : [ranked[0]!.id]).slice(0, DECISIONS_PER_TURN);
}

/** Best expected value of holding this card somewhere in the race, on some platform topic. */
function cardValue(state: GameState, cardId: string, style: BotStyle): number {
  const jid = jurisdictionId(state);
  const platform = activePlatform(state);
  if (!jid || !platform.length) return 0;
  const probe: GameState = { ...state, energy: 99, hand: [...state.hand, { uid: -1, cardId }] };
  let best = 0;
  for (const regionId of getOffice(jid).regionIds) {
    for (const p of platform) {
      const pv = previewEvent(probe, -1, regionId, p.issue);
      if (!pv.error) best = Math.max(best, score(probe, pv.effects) + pv.fundsGain * moneyWeight(style));
    }
  }
  return best;
}

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

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
      if (o.kind === 'person') {
        // Hire if the role is empty or this person outranks the holder, and it's not most of the bank.
        const person = getPerson(o.cardId);
        const holder = s.team.assigned[person.role];
        const current = holder !== undefined ? getPerson(s.team.cards.find((c) => c.uid === holder)!.personId) : undefined;
        const better = !current || RARITY_RANK[person.rarity] > RARITY_RANK[current.rarity];
        if (better && price <= s.funds * 0.4) pick = { index, value: Infinity };
        return;
      }
      const value = cardValue(s, o.cardId, style) / (price + 3000);
      if (value > 1e-7 && (!pick || value > pick.value)) pick = { index, value };
    });
    if (!pick) break;
    const bought = s.market!.offers[pick.index]!;
    s = applyAction(s, { type: 'BUY_CARD', offerIndex: pick.index });
    if (bought.kind === 'person') {
      // Bought people go to reserve if the role is taken; the bot only buys upgrades, so swap them in.
      s = applyAction(s, { type: 'ASSIGN_PERSON', uid: s.team.cards.at(-1)!.uid });
    }
  }
  return s;
}

function playEvents(state: GameState, style: BotStyle): GameState {
  let s = state;
  const jid = jurisdictionId(s);
  const platform = activePlatform(s);
  if (!jid || !platform.length) return s;
  const office = getOffice(jid);
  for (let guard = 0; guard < 20; guard++) {
    let best: { ref: number | string; regionId: string; issue: IssueId; value: number } | undefined;
    const refs: (number | string)[] = [...s.hand.map((c) => c.uid), ...BASIC_CARD_IDS];
    for (const ref of refs) {
      for (const regionId of office.regionIds) {
        for (const p of platform) {
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

const LADDER: Record<string, number> = { mayor: 0, house: 1, senate: 2, governor: 3 };

/** Join the best-fitting party once noticed; file for the next rung when a race opens this year. */
let forcedParty: PartyId | undefined;

function climb(state: GameState): GameState {
  let s = state;
  if (s.career.affiliation === 'IND' && s.elections.length && !s.career.race) {
    const best = invitations(s)
      .filter((i) => !forcedParty || i.party === forcedParty)
      .sort((a, b) => b.alignment - a.alignment)[0];
    if (best && !joinError(s, best.party)) s = applyAction(s, { type: 'JOIN_PARTY', party: best.party });
  }
  const office = s.career.office;
  const autoReelection = s.career.race?.officeId === office?.officeId && !s.career.race?.platform.length;
  if (!office || (s.career.race && !autoReelection) || s.clock.turn !== 0 || s.career.affiliation === 'IND') return s;
  const rung = LADDER[getOffice(office.officeId).level]!;
  const home = s.politician.residentRegionId;
  const targets = raceOptions(s)
    .filter((o) => o.eligible && o.electionYear === s.clock.year && !fileRaceError(s, o.officeId))
    .map((o) => getOffice(o.officeId))
    .filter((o) => LADDER[o.level]! > rung && (o.level !== 'house' || o.regionIds.includes(home)) && o.level !== 'senate')
    .sort((a, b) => LADDER[a.level]! - LADDER[b.level]!);
  const next = targets[0];
  return next ? applyAction(s, { type: 'FILE_RACE', officeId: next.id }) : s;
}

/**
 * Election night for the bot. 'sensible' and friends use night items, spend tokens on the
 * biggest still-uncounted regions once the first returns are in, and send lawyers where it's
 * tight; 'idle' (and `actions: false`) just watches.
 */
export function playNight(state: GameState, style: BotStyle, actions = true): GameState {
  let s = state;
  const act = actions && style !== 'idle';
  for (let guard = 0; guard < 40 && s.night && !nightFinished(s.night); guard++) {
    if (act) {
      const night = s.night;
      for (const item of s.items) {
        const meta = getItem(item.itemId);
        if (meta.window === 'campaign') continue;
        const open = Object.keys(night.regions).filter((id) => counted(night.regions[id]!, night.step) < 1);
        const target = open.sort((a, b) => getRegion(b).population - getRegion(a).population)[0];
        if (meta.targetsRegion && !target) continue;
        try {
          s = applyAction(s, { type: 'USE_ITEM', uid: item.uid, regionId: target });
        } catch {
          // e.g. already protected; skip
        }
      }
      if (s.night!.step >= 1) {
        for (let k = 0; k < 10 && s.night!.tokens > 0; k++) {
          const n = s.night!;
          const open = Object.keys(n.regions)
            .filter((id) => !mobilizeError(s, id))
            .sort(
              (a, b) =>
                getRegion(b).population * (1 - counted(n.regions[b]!, n.step)) -
                getRegion(a).population * (1 - counted(n.regions[a]!, n.step)),
            );
          if (!open.length) break;
          const view = nightView(n);
          // Lawyers where it's close and half counted; otherwise mobilize the biggest uncounted region.
          const close = Object.keys(n.regions).find(
            (id) => !lawyersError(s, id) && counted(n.regions[id]!, n.step) >= 0.3 && Math.abs(view.margin) < 0.03,
          );
          s = close
            ? applyAction(s, { type: 'NIGHT_LAWYERS', regionId: close })
            : applyAction(s, { type: 'NIGHT_MOBILIZE', regionId: open[0]! });
        }
      }
    }
    s = applyAction(s, { type: 'NIGHT_ADVANCE' });
  }
  return s.night ? applyAction(s, { type: 'NIGHT_FINISH' }) : s;
}

/** One full turn: dismiss results, file/platform if needed, decide, shop, campaign, end turn. */
/** Turn election-night actions off to measure how much they matter. */
let nightActions = true;
export function setNightActions(on: boolean): void {
  nightActions = on;
}

export function playTurn(state: GameState, style: BotStyle): GameState {
  let s = state;
  if (s.ended) return s;
  if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
  if (s.ended) return s;
  if (style === 'climber') s = climb(s);
  if (!s.career.race && !s.career.office) {
    const last = [...s.elections].reverse().find((e) => e.kind === 'general');
    const officeId =
      last && !getOffice(last.officeId).partisan ? last.officeId : (hometownMayoralty(s.politician.residentRegionId) ?? 'mayor-watertown');
    if (!fileRaceError(s, officeId)) s = applyAction(s, { type: 'FILE_RACE', officeId });
  }
  if (s.career.race && !s.career.race.platform.length) s = applyAction(s, { type: 'SET_PLATFORM', platform: botPlatform(s, style) });
  if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: decide(s, style) });
  s = shop(s, style);
  if (style !== 'idle') s = playEvents(s, style);
  s = applyAction(s, { type: 'END_TURN' });
  return s.night ? playNight(s, style, nightActions) : s;
}

/** Funds over a multi-year career. */
export function careerFunds(
  input: CreationInput,
  style: BotStyle,
  turns: number,
  seed: string,
): { funds: number; peak: number; fundraising: number } {
  let s = createRun(buildRunConfig(input, seed));
  let peak = s.funds;
  for (let i = 0; i < turns && !s.ended; i++) {
    s = playTurn(s, style);
    peak = Math.max(peak, s.funds);
  }
  return { funds: s.funds, peak, fundraising: s.politician.skills.economics };
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

/** A test character; native to the resident state unless `homeState` says otherwise. */
export function botCharacter(residentRegionId: string, backgroundId = 'public_servant', age = 35, homeState?: string): CreationInput {
  return {
    name: 'Bot',
    gender: 'female',
    age,
    homeState: homeState ?? getRegion(residentRegionId).state,
    residentRegionId,
    backgroundId,
    allocation: autoAllocate(backgroundId, age),
  };
}

/** Win rate for a character's hometown mayoral race across seeds. */
export function hometownWinRate(input: CreationInput, style: BotStyle, runs: number): { winRate: number; avgShare: number } {
  let wins = 0;
  let share = 0;
  for (let i = 0; i < runs; i++) {
    const start = createRun(buildRunConfig(input, `sim-${style}-${input.residentRegionId}-${input.backgroundId}-${i}`));
    const { result } = playCampaign(start, style);
    if (result.won) wins++;
    share += result.share;
  }
  return { winRate: wins / runs, avgShare: share / runs };
}

/** First-term mayors who campaign sensibly, then govern in `style`: how often are they re-elected? */
export function reelectionRate(
  input: CreationInput,
  style: BotStyle,
  runs: number,
  /** Applied once, right after the first win (e.g. to hand the mayor a chief of staff). */
  setup: (s: GameState) => GameState = (s) => s,
): { reelected: number; terms: number; avgApproval: number; integrity: number } {
  let reelected = 0;
  let terms = 0;
  let approval = 0;
  let integrity = 0;
  for (let i = 0; i < runs; i++) {
    let s = createRun(buildRunConfig(input, `reelect-${input.residentRegionId}-${i}`));
    s = playCampaign(s, 'sensible').state;
    if (!s.elections.at(-1)!.playerWon) continue;
    s = setup(s);
    terms++;
    for (let guard = 0; guard < 30 && s.elections.length < 2 && !s.ended; guard++) {
      const before = s;
      s = playTurn(s, style);
      if (before.career.race === undefined && s.career.race) {
        approval += Object.values(s.career.office!.approval).reduce((a, b) => a + b, 0) / Object.keys(s.career.office!.approval).length;
        integrity += s.integrity;
      }
    }
    if (s.elections[1]?.playerWon) reelected++;
  }
  return {
    reelected: reelected / Math.max(1, terms),
    terms,
    avgApproval: approval / Math.max(1, terms),
    integrity: integrity / Math.max(1, terms),
  };
}

export interface ClimbResult {
  highest: string;
  party: string;
  reachedHouse: boolean;
  reachedGovernor: boolean;
  /** Result of the first general election for Governor, if any. */
  firstGovernorTry?: boolean;
  houseTries: number;
  firstHouseTry?: boolean;
  years: number;
}

/** A whole career for the climber, up to `turns` turns. */
export function climbCareer(input: CreationInput, turns: number, seed: string, party?: PartyId): ClimbResult {
  forcedParty = party;
  let s = createRun(buildRunConfig(input, seed));
  let highest = 'none';
  for (let i = 0; i < turns && !s.ended; i++) {
    s = playTurn(s, 'climber');
    const level = s.career.office ? getOffice(s.career.office.officeId).level : undefined;
    if (level && (highest === 'none' || LADDER[level]! > LADDER[highest]!)) highest = level;
    if (highest === 'governor') break;
  }
  forcedParty = undefined;
  return {
    highest,
    party: s.career.affiliation,
    reachedHouse: highest === 'house' || highest === 'governor',
    reachedGovernor: highest === 'governor',
    firstGovernorTry: s.elections.find((e) => e.kind === 'general' && e.officeId === 'governor-ny')?.playerWon,
    firstHouseTry: s.elections.find((e) => e.kind === 'general' && getOffice(e.officeId).level === 'house')?.playerWon,
    houseTries: s.elections.filter((e) => e.kind === 'general' && getOffice(e.officeId).level === 'house').length,
    years: s.clock.year - 2027,
  };
}

/** The style a sensible player would use for each beginner scenario. */
export const SCENARIO_STYLE: Record<string, BotStyle> = {
  hometown_favorite: 'sensible',
  keep_your_word: 'sensible',
  pick_a_side: 'climber',
  big_city_small_town: 'climber',
};

/** Plays a scenario to its end. */
export function playScenario(
  scenarioId: string,
  seed: string,
  artifacts: string[] = [],
  style: BotStyle = SCENARIO_STYLE[scenarioId] ?? 'sensible',
): GameState {
  forcedParty = undefined;
  let s = createScenarioRun(scenarioId, { name: 'Bot', artifacts, seed });
  for (let guard = 0; guard < 120 && !s.scenario?.result; guard++) s = playTurn(s, style);
  return s;
}

export function scenarioRate(scenarioId: string, runs: number, artifacts: string[] = []): { winRate: number; avgStars: number } {
  let wins = 0;
  let stars = 0;
  for (let i = 0; i < runs; i++) {
    const r = playScenario(scenarioId, `scn-${scenarioId}-${i}`, artifacts).scenario!.result!;
    if (r.won) wins++;
    stars += r.stars.length;
  }
  return { winRate: wins / runs, avgStars: stars / runs };
}
