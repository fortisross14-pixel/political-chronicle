import { describe, expect, it } from 'vitest';
import { getDecisionCard, PEOPLE, PERSON_PRICE } from '../data';
import { botCharacter, playCampaign, reelectionRate } from '../sim/bot';
import {
  applyAction,
  crisisCostMultiplier,
  decisionImpact,
  effectiveSkills,
  grantPerson,
  passageChance,
  buyError,
  offerPrice,
  roleActive,
  rollChambers,
  ROSTER_LIMIT,
  Rng,
  yourChamber,
} from './index';
import { newRun, readyRun } from './testUtils';
import type { GameState } from './types';

function mayor(): GameState {
  for (let i = 0; i < 40; i++) {
    const s = playCampaign(newRun({ seed: `ppl-${i}` }), 'sensible').state;
    if (s.elections.at(-1)!.playerWon) return applyAction(s, { type: 'DISMISS_RESULT' });
  }
  throw new Error('no winning seed');
}

/** A governor in a given chamber situation, for passage tests. */
function governor(party: 'DU' | 'RP', control: 'DU' | 'RP' | 'split', law = 3, diplomacy = 3): GameState {
  const s = mayor();
  return {
    ...s,
    politician: { ...s.politician, skills: { ...s.politician.skills, law, diplomacy } },
    career: { ...s.career, affiliation: party, partyStanding: 60, office: { ...s.career.office!, officeId: 'governor-ny', approval: { 'ny-north': 0.6 } } },
    chambers: { ...s.chambers, state: { NY: control } },
    team: { cards: [], assigned: {}, nextUid: 1 },
  };
}

describe('hiring people in the Market', () => {
  const empty = (s: GameState): GameState => ({ ...s, team: { cards: [], assigned: {}, nextUid: 1 } });
  const offer = (s: GameState, personId: string): GameState => ({ ...s, funds: 1e6, market: { turnNo: s.snapshots.length, offers: [{ kind: 'person', cardId: personId }] } });

  it('the Market offers a person you don’t already have, every turn', () => {
    const s = newRun();
    const people = s.market!.offers.filter((o) => o.kind === 'person');
    expect(people).toHaveLength(1);
    expect(s.team.cards.map((c) => c.personId)).not.toContain(people[0]!.cardId);
  });

  it('a person costs a one-time price by rarity, and fills an empty role', () => {
    const s = offer(empty(newRun()), 'cm_vance');
    expect(offerPrice(s.market!.offers[0]!, s)).toBe(PERSON_PRICE.rare);
    const hired = applyAction(s, { type: 'BUY_CARD', offerIndex: 0 });
    expect(hired.funds).toBe(1e6 - PERSON_PRICE.rare);
    expect(hired.team.assigned.campaignManager).toBe(hired.team.cards[0]!.uid);
    // No salary: next turn's income has no deduction for them.
    expect(Object.keys(hired.lastIncome ?? {})).not.toContain('upkeep');
  });

  it('a second person for a taken role goes to reserve; swapping keeps both', () => {
    let s = applyAction(offer(empty(newRun()), 'cm_vance'), { type: 'BUY_CARD', offerIndex: 0 });
    s = applyAction(offer(s, 'cm_ortiz'), { type: 'BUY_CARD', offerIndex: 0 });
    expect(s.team.cards).toHaveLength(2);
    expect(s.team.assigned.campaignManager).toBe(s.team.cards[0]!.uid);
    s = applyAction(s, { type: 'ASSIGN_PERSON', uid: s.team.cards[1]!.uid });
    expect(s.team.assigned.campaignManager).toBe(s.team.cards[1]!.uid);
    expect(s.team.cards).toHaveLength(2);
  });

  it('discarding is permanent; the roster holds 6', () => {
    let s = empty(newRun());
    for (const p of PEOPLE.slice(0, ROSTER_LIMIT)) s = grantPerson(s, p.id, false);
    expect(buyError(offer(s, 'ld_novak'), 0)).toMatch(/full/);
    const gone = applyAction(s, { type: 'DISCARD_PERSON', uid: s.team.cards[0]!.uid });
    expect(gone.team.cards).toHaveLength(ROSTER_LIMIT - 1);
    expect(gone.team.cards.some((c) => c.personId === s.team.cards[0]!.personId)).toBe(false);
  });

  it('public servants start with a chief of staff from their old job', () => {
    expect(newRun().team.cards.map((c) => c.personId)).toContain('cs_pham');
    expect(newRun({ politician: { ...newRun().politician, backgroundId: 'lawyer' } }).team.cards).toHaveLength(0);
  });
});

