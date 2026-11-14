// Painted faces (art/grids.json): the player by gender and age, opponents by a stable hash of their name.
import { FEMALE_FIRST_NAMES } from '../data';
import type { Politician } from '../engine';

export function playerPortrait(p: Pick<Politician, 'gender' | 'startAge'>): string {
  return `you_${p.gender === 'female' ? 'f' : p.gender === 'male' ? 'm' : 'n'}${p.startAge >= 45 ? 2 : 1}`;
}

/** Opponent faces by gender (art/grids.json: opp_1…opp_12). */
const WOMEN = [2, 4, 7, 9, 11];
const MEN = [1, 3, 5, 6, 8, 10, 12];

/** A stable face for a name, from the faces of the name's gender. */
export function opponentPortrait(name: string): string {
  // FNV-1a: spreads similar names across the faces.
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const pool = FEMALE_FIRST_NAMES.has(name.split(' ')[0]!) ? WOMEN : MEN;
  return `opp_${pool[h % pool.length]}`;
}
