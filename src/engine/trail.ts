// The campaign trail (DESIGN_V2 §16): every area's numbers at the start of each turn, for the map's
// "this turn" comparisons and the chart under it. Kept for the current race (and the current term)
// only: a new campaign or a new term starts a new trail.
import { getOffice } from '../data';
import { poll } from './opinion';
import { turnLabel } from './time';
import type { AreaPoint, GameState, TrailPoint } from './types';

/** Every area of the race (or the office) as it stands right now. */
export function areaPoints(state: GameState, officeId: string, withPoll: boolean): Record<string, AreaPoint> {
  const race = state.career.race;
  const shares = withPoll && race?.platform.length ? poll(state, race).regions : {};
  const approval = state.career.office?.officeId === officeId ? state.career.office.approval : undefined;
  const out: Record<string, AreaPoint> = {};
  for (const id of getOffice(officeId).regionIds) {
    const r = state.regions[id]!;
    out[id] = {
      rec: r.recognition,
      fav: r.favorability,
      ...(shares[id] ? { shares: shares[id] } : {}),
      ...(approval?.[id] !== undefined ? { approval: approval[id] } : {}),
    };
  }
  return out;
}

export function trailPoint(state: GameState, officeId: string, withPoll: boolean): TrailPoint {
  return { label: turnLabel(state.clock), areas: areaPoints(state, officeId, withPoll) };
}

/** Adds this turn's starting point to the race's and the term's trails. */
export function extendTrails(state: GameState): GameState {
  const { race, office } = state.career;
  let career = state.career;
  if (race?.platform.length)
    career = { ...career, race: { ...race, trail: [...(race.trail ?? []), trailPoint(state, race.officeId, true)] } };
  if (office) career = { ...career, office: { ...office, trail: [...(office.trail ?? []), trailPoint(state, office.officeId, false)] } };
  return career === state.career ? state : { ...state, career };
}
