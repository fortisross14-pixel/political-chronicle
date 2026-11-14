import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data';
import { playScenario, scenarioRate } from '../sim/bot';
import {
  applyAction,
  artifactSlots,
  buildRunConfig,
  createRun,
  createScenarioRun,
  decisionImpact,
  emptyProfile,
  legacyScore,
  loadoutError,
  recordRun,
  sandboxUnlocked,
  scenarioUnlocked,
} from './index';
import { getDecisionCard } from '../data';
import { botCharacter } from '../sim/bot';
import { passTurns } from './testUtils';
import type { GameState } from './types';

const start = (id: string, artifacts: string[] = []) => createScenarioRun(id, { name: 'Test', artifacts, seed: `t-${id}` });

describe('scenario setups', () => {
  it('Hometown favorite opens as a Watertown race in 2027 with weaker opponents', () => {
    const s = start('hometown_favorite');
    expect(s.career.race?.officeId).toBe('mayor-watertown');
    expect(s.clock.year).toBe(2027);
    expect(s.scenario).toMatchObject({ id: 'hometown_favorite', startYear: 2027 });
    expect(s.modifiers.opponentRecognition).toBeLessThan(1);
  });

  it('Keep your word opens in office in 2028 with the platform you won on and bills on the desk', () => {
    const s = start('keep_your_word');
    expect(s.career.race).toBeUndefined();
    expect(s.career.office).toMatchObject({ officeId: 'mayor-watertown', termEndsYear: 2031 });
    expect(s.career.office!.platform.length).toBe(5);
    expect(s.elections).toHaveLength(1); // the 2027 win
    expect(s.decisions?.cardIds.length).toBeGreaterThan(0);
    expect(s.clock).toMatchObject({ year: 2028, turn: 0, turnsThisYear: 3 });
  });

  it('Big city, small town opens as a Red House member with standing 55', () => {
    const s = start('big_city_small_town');
    expect(s.career.affiliation).toBe('RP');
    expect(s.career.partyStanding).toBe(55);
    expect(s.career.office?.officeId).toBe('house-ny-north');
  });
});

describe('objectives & stars', () => {
  it('a won objective ends the run with stars; a missed deadline ends it as a loss', () => {
    const won = playScenario('hometown_favorite', 'obj-1');
    const r = won.scenario!.result!;
    expect(won.ended?.reason).toBe('scenario');
    if (r.won) expect(r.stars).toContain('win');
    else expect(r.reason).toMatch(/Time ran out/);
  });

  it('an idle player fails Hometown favorite', () => {
    let s = start('hometown_favorite');
    s = applyAction(s, { type: 'SET_PLATFORM', platform: [{ issue: 'guns', stance: 2 }] });
    s = passTurns(s, 6);
    expect(s.scenario!.result).toMatchObject({ won: false });
  });
});