describe('roles & boosts', () => {
  it('boosts count only while the role is active', () => {
    const running = grantPerson({ ...readyRun(), team: { cards: [], assigned: {}, nextUid: 1 } }, 'cm_harlan');
    expect(roleActive(running, 'campaignManager')).toBe(true);
    expect(effectiveSkills(running).charisma).toBe(running.politician.skills.charisma + 2);
    const chief = grantPerson(running, 'cs_feldman');
    expect(roleActive(chief, 'chiefOfStaff')).toBe(false); // not in office yet
    expect(effectiveSkills(chief).administration).toBe(chief.politician.skills.administration);
  });

  it('a legislative director does nothing for a mayor', () => {
    const s = grantPerson(mayor(), 'ld_sutherland');
    expect(roleActive(s, 'legislativeDirector')).toBe(false);
    expect(yourChamber(s)).toBeUndefined();
  });

  it('the fixer halves what declining a crisis costs', () => {
    const s = mayor();
    const noPerson = { ...s, team: { cards: [], assigned: {}, nextUid: 1 } };
    const withFixer = grantPerson(noPerson, 'cs_osei');
    // Osei also adds +1 LEA, which lowers crisis cost a bit more.
    expect(crisisCostMultiplier(withFixer)).toBeLessThan(crisisCostMultiplier(noPerson) * 0.51);
  });

  it('a road warrior campaign manager adds energy every turn', () => {
    const s = readyRun();
    const base = applyAction(applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] }), { type: 'END_TURN' });
    const boosted0 = grantPerson({ ...s, team: { cards: [], assigned: {}, nextUid: 1 } }, 'cm_harlan');
    const boosted = applyAction(applyAction(boosted0, { type: 'RESOLVE_DECISIONS', apply: [boosted0.decisions!.cardIds[0]!] }), { type: 'END_TURN' });
    expect(boosted.energy).toBe(base.energy + 1);
  });
});

describe('legislature', () => {
  it('rolls chamber control reproducibly, tilted by the state’s lean', () => {
    expect(rollChambers(new Rng(1), 2028)).toEqual(rollChambers(new Rng(1), 2028));
    let blue = 0;
    for (let i = 0; i < 200; i++) if (rollChambers(new Rng(i), 2028).state.NY === 'DU') blue++;
    expect(blue).toBeGreaterThan(100); // NY leans blue
  });

  it('passage: your chamber > split > the other party’s; LAW, DIP and a director help', () => {
    const card = getDecisionCard('gv_housing_compact');
    const own = passageChance(governor('DU', 'DU'), card);
    const split = passageChance(governor('DU', 'split'), card);
    const other = passageChance(governor('DU', 'RP'), card);
    expect(own).toBeGreaterThan(split);
    expect(split).toBeGreaterThan(other);
    expect(passageChance(governor('DU', 'RP', 8, 8), card)).toBeGreaterThan(other + 0.25);
    const staffed = grantPerson(governor('DU', 'RP'), 'ld_baptiste');
    expect(passageChance(staffed, card)).toBeGreaterThan(other + 0.15); // DIP +2 and across-the-aisle
    expect(passageChance(governor('DU', 'RP'), getDecisionCard('gv_snowstorm'))).toBe(1); // crises always go through
    expect(decisionImpact(mayor(), getDecisionCard('of_brt')).passage).toBe(1);
  });

  it('a failed bill changes nothing on the record', () => {
    // Force failure: opposing chamber, LAW and DIP at 0 → 35%.
    const s0 = governor('DU', 'RP', 0, 0);
    let failedOnce = false;
    for (let i = 0; i < 30 && !failedOnce; i++) {
      const s = { ...s0, rng: i, decisions: { turnNo: s0.snapshots.length, cardIds: ['gv_housing_compact', 'gv_snowstorm', 'gv_gas_ban'], resolved: false, applied: [] } };
      const after = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: ['gv_housing_compact'] });
      if (after.decisions!.failed!.includes('gv_housing_compact')) {
        failedOnce = true;
        expect(after.record.housing).toBe(s.record.housing);
      }
    }
    expect(failedOnce).toBe(true);
  });
});

describe('M8 acceptance', () => {
  it('a Rare chief of staff (+2 ADM) visibly lifts a mayor’s approval by re-election time', () => {
    const input = botCharacter('ny-north', 'lawyer');
    const strip = (s: GameState) => ({ ...s, team: { cards: [], assigned: {}, nextUid: s.team.nextUid } });
    const none = reelectionRate(input, 'sensible', 14, strip);
    const rare = reelectionRate(input, 'sensible', 14, (s) => grantPerson(strip(s), 'cs_feldman'));
    expect(rare.avgApproval).toBeGreaterThan(none.avgApproval + 0.02);
  });

  it('a governor with low LAW and no director fails far more bills than a well-staffed one', () => {
    const card = getDecisionCard('gv_school_aid');
    const weak = passageChance(governor('DU', 'RP', 1, 1), card);
    const strong = passageChance(grantPerson(governor('DU', 'RP', 6, 5), 'ld_sutherland'), card);
    expect(1 - weak).toBeGreaterThan(2 * (1 - strong));
  });
});
