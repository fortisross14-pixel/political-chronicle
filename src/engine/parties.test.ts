import { describe, expect, it } from 'vitest';
import { getDecisionCard, PARTIES } from '../data';
import { botCharacter, climbCareer, playCampaign } from '../sim/bot';
import {
  applyAction,
  askError,
  decisionImpact,
  effectivePlatform,
  invitations,
  joinChance,
  joinParty,
  launchError,
  nominationStatus,
  partisanBaseline,
  partyAlignment,
  projectedIncome,
  raceBoard,
  regionIntention,
  stanceAt,
} from './index';
import { launch, newRun, passTurn } from './testUtils';
import type { GameState, PartyId } from './types';

/** Launches `officeId` keeping the platform you have (always allowed). */
function relaunch(s: GameState, officeId: string): GameState {
  return launch(s, s.career.platform!, officeId, 0);
}

/** A Watertown mayor (bot campaign), optionally joined to a party with a given standing. */
function mayor(party?: PartyId, standing?: number): GameState {
  for (let i = 0; i < 40; i++) {
    let s = playCampaign(newRun({ seed: `party-${i}` }), 'sensible').state;
    if (!s.elections.at(-1)!.playerWon) continue;
    s = applyAction(s, { type: 'DISMISS_RESULT' });
    if (party) s = joinParty(s, party);
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
    expect(partyAlignment(s, 'RP')).toBeGreaterThan(0.7);
    expect(partyAlignment(s, 'RP') - partyAlignment(s, 'DU')).toBeGreaterThan(0.12);
    expect(partyAlignment(newRun(), 'DU')).toBe(0.5); // no record yet
  });
});

describe('joining', () => {
  it('you ask; the party decides. Elected officials are almost always welcome', () => {
    const outsider = newRun();
    const elected = mayor();
    expect(joinChance(elected, 'RP')).toBeGreaterThan(joinChance(outsider, 'RP') + 0.25);
    expect(joinChance(elected, 'RP')).toBeGreaterThan(0.85);
    // A platform the party likes improves your odds before you've run at all.
    const fits = [
      { issue: 'taxes' as const, stance: stanceAt(3) },
      { issue: 'guns' as const, stance: stanceAt(3) },
    ];
    expect(joinChance(outsider, 'RP', fits)).toBeGreaterThan(joinChance(outsider, 'DU', fits));
  });

  it('a refusal means waiting until next year; a yes makes you a member', () => {
    let asked = mayor();
    for (let i = 0; i < 20 && asked.career.affiliation === 'IND'; i++) {
      const tried = applyAction({ ...asked, rng: i }, { type: 'ASK_TO_JOIN', party: 'RP' });
      if (tried.career.affiliation === 'IND') expect(askError(tried, 'RP')).toMatch(/next year/);
      else asked = tried;
    }
    expect(asked.career.affiliation).toBe('RP');
    expect(asked.career.partyStanding).toBeGreaterThan(0);
  });

  it('joining sets standing from alignment; switching costs integrity and standing', () => {
    const s = mayor();
    const red = invitations(s).find((i) => i.party === 'RP')!;
    const blue = invitations(s).find((i) => i.party === 'DU')!;
    expect(red.startingStanding).toBeGreaterThan(blue.startingStanding);
    const joined = joinParty(s, 'RP');
    expect(joined.career.affiliation).toBe('RP');
    expect(joined.career.partyStanding).toBe(red.startingStanding);
    const switched = joinParty(joined, 'DU');
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
    const house: GameState = {
      ...RED_MAYOR,
      career: { ...RED_MAYOR.career, office: { ...RED_MAYOR.career.office!, officeId: 'house-ny-north' } },
    };
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
    expect(raceBoard(mayor('RP', 20)).find((o) => o.officeId === 'governor-ny')!.status).toBe('locked');
  });

  it('a mayor can run for the House; can’t run for another mayoralty', () => {
    const s = mayor('RP', 60);
    expect(launchError(s, { officeId: 'house-ny-north', platform: s.career.platform!, donation: 0 })).toBeUndefined();
    expect(raceBoard(s).find((o) => o.officeId === 'mayor-nyc')!.status).toBe('locked');
    const filed = relaunch(s, 'house-ny-north');
    expect(filed.career.race).toMatchObject({ officeId: 'house-ny-north', electionYear: 2028, nominee: 'RP' });
    expect(filed.career.race!.opponents.map((o) => o.affiliation)).toEqual(['DU']);
  });

  it('an independent in a partisan race faces both parties', () => {
    const filed = relaunch(mayor(), 'house-ny-north');
    expect(filed.career.race!.opponents.map((o) => o.affiliation).sort()).toEqual(['DU', 'RP']);
  });

  it('a primary is decided at the end of the election year’s first turn', () => {
    let s = mayor('RP', 30); // House needs 40: primary window
    s = relaunch(s, 'house-ny-north');
    expect(s.career.race!.primary?.party).toBe('RP');
    // Launched in 2028 turn 0 (an election year): the primary resolves when that turn ends.
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
    s = { ...s, clock: { ...s.clock, year: 2029 } }; // the 2030 race opens in 2029
    s = relaunch(s, 'governor-ny');
    for (let i = 0; i < 12 && s.elections.filter((e) => e.officeId === 'governor-ny').length === 0; i++) s = passTurn(s);
    const gov = s.elections.find((e) => e.officeId === 'governor-ny')!;
    if (!gov.playerWon) {
      expect(s.career.office).toBeUndefined();
      expect(s.log.some((l) => /gave up your seat/.test(l.text))).toBe(true);
    }
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
