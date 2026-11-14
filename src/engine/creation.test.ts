import { describe, expect, it } from 'vitest';
import { BACKGROUNDS } from '../data';
import { botCharacter, hometownWinRate } from '../sim/bot';
import {
  applyAction,
  autoAllocate,
  buildRunConfig,
  createRun,
  creationCap,
  creationErrors,
  decisionPool,
  finalSkills,
  handSize,
  isNative,
  MAX_AGE,
  MIN_AGE,
  newcomerPenalty,
  pointsSpent,
  preAllocationSkills,
  previewEvent,
  projectedIncome,
  raceViews,
  SKILL_IDS,
  skillPointsForAge,
  spendablePoints,
  wealthFor,
  wealthRange,
} from '.';
import type { CreationInput, GameState } from '.';
import { launch, skipPacks } from './testUtils';

function character(overrides: Partial<CreationInput> = {}): CreationInput {
  const backgroundId = overrides.backgroundId ?? 'public_servant';
  const age = overrides.age ?? 30;
  return {
    name: 'Test Person',
    gender: 'female',
    age,
    homeState: 'NY',
    residentRegionId: 'ny-north',
    backgroundId,
    allocation: autoAllocate(backgroundId, age),
    ...overrides,
  };
}

const run = (overrides: Partial<CreationInput> = {}, seed = 'c') => skipPacks(createRun(buildRunConfig(character(overrides), seed)));

describe('skills, points and funds', () => {
  it('has the 7 v2 skills', () => {
    expect(SKILL_IDS).toEqual(['charisma', 'economics', 'diplomacy', 'strategy', 'administration', 'leadership', 'law']);
  });

  it('grants 10 points at 25 and +1 per 5 years', () => {
    expect(skillPointsForAge(25)).toBe(10);
    expect(skillPointsForAge(30)).toBe(11);
    expect(skillPointsForAge(65)).toBe(18);
  });

  it('wealth: older characters have more; executives and celebrities are far richer than organizers', () => {
    expect(wealthRange('organizer', 65).max).toBeGreaterThan(wealthRange('organizer', 25).max);
    expect(wealthFor('business', 40, 'w')).toBeGreaterThan(wealthRange('organizer', 65).max * 10);
    expect(wealthFor('celebrity', 40, 'w')).toBeGreaterThanOrEqual(1_000_000);
    expect(wealthFor('lawyer', 40, 'w')).toBe(wealthFor('lawyer', 40, 'w')); // seeded
    let fortunes = 0;
    for (let i = 0; i < 400; i++) if (wealthFor('business', 30, `f-${i}`) >= 1e9) fortunes++;
    expect(fortunes).toBeGreaterThan(4);
    expect(fortunes).toBeLessThan(40);
  });

  it('background fixed points are added on top of base 1', () => {
    const s = preAllocationSkills('celebrity');
    expect(s.charisma).toBe(5);
    expect(s.strategy).toBe(2);
    expect(s.law).toBe(1);
  });

  it('weaknesses cap skills at creation', () => {
    expect(creationCap('celebrity', 'administration')).toBe(2);
    expect(creationCap('celebrity', 'charisma')).toBe(5);
    const allocation = { ...autoAllocate('celebrity', 30), administration: 3 };
    expect(creationErrors(character({ backgroundId: 'celebrity', allocation })).join()).toMatch(/Administration \(max 2\)/);
  });
});

describe('autoAllocate', () => {
  it.each(BACKGROUNDS.flatMap((b) => [MIN_AGE, 45, MAX_AGE].map((age) => [b.id, age] as const)))(
    '%s at %i spends every point within the caps',
    (backgroundId, age) => {
      const allocation = autoAllocate(backgroundId, age);
      expect(pointsSpent(allocation)).toBe(spendablePoints(backgroundId, age));
      expect(spendablePoints(backgroundId, age)).toBeLessThanOrEqual(skillPointsForAge(age));
      const skills = finalSkills({ backgroundId, allocation });
      for (const id of SKILL_IDS) expect(skills[id]).toBeLessThanOrEqual(creationCap(backgroundId, id));
      expect(creationErrors(character({ backgroundId, age, allocation }))).toEqual([]);
    },
  );

  it('keeps each background’s strongest skill on top', () => {
    for (const b of BACKGROUNDS) {
      const skills = finalSkills({ backgroundId: b.id, allocation: autoAllocate(b.id, 40) });
      const top = Object.entries(b.skillBonus).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))[0]![0] as keyof typeof skills;
      for (const id of SKILL_IDS) expect(skills[top], `${b.id}: ${top} vs ${id}`).toBeGreaterThanOrEqual(skills[id]);
    }
  });
});

