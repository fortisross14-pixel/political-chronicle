// The world around you (DESIGN_V2 §9): every office has a holder, every election produces a
// result — yours or one simulated for the races you sit out.
import { FIRST_NAMES, getOffice, getRegion, LAST_NAMES, OFFICES } from '../data';
import { clamp } from './opinion';
import { isOfficeElectionYear } from './time';
import type { Rng } from './rng';
import type { Affiliation, Candidate, ElectionRecord, GameState, Office, OfficeId, PartyId, Seat, World, WorldResult } from './types';

export const WORLD = {
  /** Blue's chance = 0.5 − this × the jurisdiction's lean (−1 blue .. +1 red). */
  leanSlope: 0.55,
  incumbentEdge: 0.06,
  /** Nonpartisan incumbents keep their seat this often. */
  mayorIncumbent: 0.65,
  /** Partisan incumbents of the winning party run again this often. */
  rerun: 0.85,
  /** Recognition an incumbent opponent gains from holding the seat. */
  incumbentRecognition: 0.2,
  /** Chance the sitting officeholder runs again against you (otherwise it's an open seat). */
  seeksReelection: 0.6,
};

function name(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

/** Population × turnout weighted partisan lean of an office's voters. */
export function officeLean(office: Office): number {
  const ws = office.regionIds.map((id) => getRegion(id).population * getRegion(id).turnout);
  const total = ws.reduce((a, b) => a + b, 0);
  return office.regionIds.reduce((s, id, i) => s + (getRegion(id).partisanLean * ws[i]!) / total, 0);
}

function lastElectionBefore(office: Office, year: number): number {
  let y = year - 1;
  while (!isOfficeElectionYear(office, y)) y--;
  return y;
}

function drawParty(rng: Rng, office: Office, incumbent?: Affiliation): PartyId {
  const edge = incumbent === 'DU' ? WORLD.incumbentEdge : incumbent === 'RP' ? -WORLD.incumbentEdge : 0;
  return rng.chance(clamp(0.5 - WORLD.leanSlope * officeLean(office) + edge, 0.05, 0.95)) ? 'DU' : 'RP';
}

export function initWorld(rng: Rng, startYear: number): World {
  const seats: Record<OfficeId, Seat> = {};
  for (const office of OFFICES) {
    seats[office.id] = {
      holder: name(rng),
      affiliation: office.partisan ? drawParty(rng, office) : 'IND',
      since: lastElectionBefore(office, startYear),
    };
  }
  return { seats, results: [] };
}

/** An election you didn't run in, decided in the background. */
function simulate(rng: Rng, office: Office, year: number, seat: Seat | undefined): WorldResult {
  const margin = Math.abs(rng.gaussian(0.07, 0.06));
  const share = clamp(0.5 + margin, 0.5, 0.8);
  if (!office.partisan) {
    const keeps = !!seat && !seat.isPlayer && rng.chance(WORLD.mayorIncumbent);
    const challenger = name(rng);
    return {
      officeId: office.id,
      year,
      winner: keeps ? seat.holder : challenger,
      winnerAffiliation: 'IND',
      share,
      runnerUp: keeps ? challenger : (seat?.holder ?? name(rng)),
      runnerUpAffiliation: 'IND',
      playerRan: false,
      playerWon: false,
    };
  }
  const party = drawParty(rng, office, seat?.affiliation);
  const incumbentRuns = !!seat && !seat.isPlayer && seat.affiliation === party && rng.chance(WORLD.rerun);
  const other: PartyId = party === 'DU' ? 'RP' : 'DU';
  return {
    officeId: office.id,
    year,
    winner: incumbentRuns ? seat.holder : name(rng),
    winnerAffiliation: party,
    share,
    runnerUp: seat && !seat.isPlayer && seat.affiliation === other ? seat.holder : name(rng),
    runnerUpAffiliation: other,
    playerRan: false,
    playerWon: false,
  };
}

/** Year-end: every office elected in `year` that you didn't run for gets a result. */
export function simulateYear(state: GameState, rng: Rng, year: number): GameState {
  const ran = new Set(state.elections.filter((e) => e.kind === 'general' && e.year === year).map((e) => e.officeId));
  const seats = { ...state.world.seats };
  const results = [...state.world.results];
  for (const office of OFFICES) {
    if (!isOfficeElectionYear(office, year) || ran.has(office.id)) continue;
    const r = simulate(rng, office, year, seats[office.id]);
    results.push(r);
    seats[office.id] = { holder: r.winner, affiliation: r.winnerAffiliation, since: year };
  }
  return { ...state, world: { seats, results } };
}

/** After your own election: the seat and the result go on the record. */
export function recordPlayerElection(state: GameState, record: ElectionRecord): GameState {
  if (record.kind !== 'general') return state;
  const order = record.totalShares.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
  const win = record.candidates[order[0]!.i]!;
  const second = record.candidates[order[1]?.i ?? 0]!;
  const result: WorldResult = {
    officeId: record.officeId,
    year: record.year,
    winner: win.name,
    winnerAffiliation: win.affiliation,
    share: order[0]!.s,
    runnerUp: second.name,
    runnerUpAffiliation: second.affiliation,
    playerRan: true,
    playerWon: record.playerWon,
  };
  const seat: Seat = {
    holder: win.name,
    affiliation: win.affiliation,
    since: record.year,
    ...(record.playerWon ? { isPlayer: true } : {}),
  };
  return { ...state, world: { seats: { ...state.world.seats, [record.officeId]: seat }, results: [...state.world.results, result] } };
}

/**
 * The sitting officeholder may run against you: they take an opponent slot of their party (or the
 * first). Otherwise it's an open seat and nobody runs as the incumbent.
 */
export function seatIncumbent(state: GameState, officeId: OfficeId, opponents: Candidate[], rng: Rng): Candidate[] {
  const seat = state.world.seats[officeId];
  if (!seat || seat.isPlayer) return opponents;
  if (!rng.chance(WORLD.seeksReelection)) return opponents.map((c) => ({ ...c, incumbent: false }));
  const office = getOffice(officeId);
  const at = office.partisan ? opponents.findIndex((c) => c.affiliation === seat.affiliation) : 0;
  if (at < 0) return opponents;
  return opponents.map((c, i) => {
    if (i !== at) return { ...c, incumbent: false };
    const regions = c.incumbent
      ? c.regions
      : Object.fromEntries(
          Object.entries(c.regions).map(([id, r]) => [
            id,
            office.regionIds.includes(id) ? { ...r, recognition: clamp(r.recognition + WORLD.incumbentRecognition, 0, 0.95) } : r,
          ]),
        );
    return { ...c, name: seat.holder, incumbent: true, regions };
  });
}

export interface CalendarEntry {
  officeId: OfficeId;
  year: number;
}

/** Elections in the next `years` years, soonest first. */
export function upcomingElections(state: GameState, years = 4): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (let y = state.clock.year; y < state.clock.year + years; y++)
    for (const office of OFFICES) if (isOfficeElectionYear(office, y)) out.push({ officeId: office.id, year: y });
  return out;
}
