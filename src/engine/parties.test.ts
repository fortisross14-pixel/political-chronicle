import { describe, expect, it } from 'vitest';
import { getDecisionCard, PARTIES } from '../data';
import { botCharacter, climbCareer, playCampaign } from '../sim/bot';
import {
  applyAction,
  decisionImpact,
  effectivePlatform,
  fileRaceError,
  invitations,
  joinError,
  nominationStatus,
  partisanBaseline,
  partyAlignment,
  projectedIncome,
  raceOptions,
  regionIntention,
} from './index';
import { newRun, passTurn } from './testUtils';
import type { GameState, PartyId } from './types';

/** A Watertown mayor (bot campaign), optionally joined to a party with a given standing. */
function mayor(party?: PartyId, standing?: number): GameState {
  for (let i = 0; i < 40; i++) {
    let s = playCampaign(newRun({ seed: `party-${i}` }), 'sensible').state;
    if (!s.elections.at(-1)!.playerWon) continue;
    s = applyAction(s, { type: 'DISMISS_RESULT' });
    if (party) s = applyAction(s, { type: 'JOIN_PARTY', party });
    if (standing !== undefined) s = { ...s, career: { ...s.career, partyStanding: standing } };
    return s;
  }
  throw new Error('no winning seed');
}

const RED_MAYOR = mayor('RP');

describe('platforms & alignment', () => {
  it('blends 70% national with 30% state chapter', () => {
    const ny = effectivePlatform('DU', 'NY');
    expect(ny.transit.position).toBeCloseTo(0.7 * PARTIES.DU.platform.transit.position + 0.3 * -1.8);
    expect(ny.abortion.position).toBe(PARTIES.DU.platform.abortion.position); // no chapter position
  });

  it('a Watertown platform fits the Reds far better than the Blues', () => {
    const s = mayor();
    expect(partyAlignment(s, 'RP')).toBeGreaterThan(0.75);
    expect(partyAlignment(s, 'RP') - partyAlignment(s, 'DU')).toBeGreaterThan(0.25);
    expect(partyAlignment(newRun(), 'DU')).toBe(0.5); // no record yet
  });
});

describe('joining', () => {
  it('parties notice you only after your first race', () => {
    expect(invitations(newRun())).toEqual([]);
    expect(joinError(newRun(), 'RP')).toMatch(/run for office/);
    expect(invitations(mayor()).map((i) => i.party).sort()).toEqual(['DU', 'RP']);
  });

  it('joining sets standing from alignment; switching costs integrity and standing', () => {
    const s = mayor();
    const red = invitations(s).find((i) => i.party === 'RP')!;
    const blue = invitations(s).find((i) => i.party === 'DU')!;
    expect(red.startingStanding).toBeGreaterThan(blue.startingStanding);
    const joined = applyAction(s, { type: 'JOIN_PARTY', party: 'RP' });
    expect(joined.career.affiliation).toBe('RP');
    expect(joined.career.partyStanding).toBe(red.startingStanding);
    const switched = applyAction(joined, { type: 'JOIN_PARTY', party: 'DU' });
    expect(switched.integrity).toBe(joined.integrity - 10);
    expect(switched.career.partyStanding!).toBeLessThan(blue.startingStanding);
  });
});

describe('standing', () => {
  it('signing bills the party likes raises standing; whip votes count triple', () => {
    const plain = decisionImpact(RED_MAYOR, getDecisionCard('of_tax_cut_trim'));
    expect(plain.standing).toBeGreaterThan(0);
    const against = decisionImpact(RED_MAYOR, getDecisionCard('of_tax_hike_services'));
    expect(against.standing).toBeLessThan(0);
    const house: GameState = { ...RED_MAYOR, career: { ...RED_MAYOR.career, office: { ...RED_MAYOR.career.office!, officeId: 'house-ny-north' } } };
    const whip = decisionImpact(house, getDecisionCard('fd_rp_tax_cut'));
    const sameTagsNoWhip = decisionImpact(house, { ...getDecisionCard('fd_rp_tax_cut'), partyPriority: undefined });
    expect(whip.standing).toBeCloseTo(sameTagsNoWhip.standing * 3);
    expect(whip.rejectStanding).toBeLessThan(0);
  });

  it('independents have no standing and get no party money', () => {
    const s = mayor();
    expect(decisionImpact(s, getDecisionCard('of_tax_cut_trim')).standing).toBe(0);
    expect(projectedIncome(s).party).toBe(0);
    expect(projectedIncome(RED_MAYOR).party).toBeGreaterThan(0);
  });
});

