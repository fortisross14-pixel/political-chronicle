import { getOffice } from '../data';
import { ageOf, energyForAge, takeSnapshot } from './run';
import { isElectionTurn, monthsPerTurn, turnsInYear } from './time';
import type { Action, GameState, LogEntry } from './types';

export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'END_TURN':
      return endTurn(state);
  }
}

function endTurn(state: GameState): GameState {
  const snapshots = [...state.snapshots, takeSnapshot(state)];
  const log: LogEntry[] = [...state.log];
  let career = state.career;

  if (career.race && isElectionTurn(state.clock, career)) {
    // Election resolution arrives in M3; for now the race simply closes.
    log.push({
      year: state.clock.year,
      turn: state.clock.turn,
      text: `Election Day for ${getOffice(career.race.officeId).name}. (Results are simulated from M3.)`,
    });
    const { race: _closed, ...rest } = career;
    career = rest;
  }

  const months = monthsPerTurn(state.clock.turnsThisYear);
  let { year, turn } = state.clock;
  let turnsThisYear = state.clock.turnsThisYear;
  turn += 1;
  if (turn >= turnsThisYear) {
    year += 1;
    turn = 0;
    turnsThisYear = turnsInYear(career, year);
  }
  const clock = { year, turn, turnsThisYear, monthsElapsed: state.clock.monthsElapsed + months };

  const next: GameState = { ...state, clock, career, snapshots, log };
  return { ...next, energy: energyForAge(ageOf(next)) };
}
