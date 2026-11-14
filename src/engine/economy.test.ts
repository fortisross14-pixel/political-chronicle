import { describe, expect, it } from 'vitest';
import { PACK_SIZE } from '../data';
import { botCharacter } from '../sim/bot';
import {
  applyAction,
  buildRunConfig,
  buyPackError,
  cardRarity,
  createRun,
  drawPack,
  endTurnBlocker,
  keepError,
  packPrice,
  POLICY_HAND_LIMIT,
  policyError,
  previewEvent,
  projectedIncome,
  Rng,
  skillCap,
} from './index';
import { readyRun } from './testUtils';
import type { GameState } from './types';

function resolved(): GameState {
  const s = readyRun();
  return applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
}

describe('income', () => {
  it('donors give most while running, less in office, least when idle', () => {
    const running = readyRun();
    const office: GameState = {
      ...running,
      career: {
        affiliation: 'IND',
        lossStreak: 0,
        office: { officeId: 'mayor-watertown', termEndsYear: 2031, approval: { 'ny-north': 0.6 }, platform: [], startedYear: 2028 },
      },
    };
    const idle: GameState = { ...running, career: { affiliation: 'IND', lossStreak: 0 } };
    expect(projectedIncome(running).donors).toBeGreaterThan(projectedIncome(office).donors);
    expect(projectedIncome(office).donors).toBeGreaterThan(projectedIncome(idle).donors);
    expect(projectedIncome(office).salary).toBeGreaterThan(0);
    expect(projectedIncome(running).salary).toBe(0);
  });

  it('Fundraising and recognition raise donor income', () => {
    const s = readyRun();
    const better = { ...s, politician: { ...s.politician, skills: { ...s.politician.skills, economics: 6 } } };
    const known = { ...s, regions: { ...s.regions, 'ny-north': { recognition: 0.9, favorability: 0.2 } } };
    expect(projectedIncome(better).donors).toBeGreaterThan(projectedIncome(s).donors);
    expect(projectedIncome(known).donors).toBeGreaterThan(projectedIncome(s).donors);
  });

  it('a 4-month turn pays a third more than a 3-month turn', () => {
    const s = readyRun();
    const normalYear = { ...s, clock: { ...s.clock, turnsThisYear: 3 } };
    expect(projectedIncome(normalYear).donors / projectedIncome(s).donors).toBeCloseTo(4 / 3, 1);
  });

  it('is collected at the start of every turn', () => {
    const s = resolved();
    const next = applyAction(s, { type: 'END_TURN' });
    expect(next.lastIncome!.donors).toBeGreaterThan(0);
  });
});

describe('packs', () => {
  it('a new run starts blank, with a free people pack to open', () => {
    const s = createRun(buildRunConfig(botCharacter('ny-north'), 'pk'));
    expect(s.career.race).toBeUndefined();
    expect(s.funds).toBe(0);
    expect(s.wealth).toBeGreaterThan(0);
    expect(s.packs).toHaveLength(1);
    expect(s.packs[0]!.kind).toBe('people');
    expect(s.packs[0]!.cards).toHaveLength(PACK_SIZE);
    const kept = applyAction(s, { type: 'KEEP_FROM_PACK', keep: [0, 1, 2] });
    expect(kept.team.cards.length).toBe(s.team.cards.length + 3);
    expect(kept.packs).toHaveLength(0);
  });

  it('regular packs never hold a legendary; elite packs never hold a common', () => {
    for (let i = 0; i < 60; i++) {
      const s = { ...resolved(), rng: i, funds: 1e7 };
      for (const kind of ['people', 'policy', 'campaign'] as const) {
        const reg = drawPack(s, new Rng(i), kind, 'regular');
        const elite = drawPack(s, new Rng(i), kind, 'elite');
        expect(reg.map((c) => cardRarity(kind, c))).not.toContain('legendary');
        expect(elite.map((c) => cardRarity(kind, c))).not.toContain('common');
      }
    }
  });

  it('buying costs campaign funds; you keep one event card or action from a pack', () => {
    const s = { ...resolved(), funds: 100_000 };
    expect(buyPackError({ ...s, funds: 1000 }, 'campaign', 'regular')).toMatch(/funds/);
    const bought = applyAction(s, { type: 'BUY_PACK', kind: 'campaign', tier: 'regular' });
    expect(bought.funds).toBe(100_000 - packPrice('campaign', 'regular'));
    expect(keepError(bought, [0, 1])).toMatch(/one/);
    expect(endTurnBlocker(bought)).toMatch(/pack/);
    const kept = applyAction(bought, { type: 'KEEP_FROM_PACK', keep: [0] });
    expect(kept.hand.length + kept.items.length).toBe(s.hand.length + s.items.length + 1);
  });

  it('political events: a hand of 5, playable for their effect', () => {
    const s = { ...resolved(), policyHand: [{ uid: 900, cardId: 'donor_breakfast' }] };
    const played = applyAction(s, { type: 'PLAY_POLICY', uid: 900 });
    expect(played.funds).toBe(s.funds + 8000);
    expect(played.energy).toBe(s.energy - 1);
    expect(played.policyHand).toHaveLength(0);
    // Office-only cards wait for an office.
    expect(policyError({ ...s, policyHand: [{ uid: 901, cardId: 'popular_law' }] }, 901)).toMatch(/office/);
    const full = { ...s, policyHand: Array.from({ length: POLICY_HAND_LIMIT }, (_, i) => ({ uid: 950 + i, cardId: 'op_ed' })) };
    const withPack = applyAction({ ...full, funds: 1e6 }, { type: 'BUY_PACK', kind: 'policy', tier: 'regular' });
    expect(keepError(withPack, [0])).toMatch(/full/);
  });

  it('training cards raise a skill up to the office cap', () => {
    const s = { ...resolved(), policyHand: [{ uid: 900, cardId: 'speech_coach' }] };
    const trained = applyAction(s, { type: 'PLAY_POLICY', uid: 900 });
    expect(trained.politician.skills.charisma).toBe(s.politician.skills.charisma + 1);
    expect(skillCap(s)).toBe(6);
    const capped = { ...s, politician: { ...s.politician, skills: { ...s.politician.skills, charisma: 6 } } };
    expect(policyError(capped, 900)).toMatch(/capped/);
  });
});

describe('fundraising events', () => {
  it('donors tire: a second ask in the same turn raises half as much', () => {
    const s = resolved();
    const first = previewEvent(s, 'call_time', 'ny-north', 'guns').fundsGain;
    const after = applyAction(s, { type: 'PLAY_EVENT', cardUid: 'call_time', regionId: 'ny-north', issue: 'guns' });
    const second = previewEvent(after, 'call_time', 'ny-north', 'guns').fundsGain;
    expect(after.funds - s.funds).toBe(first);
    expect(Math.abs(second - first / 2)).toBeLessThanOrEqual(100); // amounts round to $100
  });

  it('fundraisers do not tire voters of your topics', () => {
    const s = resolved();
    const after = applyAction(s, { type: 'PLAY_EVENT', cardUid: 'call_time', regionId: 'ny-north', issue: 'guns' });
    expect(previewEvent(after, 'door_knocking', 'ny-north', 'guns').fatigue).toBe(1);
  });
});