describe('nominations & primaries', () => {
  it('standing decides: nominee, primary, or denied; independents may run anyway', () => {
    expect(nominationStatus(mayor('RP', 70), 'governor-ny').kind).toBe('nominee');
    expect(nominationStatus(mayor('RP', 45), 'governor-ny').kind).toBe('primary');
    expect(nominationStatus(mayor('RP', 20), 'governor-ny').kind).toBe('denied');
    expect(nominationStatus(mayor(), 'governor-ny').kind).toBe('independent');
    expect(raceOptions(mayor('RP', 20)).find((o) => o.officeId === 'governor-ny')!.eligible).toBe(false);
  });

  it('a mayor can file for the House; can’t run for another mayoralty', () => {
    const s = mayor('RP', 60);
    expect(fileRaceError(s, 'house-ny-north')).toBeUndefined();
    expect(raceOptions(s).find((o) => o.officeId === 'mayor-nyc')!.eligible).toBe(false);
    const filed = applyAction(s, { type: 'FILE_RACE', officeId: 'house-ny-north' });
    expect(filed.career.race).toMatchObject({ officeId: 'house-ny-north', electionYear: 2028, nominee: 'RP' });
    expect(filed.career.race!.opponents.map((o) => o.affiliation)).toEqual(['DU']);
  });

  it('an independent in a partisan race faces both parties', () => {
    const filed = applyAction(mayor(), { type: 'FILE_RACE', officeId: 'house-ny-north' });
    expect(filed.career.race!.opponents.map((o) => o.affiliation).sort()).toEqual(['DU', 'RP']);
  });

  it('a primary is decided at the end of the election year’s first turn', () => {
    let s = mayor('RP', 30); // House needs 40: primary window
    s = applyAction(s, { type: 'FILE_RACE', officeId: 'house-ny-north' });
    expect(s.career.race!.primary?.party).toBe('RP');
    s = applyAction(s, { type: 'SET_PLATFORM', platform: [{ issue: 'guns', stance: 2 }, { issue: 'taxes', stance: 2 }] });
    // Filed in 2028 turn 0 (an election year): the primary resolves when that turn ends.
    expect(s.clock).toMatchObject({ year: 2028, turn: 0 });
    s = passTurn(s);
    const primary = s.elections.at(-1)!;
    expect(primary.kind).toBe('primary');
    if (primary.playerWon) expect(s.career.race).toMatchObject({ nominee: 'RP', primary: undefined });
    else expect(s.career.race).toBeUndefined();
    expect(s.career.office?.officeId).toBe('mayor-watertown'); // a primary loss doesn't cost your seat
  });
});

describe('partisan elections', () => {
  it('have a partisan floor: an unknown Red still gets a real share in a red region', () => {
    const unknown = { recognition: 0.02, favorability: 0 };
    const star = { recognition: 0.9, favorability: 0.5 };
    const views = [
      { standing: unknown, lean: 1, affiliation: 'RP' as const, incumbent: false },
      { standing: star, lean: -1, affiliation: 'DU' as const, incumbent: false },
    ];
    const shares = regionIntention(views, 'ny-north', 'house', true);
    const decidedRed = shares[0]! / (shares[0]! + shares[1]!);
    expect(decidedRed).toBeGreaterThan(0.25);
    expect(partisanBaseline(views, 'ny-north')[0]).toBeCloseTo(0.62, 2);
  });

  it('losing a race for a different office costs you the seat you held', () => {
    // Force a hopeless race: a weak, unknown candidate for Governor.
    let s = mayor('RP', 70);
    s = applyAction(s, { type: 'FILE_RACE', officeId: 'governor-ny' });
    s = applyAction(s, { type: 'SET_PLATFORM', platform: [{ issue: 'guns', stance: 2 }] });
    for (let i = 0; i < 12 && s.elections.filter((e) => e.officeId === 'governor-ny').length === 0; i++) s = passTurn(s);
    const gov = s.elections.find((e) => e.officeId === 'governor-ny')!;
    if (!gov.playerWon) {
      expect(s.career.office).toBeUndefined();
      expect(s.log.some((l) => /gave up your seat/.test(l.text))).toBe(true);
    }
  });

  it('an auto-filed re-election can be swapped for a different race before its platform is set', () => {
    const s = mayor('RP', 70);
    const house: GameState = {
      ...s,
      clock: { ...s.clock, year: 2030, turn: 0, turnsThisYear: 4 },
      career: {
        ...s.career,
        office: { ...s.career.office!, officeId: 'house-ny-north', termEndsYear: 2030 },
        race: { officeId: 'house-ny-north', electionYear: 2030, platform: [], opponents: [] },
      },
    };
    expect(fileRaceError(house, 'governor-ny')).toBeUndefined();
    const swapped = applyAction(house, { type: 'FILE_RACE', officeId: 'governor-ny' });
    expect(swapped.career.race!.officeId).toBe('governor-ny');
    expect(swapped.log.some((l) => /Not seeking re-election/.test(l.text))).toBe(true);
  });
});

describe('M6 acceptance: Watertown → House → Governor', () => {
  it('a climber from Watertown joins the Reds, wins the House seat and can win Governor', () => {
    const results = Array.from({ length: 8 }, (_, i) => climbCareer(botCharacter('ny-north'), 60, `accept-${i}`));
    expect(results.every((r) => r.party === 'RP')).toBe(true);
    expect(results.filter((r) => r.reachedHouse).length).toBeGreaterThanOrEqual(6);
    expect(results.filter((r) => r.reachedGovernor).length).toBeGreaterThanOrEqual(3);
    // The first try for Governor is genuinely uncertain (NYC is hard for a Red).
    const firstTries = results.map((r) => r.firstGovernorTry).filter((v) => v !== undefined);
    expect(firstTries.length).toBeGreaterThan(0);
  });

  it('the same path as a Blue is much harder — the red-region/blue-state tension', () => {
    const blue = Array.from({ length: 8 }, (_, i) => climbCareer(botCharacter('ny-north'), 40, `accept-blue-${i}`, 'DU'));
    const red = Array.from({ length: 8 }, (_, i) => climbCareer(botCharacter('ny-north'), 40, `accept-blue-${i}`));
    expect(blue.filter((r) => r.reachedHouse).length).toBeLessThan(red.filter((r) => r.reachedHouse).length);
  });
});
