import { describe, expect, it } from 'vitest';
import { botCharacter, playCampaign, setNightActions } from '../sim/bot';
import {
  applyAction,
  award,
  buildRunConfig,
  counted,
  createRun,
  endTurnBlocker,
  finalShares,
  itemError,
  mobilizeError,
  NIGHT,
  nightFinished,
  nightView,
  reportedShares,
} from './index';
import { readyRun } from './testUtils';
import type { GameState } from './types';

/** Plays a campaign up to the moment election night starts. */
function toNight(seed = 'night'): GameState {
  let s = readyRun({ seed });
  for (let i = 0; i < 8 && !s.night; i++) {
    if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
    s = applyAction(s, { type: 'END_TURN' });
  }
  if (!s.night) throw new Error('no night');
  return s;
}

function giveItem(s: GameState, itemId: string): GameState {
  return { ...s, items: [...s.items, { uid: s.nextItemUid, itemId }], nextItemUid: s.nextItemUid + 1 };
}

describe('election night', () => {
  it('starts on Election Day; the calendar and the result wait for the night', () => {
    const s = toNight();
    expect(s.night!.officeId).toBe('mayor-watertown');
    expect(s.clock).toMatchObject({ year: 2027, turn: 3 });
    expect(s.elections).toHaveLength(0);
    expect(endTurnBlocker(s)).toMatch(/Election night/);
    expect(s.night!.tokens).toBeGreaterThanOrEqual(2);
  });

  it('results come in gradually and converge to the final count', () => {
    let s = toNight();
    const id = 'ny-north';
    expect(reportedShares(s.night!, id)).toBeUndefined();
    const seen: number[] = [];
    while (!nightFinished(s.night!)) {
      s = applyAction(s, { type: 'NIGHT_ADVANCE' });
      seen.push(counted(s.night!.regions[id]!, s.night!.step));
    }
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen.at(-1)).toBe(1);
    expect(reportedShares(s.night!, id)![0]).toBeCloseTo(finalShares(s.night!, id)[0]!);
    const view = nightView(s.night!);
    expect([0, 1]).toContain(view.winProbability);
    expect(s.night!.calledFor).toBeDefined();
  });

  it('finishing applies the result and moves to the next year', () => {
    const s = applyAction(toNight(), { type: 'NIGHT_FINISH' });
    expect(s.night).toBeUndefined();
    expect(s.elections).toHaveLength(1);
    expect(s.clock).toMatchObject({ year: 2028, turn: 0 });
    expect(s.pendingResult).toBe(0);
  });

  it('mobilizing spends a token, only on uncounted regions, and is capped', () => {
    let s = toNight();
    const before = s.night!.tokens;
    s = applyAction(s, { type: 'NIGHT_MOBILIZE', regionId: 'ny-north' });
    expect(s.night!.tokens).toBe(before - 1);
    expect(s.night!.regions['ny-north']!.boost).toBeGreaterThan(0);
    // Hammer it: the total swing never exceeds the cap.
    for (let i = 0; i < 20; i++) {
      s = { ...s, night: { ...s.night!, tokens: 5 } };
      if (!mobilizeError(s, 'ny-north')) s = applyAction(s, { type: 'NIGHT_MOBILIZE', regionId: 'ny-north' });
    }
    expect(s.night!.regions['ny-north']!.boost).toBeLessThanOrEqual(NIGHT.maxSwing + 1e-9);
    while (!nightFinished(s.night!)) s = applyAction(s, { type: 'NIGHT_ADVANCE' });
    expect(mobilizeError({ ...s, night: { ...s.night!, tokens: 3 } }, 'ny-north')).toMatch(/counted/);
  });

  it('lawyers go once per region; the ad blitz costs money once', () => {
    let s = { ...toNight(), funds: 1e6 };
    s = applyAction(s, { type: 'NIGHT_LAWYERS', regionId: 'ny-north' });
    expect(s.night!.regions['ny-north']!.protected).toBe(true);
    expect(() => applyAction(s, { type: 'NIGHT_LAWYERS', regionId: 'ny-north' })).toThrow(/already/);
    const ads = applyAction(s, { type: 'NIGHT_AD_BLITZ' });
    expect(ads.funds).toBeLessThan(s.funds);
    expect(() => applyAction(ads, { type: 'NIGHT_AD_BLITZ' })).toThrow(/already/);
  });

  it('is reproducible for the same seed and actions', () => {
    const a = applyAction(toNight('rep'), { type: 'NIGHT_FINISH' }).elections;
    const b = applyAction(toNight('rep'), { type: 'NIGHT_FINISH' }).elections;
    expect(a).toEqual(b);
  });
});

