import { describe, expect, it } from 'vitest';
import { applyAction } from './index';
import { newRun } from './testUtils';
import type { GameState } from './types';

/**
 * Performance budget (CONTRIBUTING.md): a turn must stay cheap enough for a mid-range phone,
 * and saves must stay small enough for localStorage. Dev machines are ~10× faster than phones,
 * so 5 ms here is ~50 ms there.
 */
const BUDGET = { msPerTurn: 5, saveKb: 300, turns: 60 };

function longCareer(): { state: GameState; msPerTurn: number } {
  let s = newRun({ seed: 'perf' });
  let total = 0;
  let turns = 0;
  for (; turns < BUDGET.turns && !s.ended; turns++) {
    if (s.pendingResult !== undefined) s = applyAction(s, { type: 'DISMISS_RESULT' });
    if (!s.career.race && !s.career.office) s = applyAction(s, { type: 'FILE_RACE', officeId: 'mayor-watertown' });
    if (s.career.race && !s.career.race.platform.length)
      s = applyAction(s, { type: 'SET_PLATFORM', platform: [{ issue: 'guns', stance: 2 }] });
    if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
    const t0 = performance.now();
    s = applyAction(s, { type: 'END_TURN' });
    if (s.night) s = applyAction(s, { type: 'NIGHT_FINISH' });
    total += performance.now() - t0;
  }
  return { state: s, msPerTurn: total / Math.max(1, turns) };
}

describe('performance budget', () => {
  it(`a turn costs under ${BUDGET.msPerTurn} ms and a long career's save stays under ${BUDGET.saveKb} KB`, () => {
    const { state, msPerTurn } = longCareer();
    expect(msPerTurn).toBeLessThan(BUDGET.msPerTurn);
    expect(JSON.stringify(state).length / 1024).toBeLessThan(BUDGET.saveKb);
  });
});
