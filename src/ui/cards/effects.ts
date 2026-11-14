// Plain-language summaries of what a card does, shown on the card face.
import { getEventCard, getItem, getPolicyCard, ISSUES_BY_ID, REGIONS } from '../../data';
import type { EventCard, RegionType } from '../../engine';

const TYPE_LABEL: Record<RegionType, string> = { urban: 'cities', suburban: 'suburbs', midsize: 'towns', rural: 'rural' };

/** 1–5 pips for a value against the strongest card's. */
function pips(v: number, max: number): string {
  return '●'.repeat(Math.max(1, Math.min(5, Math.round((v / max) * 5))));
}

/** Where this kind of media lands best: region types whose multiplier is at least 1.15. */
export function bestIn(card: EventCard): string[] {
  const byType = new Map<RegionType, number[]>();
  for (const r of REGIONS) byType.set(r.type, [...(byType.get(r.type) ?? []), r.media[card.medium]]);
  return [...byType]
    .map(([t, v]) => [t, v.reduce((a, b) => a + b, 0) / v.length] as const)
    .filter(([, m]) => m >= 1.15)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => TYPE_LABEL[t]);
}

export interface Chip {
  text: string;
  tone?: 'pos' | 'neg' | 'gold';
}

export function actionChips(id: string): Chip[] {
  const c = getEventCard(id);
  const chips: Chip[] = [];
  if (c.reach > 0) chips.push({ text: `Reach ${pips(c.reach, 0.24)}` });
  if (c.persuasion > 0) chips.push({ text: `Persuade ${pips(c.persuasion, 0.18)}` });
  const best = bestIn(c);
  if (best.length) chips.push({ text: `Best in ${best.join(', ')}`, tone: 'pos' });
  if (c.spillover >= 0.5) chips.push({ text: 'Statewide' });
  if (c.issueBonus?.length) chips.push({ text: c.issueBonus.map((i) => ISSUES_BY_ID[i]!.name).join(', '), tone: 'gold' });
  if (c.fundraising) chips.push({ text: 'Raises money', tone: 'gold' });
  if (c.partyStanding) chips.push({ text: 'Party standing', tone: 'pos' });
  if (c.gaffeRisk) chips.push({ text: 'Gaffe risk', tone: 'neg' });
  return chips;
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;

export function policyChips(id: string): Chip[] {
  const e = getPolicyCard(id).effect;
  const chips: Chip[] = [];
  if (e.approval) chips.push({ text: `Approval ${pct(e.approval)}`, tone: e.approval > 0 ? 'pos' : 'neg' });
  if (e.regionApproval) chips.push({ text: `Approval ${pct(e.regionApproval)}, one region`, tone: 'pos' });
  if (e.favorability) chips.push({ text: `Liked ${pct(e.favorability)}`, tone: e.favorability > 0 ? 'pos' : 'neg' });
  if (e.recognition) chips.push({ text: `Known ${pct(e.recognition)}`, tone: 'pos' });
  if (e.statewide) chips.push({ text: 'Statewide' });
  if (e.funds)
    chips.push({ text: `${e.funds > 0 ? '+' : '−'}$${Math.round(Math.abs(e.funds) / 1000)}k`, tone: e.funds > 0 ? 'gold' : 'neg' });
  if (e.standing) chips.push({ text: `Party ${e.standing > 0 ? '+' : ''}${e.standing}`, tone: e.standing > 0 ? 'pos' : 'neg' });
  if (e.integrity) chips.push({ text: `Integrity ${e.integrity > 0 ? '+' : ''}${e.integrity}`, tone: e.integrity > 0 ? 'pos' : 'neg' });
  return chips;
}

export function itemChips(id: string): Chip[] {
  const item = getItem(id);
  const when = item.window === 'night' ? 'Election night' : item.window === 'both' ? 'Campaign or night' : 'Campaign';
  return [{ text: when, tone: 'gold' }, ...(item.targetsRegion ? [{ text: 'Pick a region' }] : [])];
}