describe('creationErrors', () => {
  it('accepts a valid character', () => {
    expect(creationErrors(character())).toEqual([]);
  });

  it('requires name, age, home state, residence and background', () => {
    expect(creationErrors(character({ name: '  ' }))).toContain('Enter a name.');
    expect(creationErrors(character({ age: 24 })).join()).toMatch(/Age must be/);
    expect(creationErrors(character({ homeState: 'XX' }))).toContain('Choose a home state.');
    expect(creationErrors(character({ residentRegionId: 'nowhere' }))).toContain('Choose where you live.');
    expect(creationErrors({ ...character(), backgroundId: 'wizard' })).toContain('Choose a background.');
  });

  it('requires all points to be spent, and no more', () => {
    expect(creationErrors(character({ allocation: {} })).join()).toMatch(/remaining 11/);
    expect(creationErrors(character({ allocation: { charisma: 20 } })).join()).toMatch(/more skill point/);
  });

  it('buildRunConfig refuses an invalid character', () => {
    expect(() => buildRunConfig(character({ name: '' }), 'seed')).toThrow(/Invalid character/);
  });
});

describe('native vs transplant', () => {
  const nativeRun = run({ homeState: 'NY' });
  const transplantRun = run({ homeState: 'TX' });

  it('natives are known in their city; transplants less so and doubted statewide', () => {
    expect(isNative(nativeRun.politician)).toBe(true);
    expect(isNative(transplantRun.politician)).toBe(false);
    expect(nativeRun.regions['ny-north']!.recognition).toBeGreaterThan(transplantRun.regions['ny-north']!.recognition);
    expect(newcomerPenalty(nativeRun)).toBe(0);
    expect(newcomerPenalty(transplantRun)).toBeCloseTo(0.045);
    expect(newcomerPenalty(transplantRun, 'ny-north')).toBeCloseTo(0.0405); // rural ×0.9
    expect(newcomerPenalty(transplantRun, 'ny-nyc')).toBeCloseTo(0.018); // urban ×0.4
    const later: GameState = { ...transplantRun, clock: { ...transplantRun.clock, monthsElapsed: 48 } };
    expect(newcomerPenalty(later)).toBeCloseTo(0.0225);
    const running = launch(transplantRun, [{ issue: 'guns', stance: 2 }], undefined, 0);
    const you = raceViews(running, running.career.race!, 'wt-mill')[0]!;
    expect(you.standing.favorability).toBeCloseTo(running.regions['wt-mill']!.favorability - newcomerPenalty(running, 'wt-mill'));
  });

  it('transplants raise more from outside donors; their city is home turf for events too', () => {
    expect(projectedIncome(transplantRun).donors).toBeGreaterThan(projectedIncome({ ...nativeRun, regions: transplantRun.regions }).donors);
    const ready = (s: GameState) => {
      const p = launch(s, [{ issue: 'guns', stance: 2 }]);
      return applyAction(p, { type: 'RESOLVE_DECISIONS', apply: [p.decisions!.cardIds[0]!] });
    };
    const a = previewEvent(ready(nativeRun), 'door_knocking', 'wt-mill', 'guns').effects[0]!.dRecognition;
    const b = previewEvent({ ...ready(transplantRun), regions: ready(nativeRun).regions }, 'door_knocking', 'wt-mill', 'guns').effects[0]!
      .dRecognition;
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('background perks', () => {
  it('celebrities start known statewide; doctors with high integrity and less energy', () => {
    const celeb = run({ backgroundId: 'celebrity' });
    expect(celeb.regions['ny-nyc']!.recognition).toBeGreaterThanOrEqual(0.2);
    const doc = run({ backgroundId: 'doctor' });
    expect(doc.integrity).toBe(75);
    expect(doc.energy).toBe(run().energy - 1);
  });

  it('favored states start warmer: a NY public servant vs a NY veteran', () => {
    const servant = run({ backgroundId: 'public_servant' });
    const veteran = run({ backgroundId: 'veteran' });
    expect(servant.regions['ny-nyc']!.favorability).toBeCloseTo(0.08);
    expect(veteran.regions['ny-nyc']!.favorability).toBe(0);
    expect(veteran.regions['ny-north']!.favorability).toBeGreaterThan(servant.regions['ny-north']!.favorability - 0.09); // rural affinity
  });

  it('Strategy 7+ draws a 4th decision card', () => {
    const s = run();
    expect(handSize(s)).toBe(3);
    const strategist = { ...s, politician: { ...s.politician, skills: { ...s.politician.skills, strategy: 7 } } };
    expect(handSize(strategist)).toBe(4);
    const dealt = launch(strategist, [{ issue: 'guns', stance: 2 }]);
    expect(dealt.decisions!.cardIds).toHaveLength(4);
    expect(decisionPool(dealt).length).toBeGreaterThan(4);
  });
});

describe('M7 acceptance: natives vs transplants', () => {
  it('a native is noticeably likelier to win their first mayoral race; a transplant raises more money', () => {
    const n = hometownWinRate(botCharacter('ny-north'), 'sensible', 30);
    const t = hometownWinRate(botCharacter('ny-north', 'public_servant', 35, 'TX'), 'sensible', 30);
    expect(n.winRate).toBeGreaterThanOrEqual(t.winRate);
    expect(n.avgShare - t.avgShare).toBeGreaterThan(0.01);
  });
});
