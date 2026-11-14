import { describe, expect, it } from 'vitest';
import { applyAction, GameError, validateAction } from './index';
import { newRun, readyRun } from './testUtils';
import type { Action, GameState } from './types';

/** One invalid example per action type, with the state it's invalid in. */
const INVALID: Record<Action['type'], (s: GameState) => [GameState, Action]> = {
  END_TURN: (s) => [s, { type: 'END_TURN' }], // decisions pending
  LAUNCH_CAMPAIGN: (s) => [s, { type: 'LAUNCH_CAMPAIGN', officeId: 'mayor-nyc', platform: [], donation: 0 }], // already running
  PLAY_EVENT: (s) => [s, { type: 'PLAY_EVENT', cardUid: 'door_knocking', regionId: 'wt-arsenal', issue: 'guns' }], // decisions pending
  RESOLVE_DECISIONS: (s) => [s, { type: 'RESOLVE_DECISIONS', apply: [] }],
  BUY_PACK: (s) => [
    { ...s, funds: 0 },
    { type: 'BUY_PACK', kind: 'campaign', tier: 'elite' },
  ],
  KEEP_FROM_PACK: (s) => [s, { type: 'KEEP_FROM_PACK', keep: [0] }], // no pack open
  PLAY_POLICY: (s) => [s, { type: 'PLAY_POLICY', uid: 999 }],
  DISCARD_CARD: (s) => [s, { type: 'DISCARD_CARD', zone: 'policy', uid: 999 }],
  DISMISS_RESULT: (s) => [s, { type: 'DISMISS_RESULT' }],
  RETIRE: (s) => [{ ...s, ended: { reason: 'retired', year: 2027 } }, { type: 'RETIRE' }],
  ASK_TO_JOIN: (s) => [
    { ...s, career: { ...s.career, joinAsked: { RP: s.clock.year } } },
    { type: 'ASK_TO_JOIN', party: 'RP' },
  ], // already asked this year
  ASSIGN_PERSON: (s) => [s, { type: 'ASSIGN_PERSON', uid: 999, role: 'chiefOfStaff' }],
  UNASSIGN_ROLE: (s) => [s, { type: 'UNASSIGN_ROLE', role: 'legislativeDirector' }],
  DISCARD_PERSON: (s) => [s, { type: 'DISCARD_PERSON', uid: 999 }],
  USE_ITEM: (s) => [s, { type: 'USE_ITEM', uid: 999 }],
  NIGHT_ADVANCE: (s) => [s, { type: 'NIGHT_ADVANCE' }],
  NIGHT_MOBILIZE: (s) => [s, { type: 'NIGHT_MOBILIZE', regionId: 'wt-arsenal' }],
  NIGHT_LAWYERS: (s) => [s, { type: 'NIGHT_LAWYERS', regionId: 'wt-arsenal' }],
  NIGHT_AD_BLITZ: (s) => [s, { type: 'NIGHT_AD_BLITZ' }],
  NIGHT_FINISH: (s) => [s, { type: 'NIGHT_FINISH' }],
  USE_TRINKET: (s) => [s, { type: 'USE_TRINKET', id: 'get_out_the_vote' }],
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
    expect(validateAction(s, { type: 'BUY_PACK', kind: 'people', tier: 'regular' })).toMatch(/Election night/);
  });

  it('nothing but dismissing a result works once the career is over', () => {
    const s: GameState = { ...readyRun(), ended: { reason: 'retired', year: 2027 }, pendingResult: undefined };
    expect(validateAction(s, { type: 'LAUNCH_CAMPAIGN', officeId: 'mayor-nyc', platform: [], donation: 0 })).toMatch(/over/);
  });
});
