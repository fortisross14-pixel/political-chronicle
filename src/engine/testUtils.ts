// Helpers shared by tests and the balance bot. Not used by the game UI.
import { applyAction } from './reducer';
import { createRun, defaultPolitician, hometownMayoralty } from './run';
import type { NewRunConfig } from './run';
import { stanceAt } from './stance';
import type { GameState, Pledge } from './types';

export const WATERTOWN_PLATFORM: Pledge[] = [
  { issue: 'guns', stance: stanceAt(3) },
  { issue: 'taxes', stance: stanceAt(3) },
  { issue: 'small_biz', stance: stanceAt(3) },
  { issue: 'climate', stance: stanceAt(2) },
  { issue: 'industry', stance: stanceAt(-2) },
];

/** Opens every waiting pack, keeping nothing (keeps tests independent of pack luck). */
export function skipPacks(state: GameState): GameState {
  let s = state;
  while (s.packs.length) s = applyAction(s, { type: 'KEEP_FROM_PACK', keep: [] });
  return s;
}

/**
 * A fresh run, starter pack set aside, blank in Jan 2027: Watertown's election year, at the last
 * turn its campaign window is open (4 turns to go), so tests keep a short, fixed calendar.
 */
export function newRun(overrides: Partial<NewRunConfig> = {}): GameState {
  return skipPacks(
    createRun({ seed: 'test', politician: defaultPolitician(), wealth: 100_000, earliestYear: 2027, exactYear: true, ...overrides }),
  );
}

/** Launches the hometown race (or `officeId`) with this platform and a $15k self-donation. */
export function launch(state: GameState, platform: Pledge[] = WATERTOWN_PLATFORM, officeId?: string, donation = 15_000): GameState {
  const id = officeId ?? hometownMayoralty(state.politician.residentRegionId)!;
  return skipPacks(applyAction(state, { type: 'LAUNCH_CAMPAIGN', officeId: id, platform, donation: Math.min(donation, state.wealth) }));
}

/** A fresh run with the hometown campaign launched, ready to play. */
export function readyRun(overrides: Partial<NewRunConfig> = {}, platform: Pledge[] = WATERTOWN_PLATFORM): GameState {
  return launch(newRun(overrides), platform);
}

/** Does the minimum to end a turn: opens packs, applies the first decision and dismisses results. */
export function passTurn(state: GameState): GameState {
  let s = state;
  if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
  if (s.ended) return s;
  s = skipPacks(s);
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
