import { describe, expect, it } from 'vitest';
import { OFFICES } from '../data';
import { playCampaign } from '../sim/bot';
import { applyAction, upcomingElections } from './index';
import { newRun, passTurns } from './testUtils';

describe('the world', () => {
  it('every office starts with a holder; partisan seats belong to a party', () => {
    const s = newRun();
    for (const o of OFFICES) {
      const seat = s.world.seats[o.id]!;
      expect(seat.holder.length).toBeGreaterThan(3);
      expect(o.partisan ? ['DU', 'RP'] : ['IND']).toContain(seat.affiliation);
    }
  });

  it('races you sit out are decided at New Year and change the seats', () => {
    const s = passTurns(newRun(), 5); // through 2027: Watertown, Buffalo and NYC mayors vote
    const decided = s.world.results.filter((r) => r.year === 2027);
    expect(decided.map((r) => r.officeId).sort()).toEqual(
      OFFICES.filter((o) => o.cycle.every === 4 && 2027 % 4 === o.cycle.offset)
        .map((o) => o.id)
        .sort(),
    );
    for (const r of decided) expect(s.world.seats[r.officeId]!.holder).toBe(r.winner);
  });

  it('your own race is on the record too, and a win makes the seat yours', () => {
    const s = applyAction(playCampaign(newRun({ seed: 'w' }), 'sensible').state, { type: 'DISMISS_RESULT' });
    const mine = s.world.results.find((r) => r.playerRan)!;
    expect(mine.officeId).toBe('mayor-watertown');
    if (mine.playerWon) expect(s.world.seats['mayor-watertown']).toMatchObject({ holder: s.politician.name, isPlayer: true });
  });

  it('lists the coming elections', () => {
    const cal = upcomingElections(newRun(), 4);
    expect(cal.some((c) => c.officeId === 'governor-ny' && c.year === 2030)).toBe(true);
    expect(cal.every((c) => c.year >= 2027 && c.year < 2031)).toBe(true);
  });
});
