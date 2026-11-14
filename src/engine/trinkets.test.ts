import { describe, expect, it } from 'vitest';
import { STARTER_TRINKETS, TRINKETS } from '../data';
import {
  applyAction,
  createScenarioRun,
  drawElection,
  extraPointsError,
  isElectionTurn,
  missionBaseSkills,
  passageChance,
  Rng,
  trinketError,
  trinketUsesLeft,
} from './index';
import { getDecisionCard } from '../data';
import { readyRun } from './testUtils';
import type { GameState } from './types';

const equip = (s: GameState, ...ids: string[]): GameState => ({ ...s, artifacts: [...s.artifacts, ...ids] });

function toElectionDay(s: GameState): GameState {
  for (let i = 0; i < 8 && !isElectionTurn(s.clock, s.career); i++) {
    if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
    s = applyAction(s, { type: 'END_TURN' });
  }
  if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
  return s;
}

describe('trinkets', () => {
  it('every trinket has a rarity, a window and a text; six commons to start', () => {
    expect(STARTER_TRINKETS).toHaveLength(6);
    for (const t of TRINKETS) expect(t.text.length).toBeGreaterThan(5);
    expect(new Set(TRINKETS.map((t) => t.rarity))).toEqual(new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']));
  });

  it('you can only use what you brought', () => {
    expect(trinketError(readyRun(), 'surprise_appearance', 'ny-north')).toMatch(/didn’t bring/);
  });

  it('a surprise appearance at the game helps in one region, twice per race', () => {
    const s = equip(readyRun(), 'surprise_appearance');
    expect(trinketError(s, 'surprise_appearance')).toMatch(/region/);
    const once = applyAction(s, { type: 'USE_TRINKET', id: 'surprise_appearance', regionId: 'ny-north' });
    expect(once.regions['ny-north']!.favorability).toBeGreaterThan(s.regions['ny-north']!.favorability);
    expect(once.regions['ny-north']!.recognition).toBeGreaterThan(s.regions['ny-north']!.recognition);
    const twice = applyAction(once, { type: 'USE_TRINKET', id: 'surprise_appearance', regionId: 'ny-north' });
    expect(trinketUsesLeft(twice, 'surprise_appearance')).toBe(0);
    expect(trinketError(twice, 'surprise_appearance', 'ny-north')).toMatch(/Used up/);
  });

  it('get out the vote works on Election Day only, and adds to the draw', () => {
    const s = equip(readyRun(), 'get_out_the_vote');
    expect(trinketError(s, 'get_out_the_vote')).toMatch(/Election Day/);
    const day = toElectionDay(s);
    expect(trinketError(day, 'get_out_the_vote')).toBeUndefined();
    const mobilized = applyAction(day, { type: 'USE_TRINKET', id: 'get_out_the_vote' });
    const a = drawElection(day, new Rng(7)).regionShares['ny-north']![0]!;
    const b = drawElection(mobilized, new Rng(7)).regionShares['ny-north']![0]!;
    expect(b - a).toBeCloseTo(0.01, 5);
  });

  it('the night opens on the exit polls; the phone bank works only then', () => {
    const day = toElectionDay(equip(readyRun(), 'phone_bank'));
    const night = applyAction(day, { type: 'END_TURN' });
    expect(night.night!.phase).toBe('exit');
    expect(night.night!.exitPoll).toBeGreaterThan(0);
    const called = applyAction(night, { type: 'USE_TRINKET', id: 'phone_bank' });
    expect(called.night!.surge).toBeGreaterThan(0);
    const counting = applyAction(night, { type: 'NIGHT_ADVANCE' });
    expect(counting.night!.phase).toBe('count');
    expect(counting.night!.step).toBe(night.night!.step);
    expect(trinketError(counting, 'phone_bank')).toMatch(/exit polls/);
  });

  it('force the vote passes your next bill without the votes, then is spent', () => {
    const s = createScenarioRun('pick_a_side', { name: 'T', artifacts: ['force_the_vote'], seed: 'ftv' });
    const office = { officeId: 'house-ny-north', termEndsYear: 2030, approval: { 'ny-north': 0.5 }, platform: [], startedYear: 2028 };
    const rep = { ...s, career: { ...s.career, office, affiliation: 'DU' as const }, chambers: { ...s.chambers, congress: 'RP' as const } };
    const bill = getDecisionCard('of_hire_police');
    expect(passageChance(rep, bill)).toBeLessThan(1);
    const armed = applyAction(rep, { type: 'USE_TRINKET', id: 'force_the_vote' });
    expect(passageChance(armed, bill)).toBe(1);
    expect(trinketError(armed, 'force_the_vote')).toMatch(/Used up|armed/);
  });

  it('missions take 5 extra points, with a starting cap of 7', () => {
    const base = missionBaseSkills('hometown_favorite');
    expect(extraPointsError('hometown_favorite', { charisma: 4, law: 1 })).toBeUndefined();
    expect(extraPointsError('hometown_favorite', { charisma: 6 })).toMatch(/5 points|at most/);
    const s = createScenarioRun('hometown_favorite', { name: 'T', artifacts: [], seed: 'x', extra: { charisma: 4 } });
    expect(s.politician.skills.charisma).toBe(base.charisma + 4);
  });
});
