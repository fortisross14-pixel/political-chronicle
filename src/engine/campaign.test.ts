import { describe, expect, it } from 'vitest';
import { BASIC_CARD_IDS, getDecisionCard, getEventCard } from '../data';
import { botCharacter, hometownWinRate, playCampaign } from '../sim/bot';
import {
  alignment,
  applyAction,
  decided,
  decisionError,
  campaignWindow,
  DIFFICULTY,
  endTurnBlocker,
  eventPrice,
  grantPerson,
  launchError,
  platformError,
  playEvent,
  poll,
  previewEvent,
  nominationStatus,
  raceBoard,
  regionIntention,
  selfFundingPenalty,
  stanceAt,
  hometownMayoralty,
  leanSide,
  raceField,
} from './index';
import { launch, newRun, passTurn, passTurns, readyRun, WATERTOWN_PLATFORM } from './testUtils';
import type { GameState } from './types';

describe('opinion math', () => {
  it('alignment is +1 on a match, 0 at 1.5 apart, and clamps at −1', () => {
    expect(alignment(2, 2)).toBe(1);
    expect(alignment(1, -0.5)).toBeCloseTo(0);
    expect(alignment(-2, 2)).toBe(-1);
  });

  it('intention sums to 1 and a liked, known candidate leads', () => {
    const views = [
      { standing: { recognition: 0.8, favorability: 0.4 }, lean: 0, affiliation: 'IND' as const, incumbent: false },
      { standing: { recognition: 0.3, favorability: 0 }, lean: 0, affiliation: 'IND' as const, incumbent: false },
    ];
    const shares = regionIntention(views, 'ny-wny', 'mayor', false);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(shares[0]).toBeGreaterThan(shares[1]!);
    expect(decided(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe('launching a campaign', () => {
  it('a run starts blank: nothing to do but launch, and turns can pass', () => {
    const s = newRun();
    expect(s.career.race).toBeUndefined();
    expect(endTurnBlocker(s)).toBeUndefined();
    expect(s.decisions).toBeUndefined();
  });

  it('campaigns open 7 turns before Election Day and close at 4', () => {
    const blank = newRun({ exactYear: false }); // Jan 2026, Watertown votes Nov 2027
    expect(blank.clock.year).toBe(2026);
    expect(campaignWindow(blank, 'mayor-watertown')).toMatchObject({ electionYear: 2027, turnsLeft: 7, open: true });
    const late = newRun(); // Jan 2027
    expect(campaignWindow(late, 'mayor-watertown')).toMatchObject({ turnsLeft: 4, open: true });
    const tooLate = passTurn(late);
    expect(campaignWindow(tooLate, 'mayor-watertown')).toMatchObject({ electionYear: 2031, open: false });
    expect(raceBoard(tooLate).find((r) => r.officeId === 'mayor-watertown')!.status).toBe('later');
  });

  it('the race board locks statewide races until you hold an office or are known statewide', () => {
    const board = raceBoard(newRun());
    expect(board.find((r) => r.officeId === 'governor-ny')!.status).toBe('locked');
    expect(board.find((r) => r.officeId === 'house-ny-north')!.status).not.toBe('locked');
    expect(nominationStatus(newRun(), 'mayor-nyc').kind).toBe('nonpartisan');
  });

  it('validates platforms on the 7-step scale', () => {
    const s = newRun();
    expect(platformError(s, [])).toMatch(/at least one/);
    expect(platformError(s, [...WATERTOWN_PLATFORM, { issue: 'labor', stance: stanceAt(1) }])).toMatch(/at most 5/);
    expect(platformError(s, [{ issue: 'guns', stance: 1 }])).toMatch(/position/);
    expect(platformError(s, [{ issue: 'guns', stance: 0 }])).toBeUndefined(); // neutral is a position
    expect(platformError(s, WATERTOWN_PLATFORM)).toBeUndefined();
  });

  it('launching sets the platform, the manager, moves your money and deals two free packs', () => {
    const s = grantPerson(newRun(), 'cm_vance');
    const uid = s.team.cards.at(-1)!.uid;
    const launched = applyAction(s, {
      type: 'LAUNCH_CAMPAIGN',
      officeId: 'mayor-watertown',
      platform: WATERTOWN_PLATFORM,
      donation: 20_000,
      managerUid: uid,
    });
    expect(launched.career.race?.platform).toEqual(WATERTOWN_PLATFORM);
    expect(launched.career.platform).toEqual(WATERTOWN_PLATFORM);
    expect(launched.team.assigned.campaignManager).toBe(uid);
    expect(launched.funds).toBe(s.funds + 20_000);
    expect(launched.wealth).toBe(s.wealth - 20_000);
    expect(launched.packs.map((p) => p.kind)).toEqual(['campaign', 'policy']);
    expect(launched.record.guns).toBe(2);
    expect(launched.decisions?.cardIds).toHaveLength(3);
    expect(launchError(launched, { officeId: 'mayor-nyc', platform: WATERTOWN_PLATFORM, donation: 0 })).toBeDefined();
  });

  it('self-funding past the norm costs favorability', () => {
    const rich = newRun({ wealth: 5_000_000 });
    const modest = launch(rich, WATERTOWN_PLATFORM, undefined, 50_000);
    const lavish = launch(rich, WATERTOWN_PLATFORM, undefined, 2_000_000);
    expect(selfFundingPenalty('mayor-watertown', 50_000)).toBe(0);
    expect(lavish.regions['ny-north']!.favorability).toBeLessThan(modest.regions['ny-north']!.favorability - 0.05);
  });

  it('later platforms: drop one topic, add up to five, move one position by one step', () => {
    const s = { ...newRun(), career: { ...newRun().career, platform: WATERTOWN_PLATFORM } };
    const [guns, taxes, biz, climate, industry] = WATERTOWN_PLATFORM;
    expect(platformError(s, [taxes!, biz!, climate!, industry!])).toBeUndefined(); // dropped one
    expect(platformError(s, [taxes!, biz!, climate!])).toMatch(/drop only one/);
    expect(platformError(s, [{ ...guns!, stance: stanceAt(2) }, taxes!, biz!, climate!, industry!])).toBeUndefined();
    expect(platformError(s, [{ ...guns!, stance: stanceAt(1) }, taxes!, biz!, climate!, industry!])).toMatch(/one step/);
    expect(platformError(s, [{ ...guns!, stance: stanceAt(2) }, { ...taxes!, stance: stanceAt(2) }, biz!, climate!, industry!])).toMatch(
      /only one existing/,
    );
  });

  it('opponents campaign through the window you let pass: launching early is an edge', () => {
    const early = launch(newRun({ exactYear: false, seed: 'edge' }));
    let late = newRun({ exactYear: false, seed: 'edge' });
    late = passTurns(late, 3);
    late = launch(late);
    const known = (s: GameState) => s.career.race!.opponents[0]!.regions['ny-north']!.recognition;
    expect(known(late)).toBeGreaterThan(known(early));
  });
});

describe('decisions', () => {
  it('requires applying 1 to 3 cards from this hand', () => {
    const s = readyRun();
    const [a, b, c] = s.decisions!.cardIds;
    expect(decisionError(s, [])).toMatch(/at least one/);
    expect(decisionError(s, ['nope'])).toMatch(/not in/);
    expect(decisionError(s, [a!, a!])).toMatch(/once/);
    expect(decisionError(s, [a!, b!, c!])).toBeUndefined();
    expect(endTurnBlocker(s)).toMatch(/decisions/);
  });

  it('keeping a promise raises integrity; breaking one lowers it more', () => {
    // Force a hand with a card that matches (property tax freeze, taxes +2) and one that breaks a promise.
    const base = readyRun();
    const hand = { ...base.decisions!, cardIds: ['cm_property_tax_freeze', 'cm_local_wage', 'cm_civilian_oversight'] };
    const kept = applyAction({ ...base, decisions: hand }, { type: 'RESOLVE_DECISIONS', apply: ['cm_property_tax_freeze'] });
    expect(kept.integrity).toBeGreaterThan(base.integrity);

    const breaker = {
      ...base,
      career: { ...base.career, race: { ...base.career.race!, platform: [{ issue: 'taxes' as const, stance: -2 }] } },
    };
    const broken = applyAction({ ...breaker, decisions: hand }, { type: 'RESOLVE_DECISIONS', apply: ['cm_property_tax_freeze'] });
    expect(broken.integrity).toBeLessThan(base.integrity);
    expect(base.integrity - broken.integrity).toBeGreaterThan(kept.integrity - base.integrity);
  });

  it('applying a card moves the record toward its stance', () => {
    const base = readyRun();
    const hand = { ...base.decisions!, cardIds: ['cm_bus_lanes', 'cm_road_repair', 'cm_pride_parade'] };
    const s = applyAction({ ...base, decisions: hand }, { type: 'RESOLVE_DECISIONS', apply: ['cm_bus_lanes'] });
    expect(s.record.transit).toBe(getDecisionCard('cm_bus_lanes').tags[0]!.stance);
  });
});

describe('event cards', () => {
  function resolved(): GameState {
    const s = readyRun();
    return applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] });
  }

  it('a well-aligned town hall raises recognition and favorability and costs only energy', () => {
    const s = { ...resolved(), hand: [{ uid: 500, cardId: 'town_hall' }] };
    const townHall = s.hand[0]!;
    const pv = previewEvent(s, townHall.uid, 'ny-north', 'guns');
    expect(pv.error).toBeUndefined();
    const { state: after } = playEvent(s, townHall.uid, 'ny-north', 'guns');
    expect(after.regions['ny-north']!.recognition).toBeGreaterThan(s.regions['ny-north']!.recognition);
    expect(after.regions['ny-north']!.favorability).toBeGreaterThan(s.regions['ny-north']!.favorability);
    expect(after.funds).toBe(s.funds);
    expect(after.energy).toBe(s.energy - 2);
    expect(after.hand.find((c) => c.uid === townHall.uid)).toBeUndefined();
  });

  it('the same message backfires where voters disagree (spillover uses each region’s own view)', () => {
    const s = { ...resolved(), hand: [{ uid: 999, cardId: 'cable_interview' }] };
    const cable = s.hand[0]!;
    const pv = previewEvent(s, cable.uid, 'ny-north', 'guns'); // gun rights +2
    const north = pv.effects.find((e) => e.regionId === 'ny-north')!;
    const nyc = pv.effects.find((e) => e.regionId === 'ny-nyc')!;
    expect(north.dFavorability).toBeGreaterThan(0);
    expect(nyc.dFavorability).toBeLessThan(0);
    expect(nyc.share).toBe(0.5);
  });

  it('repeating a topic in a region has diminishing returns', () => {
    const s = resolved();
    const first = previewEvent(s, 'social_post', 'ny-north', 'guns');
    const after = playEvent(s, 'social_post', 'ny-north', 'guns').state;
    const second = previewEvent(after, 'social_post', 'ny-north', 'guns');
    expect(second.fatigue).toBeCloseTo(0.7);
    expect(second.effects[0]!.dFavorability).toBeLessThan(first.effects[0]!.dFavorability);
  });

  it('NYC media costs more than Watertown media', () => {
    const tv = getEventCard('local_tv_ad');
    const nyc = newRun({ politician: { ...newRun().politician, residentRegionId: 'ny-nyc' } });
    expect(eventPrice(tv, nyc)).toBeGreaterThan(eventPrice(tv, newRun()));
  });

  it('basic cards are never consumed; call time raises money', () => {
    const s = resolved();
    expect(BASIC_CARD_IDS).toContain('call_time');
    const after = playEvent(s, 'call_time', 'ny-north', 'guns').state;
    expect(after.funds).toBeGreaterThan(s.funds);
    expect(after.hand).toHaveLength(s.hand.length);
  });

  it('refuses events without energy or before decisions are resolved', () => {
    const unresolved = readyRun();
    expect(previewEvent(unresolved, 'door_knocking', 'ny-north', 'guns').error).toMatch(/decisions/);
    const tired = { ...resolved(), energy: 1 };
    expect(previewEvent(tired, 'door_knocking', 'ny-north', 'guns').error).toMatch(/energy/);
  });
});

describe('Election Day', () => {
  it('resolves on the last turn of the election year, records it and waits for the player', () => {
    const s = passTurns(readyRun(), 4);
    expect(s.elections).toHaveLength(1);
    const e = s.elections[0]!;
    expect(e.officeId).toBe('mayor-watertown');
    expect(e.totalShares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(s.pendingResult).toBe(0);
    expect(endTurnBlocker(s)).toMatch(/election result/);
    expect(s.clock).toMatchObject({ year: 2028, turn: 0 });
  });

  it('is reproducible for the same seed and actions', () => {
    expect(passTurns(readyRun(), 4).elections).toEqual(passTurns(readyRun(), 4).elections);
  });

  it('a win puts you in office; a loss lets you file again', () => {
    let won = false;
    let lost = false;
    for (let i = 0; i < 40 && !(won && lost); i++) {
      const s = applyAction(playCampaign(newRun({ seed: `e-${i}` }), 'sensible').state, { type: 'DISMISS_RESULT' });
      if (s.elections[0]!.playerWon) {
        won = true;
        expect(s.career.office).toMatchObject({ officeId: 'mayor-watertown', termEndsYear: 2031, startedYear: 2028 });
        expect(s.career.office!.approval['ny-north']).toBeGreaterThan(0.3);
      } else {
        lost = true;
        expect(s.career.office).toBeUndefined();
        expect(s.career.lossStreak).toBe(1);
        expect(campaignWindow(s, 'mayor-buffalo').electionYear).toBe(2029);
      }
    }
    expect(won && lost).toBe(true);
  });

  it('three losses in a row end the career', () => {
    let s: GameState = { ...readyRun(), career: { ...readyRun().career, lossStreak: 2 } };
    s = passTurns(s, 4);
    if (!s.elections[0]!.playerWon) expect(s.ended?.reason).toBe('losses');
  });

  it('the poll is recorded in each campaign snapshot', () => {
    const s = passTurns(readyRun(), 2);
    expect(s.snapshots[0]!.poll).toBeGreaterThan(0);
    expect(poll(s, s.career.race!).decided).toHaveLength(1 + s.career.race!.opponents.length);
  });
});

describe('retire', () => {
  it('ends the career and blocks further turns', () => {
    const s = applyAction(passTurn(readyRun()), { type: 'RETIRE' });
    expect(s.ended?.reason).toBe('retired');
    expect(endTurnBlocker(s)).toMatch(/over/);
  });
});

describe('M3 acceptance: campaigning matters (bot)', () => {
  it('a sensible campaign beats doing nothing and beats campaigning against your voters', () => {
    const input = botCharacter('ny-north');
    const sensible = hometownWinRate(input, 'sensible', 30);
    const idle = hometownWinRate(input, 'idle', 30);
    const contrarian = hometownWinRate(input, 'contrarian', 30);
    expect(sensible.winRate).toBeGreaterThan(0.4);
    expect(idle.winRate).toBeLessThan(0.1);
    expect(contrarian.winRate).toBeLessThan(0.15);
    expect(sensible.avgShare).toBeGreaterThan(idle.avgShare + 0.2);
  });
});

describe('difficulty', () => {
  it('Sandbox difficulty changes how known and how busy opponents are', () => {
    const opp = (difficulty: 'easy' | 'normal' | 'hard') =>
      launch(newRun({ modifiers: DIFFICULTY[difficulty] })).career.race!.opponents[0]!;
    expect(opp('hard').activity).toBeGreaterThan(opp('normal').activity);
    expect(opp('easy').activity).toBeLessThan(opp('normal').activity);
    expect(opp('hard').regions['ny-north']!.recognition).toBeGreaterThan(opp('easy').regions['ny-north']!.recognition);
  });

  it('scenarios can field a harder-working challenger', () => {
    const plain = launch(newRun()).career.race!.opponents[0]!.activity;
    const tough = launch(newRun({ modifiers: { opponentActivity: 3 } })).career.race!.opponents[0]!.activity;
    expect(tough).toBe(plain + 3);
  });
});

describe('the field preview', () => {
  it('shows exactly who you will face, with a red, blue or neutral lean', () => {
    const s = newRun();
    const id = hometownMayoralty(s.politician.residentRegionId)!;
    const preview = raceField(s, id, campaignWindow(s, id).electionYear);
    const filed = launch(s);
    expect(filed.career.race!.opponents.map((c) => c.name)).toEqual(preview.map((c) => c.name));
    for (const c of preview) expect(['red', 'blue', 'neutral']).toContain(leanSide(c));
  });

  it('small-town mayoral races draw one or two challengers', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const s = newRun({ seed: `field-${i}` });
      const id = hometownMayoralty(s.politician.residentRegionId)!;
      counts.add(raceField(s, id, campaignWindow(s, id).electionYear).length);
    }
    expect([...counts].sort()).toEqual([1, 2]);
  });
});
