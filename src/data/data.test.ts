import { describe, expect, it } from 'vitest';
import { ISSUE_IDS, OFFICES, PARTIES, PARTY_IDS, REGIONS, REGIONS_BY_ID, STATES, populationShare } from '.';

describe('world data', () => {
  it('defines 16 unique issues', () => {
    expect(ISSUE_IDS).toHaveLength(16);
    expect(new Set(ISSUE_IDS).size).toBe(16);
  });

  it.each(REGIONS.map((r) => [r.id, r] as const))('region %s has complete, in-range data', (_id, region) => {
    expect(region.partisanLean).toBeGreaterThanOrEqual(-1);
    expect(region.partisanLean).toBeLessThanOrEqual(1);
    expect(region.turnout).toBeGreaterThan(0);
    expect(region.turnout).toBeLessThanOrEqual(1);
    for (const id of ISSUE_IDS) {
      expect(region.issueOpinion[id], `opinion ${id}`).toBeGreaterThanOrEqual(-2);
      expect(region.issueOpinion[id], `opinion ${id}`).toBeLessThanOrEqual(2);
      expect(region.issueSalience[id], `salience ${id}`).toBeGreaterThanOrEqual(0);
      expect(region.issueSalience[id], `salience ${id}`).toBeLessThanOrEqual(1);
    }
    for (const value of Object.values(region.media)) {
      expect(value).toBeGreaterThanOrEqual(0.5);
      expect(value).toBeLessThanOrEqual(1.5);
    }
  });

  it('every state lists existing regions and their population shares sum to 1', () => {
    for (const state of Object.values(STATES)) {
      for (const id of state.regionIds) expect(REGIONS_BY_ID[id]?.state).toBe(state.id);
      const total = state.regionIds.reduce((sum, id) => sum + populationShare(id), 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('New York has 18 districts, NYC about 40% of the state, and neighborhoods that add up', () => {
    expect(STATES.NY!.regionIds).toHaveLength(18);
    const nyc = ['ny-nyc', 'ny-brooklyn', 'ny-queens', 'ny-bronx', 'ny-staten'].reduce((s, id) => s + populationShare(id), 0);
    expect(nyc).toBeGreaterThan(0.36);
    expect(nyc).toBeLessThan(0.45);
    for (const o of OFFICES.filter((x) => x.level === 'mayor')) {
      expect(o.regionIds.length).toBeGreaterThanOrEqual(6);
      expect(o.regionIds.length).toBeLessThanOrEqual(12);
      for (const id of o.regionIds) expect(REGIONS_BY_ID[id]!.parent).toBeDefined();
    }
  });

  it('offices reference existing regions and have valid cycles', () => {
    for (const office of OFFICES) {
      expect(office.regionIds.length).toBeGreaterThan(0);
      for (const id of office.regionIds) expect(REGIONS_BY_ID[id], `${office.id} → ${id}`).toBeDefined();
      expect(office.cycle.offset).toBeLessThan(office.cycle.every);
      if (office.partisan) expect(office.nominationStanding).toBeDefined();
    }
  });

  it('NY has 3 mayoralties, 6 House seats, 1 Senate and 1 Governor', () => {
    const count = (level: string) => OFFICES.filter((o) => o.state === 'NY' && o.level === level).length;
    expect([count('mayor'), count('house'), count('senate'), count('governor')]).toEqual([3, 6, 1, 1]);
  });

  it('parties have a full platform within range', () => {
    for (const id of PARTY_IDS) {
      for (const issue of ISSUE_IDS) {
        const plank = PARTIES[id].platform[issue];
        expect(plank, `${id} ${issue}`).toBeDefined();
        expect(Math.abs(plank.position)).toBeLessThanOrEqual(2);
        expect(plank.weight).toBeGreaterThan(0);
        expect(plank.weight).toBeLessThanOrEqual(1);
      }
    }
  });
});
