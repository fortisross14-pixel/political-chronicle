import { describe, expect, it } from 'vitest';
import { BACKGROUNDS } from '../data';
import {
  autoAllocate,
  buildRunConfig,
  CREATION_SKILL_CAP,
  createRun,
  creationErrors,
  finalSkills,
  MAX_AGE,
  MIN_AGE,
  pointsSpent,
  preAllocationSkills,
  SKILL_IDS,
  skillPointsForAge,
  startingFundsFor,
} from '.';
import type { CreationInput } from '.';

function character(overrides: Partial<CreationInput> = {}): CreationInput {
  const backgroundId = overrides.backgroundId ?? 'teacher';
  const age = overrides.age ?? 30;
  return {
    name: 'Test Person',
    gender: 'female',
    age,
    birthRegionId: 'ny-north',
    backgroundId,
    allocation: autoAllocate(backgroundId, age),
    ...overrides,
  };
}

describe('skill points and funds', () => {
  it('grants 10 points at 25 and +1 per 5 years', () => {
    expect(skillPointsForAge(25)).toBe(10);
    expect(skillPointsForAge(29)).toBe(10);
    expect(skillPointsForAge(30)).toBe(11);
    expect(skillPointsForAge(65)).toBe(18);
  });

  it('older characters start with more money', () => {
    expect(startingFundsFor('teacher', 25)).toBe(10_000);
    expect(startingFundsFor('teacher', 65)).toBe(20_000);
    expect(startingFundsFor('lawyer', 55)).toBeGreaterThan(startingFundsFor('lawyer', 28));
  });

  it('background bonuses are applied on top of base 1', () => {
    const s = preAllocationSkills('lawyer');
    expect(s.policy).toBe(3);
    expect(s.oratory).toBe(2);
    expect(s.digital).toBe(1);
  });
});

describe('autoAllocate', () => {
  it.each(BACKGROUNDS.flatMap((b) => [MIN_AGE, 45, MAX_AGE].map((age) => [b.id, age] as const)))(
    '%s at %i spends every point within the cap',
    (backgroundId, age) => {
      const allocation = autoAllocate(backgroundId, age);
      expect(pointsSpent(allocation)).toBe(skillPointsForAge(age));
      const skills = finalSkills({ backgroundId, allocation });
      for (const id of SKILL_IDS) expect(skills[id]).toBeLessThanOrEqual(CREATION_SKILL_CAP);
      expect(creationErrors(character({ backgroundId, age, allocation }))).toEqual([]);
    },
  );
});

describe('creationErrors', () => {
  it('accepts a valid character', () => {
    expect(creationErrors(character())).toEqual([]);
  });

  it('requires a name, a valid age, birthplace and background', () => {
    expect(creationErrors(character({ name: '  ' }))).toContain('Enter a name.');
    expect(creationErrors(character({ age: 24 })).join()).toMatch(/Age must be/);
    expect(creationErrors(character({ age: 66 })).join()).toMatch(/Age must be/);
    expect(creationErrors(character({ birthRegionId: 'nowhere' }))).toContain('Choose a birthplace.');
    expect(creationErrors({ ...character(), backgroundId: 'wizard' })).toContain('Choose a background.');
  });

  it('requires all points to be spent, and no more', () => {
    expect(creationErrors(character({ allocation: {} })).join()).toMatch(/remaining 11/);
    expect(creationErrors(character({ allocation: { oratory: 20 } })).join()).toMatch(/more skill point/);
  });

  it('enforces the creation cap', () => {
    // Teacher has charisma 3 before allocation; +3 would make 6.
    const allocation = { ...autoAllocate('teacher', 30) };
    allocation.charisma = 3;
    expect(creationErrors(character({ allocation })).join()).toMatch(/capped at 5/);
  });

  it('buildRunConfig refuses an invalid character', () => {
    expect(() => buildRunConfig(character({ name: '' }), 'seed')).toThrow(/Invalid character/);
  });
});

describe('M2 acceptance: choices matter', () => {
  it('a 28-year-old Watertown teacher and a 55-year-old NYC lawyer start very differently', () => {
    const teacher = createRun(buildRunConfig(character({ age: 28, backgroundId: 'teacher', birthRegionId: 'ny-north', allocation: autoAllocate('teacher', 28) }), 'a'));
    const lawyer = createRun(buildRunConfig(character({ age: 55, backgroundId: 'lawyer', birthRegionId: 'ny-nyc', allocation: autoAllocate('lawyer', 55) }), 'b'));

    // Skills
    expect(teacher.politician.skills).not.toEqual(lawyer.politician.skills);
    expect(lawyer.politician.skills.policy).toBeGreaterThan(teacher.politician.skills.policy);
    const sum = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);
    expect(sum(lawyer.politician.skills)).toBeGreaterThan(sum(teacher.politician.skills));

    // Energy: younger has more
    expect(teacher.energy).toBe(6);
    expect(lawyer.energy).toBe(5);

    // Funds
    expect(lawyer.funds).toBeGreaterThan(teacher.funds * 3);

    // Regional recognition follows the hometown
    expect(teacher.regions['ny-north']!.recognition).toBeGreaterThan(teacher.regions['ny-nyc']!.recognition);
    expect(lawyer.regions['ny-nyc']!.recognition).toBeGreaterThan(lawyer.regions['ny-north']!.recognition);

    // First race follows the hometown too
    expect(teacher.career.race?.officeId).toBe('mayor-watertown');
    expect(lawyer.career.race?.officeId).toBe('mayor-nyc');
  });

  it('a suburban-born politician has no mayoralty yet and starts as a private citizen', () => {
    const s = createRun(buildRunConfig(character({ birthRegionId: 'ny-suburbs' }), 'c'));
    expect(s.career.race).toBeUndefined();
    expect(s.clock.turnsThisYear).toBe(3);
  });
});

describe('autoAllocate keeps background strengths', () => {
  it('leaves the background’s best skill at or above every other skill', () => {
    for (const b of BACKGROUNDS) {
      const skills = finalSkills({ backgroundId: b.id, allocation: autoAllocate(b.id, 40) });
      const top = Object.entries(b.skillBonus).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))[0]![0] as keyof typeof skills;
      for (const id of SKILL_IDS) expect(skills[top], `${b.id}: ${top} vs ${id}`).toBeGreaterThanOrEqual(skills[id]);
      expect(new Set(Object.values(skills)).size, `${b.id} should not be flat`).toBeGreaterThan(1);
    }
  });
});
