import { describe, expect, it } from 'vitest';
import { getEventCard, getSkillCard } from '../data';
import { botCharacter, careerFunds } from '../sim/bot';
import {
  applyAction,
  buildRunConfig,
  buyError,
  createRun,
  dealMarket,
  eventPrice,
  HAND_LIMIT,
  MARKET_SIZE,
  previewEvent,
  projectedIncome,
  skillCap,
  skillPrice,
} from './index';
import { readyRun } from './testUtils';
import type { GameState, MarketOffer } from './types';

function withOffers(state: GameState, offers: MarketOffer[]): GameState {
  return { ...state, market: { turnNo: state.snapshots.length, offers } };
}

function resolved(): GameState {
  const s = readyRun();
  return applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
}

describe('income', () => {
  it('donors give most while running, less in office, least when idle', () => {
    const running = readyRun();
    const office: GameState = { ...running, career: { affiliation: 'IND', lossStreak: 0, office: { officeId: 'mayor-watertown', termEndsYear: 2031, approval: { 'ny-north': 0.6 }, platform: [], startedYear: 2028 } } };
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

describe('Market', () => {
  it('deals 6 offers each turn, including skill cards, reproducibly', () => {
    const s = readyRun();
    expect(s.market!.offers).toHaveLength(MARKET_SIZE);
    expect(s.market!.offers.some((o) => o.kind === 'skill')).toBe(true);
    expect(readyRun().market).toEqual(s.market);
    const next = applyAction(resolved(), { type: 'END_TURN' });
    expect(next.market!.turnNo).toBe(1);
  });

  it('never sells debates or party-only cards to an independent', () => {
    for (let i = 0; i < 30; i++) {
      const s = dealMarket({ ...readyRun({ seed: `m-${i}` }), market: undefined });
      for (const o of s.market!.offers) {
        expect(o.cardId).not.toBe('debate');
        if (o.kind === 'skill') expect(getSkillCard(o.cardId).requiresParty).toBeFalsy();
      }
    }
  });

  it('buying an event card adds it to the hand; playing it then costs only energy', () => {
    const s = withOffers({ ...resolved(), funds: 100_000 }, [{ kind: 'event', cardId: 'local_tv_ad' }]);
    const price = eventPrice(getEventCard('local_tv_ad'), s);
    const bought = applyAction(s, { type: 'BUY_CARD', offerIndex: 0 });
    expect(bought.funds).toBe(100_000 - price);
    expect(bought.market!.offers).toHaveLength(0);
    const card = bought.hand.find((c) => c.cardId === 'local_tv_ad')!;
    const played = applyAction(bought, { type: 'PLAY_EVENT', cardUid: card.uid, regionId: 'ny-north', issue: 'guns' });
    expect(played.funds).toBe(bought.funds);
  });

  it('enforces funds and the hand limit', () => {
    const offer: MarketOffer[] = [{ kind: 'event', cardId: 'arena_rally' }];
    expect(buyError(withOffers({ ...resolved(), funds: 1000 }, offer), 0)).toMatch(/funds/);
    const full = { ...resolved(), funds: 1e6, hand: Array.from({ length: HAND_LIMIT }, (_, i) => ({ uid: 100 + i, cardId: 'town_hall' })) };
    expect(buyError(withOffers(full, offer), 0)).toMatch(/hand is full/);
  });

  it('skill cards cost more at higher levels, raise the skill and respect the office cap', () => {
    const s = withOffers({ ...resolved(), funds: 1e6 }, [{ kind: 'skill', cardId: 'speech_coach' }]);
    const level = s.politician.skills.charisma;
    expect(skillPrice(getSkillCard('speech_coach'), s)).toBe(5000 * level);
    const after = applyAction(s, { type: 'BUY_CARD', offerIndex: 0 });
    expect(after.politician.skills.charisma).toBe(level + 1);
    expect(skillCap(s)).toBe(6);
    const capped = { ...s, politician: { ...s.politician, skills: { ...s.politician.skills, charisma: 6 } } };
    expect(buyError(capped, 0)).toMatch(/capped/);
  });

  it('courses can cost energy', () => {
    const s = withOffers({ ...resolved(), funds: 1e6 }, [{ kind: 'skill', cardId: 'think_tank' }]);
    const studied = applyAction(s, { type: 'BUY_CARD', offerIndex: 0 });
    expect(studied.energy).toBe(s.energy - 2);
    expect(studied.politician.skills.law).toBe(s.politician.skills.law + 1);
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

describe('M4 acceptance: investing in Fundraising pays for rallies later', () => {
  it('an investor ends with more Fundraising and reaches arena-rally money more often', () => {
    const input = botCharacter('ny-north');
    const rally = eventPrice(getEventCard('arena_rally'), createRun(buildRunConfig(input, 'p')));
    let investorRally = 0;
    let sensibleRally = 0;
    let investorFr = 0;
    let sensibleFr = 0;
    const n = 15;
    for (let i = 0; i < n; i++) {
      const inv = careerFunds(input, 'investor', 20, `acc-${i}`);
      const sen = careerFunds(input, 'sensible', 20, `acc-${i}`);
      if (inv.peak >= rally) investorRally++;
      if (sen.peak >= rally) sensibleRally++;
      investorFr += inv.fundraising;
      sensibleFr += sen.fundraising;
    }
    expect(investorFr).toBeGreaterThan(sensibleFr);
    expect(investorRally).toBeGreaterThan(sensibleRally);
  });
});
