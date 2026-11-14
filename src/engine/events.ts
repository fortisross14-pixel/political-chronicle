// Event cards: pick a region and one of your platform topics (DESIGN §6.1).
import { GameError } from './errors';
import { cityRegionsOf, getBackground, getEventCard, getOffice, getRegion, ISSUES_BY_ID, STATES } from '../data';
import { groupFit } from './demographics';
import { alignment, clamp, nudgeFavorability, nudgeRecognition, regionAlignment, relevance, skillMult } from './opinion';
import { GOVERNING, nudgeApproval } from './governing';
import { adjustStanding } from './parties';
import { award, GROUND_GAME } from './loot';
import { effectiveSkills, hasPerk, ROLE_EFFECT, roleStars } from './people';
import { hasAbility, native } from './traits';
import { Rng } from './rng';
import type { EventCard, GameState, IssueId, MediaChannel, OfficeLevel, Pledge, RegionId, Stance } from './types';

export const HOMETOWN_EVENT_BONUS = 1.25;
/** A transplant's own city is home turf too: they chose to live there. */
export const TRANSPLANT_EVENT_BONUS = 1.25;
export const CREDIBLE_ISSUE_BONUS = 1.15;
export const DOUBTED_ISSUE_FACTOR = 0.85;
export const FATIGUE = 0.7;
export const FUNDRAISING_FATIGUE = 0.5;
/** A card's own topics (e.g. a college presentation on education) persuade this much more. */
/** Share of an event heard in a city's other neighborhoods, by medium. */
export const CITY_SPREAD: Record<MediaChannel, number> = { tv: 0.85, cable: 0.8, radio: 0.75, social: 0.6, inPerson: 0.35 };

/** Share heard in the race's other districts (House and statewide races), by medium. */
export const DISTRICT_SPREAD: Record<MediaChannel, number> = { tv: 0.45, cable: 0.45, radio: 0.35, social: 0.35, inPerson: 0.03 };

/** Campaign events count this much when you run for re-election: the record speaks louder. */
export const INCUMBENT_CAMPAIGN = 0.6;

export const ISSUE_BONUS = 1.4;

export interface RegionEffect {
  regionId: RegionId;
  dRecognition: number;
  dFavorability: number;
  /** Share of the full effect: 1 for the target, the spillover rate elsewhere. */
  share: number;
  alignment: number;
}

export interface EventPreview {
  card: EventCard;
  energy: number;
  stance?: Stance;
  fundsGain: number;
  gaffeChance: number;
  fatigue: number;
  effects: RegionEffect[];
  error?: string;
}

export function turnNo(state: GameState): number {
  return state.snapshots.length;
}

/** The office level the player is currently acting at. */
export function activeLevel(state: GameState): OfficeLevel {
  const id = state.career.race?.officeId ?? state.career.office?.officeId;
  return id ? getOffice(id).level : 'mayor';
}

/** The topics you can campaign on: your race platform, or in office the platform you won on. */
export function activePlatform(state: GameState): Pledge[] {
  const race = state.career.race;
  if (race?.platform.length) return race.platform;
  return state.career.office?.platform ?? [];
}

export function stanceFor(state: GameState, issue: IssueId): Stance | undefined {
  return activePlatform(state).find((p) => p.issue === issue)?.stance ?? state.record[issue];
}

export function credibility(state: GameState, issue: IssueId, stance: Stance): number {
  const record = state.record[issue];
  const consistency = record === undefined ? 1 : clamp(alignment(stance, record), 0, 1);
  const base = (0.7 + 0.03 * effectiveSkills(state).law + 0.3 * consistency) / 1.15;
  const bg = getBackground(state.politician.backgroundId);
  if (bg.credibleIssues.includes(issue)) return base * CREDIBLE_ISSUE_BONUS;
  if (bg.doubtedIssues?.includes(issue)) return base * DOUBTED_ISSUE_FACTOR;
  return base * (bg.perks.policyCredibility ?? 1);
}

export function fatigueFor(state: GameState, regionId: RegionId, issue: IssueId): number {
  const now = turnNo(state);
  const repeats = state.eventHistory.filter(
    (e) => !e.fundraiser && e.regionId === regionId && e.issue === issue && e.turnNo >= now - 1,
  ).length;
  return FATIGUE ** repeats;
}

export function gaffeChance(card: EventCard, state: GameState): number {
  return card.gaffeRisk ? Math.max(0.01, 0.08 - 0.006 * effectiveSkills(state).charisma) : 0;
}

