// A simple "sensible player" bot used to measure balance (DESIGN §12).
import { BASIC_CARD_IDS, getDecisionCard, getItem, getOffice, getPerson, getPolicyCard, getRegion, getTrinket, ISSUE_IDS } from '../data';
import {
  isSkillCard,
  missionBaseSkills,
  MISSION_EXTRA_POINTS,
  MISSION_SKILL_CAP,
  policyJurisdiction,
  trinketError,
  activePlatform,
  applyAction,
  askError,
  campaignWindow,
  counted,
  createScenarioRun,
  donationNorm,
  joinChance,
  lawyersError,
  mobilizeError,
  nightFinished,
  nightView,
  hometownMayoralty,
  invitations,
  launchError,
  raceBoard,
  autoAllocate,
  buildRunConfig,
  buyPackError,
  createRun,
  decisionImpact,
  DECISIONS_PER_TURN,
  MAX_PLATFORM,
  packPrice,
  policyError,
  positionOf,
  previewEvent,
  regionWeights,
  relevance,
  roleActive,
  ROLES,
  stanceAt,
} from '../engine';
import type { CreationInput, GameState, IssueId, OfficeId, PartyId, Pledge, Rarity, SkillId } from '../engine';

/** 'flipflop' campaigns sensibly but, in office, signs bills that break its promises. */
/** 'climber' plays like 'sensible', joins its best-fitting party and runs for higher office. */
export type BotStyle = 'sensible' | 'idle' | 'contrarian' | 'investor' | 'flipflop' | 'climber';

