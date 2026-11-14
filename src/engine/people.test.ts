import { describe, expect, it } from 'vitest';
import { getDecisionCard, PEOPLE } from '../data';
import { playCampaign } from '../sim/bot';
import {
  administrationWear,
  applyAction,
  buyPackError,
  crisisCostMultiplier,
  decisionImpact,
  grantPerson,
  passageChance,
  previewEvent,
  roleStars,
  rollChambers,
  ROSTER_LIMIT,
  Rng,
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
    career: {
      ...s.career,
      affiliation: party,
      partyStanding: 60,
      office: { ...s.career.office!, officeId: 'governor-ny', approval: { 'ny-north': 0.6 } },
    },
    chambers: { ...s.chambers, state: { NY: control } },
    team: { cards: [], assigned: {}, nextUid: 1 },
  };
}

describe('the roster', () => {
  const empty = (s: GameState): GameState => ({ ...s, team: { cards: [], assigned: {}, nextUid: 1 } });

  it('anyone can fill any role; their stars for that role are what count', () => {
    let s = empty(readyRun());
    s = grantPerson(s, 'cs_lindqvist'); // 2★ campaign, 4.5★ chief of staff
    const uid = s.team.cards[0]!.uid;
    s = applyAction(s, { type: 'ASSIGN_PERSON', uid, role: 'campaignManager' });
    expect(roleStars(s, 'campaignManager')).toBe(2);
    expect(roleStars(s, 'chiefOfStaff')).toBe(0); // nobody there, and no office anyway
    // Moving them frees the old role.
    s = applyAction(s, { type: 'ASSIGN_PERSON', uid, role: 'chiefOfStaff' });
    expect(s.team.assigned.campaignManager).toBeUndefined();
    expect(roleStars(s, 'chiefOfStaff')).toBe(0); // the role is idle until you hold office
  });

  it('a campaign manager makes campaign actions land harder', () => {
    const s = empty(readyRun());
    const managed = applyAction(grantPerson(s, 'cm_king'), { type: 'ASSIGN_PERSON', uid: 1, role: 'campaignManager' });
    const plain = previewEvent(s, 'door_knocking', 'ny-north', 'guns').effects[0]!;
    const better = previewEvent(managed, 'door_knocking', 'ny-north', 'guns').effects[0]!;
    expect(better.dRecognition).toBeGreaterThan(plain.dRecognition * 1.25);
  });

  it('discarding is permanent; the roster holds 10', () => {
    let s = empty(newRun());
    for (const p of PEOPLE.slice(0, ROSTER_LIMIT)) s = grantPerson(s, p.id);
    expect(ROSTER_LIMIT).toBe(10);
    expect(buyPackError({ ...s, funds: 1e6 }, 'people', 'regular')).toMatch(/full/);
    const gone = applyAction(s, { type: 'DISCARD_PERSON', uid: s.team.cards[0]!.uid });
    expect(gone.team.cards).toHaveLength(ROSTER_LIMIT - 1);
  });

  it('public servants start with someone from their old job', () => {
    expect(newRun().team.cards.map((c) => c.personId)).toContain('cs_pham');
    expect(newRun({ politician: { ...newRun().politician, backgroundId: 'lawyer' } }).team.cards).toHaveLength(0);
  });

  it('every person has 0–5 stars in every role, best role matching their rarity', () => {
    const floor = { common: 1.5, rare: 2.5, epic: 3.5, legendary: 4.5 } as const;
    for (const p of PEOPLE) {
      for (const v of Object.values(p.stars)) expect(v >= 0 && v <= 5 && (v * 2) % 1 === 0).toBe(true);
      expect(Math.max(...Object.values(p.stars))).toBeGreaterThanOrEqual(floor[p.rarity]);
    }
  });
});

describe('roles & perks', () => {
  it('the fixer halves what declining a crisis costs', () => {
    const s = mayor();
    const noPerson = { ...s, team: { cards: [], assigned: {}, nextUid: 1 } };
    const withFixer = applyAction(grantPerson(noPerson, 'cs_osei'), { type: 'ASSIGN_PERSON', uid: 1, role: 'chiefOfStaff' });
    expect(crisisCostMultiplier(withFixer)).toBeLessThan(crisisCostMultiplier(noPerson) * 0.51);
  });

  it('a road-warrior campaign manager adds energy every campaign turn', () => {
    const s = readyRun();
    const base = applyAction(applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions!.cardIds[0]!] }), { type: 'END_TURN' });
    const boosted0 = grantPerson({ ...s, team: { cards: [], assigned: {}, nextUid: 1 } }, 'cm_harlan', 'campaignManager');
    const boosted = applyAction(applyAction(boosted0, { type: 'RESOLVE_DECISIONS', apply: [boosted0.decisions!.cardIds[0]!] }), {
      type: 'END_TURN',
    });
    expect(boosted.energy).toBe(base.energy + 1);
  });

  it('a chief of staff slows approval wear in office', () => {
    const s = mayor();
    const strip = { ...s, team: { cards: [], assigned: {}, nextUid: 1 } };
    const staffed = grantPerson(strip, 'cs_monroe', 'chiefOfStaff');
    expect(administrationWear(staffed)).toBeLessThan(administrationWear(strip) * 0.65);
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
    const staffed = grantPerson(governor('DU', 'RP'), 'ld_baptiste', 'legislativeDirector');
    expect(passageChance(staffed, card)).toBeGreaterThan(other + 0.15); // 3★ director and across-the-aisle
    expect(passageChance(governor('DU', 'RP'), getDecisionCard('gv_snowstorm'))).toBe(1); // crises always go through
    expect(decisionImpact(mayor(), getDecisionCard('of_brt')).passage).toBe(1);
  });

  it('a failed bill changes nothing on the record', () => {
    // Force failure: opposing chamber, LAW and DIP at 0 → 35%.
    const s0 = governor('DU', 'RP', 0, 0);
    let failedOnce = false;
    for (let i = 0; i < 30 && !failedOnce; i++) {
      const s = {
        ...s0,
        rng: i,
        decisions: {
          turnNo: s0.snapshots.length,
          cardIds: ['gv_housing_compact', 'gv_snowstorm', 'gv_gas_ban'],
          resolved: false,
          applied: [],
        },
      };
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
  it('a governor with low LAW and no director fails far more bills than a well-staffed one', () => {
    const card = getDecisionCard('gv_school_aid');
    const weak = passageChance(governor('DU', 'RP', 1, 1), card);
    const strong = passageChance(grantPerson(governor('DU', 'RP', 6, 5), 'ld_sutherland', 'legislativeDirector'), card);
    expect(1 - weak).toBeGreaterThan(2 * (1 - strong));
  });
});