/** Resolves a card from the hand (number uid) or a basic card (string id). */
export function resolveCardRef(state: GameState, ref: number | string): EventCard | undefined {
  if (typeof ref === 'string') {
    const card = getEventCard(ref);
    return card.basic ? card : undefined;
  }
  const inst = state.hand.find((c) => c.uid === ref);
  return inst ? getEventCard(inst.cardId) : undefined;
}

/** Expected effect, without the gaffe roll. */
export function previewEvent(state: GameState, ref: number | string, regionId: RegionId, issue: IssueId): EventPreview {
  const card = resolveCardRef(state, ref);
  if (!card) throw new GameError(`Card not available: ${ref}`);
  const stance = stanceFor(state, issue);
  const level = activeLevel(state);
  const region = getRegion(regionId);
  const skills = effectiveSkills(state);
  const fatigue = fatigueFor(state, regionId, issue);
  const preview: EventPreview = {
    card,
    energy: card.energy,
    stance,
    fundsGain: 0,
    gaffeChance: gaffeChance(card, state),
    fatigue,
    effects: [],
  };

  if (state.ended) preview.error = 'Your career is over.';
  else if (state.packs.length) preview.error = 'Open your pack first.';
  else if (!activePlatform(state).length) preview.error = 'Launch a campaign first.';
  else if (state.decisions && !state.decisions.resolved) preview.error = 'Resolve this turn’s decisions first.';
  else if (card.energy > state.energy) preview.error = 'Not enough energy this turn.';
  else if (stance === undefined && !card.fundraising) preview.error = 'Pick one of your platform topics.';
  else if (card.requiresParty && state.career.affiliation === 'IND') preview.error = 'Party members only.';

  if (card.fundraising) {
    const R = state.regions[regionId]!.recognition;
    // Donors tire of being asked: each earlier fundraiser this turn halves the next one.
    const asks = state.eventHistory.filter((e) => e.turnNo === turnNo(state) && e.fundraiser).length;
    preview.fundsGain = Math.round((card.fundraising * skills.economics * (0.5 + R) * FUNDRAISING_FATIGUE ** asks) / 100) * 100;
  }
  if (stance === undefined || (card.reach === 0 && card.persuasion === 0)) return preview;

  // Only natives get the hometown bonus; a transplant's city doesn't know them that well yet.
  const atHome = regionId === state.politician.residentRegionId || region.parent === state.politician.residentRegionId;
  const hometown = atHome ? (native(state) ? HOMETOWN_EVENT_BONUS : TRANSPLANT_EVENT_BONUS) : 1;
  const perks = getBackground(state.politician.backgroundId).perks;
  const perk = (card.id === 'door_knocking' ? (perks.doorKnocking ?? 1) : 1) * (card.id === 'debate' ? (perks.debate ?? 1) : 1);
  const manager = state.career.race ? 1 + ROLE_EFFECT.campaignPerStar * roleStars(state, 'campaignManager') : 1;
  const topical = card.issueBonus?.includes(issue) ? ISSUE_BONUS : 1;
  // Defending your own seat, voters judge your record more than your campaign (DESIGN_V2 §13).
  const defending = state.career.race && state.career.office?.officeId === state.career.race.officeId ? INCUMBENT_CAMPAIGN : 1;
  const mult = skillMult(skills, card.skills) * hometown * fatigue * perk * manager * defending;
  const cred = credibility(state, issue, stance);
  const targets: [RegionId, number][] = [[regionId, 1]];
  const city = cityRegionsOf(regionId);
  if (city.length) {
    // In a city, media carry across every neighborhood; door-knocking stays on the block.
    const spread = Math.max(card.spillover, CITY_SPREAD[card.medium]);
    for (const id of city) if (id !== regionId) targets.push([id, spread]);
  } else {
    // Across districts: media carry to the race's other districts; anything statewide is heard everywhere.
    const raceIds = new Set(state.career.race ? getOffice(state.career.race.officeId).regionIds : []);
    for (const id of STATES[region.state]!.regionIds) {
      if (id === regionId) continue;
      const share = raceIds.has(id) ? Math.max(card.spillover, DISTRICT_SPREAD[card.medium]) : card.spillover;
      if (share > 0) targets.push([id, share]);
    }
  }

  for (const [id, share] of targets) {
    const r = getRegion(id);
    const m = r.media[card.medium] * mult * share * groupFit(r.demo, card.audience ?? {});
    const align = regionAlignment(id, issue, stance);
    const you = state.regions[id]!;
    const gain = card.reach * m;
    const dF = card.persuasion * topical * m * r.issueSalience[issue] * align * relevance(issue, level) * cred;
    preview.effects.push({
      regionId: id,
      share,
      alignment: align,
      dRecognition: nudgeRecognition(you.recognition, gain) - you.recognition,
      dFavorability: nudgeFavorability(you.favorability, dF) - you.favorability,
    });
  }
  return preview;
}

