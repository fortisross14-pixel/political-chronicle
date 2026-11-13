import { ISSUES_BY_ID } from '../../data';
import type { Candidate, IssueId, Stance } from '../../engine';

export function stanceLabel(issue: IssueId, stance: Stance): string {
  const i = ISSUES_BY_ID[issue];
  const side = stance < 0 ? i.negLabel : i.posLabel;
  return Math.abs(stance) >= 2 ? `Strongly: ${side}` : side;
}

export function leanTag(lean: number): string {
  if (lean <= -0.5) return 'Blue-leaning';
  if (lean >= 0.5) return 'Red-leaning';
  return 'Centrist';
}

export function candidateTag(c: Candidate): string {
  return `${leanTag(c.lean)}${c.incumbent ? ' · incumbent' : ''}`;
}

export function fitLabel(alignment: number): { text: string; tone: 'good' | 'mixed' | 'bad' } {
  if (alignment >= 0.5) return { text: 'Fits voters', tone: 'good' };
  if (alignment > 0) return { text: 'Mixed', tone: 'mixed' };
  return { text: 'Against voters', tone: 'bad' };
}

/** Coarse arrows for low Policy skill; exact points for high (DESIGN §6.1). */
export function effectLabel(delta: number, precise: boolean): string {
  if (precise) {
    const n = Math.round(delta * 1000) / 10;
    return n > 0 ? `+${n}` : `${n}`;
  }
  if (Math.abs(delta) < 0.003) return '·';
  const arrows = Math.abs(delta) >= 0.03 ? 2 : 1;
  return (delta > 0 ? '▲' : '▼').repeat(arrows);
}

export const PRECISE_PREVIEW_POLICY = 5;
