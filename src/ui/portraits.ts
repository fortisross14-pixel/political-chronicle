// Painted faces (art/grids.json): the player by gender and age, opponents by a stable hash of their name.
import type { Politician } from '../engine';

export function playerPortrait(p: Pick<Politician, 'gender' | 'startAge'>): string {
  return `you_${p.gender === 'female' ? 'f' : p.gender === 'male' ? 'm' : 'n'}${p.startAge >= 45 ? 2 : 1}`;
}

export function opponentPortrait(name: string): string {
  // FNV-1a: spreads similar names across all twelve faces.
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return `opp_${(h % 12) + 1}`;
}
