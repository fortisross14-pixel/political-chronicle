import { describe, expect, it } from 'vitest';
import { FEMALE_FIRST_NAMES, FIRST_NAMES, LAST_NAMES } from '../data';
import { opponentPortrait, playerPortrait } from './portraits';

const WOMEN = new Set(['opp_2', 'opp_4', 'opp_7', 'opp_9', 'opp_11']);

describe('portraits', () => {
  it('every opponent gets a face of their name’s gender', () => {
    for (const first of FIRST_NAMES)
      for (const last of LAST_NAMES) expect(WOMEN.has(opponentPortrait(`${first} ${last}`))).toBe(FEMALE_FIRST_NAMES.has(first));
    expect(opponentPortrait('Hannah Lindqvist')).toBe(opponentPortrait('Hannah Lindqvist'));
  });

  it('the player’s face follows gender and age', () => {
    expect(playerPortrait({ gender: 'female', startAge: 30 })).toBe('you_f1');
    expect(playerPortrait({ gender: 'male', startAge: 52 })).toBe('you_m2');
    expect(playerPortrait({ gender: 'nonbinary', startAge: 40 })).toBe('you_n1');
  });
});