/** Platform fitted to an office's voters (or deliberately against them), on the 7-step scale. */
export function botPlatform(state: GameState, style: BotStyle, officeId: OfficeId): Pledge[] {
  const office = getOffice(officeId);
  const weights = regionWeights(officeId);
  const avg = (issue: IssueId, key: 'issueOpinion' | 'issueSalience') =>
    office.regionIds.reduce((sum, id) => sum + getRegion(id)[key][issue] * weights[id]!, 0);
  const ideal = ISSUE_IDS.map((issue) => ({
    issue,
    score: avg(issue, 'issueSalience') * relevance(issue, office.level),
    opinion: avg(issue, 'issueOpinion'),
  }))
    .sort((a, b) => b.score - a.score)
    .map(({ issue, opinion }) => {
      const pos = positionOf(opinion) || (opinion < 0 ? -1 : 1);
      return { issue, stance: stanceAt(style === 'contrarian' ? -pos : pos) };
    });
  const prev = state.career.platform;
  if (!prev?.length) return ideal.slice(0, MAX_PLATFORM);
  // Later campaigns, within the rules: drop the worst-fitting topic, move the next-worst one step
  // toward these voters, and top up with the best new topics.
  const fit = (p: Pledge) => avg(p.issue, 'issueSalience') * (1 - Math.abs(p.stance - avg(p.issue, 'issueOpinion')) / 1.5);
  const ranked = [...prev].sort((a, b) => fit(a) - fit(b));
  const kept = ranked.slice(prev.length > 1 ? 1 : 0).map((p) => ({ ...p }));
  const worst = kept[0];
  if (worst && kept.length > 1) {
    const pos = positionOf(worst.stance);
    const target = positionOf(avg(worst.issue, 'issueOpinion'));
    if (target !== pos) worst.stance = stanceAt(pos + Math.sign(target - pos));
  }
  const extra = ideal.filter((p) => !prev.some((q) => q.issue === p.issue)).slice(0, MAX_PLATFORM - kept.length);
  return [...kept, ...extra];
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

/** Keeps the best of each pack: every person (roster permitting), the most valuable single card. */
function openPacks(state: GameState, style: BotStyle): GameState {
  let s = state;
  for (let guard = 0; guard < 10 && s.packs.length; guard++) {
    const pack = s.packs[0]!;
    let keep: number[] = [];
    if (pack.kind === 'people') keep = pack.cards.map((_, i) => i).slice(0, Math.max(0, 10 - s.team.cards.length));
    else if (style !== 'idle') {
      const rank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;
      const scored = pack.cards.map((id, i) => ({ i, r: isSkillCard(id) ? -1 : rank[cardRarityOf(pack.kind, id)] }));
      const room = pack.kind === 'policy' ? 5 - s.policyHand.length : 8 - s.hand.length - s.items.length;
      if (room > 0) keep = [scored.sort((a, b) => b.r - a.r)[0]!.i];
    }
    s = applyAction(s, { type: 'KEEP_FROM_PACK', keep });
  }
  return s;
}

function cardRarityOf(kind: 'people' | 'policy' | 'campaign', id: string): Rarity {
  if (isSkillCard(id)) return 'uncommon';
  if (kind === 'people') return getPerson(id).rarity;
  if (kind === 'policy') return getPolicyCard(id).rarity;
  return id.startsWith('item:') ? getItem(id.slice(5)).rarity : 'common';
}

/** Puts the best available person in every active role. */
function staff(state: GameState): GameState {
  let s = state;
  const taken = new Set<number>();
  for (const role of ROLES) {
    if (!roleActive(s, role)) continue;
    const best = s.team.cards
      .filter((c) => !taken.has(c.uid))
      .sort((a, b) => getPerson(b.personId).stars[role] - getPerson(a.personId).stars[role])[0];
    if (!best) continue;
    taken.add(best.uid);
    if (s.team.assigned[role] !== best.uid) s = applyAction(s, { type: 'ASSIGN_PERSON', uid: best.uid, role });
  }
  return s;
}

/** Shopping: regular campaign packs while running, political events in office, people when thin. */
function shop(state: GameState, style: BotStyle): GameState {
  let s = state;
  if (style === 'idle') return s;
  const wants: ['people' | 'policy' | 'campaign', 'regular' | 'golden' | 'elite'][] = [];
  if (s.team.cards.length < 3) wants.push(['people', 'regular']);
  if (s.career.race)
    for (let k = 0; k < 3; k++) {
      const tier =
        s.funds > packPrice('campaign', 'elite') * 8 ? 'elite' : s.funds > packPrice('campaign', 'golden') * 6 ? 'golden' : 'regular';
      wants.push(['campaign', tier]);
    }
  if (s.career.office) wants.push(['policy', 'regular']);
  for (const [kind, tier] of wants) {
    // Keep a reserve: never spend more than a third of the war chest on one pack.
    if (buyPackError(s, kind, tier) || packPrice(kind, tier) > s.funds / 3) continue;
    if (kind === 'campaign' && s.hand.length + s.items.length >= 6) continue;
    s = openPacks(applyAction(s, { type: 'BUY_PACK', kind, tier }), style);
  }
  return s;
}

/** Plays every political event it can. */
function playPolicies(state: GameState): GameState {
  let s = state;
  for (const inst of [...s.policyHand]) {
    const card = getPolicyCard(inst.cardId);
    const regionId = card.targetsRegion ? (s.career.office ? Object.keys(s.career.office.approval)[0] : undefined) : undefined;
    if (!policyError(s, inst.uid, regionId)) s = applyAction(s, { type: 'PLAY_POLICY', uid: inst.uid, regionId });
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
    // The biggest areas (and home) are enough to find a good play; checking all 18 districts is slow.
    const areas = [...office.regionIds]
      .sort((a, b) => getRegion(b).population * getRegion(b).turnout - getRegion(a).population * getRegion(a).turnout)
      .slice(0, 6);
    for (const ref of refs) {
      for (const regionId of areas) {
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

/** Climber: ask its best-fitting party once it holds office; launch for the next rung when it opens. */
let forcedParty: PartyId | undefined;

/** The race the bot launches next, if any is open. */
function nextRace(s: GameState, style: BotStyle): OfficeId | undefined {
  const open = raceBoard(s).filter((r) => r.status === 'open');
  const office = s.career.office;
  if (style === 'climber' && office && s.career.affiliation !== 'IND') {
    const rung = LADDER[getOffice(office.officeId).level]!;
    const home = s.politician.residentRegionId;
    const up = open
      .map((r) => getOffice(r.officeId))
      .filter((o) => LADDER[o.level]! > rung && (o.level !== 'house' || o.regionIds.includes(home)) && o.level !== 'senate')
      .sort((a, b) => LADDER[a.level]! - LADDER[b.level]!)[0];
    // Only climb when the next rung's election comes before (or with) the end of the current term.
    if (up && campaignWindow(s, up.id).electionYear <= office.termEndsYear) return up.id;
  }
  if (office) return open.some((r) => r.officeId === office.officeId) ? office.officeId : undefined;
  // A party climber out of office goes back to its home House seat, not down to City Hall.
  if (style === 'climber' && s.career.affiliation !== 'IND') {
    const home = s.politician.residentRegionId;
    const house = open.map((r) => getOffice(r.officeId)).find((o) => o.level === 'house' && o.regionIds.includes(home));
    if (house) return house.id;
  }
  const last = [...s.elections].reverse().find((e) => e.kind === 'general');
  const target = last && !getOffice(last.officeId).partisan ? last.officeId : hometownMayoralty(s.politician.residentRegionId);
  return target && open.some((r) => r.officeId === target) ? target : undefined;
}

function climb(state: GameState): GameState {
  let s = state;
  if (s.career.affiliation === 'IND' && s.career.office && !s.career.race) {
    const best = invitations(s)
      .filter((i) => !forcedParty || i.party === forcedParty)
      .sort((a, b) => b.alignment - a.alignment)[0];
    if (best && !askError(s, best.party) && joinChance(s, best.party) > 0.3) s = applyAction(s, { type: 'ASK_TO_JOIN', party: best.party });
  }
  return s;
}

/** Measurement hook: put this share of personal wealth into every campaign instead of the usual amount. */
let donationShare: number | undefined;
export function setDonationShare(share: number | undefined): void {
  donationShare = share;
}

function launchIfReady(state: GameState, style: BotStyle): GameState {
  const s = state;
  if (s.career.race || s.packs.length) return s;
  const officeId = nextRace(s, style);
  if (!officeId) return s;
  const platform = botPlatform(s, style, officeId);
  const manager = [...s.team.cards].sort(
    (a, b) => getPerson(b.personId).stars.campaignManager - getPerson(a.personId).stars.campaignManager,
  )[0];
  const donation =
    style === 'idle'
      ? 0
      : donationShare !== undefined
        ? Math.round(s.wealth * donationShare)
        : Math.round(Math.min(s.wealth * 0.6, donationNorm(officeId) * 0.5));
  const action = { type: 'LAUNCH_CAMPAIGN' as const, officeId, platform, donation, managerUid: manager?.uid };
  return launchError(s, action) ? s : applyAction(s, action);
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
    if (act && s.night?.phase === 'exit' && !trinketError(s, 'phone_bank')) s = applyAction(s, { type: 'USE_TRINKET', id: 'phone_bank' });
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

/** Fires every equipped trinket that can fire now: at home (or the biggest region) when it needs one. */
function fireTrinkets(state: GameState): GameState {
  let s = state;
  for (const id of s.artifacts) {
    const t = getTrinket(id);
    if (t.window === 'passive' || t.window === 'lateVoters') continue;
    const pool = t.window === 'governing' ? policyJurisdiction(s) : s.career.race ? getOffice(s.career.race.officeId).regionIds : [];
    const home = s.politician.residentRegionId;
    const target = t.targetsRegion
      ? pool.includes(home)
        ? home
        : [...pool].sort((a, b) => getRegion(b).population - getRegion(a).population)[0]
      : undefined;
    for (let k = 0; k < t.uses && !trinketError(s, id, target); k++) s = applyAction(s, { type: 'USE_TRINKET', id, regionId: target });
  }
  return s;
}

export function playTurn(state: GameState, style: BotStyle): GameState {
  let s = state;
  if (s.ended) return s;
  if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
  if (s.ended) return s;
  s = openPacks(s, style);
  if (style === 'climber') s = climb(s);
  s = openPacks(launchIfReady(s, style), style);
  s = staff(s);
  if (style !== 'idle') s = fireTrinkets(s);
  if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: decide(s, style) });
  s = shop(s, style);
  if (style !== 'idle') s = playPolicies(playEvents(s, style));
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

/** Plays from a blank start (or between races) through the next Election Day. */
export function playCampaign(state: GameState, style: BotStyle): { state: GameState; result: BotResult } {
  let s = state;
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
  the_underdog: 'sensible',
  blue_in_the_north: 'climber',
  small_town_to_the_top: 'climber',
};

/** A first try: no trinkets, extra points dropped on the weakest skills (not a plan). */
export const FIRST_TRY: MissionLoadout = { trinkets: [], extra: {} };

export interface MissionLoadout {
  trinkets: string[];
  extra: Partial<Record<SkillId, number>>;
}

/** What a player who read the mission would bring: election trinkets and points where elections are won. */
export function preparedLoadout(scenarioId: string): MissionLoadout {
  const base = missionBaseSkills(scenarioId);
  const extra: Partial<Record<SkillId, number>> = {};
  let left = MISSION_EXTRA_POINTS;
  for (const id of ['charisma', 'strategy', 'diplomacy'] as SkillId[]) {
    const add = Math.min(left, MISSION_SKILL_CAP - base[id]);
    if (add > 0) extra[id] = add;
    left -= Math.max(0, add);
  }
  return { trinkets: ['get_out_the_vote', 'surprise_appearance'], extra };
}

/** Plays a scenario to its end. */
export function playScenario(
  scenarioId: string,
  seed: string,
  artifacts: string[] = [],
  style: BotStyle = SCENARIO_STYLE[scenarioId] ?? 'sensible',
  extra: Partial<Record<SkillId, number>> = {},
): GameState {
  forcedParty = undefined;
  let s = createScenarioRun(scenarioId, { name: 'Bot', artifacts, seed, extra });
  for (let guard = 0; guard < 120 && !s.scenario?.result; guard++) s = playTurn(s, style);
  return s;
}

export function scenarioRate(scenarioId: string, runs: number, loadout: MissionLoadout = FIRST_TRY): { winRate: number; avgStars: number } {
  let wins = 0;
  let stars = 0;
  for (let i = 0; i < runs; i++) {
    const r = playScenario(scenarioId, `scn-${scenarioId}-${i}`, loadout.trinkets, undefined, loadout.extra).scenario!.result!;
    if (r.won) wins++;
    stars += r.stars.length;
  }
  return { winRate: wins / runs, avgStars: stars / runs };
}
