// Legislatures: bills you sign or back as Governor, House member or Senator must pass (DESIGN_V2 §4).
import { getOffice, getRegion, OFFICES, STATES } from '../data';
import { clamp, regionAlignment } from './opinion';
import { effectiveSkills, hasPerk, ROLE_EFFECT, roleStars } from './people';
import type { Rng } from './rng';
import type { ChamberControl, Chambers, DecisionCard, GameState, StateId } from './types';

export const PASSAGE = {
  ownControl: 0.85,
  split: 0.6,
  opposing: 0.35,
  /** Independents never control anything; everyone has to be persuaded. */
  independent: 0.5,
  perLaw: 0.03,
  /** Diplomacy only matters when it's not your chamber. */
  perDiplomacy: 0.03,
  acrossTheAisle: 0.1,
  min: 0.1,
  max: 0.97,
};

/** City councils are less partisan than legislatures: a mayor's bills pass more often, but not always. */
export const COUNCIL = {
  ownControl: 0.9,
  split: 0.75,
  opposing: 0.55,
  independent: 0.7,
  /** A bill the city loves is hard to vote down: added per unit of the bill's fit with the city. */
  popularity: 0.15,
};

/** Population-weighted lean of a set of areas. */
function leanOf(regionIds: string[]): number {
  const pop = regionIds.reduce((s, id) => s + getRegion(id).population, 0);
  return regionIds.reduce((s, id) => s + getRegion(id).partisanLean * getRegion(id).population, 0) / pop;
}

function rollControl(rng: Rng, lean: number): ChamberControl {
  const pBlue = clamp(0.45 - lean * 0.9, 0.1, 0.85);
  const r = rng.float();
  return r < pBlue ? 'DU' : r < pBlue + 0.2 ? 'split' : 'RP';
}

/** Rolls control of every legislature for the new cycle; state lean tilts the odds. */
export function rollChambers(rng: Rng, year: number): Chambers {
  const state: Record<StateId, ChamberControl> = {};
  for (const s of Object.values(STATES)) state[s.id] = rollControl(rng, leanOf(s.regionIds));
  const r = rng.float();
  const congress: ChamberControl = r < 0.4 ? 'DU' : r < 0.6 ? 'split' : 'RP';
  const councils: Record<string, ChamberControl> = {};
  for (const o of OFFICES.filter((x) => x.level === 'mayor')) councils[o.id] = rollControl(rng, leanOf(o.regionIds));
  return { state, congress, councils, rolledYear: year };
}

/** The chamber your bills must get through, if any. */
export function yourChamber(state: GameState): { name: string; control: ChamberControl; council?: boolean } | undefined {
  const office = state.career.office ? getOffice(state.career.office.officeId) : undefined;
  if (!office) return undefined;
  if (office.level === 'mayor') {
    const control =
      state.chambers.councils?.[office.id] ?? (leanOf(office.regionIds) > 0.15 ? 'RP' : leanOf(office.regionIds) < -0.15 ? 'DU' : 'split');
    return { name: `the ${office.name.replace('Mayor of ', '')} City Council`, control, council: true };
  }
  if (office.level === 'governor')
    return { name: `the ${STATES[office.state]!.name} Legislature`, control: state.chambers.state[office.state] ?? 'split' };
  return { name: 'Congress', control: state.chambers.congress };
}

/** Chance an applied card actually passes. Cards with no policy tags (crises, ethics) always do. */
export function passageChance(state: GameState, card: DecisionCard): number {
  const chamber = yourChamber(state);
  if (!chamber || card.context !== 'office' || card.tags.length === 0) return 1;
  if (state.career.office?.forceVote) return 1;
  const skills = effectiveSkills(state);
  const party = state.career.affiliation;
  const own = party !== 'IND' && chamber.control === party;
  const t = chamber.council ? COUNCIL : PASSAGE;
  let base = party === 'IND' ? t.independent : own ? t.ownControl : chamber.control === 'split' ? t.split : t.opposing;
  if (chamber.council) base += COUNCIL.popularity * cityFit(state, card);
  const persuasion = own ? 0 : PASSAGE.perDiplomacy * skills.diplomacy + (hasPerk(state, 'acrossTheAisle') ? PASSAGE.acrossTheAisle : 0);
  const director = ROLE_EFFECT.passagePerStar * roleStars(state, 'legislativeDirector');
  return clamp(base + PASSAGE.perLaw * skills.law + persuasion + director, PASSAGE.min, PASSAGE.max);
}

/** How the city feels about a bill: population-weighted fit of its tags, about −1..1. */
function cityFit(state: GameState, card: DecisionCard): number {
  const office = getOffice(state.career.office!.officeId);
  const pop = office.regionIds.reduce((s, id) => s + getRegion(id).population, 0);
  let fit = 0;
  for (const id of office.regionIds) {
    const r = getRegion(id);
    for (const tag of card.tags) fit += (r.population / pop) * r.issueSalience[tag.issue] * regionAlignment(id, tag.issue, tag.stance);
  }
  return clamp(fit, -1, 1);
}

export function rollPassage(state: GameState, card: DecisionCard, rng: Rng): boolean {
  const chance = passageChance(state, card);
  return chance >= 1 || rng.float() < chance;
}
