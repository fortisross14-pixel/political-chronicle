import { describe, expect, it } from 'vitest';
import { getDecisionCard } from '../data';
import { botCharacter, playCampaign, playTurn, reelectionRate } from '../sim/bot';
import {
  applyAction,
  averageApproval,
  decisionContext,
  decisionImpact,
  endTurnBlocker,
  governTick,
  previewEvent,
  raceViews,
} from './index';
import { newRun } from './testUtils';
import type { GameState } from './types';

/** A freshly elected Watertown mayor (first seed whose sensible campaign wins). */
function electedMayor(): GameState {
  for (let i = 0; i < 40; i++) {
    const s = playCampaign(newRun({ seed: `gov-${i}` }), 'sensible').state;
    if (s.elections.at(-1)!.playerWon) return applyAction(s, { type: 'DISMISS_RESULT' });
  }
  throw new Error('no winning seed');
}

const MAYOR = electedMayor();

function signedHand(state: GameState, ids: string[]): GameState {
  return { ...state, decisions: { turnNo: state.snapshots.length, cardIds: ids, resolved: false, applied: [] } };
}

describe('taking office', () => {
  it('seeds approval from the vote and remembers the platform you won on', () => {
    const office = MAYOR.career.office!;
    expect(office.officeId).toBe('mayor-watertown');
    expect(office.termEndsYear).toBe(2031);
    expect(office.platform.length).toBeGreaterThan(0);
    expect(office.approval['ny-north']).toBeGreaterThan(0.5);
    expect(MAYOR.career.race).toBeUndefined();
  });

  it('deals bills and executive actions (office cards) each turn', () => {
    expect(decisionContext(MAYOR)).toBe('office');
    expect(MAYOR.decisions!.cardIds.every((id) => getDecisionCard(id).context === 'office')).toBe(true);
    expect(endTurnBlocker(MAYOR)).toMatch(/decisions/);
  });
});

describe('governing', () => {
  it('a bill voters like raises approval; one that breaks a promise lowers it and integrity', () => {
    // Watertown platform from the bot: guns +2 is always on it (top salience).
    const platform = MAYOR.career.office!.platform;
    expect(platform.find((p) => p.issue === 'guns')?.stance).toBeGreaterThan(0);
    const hand = signedHand(MAYOR, ['of_carry_city_buildings', 'of_park_gun_ban', 'of_open_records']);

    const kept = applyAction(hand, { type: 'RESOLVE_DECISIONS', apply: ['of_carry_city_buildings'] });
    expect(kept.career.office!.approval['ny-north']).toBeGreaterThan(MAYOR.career.office!.approval['ny-north']!);
    expect(kept.integrity).toBeGreaterThan(MAYOR.integrity);
    expect(kept.promises.at(-1)).toMatchObject({ issue: 'guns', kept: true });

    const broken = applyAction(hand, { type: 'RESOLVE_DECISIONS', apply: ['of_park_gun_ban'] });
    expect(broken.career.office!.approval['ny-north']).toBeLessThan(MAYOR.career.office!.approval['ny-north']!);
    expect(broken.integrity).toBeLessThan(MAYOR.integrity);
    expect(broken.promises.at(-1)).toMatchObject({ issue: 'guns', kept: false });
  });

  it('previews approval, not favorability, in the jurisdiction', () => {
    const impact = decisionImpact(MAYOR, getDecisionCard('of_carry_city_buildings'));
    expect(impact.approval['ny-north']).toBeGreaterThan(0);
    expect(impact.favorability['ny-north']).toBeUndefined();
    expect(impact.favorability['ny-nyc']).toBeLessThan(0); // heard statewide, judged by NYC
  });

  it('declining a crisis card costs approval', () => {
    const hand = signedHand(MAYOR, ['of_snow_overtime', 'of_open_records', 'of_pride_flag']);
    const s = applyAction(hand, { type: 'RESOLVE_DECISIONS', apply: ['of_open_records'] });
    expect(s.career.office!.approval['ny-north']).toBeLessThan(MAYOR.career.office!.approval['ny-north']!);
  });

  it('approval wears down if you do nothing, and favorability follows approval', () => {
    const low: GameState = {
      ...MAYOR,
      career: { ...MAYOR.career, office: { ...MAYOR.career.office!, approval: { 'ny-north': 0.25 } } },
      regions: { ...MAYOR.regions, 'ny-north': { recognition: 0.8, favorability: 0.4 } },
    };
    const next = governTick(low);
    expect(next.career.office!.approval['ny-north']).toBeLessThan(0.25);
    expect(next.regions['ny-north']!.favorability).toBeLessThan(0.4);
  });

  it('events still work in office, on the platform you won on, and move approval', () => {
    const s = applyAction(MAYOR, { type: 'RESOLVE_DECISIONS', apply: [MAYOR.decisions!.cardIds[0]!] });
    const issue = s.career.office!.platform[0]!.issue;
    expect(previewEvent(s, 'door_knocking', 'ny-north', issue).error).toBeUndefined();
    const after = applyAction(s, { type: 'PLAY_EVENT', cardUid: 'door_knocking', regionId: 'ny-north', issue });
    expect(after.career.office!.approval['ny-north']).not.toBe(s.career.office!.approval['ny-north']);
  });
});

describe('re-election', () => {
  it('opens automatically at the start of the last year of the term, as a 4-turn year', () => {
    let s = MAYOR;
    for (let i = 0; i < 12 && !s.career.race; i++) s = playTurn(s, 'sensible');
    expect(s.career.race?.officeId).toBe('mayor-watertown');
    expect(s.clock).toMatchObject({ year: 2031, turnsThisYear: 4 });
    expect(s.career.race!.opponents.every((c) => !c.incumbent)).toBe(true);
    expect(s.career.office).toBeDefined(); // you keep governing while you run
  });

  it('as the incumbent you are judged on approval', () => {
    let s = MAYOR;
    for (let i = 0; i < 12 && !s.career.race; i++) s = playTurn(s, 'sensible');
    const you = raceViews(s, s.career.race!, 'ny-north')[0]!;
    expect(you.incumbent).toBe(true);
    expect(you.approval).toBe(s.career.office!.approval['ny-north']);
  });

  it('losing re-election ends the term; winning starts a new one', () => {
    let s = MAYOR;
    for (let i = 0; i < 20 && s.elections.length < 2; i++) s = playTurn(s, 'sensible');
    const e = s.elections[1]!;
    if (e.playerWon) expect(s.career.office!.termEndsYear).toBe(2035);
    else expect(s.career.office).toBeUndefined();
    expect(averageApproval(s) === undefined).toBe(!e.playerWon);
  });
});

describe('M5 acceptance: keeping promises gets you re-elected', () => {
  it('promise-keepers are re-elected much more often than flip-floppers', () => {
    const input = botCharacter('ny-north');
    const keep = reelectionRate(input, 'sensible', 16);
    const flip = reelectionRate(input, 'flipflop', 16);
    expect(keep.terms).toBeGreaterThan(5);
    expect(keep.reelected).toBeGreaterThan(flip.reelected + 0.3);
    expect(keep.integrity).toBeGreaterThan(flip.integrity);
    expect(keep.avgApproval).toBeGreaterThan(flip.avgApproval);
  });
});