describe('items', () => {
  it('campaign items work during the campaign; night items wait', () => {
    let s = readyRun();
    s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
    s = giveItem(giveItem(s, 'endorsement'), 'volunteer_list');
    const [endorse, volunteers] = s.items;
    expect(itemError(s, volunteers!.uid)).toMatch(/election night/);
    const after = applyAction(s, { type: 'USE_ITEM', uid: endorse!.uid, regionId: 'ny-north' });
    expect(after.regions['ny-north']!.favorability).toBeGreaterThan(s.regions['ny-north']!.favorability);
    expect(after.items).toHaveLength(1);
  });

  it('the dossier hurts your leading opponent', () => {
    let s = readyRun();
    s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
    s = giveItem(s, 'oppo_dossier');
    const after = applyAction(s, { type: 'USE_ITEM', uid: s.items[0]!.uid, regionId: 'ny-north' });
    expect(after.career.race!.opponents[0]!.regions['ny-north']!.favorability).toBeLessThan(s.career.race!.opponents[0]!.regions['ny-north']!.favorability);
  });

  it('campaign-only items expire on Election Day; volunteers add tokens at night', () => {
    let s = giveItem(giveItem(readyRun(), 'oppo_dossier'), 'volunteer_list');
    for (let i = 0; i < 8 && !s.night; i++) {
      if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
      s = applyAction(s, { type: 'END_TURN' });
    }
    expect(s.items.map((i) => i.itemId)).toEqual(['volunteer_list']);
    const tokens = s.night!.tokens;
    s = applyAction(s, { type: 'USE_ITEM', uid: s.items[0]!.uid });
    expect(s.night!.tokens).toBe(tokens + NIGHT.volunteerTokens);
    s = applyAction(giveItem(s, 'poll_watchers'), { type: 'NIGHT_FINISH' });
    expect(s.items).toHaveLength(0); // unused night items expire too
  });
});

describe('loot', () => {
  it('a milestone pays out once per race', () => {
    const s = readyRun();
    const once = award(s, 'momentum');
    expect(once.funds).toBe(s.funds + 6000);
    expect(award(once, 'momentum').funds).toBe(once.funds);
    expect(award(s, 'frontrunner').items.map((i) => i.itemId)).toEqual(['endorsement']);
  });

  it('door-knocking builds the ground game (up to a cap) and unlocks volunteers', () => {
    let s = readyRun();
    s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
    const start = s.career.race!.tokens;
    for (let i = 0; i < 3; i++) s = applyAction({ ...s, energy: 6 }, { type: 'PLAY_EVENT', cardUid: 'door_knocking', regionId: 'ny-north', issue: s.career.race!.platform[0]!.issue });
    expect(s.career.race!.tokens).toBe(start + 3);
    expect(s.career.race!.doorKnocks).toBe(3);
    s = applyAction(s, { type: 'END_TURN' });
    expect(s.career.race!.milestones).toContain('ground_game');
    expect(s.items.some((i) => i.itemId === 'volunteer_list')).toBe(true);
  });
});

describe('M9 acceptance', () => {
  it('night actions decide some close races but never a blowout', () => {
    let close = 0;
    let flipped = 0;
    let blowoutFlips = 0;
    for (let i = 0; i < 60; i++) {
      const seed = `accept-night-${i}`;
      setNightActions(false);
      const off = playCampaign(createRun(buildRunConfig(botCharacter('ny-north'), seed)), 'sensible').state.elections.at(-1)!;
      setNightActions(true);
      const on = playCampaign(createRun(buildRunConfig(botCharacter('ny-north'), seed)), 'sensible').state.elections.at(-1)!;
      const margin = Math.abs(off.totalShares[0]! - Math.max(...off.totalShares.slice(1)));
      if (margin < 0.03) close++;
      if (off.playerWon !== on.playerWon) {
        flipped++;
        if (margin > 0.05) blowoutFlips++;
      }
    }
    expect(blowoutFlips).toBe(0);
    expect(flipped).toBeLessThanOrEqual(close);
  });
});