export interface EventOutcome {
  state: GameState;
  gaffe: boolean;
}

export function playEvent(state: GameState, ref: number | string, regionId: RegionId, issue: IssueId): EventOutcome {
  const preview = previewEvent(state, ref, regionId, issue);
  if (preview.error) throw new GameError(preview.error);
  const rng = new Rng(state.rng);
  const rolled = rng.chance(preview.gaffeChance);
  const used = state.career.race?.used ?? [];
  // Debate notes (artifact) make the first debate safe; Rapid response (ability) cancels one gaffe.
  const safeDebate = preview.card.id === 'debate' && state.modifiers.safeFirstDebate && !used.includes('debate_notes');
  const rapid = rolled && !safeDebate && hasAbility(state, 'rapid_response') && !used.includes('rapid_response');
  const gaffe = rolled && !safeDebate && !rapid;
  const newlyUsed = [...(safeDebate ? ['debate_notes'] : []), ...(rapid ? ['rapid_response'] : [])];
  const regions = { ...state.regions };

  for (const e of preview.effects) {
    const you = regions[e.regionId]!;
    let favorability = you.favorability + e.dFavorability;
    if (gaffe) {
      const r = getRegion(e.regionId);
      const penalty = preview.card.persuasion * r.media[preview.card.medium] * e.share * 0.6 * (hasPerk(state, 'spinDoctor') ? 0.5 : 1);
      favorability = nudgeFavorability(you.favorability, -penalty);
    }
    regions[e.regionId] = { recognition: you.recognition + e.dRecognition, favorability };
  }

  // In office, showing up for your constituents also moves job approval.
  let career = state.career;
  const office = career.office;
  if (office) {
    const approval = { ...office.approval };
    for (const e of preview.effects) {
      if (approval[e.regionId] === undefined) continue;
      const dF = regions[e.regionId]!.favorability - state.regions[e.regionId]!.favorability;
      approval[e.regionId] = nudgeApproval(approval[e.regionId]!, dF * GOVERNING.eventApprovalShare);
    }
    career = { ...career, office: { ...office, approval } };
  }

  const hand = typeof ref === 'number' ? state.hand.filter((c) => c.uid !== ref) : state.hand;
  const where = getRegion(regionId).seatCity;
  const text = preview.card.fundraising
    ? `${preview.card.name} in ${where}: raised $${preview.fundsGain.toLocaleString('en-US')}.`
    : `${preview.card.name} in ${where} on ${ISSUES_BY_ID[issue].name}${gaffe ? ' — a gaffe went viral!' : rapid ? ' — a gaffe, but your rapid response shut it down.' : '.'}`;

  const standingGain = preview.card.partyStanding ?? 0;
  // Loot bookkeeping on the race: door-knocks build the ground game; fundraisers count toward a haul.
  if (career.race) {
    const r = { ...career.race, used: [...(career.race.used ?? []), ...newlyUsed] };
    const knock = preview.card.id === 'door_knocking';
    career = {
      ...career,
      race: {
        ...r,
        doorKnocks: r.doorKnocks + (knock ? 1 : 0),
        tokens: r.tokens + (knock && r.doorKnocks < GROUND_GAME.maxFromDoorKnocks ? GROUND_GAME.perDoorKnock : 0),
        raisedThisTurn: r.raisedThisTurn + preview.fundsGain,
      },
    };
  }
  const debateWon =
    preview.card.id === 'debate' && !gaffe && preview.effects.filter((e) => e.share === 1).every((e) => e.dFavorability > 0);
  const result = {
    gaffe,
    state: adjustStanding(
      {
        ...state,
        rng: rng.state,
        regions,
        career,
        hand,
        // Cards are paid for in the Market; playing one costs only energy.
        funds: state.funds + preview.fundsGain,
        energy: state.energy - preview.card.energy,
        eventHistory: [
          ...state.eventHistory,
          { turnNo: turnNo(state), regionId, issue, ...(preview.card.fundraising ? { fundraiser: true } : {}) },
        ],
        log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }],
      },
      standingGain,
    ),
  };
  return debateWon ? { ...result, state: award(result.state, 'debate_win') } : result;
}