describe('meta-progression', () => {
  it('unlocks scenarios in order and Sandbox after the beginner track', () => {
    let p = emptyProfile();
    expect(scenarioUnlocked(p, 'hometown_favorite')).toBe(true);
    expect(scenarioUnlocked(p, 'keep_your_word')).toBe(false);
    expect(sandboxUnlocked(p)).toBe(false);
    for (const id of ['hometown_favorite', 'keep_your_word', 'pick_a_side', 'big_city_small_town']) {
      p = { ...p, scenarios: { ...p.scenarios, [id]: { stars: ['win'], completions: 1, attempts: 1 } } };
    }
    expect(scenarioUnlocked(p, 'keep_your_word')).toBe(true);
    expect(sandboxUnlocked(p)).toBe(true);
  });

  it('recording a won scenario pays rewards once per star count and files the run', () => {
    const fakeWin = (stars: string[], runId: string): GameState => {
      const s = start('hometown_favorite');
      return {
        ...s,
        runId,
        scenario: { ...s.scenario!, result: { won: true, stars, year: 2027, reason: '' } },
        ended: { reason: 'scenario', year: 2027 },
      };
    };
    const one = recordRun(emptyProfile(), fakeWin(['win'], 'r1'));
    expect(one.newArtifacts).toEqual(['campaign_button']);
    expect(one.profile.runs).toHaveLength(1);
    const again = recordRun(one.profile, fakeWin(['win'], 'r2'));
    expect(again.newArtifacts).toEqual([]); // 1 star already paid
    const three = recordRun(again.profile, fakeWin(['win', 'share55', 'share60'], 'r3'));
    expect(three.newArtifacts).toEqual(['war_chest']);
    expect(three.newAbilities).toEqual(['rapid_response']);
    expect(three.profile.scenarios.hometown_favorite!.stars).toHaveLength(3);
    expect(recordRun(three.profile, fakeWin(['win'], 'r3')).profile).toBe(three.profile); // same run twice: no-op
  });

  it('artifact slots grow with stars; loadouts are validated', () => {
    const p = { ...emptyProfile(), artifacts: ['war_chest', 'lucky_tie', 'rolodex'] };
    expect(artifactSlots(p)).toBe(2);
    expect(loadoutError(p, ['war_chest', 'lucky_tie', 'rolodex'], [])).toMatch(/2 artifact slots/);
    expect(loadoutError(p, ['debate_notes'], [])).toMatch(/don’t own/);
    expect(loadoutError(p, ['war_chest'], ['iron_discipline'])).toMatch(/earned/);
    expect(loadoutError(p, ['war_chest', 'lucky_tie'], [])).toBeUndefined();
  });

  it('legacy grows with time in higher office', () => {
    const mayor = playScenario('keep_your_word', 'legacy-1');
    expect(legacyScore(mayor)).toBeGreaterThan(30);
  });
});

describe('artifacts & abilities', () => {
  it('artifacts change the opening state', () => {
    const plain = start('hometown_favorite');
    const kitted = start('hometown_favorite', ['war_chest', 'lucky_tie', 'rolodex', 'union_hall_key']);
    expect(kitted.funds).toBe(plain.funds + 15000);
    expect(kitted.integrity).toBe(plain.integrity + 5);
    expect(kitted.team.cards.map((c) => c.personId)).toContain('cm_kowalczyk');
    expect(kitted.career.race!.tokens).toBe(plain.career.race!.tokens + 1);
  });

  it('iron discipline halves the integrity cost of a broken promise', () => {
    const s = start('keep_your_word');
    const card = getDecisionCard('of_park_gun_ban'); // breaks the guns promise
    const disciplined = { ...s, politician: { ...s.politician, abilities: ['iron_discipline'] } };
    expect(decisionImpact(disciplined, card).integrity).toBeCloseTo(decisionImpact(s, card).integrity / 2, 5);
  });

  it('sandbox careers end after the chosen length', () => {
    let s = createRun({ ...buildRunConfig(botCharacter('ny-north'), 'len'), careerYears: 2 });
    s = applyAction(s, { type: 'SET_PLATFORM', platform: [{ issue: 'guns', stance: 2 }] });
    s = passTurns(s, 9);
    expect(s.ended?.reason).toBe('length');
  });
});

describe('M10 acceptance: beginner scenarios sit in their difficulty bands', () => {
  // Target 80–90% for sensible play. Keep your word sits above it until the M13 governing pass.
  const bands: Record<string, [number, number]> = {
    hometown_favorite: [0.7, 0.95],
    keep_your_word: [0.7, 1],
    pick_a_side: [0.65, 0.95],
    big_city_small_town: [0.6, 0.95],
  };
  for (const scn of SCENARIOS.filter((x) => x.track === 'beginner')) {
    it(`${scn.title}`, () => {
      const { winRate } = scenarioRate(scn.id, 20);
      expect(winRate).toBeGreaterThanOrEqual(bands[scn.id]![0]);
      expect(winRate).toBeLessThanOrEqual(bands[scn.id]![1]);
    });
  }
});
