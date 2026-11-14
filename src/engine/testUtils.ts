// Helpers shared by tests and the balance bot. Not used by the game UI.
import { applyAction } from './reducer';
import { createRun, defaultPolitician } from './run';
import type { NewRunConfig } from './run';
import type { GameState, Pledge } from './types';

export const WATERTOWN_PLATFORM: Pledge[] = [
  { issue: 'guns', stance: 2 },
  { issue: 'taxes', stance: 2 },
  { issue: 'small_biz', stance: 2 },
  { issue: 'climate', stance: 1 },
  { issue: 'industry', stance: -1 },
];

export function newRun(overrides: Partial<NewRunConfig> = {}): GameState {
  return createRun({ seed: 'test', politician: defaultPolitician(), startingFunds: 15_000, ...overrides });
}

/** A fresh run with a platform set, ready to play. */
export function readyRun(overrides: Partial<NewRunConfig> = {}, platform: Pledge[] = WATERTOWN_PLATFORM): GameState {
  return applyAction(newRun(overrides), { type: 'SET_PLATFORM', platform });
}

/** Does the minimum to end a turn: applies the first decision and dismisses results. */
export function passTurn(state: GameState): GameState {
  let s = state;
  if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
  if (s.ended) return s;
  if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
  s = applyAction(s, { type: 'END_TURN' });
  if (s.night) s = applyAction(s, { type: 'NIGHT_FINISH' });
  return s;
}

export function passTurns(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = passTurn(s);
  return s;
}
