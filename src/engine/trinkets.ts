// Trinkets (DESIGN_V2 §13): equipped before each try; passive ones change the rules, active ones
// are used a few times per race or term in their window.
import { getOffice, getRegion, getTrinket } from '../data';
import { reject } from './errors';
import { nudgeApproval } from './governing';
import { nightView } from './night';
import { nudgeFavorability, nudgeRecognition } from './opinion';
import { policyJurisdiction } from './policy';
import { isElectionTurn } from './time';
import type { GameState, RegionId } from './types';

export const TRINKET_EFFECT = {
  /** Get out the vote: share points on your vote in every region of the race. */
  gotv: 0.01,
  /** Phone bank: late-voter points on the uncounted vote. */
  phoneBank: 0.008,
  surpriseRecognition: 0.03,
  surpriseFavorability: 0.03,
  officeHours: 0.03,
  starRecognition: 0.05,
  starFavorability: 0.04,
};

/** Equipped this run (or, for old saves, earned as an ability). */
export function hasTrinket(state: Pick<GameState, 'artifacts' | 'politician'>, id: string): boolean {
  return (state.artifacts ?? []).includes(id) || (state.politician.abilities?.includes(id) ?? false);
}

function spent(state: GameState, id: string): number {
  const window = getTrinket(id).window;
  const used = window === 'governing' ? (state.career.office?.used ?? []) : (state.career.race?.used ?? []);
  return used.filter((u) => u === id).length;
}

export function trinketUsesLeft(state: GameState, id: string): number {
  return Math.max(0, getTrinket(id).uses - spent(state, id));
}

/** Why this trinket can't be used right now, if it can't. */
export function trinketError(state: GameState, id: string, regionId?: RegionId): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (!hasTrinket(state, id)) return 'You didn’t bring that trinket.';
  const t = getTrinket(id);
  if (t.window === 'passive') return 'It works on its own.';
  if (trinketUsesLeft(state, id) < 1) return t.window === 'governing' ? 'Used up for this term.' : 'Used up for this race.';
  const race = state.career.race;
  const night = state.night;
  switch (t.window) {
    case 'campaign':
      if (night) return 'The campaign is over: it’s election night.';
      if (!race?.platform.length) return 'You need an active campaign.';
      if (t.targetsRegion && (!regionId || !getOffice(race.officeId).regionIds.includes(regionId))) return 'Pick a region in this race.';
      return undefined;
    case 'mobilize':
      if (night) return 'Too late: the polls have closed.';
      if (!race?.platform.length || !isElectionTurn(state.clock, state.career)) return 'Only on Election Day, before the polls open.';
      return undefined;
    case 'lateVoters':
      if (!night) return 'Only on election night.';
      if (night.phase !== 'exit') return 'Only right after the exit polls.';
      return undefined;
    case 'governing':
      if (night) return 'Not on election night.';
      if (!state.career.office) return 'Only while you hold office.';
      if (id === 'force_the_vote' && state.career.office.forceVote) return 'Already armed for your next bill.';
      if (t.targetsRegion && (!regionId || !policyJurisdiction(state).includes(regionId))) return 'Pick a region you govern.';
      return undefined;
  }
}

function log(state: GameState, text: string): GameState {
  return { ...state, log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text }] };
}

function markRace(state: GameState, id: string, patch: Partial<NonNullable<GameState['career']['race']>> = {}): GameState {
  const race = state.career.race!;
  return { ...state, career: { ...state.career, race: { ...race, ...patch, used: [...(race.used ?? []), id] } } };
}

export function applyTrinket(state: GameState, id: string, regionId?: RegionId): GameState {
  reject(trinketError(state, id, regionId));
  const t = getTrinket(id);
  const race = state.career.race;
  switch (id) {
    case 'surprise_appearance': {
      const r = state.regions[regionId!]!;
      const regions = {
        ...state.regions,
        [regionId!]: {
          recognition: nudgeRecognition(r.recognition, TRINKET_EFFECT.surpriseRecognition),
          favorability: nudgeFavorability(r.favorability, TRINKET_EFFECT.surpriseFavorability),
        },
      };
      return log(
        markRace({ ...state, regions }, id),
        `Surprise appearance at the game in ${getRegion(regionId!).seatCity}. The crowd loves it.`,
      );
    }
    case 'star_power': {
      const regions = { ...state.regions };
      for (const rid of getOffice(race!.officeId).regionIds) {
        const r = regions[rid]!;
        regions[rid] = {
          recognition: nudgeRecognition(r.recognition, TRINKET_EFFECT.starRecognition),
          favorability: nudgeFavorability(r.favorability, TRINKET_EFFECT.starFavorability),
        };
      }
      return log(markRace({ ...state, regions }, id), 'Star power: a rally everyone is talking about.');
    }
    case 'get_out_the_vote':
      return log(
        markRace(state, id, { gotv: (race!.gotv ?? 0) + TRINKET_EFFECT.gotv }),
        'Your volunteers mobilize voters before the polls open.',
      );
    case 'phone_bank': {
      const night = state.night!;
      const effect = TRINKET_EFFECT.phoneBank * (1 - nightView(night).countedTotal);
      const s = markRace(state, id);
      return {
        ...s,
        night: {
          ...night,
          surge: (night.surge ?? 0) + effect,
          ticker: [...night.ticker, 'Your phone bank reaches the last voters in line.'],
        },
      };
    }
    case 'office_hours': {
      const office = state.career.office!;
      const approval = { ...office.approval };
      if (approval[regionId!] !== undefined) approval[regionId!] = nudgeApproval(approval[regionId!]!, TRINKET_EFFECT.officeHours);
      return log(
        { ...state, career: { ...state.career, office: { ...office, approval, used: [...(office.used ?? []), id] } } },
        `Office hours in ${getRegion(regionId!).seatCity}: you hear people out.`,
      );
    }
    case 'force_the_vote': {
      const office = state.career.office!;
      return log(
        { ...state, career: { ...state.career, office: { ...office, forceVote: true, used: [...(office.used ?? []), id] } } },
        'You call in every favor: your next bill will pass.',
      );
    }
  }
  throw new Error(`Trinket ${t.id} has no active effect.`);
}
