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

  it('New York matches the POC population split (≈43/25/15/17)', () => {
    expect(populationShare('ny-nyc')).toBeCloseTo(0.43, 1);
    expect(populationShare('ny-suburbs')).toBeCloseTo(0.25, 1);
  });

  it('offices reference existing regions and have valid cycles', () => {
    for (const office of OFFICES) {
      expect(office.regionIds.length).toBeGreaterThan(0);
      for (const id of office.regionIds) expect(REGIONS_BY_ID[id], `${office.id} → ${id}`).toBeDefined();
      expect(office.cycle.offset).toBeLessThan(office.cycle.every);
      if (office.partisan) expect(office.nominationStanding).toBeDefined();
    }
  });

  it('POC has 3 mayoralties, 4 House seats, 1 Senate and 1 Governor in NY', () => {
    const count = (level: string) => OFFICES.filter((o) => o.state === 'NY' && o.level === level).length;
    expect([count('mayor'), count('house'), count('senate'), count('governor')]).toEqual([3, 4, 1, 1]);
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
