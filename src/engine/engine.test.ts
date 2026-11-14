import { describe, expect, it } from 'vitest';
import { getOffice } from '../data';
import {
  ageOf,
  createRun,
  defaultPolitician,
  energyForAge,
  isOfficeElectionYear,
  monthsFactor,
  nextElectionYear,
  nextFloat,
  nextInt,
  seedFromString,
  turnLabel,
} from '.';
import { newRun, passTurns as endTurns, readyRun } from './testUtils';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const seq = (seed: number) => {
      const out: number[] = [];
      let s = seed;
      for (let i = 0; i < 5; i++) {
        const [v, next] = nextFloat(s);
        out.push(v);
        s = next;
      }
      return out;
    };
    expect(seq(seedFromString('abc'))).toEqual(seq(seedFromString('abc')));
    expect(seq(seedFromString('abc'))).not.toEqual(seq(seedFromString('abd')));
  });

  it('stays in range', () => {
    let s = seedFromString('range');
    for (let i = 0; i < 1000; i++) {
      const [f, n1] = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const [k, n2] = nextInt(n1, 1, 6);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(k).toBeLessThanOrEqual(6);
      s = n2;
    }
  });
});

describe('election cycles', () => {
  it('follows the office cycles', () => {
    expect(isOfficeElectionYear(getOffice('mayor-nyc'), 2029)).toBe(true);
    expect(isOfficeElectionYear(getOffice('governor-ny'), 2030)).toBe(true);
    expect(nextElectionYear(getOffice('mayor-watertown'), 2027)).toBe(2027);
    expect(nextElectionYear(getOffice('house-ny-north'), 2027)).toBe(2028);
  });
});

describe('createRun', () => {
  it('starts blank as an independent, the year before the hometown election, with only personal money', () => {
    const s = createRun({ seed: 'blank', politician: defaultPolitician(), wealth: 50_000 });
    expect(s.career.affiliation).toBe('IND');
    expect(s.career.race).toBeUndefined();
    expect(s.clock).toEqual({ year: 2026, turn: 0, turnsThisYear: 3, monthsElapsed: 0 });
    expect(s.funds).toBe(0);
    expect(s.wealth).toBe(50_000);
    expect(s.hand).toHaveLength(0);
    expect(Object.keys(s.world.seats)).toContain('mayor-watertown');
  });

  it('gives the hometown a recognition and favorability boost', () => {
    const s = newRun();
    // Native public servant: hometown 0.30 / +0.05, plus +0.08 statewide (NY favors public servants).
    expect(s.regions['ny-north']!.recognition).toBe(0.3);
    expect(s.regions['ny-north']!.favorability).toBeCloseTo(0.13);
    expect(s.regions['ny-nyc']!.recognition).toBe(0.05);
    expect(s.regions['ny-nyc']!.favorability).toBeCloseTo(0.08);
  });

  it('a New Yorker starts in 2028, a year before the 2029 NYC mayoral race', () => {
    const s = createRun({ seed: 'nyc', politician: { ...defaultPolitician(), residentRegionId: 'ny-nyc' }, wealth: 0 });
    expect(s.clock.year).toBe(2028);
  });

  it('is reproducible from its seed', () => {
    expect(newRun()).toEqual(newRun());
  });
});

describe('turn clock', () => {
  it('election year has 4 three-month turns, then normal years have 3 four-month turns', () => {
    let s = readyRun();
    expect(turnLabel(s.clock)).toBe('Jan–Mar 2027');
    expect(monthsFactor(s.clock)).toBe(1);
    s = endTurns(s, 3);
    expect(turnLabel(s.clock)).toBe('Oct–Dec 2027');
    s = endTurns(s, 1);
    expect(s.clock).toMatchObject({ year: 2028, turn: 0, turnsThisYear: 3 });
    expect(turnLabel(s.clock)).toBe('Jan–Apr 2028');
    expect(monthsFactor(s.clock)).toBeCloseTo(4 / 3);
    s = endTurns(s, 2);
    expect(turnLabel(s.clock)).toBe('Sep–Dec 2028');
  });

  it('closes the race after Election Day and logs it', () => {
    const s = endTurns(readyRun(), 4);
    expect(s.career.race).toBeUndefined();
    expect(s.elections).toHaveLength(1);
    expect(s.log.some((l) => /Elected|Lost the race/.test(l.text))).toBe(true);
  });

  it('ages the politician by turn length', () => {
    const s = endTurns(readyRun(), 4 + 3); // one election year + one normal year
    expect(s.clock.monthsElapsed).toBe(24);
    expect(ageOf(s)).toBe(34);
  });

  it('appends one snapshot per turn, recording the turn that ended', () => {
    const s = endTurns(readyRun(), 5);
    expect(s.snapshots).toHaveLength(5);
    expect(s.snapshots[0]).toMatchObject({ year: 2027, turn: 0, turnsThisYear: 4, raceOfficeId: 'mayor-watertown' });
    expect(s.snapshots[4]).toMatchObject({ year: 2028, turn: 0, turnsThisYear: 3 });
    expect(s.snapshots[4]?.raceOfficeId).toBeUndefined();
  });

  it('does not mutate the previous state', () => {
    const before = readyRun();
    const copy = structuredClone(before);
    endTurns(before, 1);
    expect(before).toEqual(copy);
  });
});

describe('energy', () => {
  it('is 6 up to 40 and drops by 1 per decade after', () => {
    expect(energyForAge(25)).toBe(6);
    expect(energyForAge(49.9)).toBe(6);
    expect(energyForAge(50)).toBe(5);
    expect(energyForAge(65)).toBe(4);
  });
});
