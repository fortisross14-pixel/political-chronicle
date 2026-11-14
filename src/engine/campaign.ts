// Races: filing, platform, AI opponents and Election Day (DESIGN §5.3, §7).
import { FIRST_NAMES, getOffice, getRegion, LAST_NAMES, OFFICES, PARTIES, REGIONS, STARTER_HAND } from '../data';
import { dealDecisions } from './decisions';
import { effectiveSkills } from './people';
import { startingTokens } from './night';
import { adjustStanding, effectivePlatform, member, newPrimary, nominationStatus, PARTY, primaryShare, PRIMARY } from './parties';
import { clamp, decided, nudgeFavorability, nudgeRecognition, poll, raceViews, regionAlignment, regionIntention, regionWeights, relevance } from './opinion';
import { Rng } from './rng';
import { newTerm } from './governing';
import { nextElectionYear, turnsInYear } from './time';
import type { Affiliation, Candidate, ElectionRecord, GameState, IssueId, Office, OfficeId, OfficeLevel, PartyId, Pledge, Race, RegionId } from './types';

export const MAX_PLATFORM = 5;
export const VALID_STANCES = [-2, -1, 1, 2] as const;
export const MAX_LOSS_STREAK = 3;

export const ELECTION_NOISE = { common: 0.015, regional: 0.025 };

export const OPPONENT = {
  baseRecognition: 0.22,
  recognitionSpread: 0.15,
  incumbentChance: 0.4,
  incumbentRecognition: 0.25,
  /** Whoever takes on a sitting mayor is a serious, well-known challenger. */
  challengerRecognition: 0.25,
  baseFavorability: 0.05,
  favorabilitySpread: 0.1,
  incumbentFavorability: 0.05,
  reachPerEvent: 0.06,
  persuasionPerEvent: 0.055,
};

/** Partisan races: tougher, better-funded opponents as the office grows (DESIGN §5.3). */
export const PARTISAN_OPPONENT: Record<Exclude<OfficeLevel, 'mayor'>, { recognition: number; incumbentChance: number; activity: number }> = {
  house: { recognition: 0.42, incumbentChance: 0.6, activity: 4 },
  senate: { recognition: 0.2, incumbentChance: 0.35, activity: 4 },
  governor: { recognition: 0.2, incumbentChance: 0.35, activity: 4 },
};

// ---------- Eligibility ----------

export interface RaceOption {
  officeId: OfficeId;
  electionYear: number;
  eligible: boolean;
  reason?: string;
}

/** The election year a race filed now would be decided in. */
export function electionYearIfFiled(state: GameState, officeId: OfficeId): number {
  // Mid-year, this year's calendar is already fixed, so the earliest race is next year's.
  const from = state.clock.year + (state.clock.turn > 0 ? 1 : 0);
  return nextElectionYear(getOffice(officeId), from);
}

export function raceOptions(state: GameState): RaceOption[] {
  const homeState = getRegion(state.politician.residentRegionId).state;
  const held = state.career.office;
  return OFFICES.filter((o) => o.state === homeState).map((office) => {
    const option: RaceOption = { officeId: office.id, electionYear: electionYearIfFiled(state, office.id), eligible: true };
    const block = (reason: string) => Object.assign(option, { eligible: false, reason });
    if (held?.officeId === office.id) return block('Your current office — re-election opens automatically in its last year.');
    if (held && !office.partisan) return block('You can’t run for another mayoralty while in office.');
    const status = nominationStatus(state, office.id);
    if (status.kind === 'denied') return block(status.text);
    return option;
  });
}

export function fileRaceError(state: GameState, officeId: OfficeId): string | undefined {
  if (state.ended) return 'Your career is over.';
  const race = state.career.race;
  const swappingReelection = !!race && race.officeId === state.career.office?.officeId && !race.platform.length && race.officeId !== officeId;
  if (race && !swappingReelection) return 'You are already running.';
  const held = state.career.office;
  if (held && held.officeId === officeId) {
    if (state.clock.year !== held.termEndsYear) return `Re-election opens in ${held.termEndsYear}.`;
    return undefined;
  }
  if (state.pendingResult !== undefined) return 'Review the last election first.';
  const option = raceOptions(state).find((o) => o.officeId === officeId);
  if (!option) return 'That office is not available.';
  if (!option.eligible) return option.reason;
  return undefined;
}

// ---------- Opponents ----------

