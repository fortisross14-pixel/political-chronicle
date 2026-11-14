// The 7-step platform scale (DESIGN_V2 §2.2): Strongly / Clearly / Leaning against, Neutral,
// Leaning / Clearly / Strongly for. Positions −3..+3 map onto the −2..+2 opinion axis.
import type { Stance } from './types';

export const POSITIONS = [-3, -2, -1, 0, 1, 2, 3] as const;
export type Position = (typeof POSITIONS)[number];

/** −3..+3 → −2..+2. */
export function stanceAt(position: number): Stance {
  return (position * 2) / 3;
}

/** The nearest platform position for any stance. */
export function positionOf(stance: Stance): Position {
  return Math.max(-3, Math.min(3, Math.round(stance * 1.5))) as Position;
}

/** True if the stance sits exactly on one of the 7 steps. */
export function onScale(stance: Stance): boolean {
  return Math.abs(stance - stanceAt(positionOf(stance))) < 1e-6 && Math.abs(stance) <= 2 + 1e-9;
}

export const STRENGTH_LABEL: Record<number, string> = { 0: 'Neutral', 1: 'Leaning', 2: 'Clearly', 3: 'Strongly' };
