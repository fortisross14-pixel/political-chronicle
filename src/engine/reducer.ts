import { getOffice } from '../data';
import { fileRace, opponentsAct, resolveElection, setPlatform } from './campaign';
import { dealDecisions, resolveDecisions } from './decisions';
import { playEvent } from './events';
import { Rng } from './rng';
import { ageOf, energyForAge, MAX_AGE_ENDS_RUN, takeSnapshot } from './run';
import { isElectionTurn, monthsPerTurn, turnsInYear } from './time';
import type { Action, GameState } from './types';

/** Why the player can't end the turn right now, or undefined if they can. */
export function endTurnBlocker(state: GameState): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.pendingResult !== undefined) return 'Review the election result first.';
  if (state.career.race && !state.career.race.platform.length) return 'Choose your platform first.';
  if (state.decisions && !state.decisions.resolved) return 'Resolve this turn’s decisions first (apply 1–3).';
  return undefined;
}

/**
 * Applies a player action. Invalid actions throw; the UI checks the matching
 * `*Error` / `*Blocker` helpers first so it never sends one.
 */
export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'END_TURN':
      return endTurn(state);
    case 'FILE_RACE':
      return fileRace(state, action.officeId);
    case 'SET_PLATFORM':
      return setPlatform(state, action.platform);
    case 'PLAY_EVENT':
      return playEvent(state, action.cardUid, action.regionId, action.issue).state;
    case 'RESOLVE_DECISIONS':
      return resolveDecisions(state, action.apply);
    case 'DISMISS_RESULT':
      return { ...state, pendingResult: undefined };
    case 'RETIRE':
      if (state.ended) return state;
      return {
        ...state,
        ended: { reason: 'retired', year: state.clock.year },
        log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text: 'Retired from politics.' }],
      };
  }
}

function endTurn(state: GameState): GameState {
  const blocker = endTurnBlocker(state);
  if (blocker) throw new Error(blocker);
  const rng = new Rng(state.rng);
  let s: GameState = state;

  // Opponents campaign, then the turn is recorded (including the poll).
  if (s.career.race) s = { ...s, career: { ...s.career, race: opponentsAct(rng, s.career.race) } };
  s = { ...s, snapshots: [...s.snapshots, takeSnapshot(s)] };

  if (s.career.race && isElectionTurn(s.clock, s.career)) s = resolveElection(s, rng);

  const months = monthsPerTurn(s.clock.turnsThisYear);
  let { year, turn, turnsThisYear } = s.clock;
  turn += 1;
  if (turn >= turnsThisYear) {
    year += 1;
    turn = 0;
    turnsThisYear = turnsInYear(s.career, year);
  }
  s = { ...s, rng: rng.state, clock: { year, turn, turnsThisYear, monthsElapsed: s.clock.monthsElapsed + months } };

  const age = ageOf(s);
  s = { ...s, energy: energyForAge(age) };
  if (!s.ended && age >= MAX_AGE_ENDS_RUN) {
    s = {
      ...s,
      ended: { reason: 'age', year },
      log: [...s.log, { year, turn, text: `At ${Math.floor(age)}, it is time to step away from public life.` }],
    };
  }
  if (s.career.office && !s.career.race && s.clock.turn === 0 && s.clock.year === s.career.office.termEndsYear) {
    s = { ...s, log: [...s.log, { year, turn, text: `Your term as ${getOffice(s.career.office.officeId).name} ends this year. Re-election arrives in M5.` }] };
  }
  return s.ended ? { ...s, decisions: undefined } : dealDecisions(s);
}
