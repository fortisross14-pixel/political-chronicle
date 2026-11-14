import { describe, expect, it } from 'vitest';
import { applyAction, GameError, validateAction } from './index';
import { newRun, readyRun } from './testUtils';
import type { Action, GameState } from './types';

/** One invalid example per action type, with the state it's invalid in. */
const INVALID: Record<Action['type'], (s: GameState) => [GameState, Action]> = {
  END_TURN: (s) => [s, { type: 'END_TURN' }], // decisions pending
  FILE_RACE: (s) => [s, { type: 'FILE_RACE', officeId: 'mayor-nyc' }], // already running
  SET_PLATFORM: (s) => [s, { type: 'SET_PLATFORM', platform: [] }],
  PLAY_EVENT: (s) => [s, { type: 'PLAY_EVENT', cardUid: 'door_knocking', regionId: 'ny-north', issue: 'guns' }], // decisions pending
  RESOLVE_DECISIONS: (s) => [s, { type: 'RESOLVE_DECISIONS', apply: [] }],
  BUY_CARD: (s) => [
    { ...s, funds: 0 },
    { type: 'BUY_CARD', offerIndex: 99 },
  ],
  DISMISS_RESULT: (s) => [s, { type: 'DISMISS_RESULT' }],
  RETIRE: (s) => [{ ...s, ended: { reason: 'retired', year: 2027 } }, { type: 'RETIRE' }],
  JOIN_PARTY: (s) => [s, { type: 'JOIN_PARTY', party: 'RP' }], // no race yet run
  ASSIGN_PERSON: (s) => [s, { type: 'ASSIGN_PERSON', uid: 999 }],
  UNASSIGN_ROLE: (s) => [s, { type: 'UNASSIGN_ROLE', role: 'legislativeDirector' }],
  DISCARD_PERSON: (s) => [s, { type: 'DISCARD_PERSON', uid: 999 }],
  USE_ITEM: (s) => [s, { type: 'USE_ITEM', uid: 999 }],
  NIGHT_ADVANCE: (s) => [s, { type: 'NIGHT_ADVANCE' }],
  NIGHT_MOBILIZE: (s) => [s, { type: 'NIGHT_MOBILIZE', regionId: 'ny-north' }],
  NIGHT_LAWYERS: (s) => [s, { type: 'NIGHT_LAWYERS', regionId: 'ny-north' }],
  NIGHT_AD_BLITZ: (s) => [s, { type: 'NIGHT_AD_BLITZ' }],
  NIGHT_FINISH: (s) => [s, { type: 'NIGHT_FINISH' }],
};

describe('validateAction', () => {
  it.each(Object.keys(INVALID) as Action['type'][])('rejects an invalid %s with a GameError', (type) => {
    const [state, action] = INVALID[type](readyRun());
    const reason = validateAction(state, action);
    expect(reason, type).toBeTruthy();
    expect(() => applyAction(state, action)).toThrow(GameError);
  });

  it('agrees with the reducer on a valid action', () => {
    const s = readyRun();
    const action: Action = { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] };
    expect(validateAction(s, action)).toBeUndefined();
    expect(() => applyAction(s, action)).not.toThrow();
  });

  it('only night actions (and team management) are allowed on election night', () => {
    const s: GameState = { ...newRun(), night: { officeId: 'mayor-watertown' } as GameState['night'] };
    expect(validateAction(s, { type: 'END_TURN' })).toMatch(/Election night/);
    expect(validateAction(s, { type: 'BUY_CARD', offerIndex: 0 })).toMatch(/Election night/);
  });

  it('nothing but dismissing a result works once the career is over', () => {
    const s: GameState = { ...readyRun(), ended: { reason: 'retired', year: 2027 }, pendingResult: undefined };
    expect(validateAction(s, { type: 'FILE_RACE', officeId: 'mayor-nyc' })).toMatch(/over/);
  });
});
