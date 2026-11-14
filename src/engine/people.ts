// People cards (DESIGN_V2 §3): pulled from packs, up to 10 on the roster. Anyone can fill any of
// the four roles; how well they do it is their star rating (0–5) for that role.
import { GameError } from './errors';
import { getPerson } from '../data';
import type { PersonPerk } from '../data';
import type { GameState, RoleId, Skills } from './types';

export const ROSTER_LIMIT = 10;
export const SKILL_HARD_CAP = 10;
export const ROLES: RoleId[] = ['campaignManager', 'chiefOfStaff', 'partyLiaison', 'legislativeDirector'];

/** What one star is worth in each role. */
export const ROLE_EFFECT = {
  /** Campaign actions ×(1 + this × stars). */
  campaignPerStar: 0.06,
  /** Election-night tokens: +1 per this many stars. */
  starsPerToken: 2,
  /** Approval wear ×(1 − this × stars), floor 0.5. */
  wearPerStar: 0.08,
  /** Political events ×(1 + this × stars). */
  policyPerStar: 0.06,
  /** Party standing gains ×(1 + this × stars); losses ×(1 − this × stars). */
  standingPerStar: 0.06,
  /** Chance a party accepts you: + this × stars. */
  joinPerStar: 0.04,
  /** Bill passage: + this × stars. */
  passagePerStar: 0.04,
};

export function emptyTeam(): GameState['team'] {
  return { cards: [], assigned: {}, nextUid: 1 };
}

/** Is this role doing anything right now? */
export function roleActive(state: GameState, role: RoleId): boolean {
  switch (role) {
    case 'campaignManager':
      return !!state.career.race;
    case 'chiefOfStaff':
    case 'legislativeDirector':
      return !!state.career.office;
    case 'partyLiaison':
      // Works for members, and for independents trying to get into a party.
      return true;
  }
}

/** Stars of whoever holds `role`, if the role is active (0 when empty or idle). */
export function roleStars(state: GameState, role: RoleId): number {
  if (!roleActive(state, role)) return 0;
  const uid = state.team.assigned[role];
  const card = uid !== undefined ? state.team.cards.find((c) => c.uid === uid) : undefined;
  return card ? getPerson(card.personId).stars[role] : 0;
}

function activePeople(state: GameState) {
  return ROLES.filter((r) => state.team.assigned[r] !== undefined && roleActive(state, r)).map((r) => {
    const card = state.team.cards.find((c) => c.uid === state.team.assigned[r])!;
    return getPerson(card.personId);
  });
}

/** People no longer boost skills directly (their roles do the work); kept as the one place skills are read. */
export function effectiveSkills(state: GameState): Skills {
  return { ...state.politician.skills };
}

export function hasPerk(state: GameState, perk: PersonPerk): boolean {
  return activePeople(state).some((p) => p.perk === perk);
}

export function rosterFull(state: GameState): boolean {
  return state.team.cards.length >= ROSTER_LIMIT;
}

/** The role a person holds, if any. */
export function roleOf(state: GameState, uid: number): RoleId | undefined {
  return ROLES.find((r) => state.team.assigned[r] === uid);
}

/** Adds someone to the roster, unassigned. */
export function acquirePerson(state: GameState, personId: string): GameState {
  if (rosterFull(state)) throw new GameError(`Your roster is full (${ROSTER_LIMIT}).`);
  const uid = state.team.nextUid;
  return { ...state, team: { ...state.team, cards: [...state.team.cards, { uid, personId }], nextUid: uid + 1 } };
}

/** Puts a person in a role; whoever held it goes back to the bench, and the person leaves any other role. */
export function assignPerson(state: GameState, uid: number, role: RoleId): GameState {
  if (!state.team.cards.some((c) => c.uid === uid)) throw new GameError('Not on your team.');
  const assigned = Object.fromEntries(Object.entries(state.team.assigned).filter(([, v]) => v !== uid)) as GameState['team']['assigned'];
  assigned[role] = uid;
  return { ...state, team: { ...state.team, assigned } };
}

export function unassignRole(state: GameState, role: RoleId): GameState {
  const assigned = { ...state.team.assigned };
  delete assigned[role];
  return { ...state, team: { ...state.team, assigned } };
}

/** Gone for good. */
export function discardPerson(state: GameState, uid: number): GameState {
  const card = state.team.cards.find((c) => c.uid === uid);
  if (!card) throw new GameError('Not on your team.');
  const assigned = Object.fromEntries(Object.entries(state.team.assigned).filter(([, v]) => v !== uid));
  return {
    ...state,
    team: { ...state.team, cards: state.team.cards.filter((c) => c.uid !== uid), assigned },
    log: [
      ...state.log,
      { year: state.clock.year, turn: state.clock.turn, text: `${getPerson(card.personId).name} left your team for good.` },
    ],
  };
}

/** Add a specific person (scenario setups, background perks), optionally straight into a role. */
export function grantPerson(state: GameState, personId: string, role?: RoleId): GameState {
  const uid = state.team.nextUid;
  const assigned = role && state.team.assigned[role] === undefined ? { ...state.team.assigned, [role]: uid } : state.team.assigned;
  return { ...state, team: { cards: [...state.team.cards, { uid, personId }], assigned, nextUid: uid + 1 } };
}
