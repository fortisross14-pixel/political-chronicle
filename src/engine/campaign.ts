// Races: filing, platform, AI opponents and Election Day (DESIGN §5.3, §7).
import { FIRST_NAMES, getOffice, getRegion, LAST_NAMES, OFFICES, REGIONS, STARTER_HAND } from '../data';
import { dealDecisions } from './decisions';
import { clamp, decided, nudgeFavorability, nudgeRecognition, poll, raceViews, regionAlignment, regionIntention, regionWeights, relevance } from './opinion';
import { Rng } from './rng';
import { newTerm } from './governing';
import { nextElectionYear, turnsInYear } from './time';
import type { Affiliation, Candidate, ElectionRecord, GameState, IssueId, OfficeId, Pledge, Race, RegionId } from './types';

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
  const homeState = getRegion(state.politician.birthRegionId).state;
  return OFFICES.filter((o) => o.state === homeState).map((office) => {
    const option: RaceOption = { officeId: office.id, electionYear: electionYearIfFiled(state, office.id), eligible: true };
    if (office.partisan && state.career.affiliation === 'IND') {
      option.eligible = false;
      option.reason = 'Needs a party nomination (parties arrive in M6).';
    }
    return option;
  });
}

export function fileRaceError(state: GameState, officeId: OfficeId): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.career.race) return 'You are already running.';
  const held = state.career.office;
  if (held && held.officeId !== officeId) return 'Running for a different office needs a party (M6).';
  if (held && state.clock.year !== held.termEndsYear) return `Re-election opens in ${held.termEndsYear}.`;
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

export function generateOpponents(rng: Rng, officeId: OfficeId, playerIsIncumbent = false): Candidate[] {
  const office = getOffice(officeId);
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
  const race: Race = {
    officeId,
    electionYear: electionYearIfFiled(state, officeId),
    platform: [],
    opponents: generateOpponents(rng, officeId, state.career.office?.officeId === officeId),
  };
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
      {
        year: clock.year,
        turn: clock.turn,
        text:
          state.career.office?.officeId === officeId
            ? `Running for re-election as ${getOffice(officeId).name} (${race.electionYear}).`
            : `Filed as an independent for ${getOffice(officeId).name} (${race.electionYear}).`,
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

export function resolveElection(state: GameState, rng: Rng): GameState {
  const race = state.career.race!;
  const office = getOffice(race.officeId);
  const weights = regionWeights(race.officeId);
  const finalPoll = poll(state, race).decided[0]!;
  const common = rng.gaussian(0, ELECTION_NOISE.common);
  const regionShares: Record<RegionId, number[]> = {};
  const totalShares = new Array<number>(race.opponents.length + 1).fill(0);

  for (const id of office.regionIds) {
    const shares = decided(regionIntention(raceViews(state, race, id), id, office.level, office.partisan));
    const player = clamp(shares[0]! + common + rng.gaussian(0, ELECTION_NOISE.regional), 0.01, 0.99);
    const othersTotal = 1 - shares[0]!;
    const final = [player, ...shares.slice(1).map((s) => (othersTotal > 0 ? (s / othersTotal) * (1 - player) : 0))];
    regionShares[id] = final;
    final.forEach((s, i) => (totalShares[i]! += s * weights[id]!));
  }

  const winner = totalShares.indexOf(Math.max(...totalShares));
  const playerWon = winner === 0;
  const record: ElectionRecord = {
    officeId: race.officeId,
    year: race.electionYear,
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
  const career = {
    ...rest,
    lossStreak,
    office: playerWon
      ? newTerm(race.officeId, race.electionYear, regionShares, race.platform)
      : rest.office?.officeId === race.officeId
        ? undefined // voted out
        : rest.office,
  };
  if (!career.office) delete career.office;
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const text = playerWon
    ? `Elected ${office.name} with ${pct(totalShares[0]!)}!`
    : `Lost the race for ${office.name}: ${pct(totalShares[0]!)} to ${record.candidates[winner]!.name}'s ${pct(totalShares[winner]!)}.`;

  return {
    ...state,
    career,
    elections: [...state.elections, record],
    pendingResult: state.elections.length,
    ended: lossStreak >= MAX_LOSS_STREAK ? { reason: 'losses', year: race.electionYear } : state.ended,
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }],
  };
}