function opponentPlatform(rng: Rng, regionId: RegionId, lean: number, level: ReturnType<typeof getOffice>['level']): Pledge[] {
  const region = getRegion(regionId);
  const ranked = (Object.keys(region.issueSalience) as IssueId[])
    .map((issue) => ({ issue, score: region.issueSalience[issue] * relevance(issue, level) + rng.float() * 0.25 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PLATFORM);
  return ranked.map(({ issue }) => {
    const target = region.issueOpinion[issue] + lean * 0.5 + rng.gaussian(0, 0.4);
    const sign = target < 0 ? -1 : 1;
    return { issue, stance: sign * (Math.abs(target) > 1 ? 2 : 1) };
  });
}

function pickName(rng: Rng, used: Set<string>): string {
  let name = '';
  do name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  while (used.has(name));
  used.add(name);
  return name;
}

/** Average opinion and salience across a jurisdiction, weighted by population × turnout. */
function jurisdictionView(office: Office): { opinion: Record<IssueId, number>; salience: Record<IssueId, number> } {
  const weights = regionWeights(office.id);
  const opinion = {} as Record<IssueId, number>;
  const salience = {} as Record<IssueId, number>;
  for (const id of office.regionIds) {
    const r = getRegion(id);
    for (const issue of Object.keys(r.issueOpinion) as IssueId[]) {
      opinion[issue] = (opinion[issue] ?? 0) + r.issueOpinion[issue] * weights[id]!;
      salience[issue] = (salience[issue] ?? 0) + r.issueSalience[issue] * weights[id]!;
    }
  }
  return { opinion, salience };
}

/** A partisan candidate runs halfway between the local electorate and their party's platform. */
function partisanPlatform(rng: Rng, office: Office, party: PartyId): Pledge[] {
  const view = jurisdictionView(office);
  const platform = effectivePlatform(party, office.state);
  return (Object.keys(view.salience) as IssueId[])
    .map((issue) => ({ issue, score: view.salience[issue] * (0.6 + platform[issue].weight * 0.6) + rng.float() * 0.2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PLATFORM)
    .map(({ issue }) => {
      const target = 0.5 * view.opinion[issue] + 0.5 * platform[issue].position + rng.gaussian(0, 0.3);
      return { issue, stance: (target < 0 ? -1 : 1) * (Math.abs(target) > 1 ? 2 : 1) };
    });
}

function partisanOpponents(rng: Rng, office: Office, playerIsIncumbent: boolean, playerParty: Affiliation): Candidate[] {
  const tuning = PARTISAN_OPPONENT[office.level as Exclude<OfficeLevel, 'mayor'>];
  const parties: PartyId[] = playerParty === 'IND' ? ['DU', 'RP'] : [playerParty === 'DU' ? 'RP' : 'DU'];
  const used = new Set<string>();
  return parties.map((party, i) => {
    const lean = party === 'DU' ? -1 : 1;
    const incumbent = !playerIsIncumbent && i === 0 && rng.chance(tuning.incumbentChance);
    const regions: Candidate['regions'] = {};
    for (const r of REGIONS) {
      const inRace = office.regionIds.includes(r.id);
      regions[r.id] = inRace
        ? {
            recognition: clamp(
              tuning.recognition + rng.float() * OPPONENT.recognitionSpread + (incumbent ? OPPONENT.incumbentRecognition : 0) + (playerIsIncumbent ? OPPONENT.challengerRecognition * 0.6 : 0),
              0,
              0.95,
            ),
            favorability: OPPONENT.baseFavorability + rng.float() * OPPONENT.favorabilitySpread + (incumbent ? OPPONENT.incumbentFavorability : 0),
          }
        : { recognition: 0.03, favorability: 0 };
    }
    return {
      id: `opp-${i}`,
      name: pickName(rng, used),
      affiliation: party,
      lean,
      platform: partisanPlatform(rng, office, party),
      incumbent,
      activity: tuning.activity + (playerIsIncumbent ? 1 : 0),
      regions,
    };
  });
}

export function generateOpponents(rng: Rng, officeId: OfficeId, playerIsIncumbent = false, playerParty: Affiliation = 'IND'): Candidate[] {
  const office = getOffice(officeId);
  if (office.partisan) return partisanOpponents(rng, office, playerIsIncumbent, playerParty);
  const seat = getRegion(office.regionIds[0]!);
  const count = office.level === 'mayor' && seat.type === 'urban' ? 2 : 1;
  const used = new Set<string>();
  const opponents: Candidate[] = [];

  for (let i = 0; i < count; i++) {
    let name = '';
    do name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    while (used.has(name));
    used.add(name);

    const regionSide = Math.abs(seat.partisanLean) > 0.15 ? Math.sign(seat.partisanLean) : rng.chance(0.5) ? 1 : -1;
    const lean = i === 0 ? regionSide : -regionSide * (rng.chance(0.5) ? 1 : 0.5);
    const affiliation: Affiliation = office.partisan ? (lean < 0 ? 'DU' : 'RP') : 'IND';
    const incumbent = !playerIsIncumbent && i === 0 && rng.chance(OPPONENT.incumbentChance);

    const regions: Candidate['regions'] = {};
    for (const r of REGIONS) {
      const inRace = office.regionIds.includes(r.id);
      regions[r.id] = inRace
        ? {
            recognition: clamp(
              OPPONENT.baseRecognition + rng.float() * OPPONENT.recognitionSpread + (incumbent ? OPPONENT.incumbentRecognition : 0) + (playerIsIncumbent && i === 0 ? OPPONENT.challengerRecognition : 0) + (seat.type === 'urban' || seat.type === 'midsize' ? 0.06 : 0) - (i > 0 ? 0.12 : 0),
              0,
              0.95,
            ),
            favorability: OPPONENT.baseFavorability + rng.float() * OPPONENT.favorabilitySpread + (incumbent ? OPPONENT.incumbentFavorability : 0),
          }
        : { recognition: 0.02, favorability: 0 };
    }

    opponents.push({
      id: `opp-${i}`,
      name,
      affiliation,
      lean: Math.round(lean * 10) / 10,
      platform: opponentPlatform(rng, seat.id, lean, office.level),
      incumbent,
      activity: (seat.type === 'urban' && i > 0 ? 1 : 2) + (playerIsIncumbent && i === 0 ? 1 : 0),
      regions,
    });
  }
  return opponents;
}

export const INTEL = { standings: 4, nextMove: 6 };

/** What Strategy lets you see about an opponent (DESIGN_V2 §2.4). */
export interface OpponentIntel {
  recognition?: number;
  favorability?: number;
  nextMove?: { regionId: RegionId; issue: IssueId };
}

export function opponentIntel(state: GameState, race: Race, c: Candidate): OpponentIntel {
  const str = effectiveSkills(state).strategy;
  const intel: OpponentIntel = {};
  if (str < INTEL.standings) return intel;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  intel.recognition = office.regionIds.reduce((s, id) => s + c.regions[id]!.recognition * weights[id]!, 0);
  intel.favorability = office.regionIds.reduce((s, id) => s + c.regions[id]!.favorability * weights[id]!, 0);
  if (str >= INTEL.nextMove) {
    // Their most likely move: the biggest region, their best-fitting topic there (no noise).
    const regionId = [...office.regionIds].sort((a, b) => weights[b]! - weights[a]!)[0]!;
    const region = getRegion(regionId);
    const best = [...c.platform].sort(
      (a, b) =>
        region.issueSalience[b.issue] * regionAlignment(regionId, b.issue, b.stance) * relevance(b.issue, office.level) -
        region.issueSalience[a.issue] * regionAlignment(regionId, a.issue, a.stance) * relevance(a.issue, office.level),
    )[0]!;
    intel.nextMove = { regionId, issue: best.issue };
  }
  return intel;
}

/** Opponents campaign: their best-fitting topic, in their jurisdiction. */
export function opponentsAct(rng: Rng, race: Race): Race {
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const opponents = race.opponents.map((c) => {
    const regions = { ...c.regions };
    for (let k = 0; k < c.activity; k++) {
      // Weighted pick of a region by population × turnout.
      let roll = rng.float();
      let regionId = office.regionIds[0]!;
      for (const id of office.regionIds) {
        roll -= weights[id]!;
        if (roll <= 0) {
          regionId = id;
          break;
        }
      }
      const region = getRegion(regionId);
      const best = c.platform
        .map((p) => ({ p, score: region.issueSalience[p.issue] * regionAlignment(regionId, p.issue, p.stance) * relevance(p.issue, office.level) + rng.float() * 0.2 }))
        .sort((a, b) => b.score - a.score)[0]!.p;
      const cur = regions[regionId]!;
      const dF = OPPONENT.persuasionPerEvent * region.issueSalience[best.issue] * regionAlignment(regionId, best.issue, best.stance) * relevance(best.issue, office.level);
      regions[regionId] = {
        recognition: nudgeRecognition(cur.recognition, OPPONENT.reachPerEvent),
        favorability: nudgeFavorability(cur.favorability, dF),
      };
    }
    return { ...c, regions };
  });
  return { ...race, opponents };
}

// ---------- Filing & platform ----------

export function fileRace(state: GameState, officeId: OfficeId): GameState {
  const error = fileRaceError(state, officeId);
  if (error) throw new Error(error);
  const rng = new Rng(state.rng);
  const status = nominationStatus(state, officeId);
  const party = member(state);
  const opponents = generateOpponents(rng, officeId, state.career.office?.officeId === officeId, state.career.affiliation);
  const race: Race = {
    officeId,
    electionYear: electionYearIfFiled(state, officeId),
    platform: [],
    opponents,
    tokens: startingTokens(state),
    milestones: [],
    doorKnocks: 0,
    raisedThisTurn: 0,
  };
  if (party && status.kind === 'nominee') race.nominee = party;
  if (party && status.kind === 'primary') race.primary = newPrimary(rng, party, pickName(rng, new Set(opponents.map((o) => o.name))));
  const replaced = state.career.race;
  const career = { ...state.career, race };
  // At the start of a year the calendar can still become a 4-turn election year.
  const clock = state.clock.turn === 0 ? { ...state.clock, turnsThisYear: turnsInYear(career, state.clock.year) } : state.clock;
  let uid = state.nextCardUid;
  const dealt = STARTER_HAND.map((cardId) => ({ uid: uid++, cardId }));
  return {
    ...state,
    rng: rng.state,
    clock,
    career,
    hand: [...state.hand, ...dealt],
    nextCardUid: uid,
    log: [
      ...state.log,
      ...(replaced
        ? [{ year: clock.year, turn: clock.turn, text: `Not seeking re-election as ${getOffice(replaced.officeId).name}.` }]
        : []),
      {
        year: clock.year,
        turn: clock.turn,
        text:
          state.career.office?.officeId === officeId
            ? `Running for re-election as ${getOffice(officeId).name} (${race.electionYear}).`
            : race.primary
              ? `Entered the ${PARTIES[race.primary.party].name} primary for ${getOffice(officeId).name} against ${race.primary.challenger} (${race.electionYear}).`
              : race.nominee
                ? `Running as the ${PARTIES[race.nominee].name} nominee for ${getOffice(officeId).name} (${race.electionYear}).`
                : state.career.affiliation === 'IND'
                  ? `Filed as an independent for ${getOffice(officeId).name} (${race.electionYear}).`
                  : `Filed for ${getOffice(officeId).name} (${race.electionYear}).`,
      },
    ],
  };
}

export function platformError(state: GameState, platform: Pledge[]): string | undefined {
  if (!state.career.race) return 'You are not running for anything.';
  if (state.career.race.platform.length) return 'Your platform is locked for this race.';
  if (platform.length < 1) return 'Choose at least one topic.';
  if (platform.length > MAX_PLATFORM) return `Choose at most ${MAX_PLATFORM} topics.`;
  if (new Set(platform.map((p) => p.issue)).size !== platform.length) return 'Each topic can be chosen once.';
  if (platform.some((p) => !(VALID_STANCES as readonly number[]).includes(p.stance))) return 'Pick a side on every topic.';
  return undefined;
}

export function setPlatform(state: GameState, platform: Pledge[]): GameState {
  const error = platformError(state, platform);
  if (error) throw new Error(error);
  const record = { ...state.record };
  for (const p of platform) {
    const old = record[p.issue];
    record[p.issue] = old === undefined ? p.stance : (old + p.stance) / 2;
  }
  const race = { ...state.career.race!, platform: platform.map((p) => ({ ...p })) };
  return dealDecisions({ ...state, record, career: { ...state.career, race } });
}

// ---------- Election Day ----------

export interface ElectionDraw {
  /** True final shares per region (player first). */
  regionShares: Record<RegionId, number[]>;
  /** The player's pre-election poll share per region (decided voters). */
  priors: Record<RegionId, number>;
  finalPoll: number;
}

/** Election Day: draws the true result from the final polls plus noise. */
export function drawElection(state: GameState, rng: Rng): ElectionDraw {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const finalPoll = poll(state, race).decided[0]!;
  const common = rng.gaussian(0, ELECTION_NOISE.common);
  const regionShares: Record<RegionId, number[]> = {};
  const priors: Record<RegionId, number> = {};
  for (const id of office.regionIds) {
    const shares = decided(regionIntention(raceViews(state, race, id), id, office.level, office.partisan));
    priors[id] = shares[0]!;
    const player = clamp(shares[0]! + common + rng.gaussian(0, ELECTION_NOISE.regional), 0.01, 0.99);
    const othersTotal = 1 - shares[0]!;
    regionShares[id] = [player, ...shares.slice(1).map((s) => (othersTotal > 0 ? (s / othersTotal) * (1 - player) : 0))];
  }
  return { regionShares, priors, finalPoll };
}

/** Instant resolution (no election night), for bots and tests. */
export function resolveElection(state: GameState, rng: Rng): GameState {
  const draw = drawElection(state, rng);
  return finalizeElection(state, rng, draw.regionShares, draw.finalPoll);
}

/** Applies a final result: records it, moves you into (or out of) office. */
export function finalizeElection(state: GameState, rng: Rng, regionShares: Record<RegionId, number[]>, finalPoll: number): GameState {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const totalShares = new Array<number>(race.opponents.length + 1).fill(0);
  for (const [id, final] of Object.entries(regionShares)) final.forEach((s, i) => (totalShares[i]! += s * weights[id]!));
  void rng;

  const winner = totalShares.indexOf(Math.max(...totalShares));
  const playerWon = winner === 0;
  const record: ElectionRecord = {
    officeId: race.officeId,
    year: race.electionYear,
    kind: 'general',
    candidates: [
      { name: state.politician.name, isPlayer: true, affiliation: state.career.affiliation, lean: 0 },
      ...race.opponents.map((c) => ({ name: c.name, isPlayer: false, affiliation: c.affiliation, lean: c.lean })),
    ],
    regionShares,
    totalShares,
    finalPoll,
    playerWon,
  };

  const lossStreak = playerWon ? 0 : state.career.lossStreak + 1;
  const { race: _done, ...rest } = state.career;
  // Running for a different office puts your seat on the line (DESIGN §7).
  const gaveUpSeat = !playerWon && !!rest.office && rest.office.officeId !== race.officeId;
  const career = {
    ...rest,
    lossStreak,
    office: playerWon
      ? newTerm(race.officeId, race.electionYear, regionShares, race.platform)
      : rest.office?.officeId === race.officeId || gaveUpSeat
        ? undefined // voted out, or gave up the seat to run
        : rest.office,
  };
  if (!career.office) delete career.office;
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const text = playerWon
    ? `Elected ${office.name} with ${pct(totalShares[0]!)}!${rest.office && rest.office.officeId !== race.officeId ? ` You leave your post as ${getOffice(rest.office.officeId).name}.` : ''}`
    : `Lost the race for ${office.name}: ${pct(totalShares[0]!)} to ${record.candidates[winner]!.name}'s ${pct(totalShares[winner]!)}.${gaveUpSeat ? ` You gave up your seat as ${getOffice(rest.office!.officeId).name} to run.` : ''}`;
  const standingDelta = office.partisan ? (playerWon ? PARTY.wonRace : PARTY.lostRace) : playerWon ? PARTY.wonMayor : 0;
  const withStanding = adjustStanding({ ...state, career }, standingDelta);

  return {
    ...state,
    career: withStanding.career,
    elections: [...state.elections, record],
    pendingResult: state.elections.length,
    ended: lossStreak >= MAX_LOSS_STREAK ? { reason: 'losses', year: race.electionYear } : state.ended,
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }],
  };
}


// ---------- Primaries ----------

export function isPrimaryTurn(state: GameState): boolean {
  const race = state.career.race;
  return !!race?.primary && state.clock.year === race.electionYear && state.clock.turn === 0;
}

/** Party voters decide at the end of the election year's first turn. */
export function resolvePrimary(state: GameState, rng: Rng): GameState {
  const race = state.career.race!;
  const primary = race.primary!;
  const expected = primaryShare(state);
  const share = clamp(expected + rng.gaussian(0, PRIMARY.noise), 0.02, 0.98);
  const won = share > 0.5;
  const office = getOffice(race.officeId);
  const record: ElectionRecord = {
    officeId: race.officeId,
    year: race.electionYear,
    kind: 'primary',
    candidates: [
      { name: state.politician.name, isPlayer: true, affiliation: primary.party, lean: 0 },
      { name: primary.challenger, isPlayer: false, affiliation: primary.party, lean: 0 },
    ],
    regionShares: {},
    totalShares: [share, 1 - share],
    finalPoll: expected,
    playerWon: won,
  };
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const text = won
    ? `Won the ${PARTIES[primary.party].name} primary for ${office.name} with ${pct(share)}. On to November.`
    : `Lost the ${PARTIES[primary.party].name} primary for ${office.name} to ${primary.challenger} (${pct(share)}).`;
  const career = won ? { ...state.career, race: { ...race, primary: undefined, nominee: primary.party } } : (({ race: _r, ...rest }) => rest)(state.career);
  const next = adjustStanding({ ...state, career }, won ? 3 : -3);
  return {
    ...next,
    elections: [...state.elections, record],
    pendingResult: state.elections.length,
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }],
  };
}
