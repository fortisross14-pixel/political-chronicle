// Political events (DESIGN_V2 §3b): a hand of up to 5 cards you play for their effect —
// mostly in office (approval), some anywhere (recognition, money, training).
import { reject } from './errors';
import { getOffice, getPolicyCard, getRegion, STATES } from '../data';
import { SKILL_LABELS } from './creation';
import { skillCap } from './economy';
import { nudgeApproval } from './governing';
import { clamp, nudgeFavorability, nudgeRecognition } from './opinion';
import { adjustStanding } from './parties';
import { ROLE_EFFECT, roleStars } from './people';
import type { GameState, RegionId } from './types';

/** The regions a political event lands in: your office, your race, or your home city. */
export function policyJurisdiction(state: GameState): RegionId[] {
  const id = state.career.office?.officeId ?? state.career.race?.officeId;
  return id ? getOffice(id).regionIds : [state.politician.residentRegionId];
}

/** Chief of staff makes political events land harder. */
export function policyMultiplier(state: GameState): number {
  return 1 + ROLE_EFFECT.policyPerStar * roleStars(state, 'chiefOfStaff');
}

export function policyError(state: GameState, uid: number, regionId?: RegionId): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.packs.length) return 'Open your pack first.';
  const inst = state.policyHand.find((c) => c.uid === uid);
  if (!inst) return 'You don’t hold that card.';
  const card = getPolicyCard(inst.cardId);
  if (card.energy > state.energy) return 'Not enough energy this turn.';
  if (card.needsOffice && !state.career.office) return 'Only while you hold office.';
  if (card.needsParty && state.career.affiliation === 'IND') return 'Party members only.';
  if (card.effect.skill && state.politician.skills[card.effect.skill] >= skillCap(state))
    return `Skill capped at ${skillCap(state)} at your current office.`;
  if (card.targetsRegion && (!regionId || !policyJurisdiction(state).includes(regionId))) return 'Pick a region you govern.';
  return undefined;
}

export function playPolicy(state: GameState, uid: number, regionId?: RegionId): GameState {
  reject(policyError(state, uid, regionId));
  const inst = state.policyHand.find((c) => c.uid === uid)!;
  const card = getPolicyCard(inst.cardId);
  const e = card.effect;
  const m = policyMultiplier(state);
  const home = policyJurisdiction(state);
  const reach = e.statewide ? STATES[getRegion(state.politician.residentRegionId).state]!.regionIds : home;

  const regions = { ...state.regions };
  for (const id of reach) {
    const r = regions[id]!;
    regions[id] = {
      recognition: e.recognition ? nudgeRecognition(r.recognition, e.recognition * m) : r.recognition,
      favorability: e.favorability ? nudgeFavorability(r.favorability, e.favorability * m) : r.favorability,
    };
  }
  let career = state.career;
  const office = career.office;
  if (office && (e.approval || e.regionApproval)) {
    const approval = { ...office.approval };
    for (const id of Object.keys(approval)) {
      if (e.approval) approval[id] = nudgeApproval(approval[id]!, e.approval * m);
      if (e.regionApproval && id === regionId) approval[id] = nudgeApproval(approval[id]!, e.regionApproval * m);
    }
    career = { ...career, office: { ...office, approval } };
  }
  const skills = e.skill ? { ...state.politician.skills, [e.skill]: state.politician.skills[e.skill] + 1 } : state.politician.skills;
  const next: GameState = {
    ...state,
    regions,
    career,
    politician: { ...state.politician, skills },
    funds: state.funds + (e.funds ?? 0),
    integrity: clamp(state.integrity + (e.integrity ?? 0), 0, 100),
    energy: state.energy - card.energy,
    policyHand: state.policyHand.filter((c) => c.uid !== uid),
    log: [
      ...state.log,
      {
        year: state.clock.year,
        turn: state.clock.turn,
        text: `${card.name}${e.skill ? `: ${SKILL_LABELS[e.skill]} is now ${skills[e.skill]}` : ''}${regionId && card.targetsRegion ? ` in ${getRegion(regionId).seatCity}` : ''}.`,
      },
    ],
  };
  return e.standing ? adjustStanding(next, e.standing * m) : next;
}
