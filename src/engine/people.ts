// People cards: bought once in the Market, then assigned to a role, kept in reserve, or discarded (DESIGN_V2 §3).
import { getOffice, getPerson, PEOPLE, RARITY_WEIGHT } from '../data';
import type { PersonPerk } from '../data';
import type { Rng } from './rng';
import type { GameState, RoleId, Skills } from './types';

export const ROSTER_LIMIT = 6;
export const SKILL_HARD_CAP = 10;
export const ROLES: RoleId[] = ['campaignManager', 'chiefOfStaff', 'partyLiaison', 'legislativeDirector'];

export function emptyTeam(): GameState['team'] {
  return { cards: [], assigned: {}, nextUid: 1 };
}

/** Is this role doing anything right now? */
export function roleActive(state: GameState, role: RoleId): boolean {
  const office = state.career.office ? getOffice(state.career.office.officeId) : undefined;
  switch (role) {
    case 'campaignManager':
      return !!state.career.race;
    case 'chiefOfStaff':
      return !!office;
    case 'partyLiaison':
      return !!office && state.career.affiliation !== 'IND';
    case 'legislativeDirector':
      return !!office && office.level !== 'mayor';
  }
}

function activePeople(state: GameState) {
  return ROLES.filter((r) => state.team.assigned[r] !== undefined && roleActive(state, r)).map((r) => {
    const card = state.team.cards.find((c) => c.uid === state.team.assigned[r])!;
    return getPerson(card.personId);
  });
}

/** Your skills plus boosts from people in active roles (up to 10). */
export function effectiveSkills(state: GameState): Skills {
  const skills = { ...state.politician.skills };
  for (const person of activePeople(state)) {
    for (const [id, v] of Object.entries(person.boosts) as [keyof Skills, number][]) skills[id] = Math.min(SKILL_HARD_CAP, skills[id] + v);
  }
  return skills;
}

export function hasPerk(state: GameState, perk: PersonPerk): boolean {
  return activePeople(state).some((p) => p.perk === perk);
}

// ---------- Getting people ----------

/** A person you don't hold yet, weighted by rarity, or undefined if you hold everyone. */
export function rollPerson(state: GameState, rng: Rng, exclude: string[] = []): string | undefined {
  const owned = new Set([...state.team.cards.map((c) => c.personId), ...exclude]);
  const pool = PEOPLE.filter((p) => !owned.has(p.id));
  if (!pool.length) return undefined;
  let roll = rng.float() * pool.reduce((s, p) => s + RARITY_WEIGHT[p.rarity], 0);
  return (pool.find((p) => (roll -= RARITY_WEIGHT[p.rarity]) <= 0) ?? pool.at(-1)!).id;
}

export function rosterFull(state: GameState): boolean {
  return state.team.cards.length >= ROSTER_LIMIT;
}

/** Adds someone to the team; they fill their role right away if it's empty, otherwise go to reserve. */
export function acquirePerson(state: GameState, personId: string): GameState {
  const person = getPerson(personId);
  const uid = state.team.nextUid;
  const assigned = { ...state.team.assigned };
  if (assigned[person.role] === undefined) assigned[person.role] = uid;
  return { ...state, team: { cards: [...state.team.cards, { uid, personId }], assigned, nextUid: uid + 1 } };
}

export function assignPerson(state: GameState, uid: number): GameState {
  const card = state.team.cards.find((c) => c.uid === uid);
  if (!card) throw new Error('Not on your team.');
  const role = getPerson(card.personId).role;
  return { ...state, team: { ...state.team, assigned: { ...state.team.assigned, [role]: uid } } };
}

export function unassignRole(state: GameState, role: RoleId): GameState {
  const assigned = { ...state.team.assigned };
  delete assigned[role];
  return { ...state, team: { ...state.team, assigned } };
}

/** Gone for good. */
export function discardPerson(state: GameState, uid: number): GameState {
  const card = state.team.cards.find((c) => c.uid === uid);
  if (!card) throw new Error('Not on your team.');
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

/** Add a specific person (scenario setups, background perks). */
export function grantPerson(state: GameState, personId: string, assign = true): GameState {
  const uid = state.team.nextUid;
  const role = getPerson(personId).role;
  const assigned = assign && state.team.assigned[role] === undefined ? { ...state.team.assigned, [role]: uid } : state.team.assigned;
  return { ...state, team: { cards: [...state.team.cards, { uid, personId }], assigned, nextUid: uid + 1 } };
}
