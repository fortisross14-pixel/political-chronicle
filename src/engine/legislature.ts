// Legislatures: bills you sign or back as Governor, House member or Senator must pass (DESIGN_V2 §4).
import { getOffice, getRegion, STATES } from '../data';
import { clamp } from './opinion';
import { effectiveSkills, hasPerk } from './people';
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

/** Rolls control of every legislature for the new cycle; state lean tilts the odds. */
export function rollChambers(rng: Rng, year: number): Chambers {
  const state: Record<StateId, ChamberControl> = {};
  for (const s of Object.values(STATES)) {
    const lean = s.regionIds.reduce((sum, id) => sum + getRegion(id).partisanLean * getRegion(id).population, 0) / s.regionIds.reduce((sum, id) => sum + getRegion(id).population, 0);
    const pBlue = clamp(0.45 - lean * 0.9, 0.1, 0.85);
    const pSplit = 0.2;
    const r = rng.float();
    state[s.id] = r < pBlue ? 'DU' : r < pBlue + pSplit ? 'split' : 'RP';
  }
  const r = rng.float();
  const congress: ChamberControl = r < 0.4 ? 'DU' : r < 0.6 ? 'split' : 'RP';
  return { state, congress, rolledYear: year };
}

/** The chamber your bills must get through, if any (mayors' city councils are abstracted away). */
export function yourChamber(state: GameState): { name: string; control: ChamberControl } | undefined {
  const office = state.career.office ? getOffice(state.career.office.officeId) : undefined;
  if (!office || office.level === 'mayor') return undefined;
  if (office.level === 'governor') return { name: `the ${STATES[office.state]!.name} Legislature`, control: state.chambers.state[office.state] ?? 'split' };
  return { name: 'Congress', control: state.chambers.congress };
}

/** Chance an applied card actually passes. Cards with no policy tags (crises, ethics) always do. */
export function passageChance(state: GameState, card: DecisionCard): number {
  const chamber = yourChamber(state);
  if (!chamber || card.context !== 'office' || card.tags.length === 0) return 1;
  const skills = effectiveSkills(state);
  const party = state.career.affiliation;
  const own = party !== 'IND' && chamber.control === party;
  const base = party === 'IND' ? PASSAGE.independent : own ? PASSAGE.ownControl : chamber.control === 'split' ? PASSAGE.split : PASSAGE.opposing;
  const persuasion = own ? 0 : PASSAGE.perDiplomacy * skills.diplomacy + (hasPerk(state, 'acrossTheAisle') ? PASSAGE.acrossTheAisle : 0);
  return clamp(base + PASSAGE.perLaw * skills.law + persuasion, PASSAGE.min, PASSAGE.max);
}

export function rollPassage(state: GameState, card: DecisionCard, rng: Rng): boolean {
  const chance = passageChance(state, card);
  return chance >= 1 || rng.float() < chance;
}
