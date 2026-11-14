// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../engine';
import { passTurns, readyRun } from '../engine/testUtils';
import type { GameState } from '../engine';
import { migrate, migrationsComplete, OLDEST_MIGRATABLE } from './migrations';
import { loadGameResult, SAVE_KEY } from './save';

/** A current game rewritten into the shape an older version saved, to prove the upgrade path. */
function downgrade(state: GameState, to: number): Record<string, unknown> {
  const s = structuredClone(state) as unknown as Record<string, unknown>;
  const career = s.career as Record<string, unknown>;
  const race = career.race as Record<string, unknown> | undefined;
  if (to < 10) {
    delete s.wealth;
    delete s.policyHand;
    delete s.packs;
    delete s.world;
    delete career.platform;
    delete career.joinAsked;
    if (race) for (const k of ['selfFunded', 'launchedWith']) delete race[k];
    s.market = { turnNo: 0, offers: [{ kind: 'event', cardId: 'town_hall' }] };
  }
  if (to < 9) {
    delete s.modifiers;
    delete s.startYear;
    delete s.artifacts;
    delete s.scenario;
  }
  if (to < 8) {
    delete s.items;
    delete s.nextItemUid;
    delete s.night;
    if (race) for (const k of ['tokens', 'milestones', 'doorKnocks', 'raisedThisTurn', 'used']) delete race[k];
    s.draft = { options: ['cm_vance'], reason: 'old draft' };
  }
  if (to < 7) {
    delete s.market;
    delete s.team;
    delete s.chambers;
    delete s.draft;
    s.staff = [{ cardId: 'digital_director', skill: 'charisma', upkeep: 2000 }];
    s.lastIncome = { donors: 2400, salary: 0, upkeep: 2000, party: 0, quit: [] };
  }
  return { ...s, schemaVersion: to };
}

function storeRaw(state: Record<string, unknown>, version: number) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: version, savedAt: '2026-01-01', state }));
}

describe('save migrations', () => {
  beforeEach(() => localStorage.clear());

  it('has a step for every version from the oldest readable one to the current one', () => {
    expect(migrationsComplete()).toBe(true);
  });

  for (let v = OLDEST_MIGRATABLE; v < SCHEMA_VERSION; v++) {
    it(`upgrades a v${v} save mid-campaign, and the game plays on`, () => {
      const current = passTurns(readyRun({ seed: `mig-${v}` }), 2);
      storeRaw(downgrade(current, v), v);
      const loaded = loadGameResult();
      expect(loaded.state).not.toBeNull();
      if (!loaded.state) return;
      expect('migratedFrom' in loaded && loaded.migratedFrom).toBe(v);
      const s = loaded.state;
      expect(s.team).toBeDefined();
      expect(s.chambers).toBeDefined();
      expect(s.items).toEqual(v < 8 ? [] : current.items);
      expect(s.modifiers).toBeDefined();
      expect(s.career.race?.tokens).toBeGreaterThanOrEqual(2);
      expect((s as unknown as Record<string, unknown>).staff).toBeUndefined();
      expect((s as unknown as Record<string, unknown>).draft).toBeUndefined();
      expect((s as unknown as Record<string, unknown>).market).toBeUndefined();
      expect(s.wealth).toBeGreaterThanOrEqual(0);
      expect(s.packs).toEqual([]);
      expect(s.world.seats['mayor-watertown']).toBeDefined();
      expect(s.career.platform?.length).toBeGreaterThan(0);
      // The upgraded save is a real, playable game.
      const later = passTurns(s, 3);
      expect(later.snapshots.length).toBe(s.snapshots.length + 3);
    });
  }

  it('reports why a save can’t be loaded', () => {
    storeRaw({ clock: {} }, OLDEST_MIGRATABLE - 1);
    expect(loadGameResult()).toMatchObject({ state: null, reason: expect.stringMatching(/before the current skills/) });
    storeRaw({}, SCHEMA_VERSION + 1);
    expect(loadGameResult()).toMatchObject({ state: null, reason: expect.stringMatching(/newer version/) });
    localStorage.setItem(SAVE_KEY, '{broken');
    expect(loadGameResult()).toMatchObject({ state: null, reason: expect.stringMatching(/unreadable/) });
  });

  it('v10 → v11 drops training cards and turns abilities into equipped trinkets', () => {
    const s = readyRun();
    const raw = {
      ...(s as unknown as Record<string, unknown>),
      policyHand: [
        { uid: 1, cardId: 'speech_coach' },
        { uid: 2, cardId: 'op_ed' },
      ],
      politician: { ...s.politician, abilities: ['rapid_response'] },
      packs: [{ kind: 'policy', tier: 'regular', cards: ['speech_coach'] }],
    };
    const out = migrate(raw, 10);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.state.policyHand).toEqual([{ uid: 2, cardId: 'op_ed' }]);
    expect(out.state.packs).toEqual([]);
    expect(out.state.artifacts).toContain('rapid_response');
  });

  it('v11 → v12 rebuilds four-region saves for 18 districts and city neighborhoods', () => {
    const s = readyRun();
    const old = ['ny-nyc', 'ny-suburbs', 'ny-wny', 'ny-north'];
    const pick = <T>(rec: Record<string, T>) => Object.fromEntries(old.map((id) => [id, rec[id]!]));
    const raw = {
      ...(s as unknown as Record<string, unknown>),
      regions: pick(s.regions),
      career: {
        ...s.career,
        race: { ...s.career.race!, opponents: s.career.race!.opponents.map((c) => ({ ...c, regions: pick(c.regions) })) },
      },
    };
    const out = migrate(raw, 11);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const regions = out.state.regions as Record<string, unknown>;
    expect(regions['ny-central']).toEqual(s.regions['ny-north']);
    expect(regions['wt-mill']).toEqual(s.regions['ny-north']);
    expect(Object.keys(regions)).toHaveLength(Object.keys(s.regions).length);
  });

  it('leaves current saves untouched', () => {
    const s = readyRun();
    expect(migrate(s as unknown as Record<string, unknown>, SCHEMA_VERSION)).toMatchObject({ ok: true, from: SCHEMA_VERSION });
  });
});
