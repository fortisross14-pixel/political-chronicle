// People cards: free cards you assign to a role, keep in reserve, or discard (DESIGN_V2 §3).
import { getOffice, getPerson, PEOPLE, RARITY_WEIGHT } from '../data';
import type { PersonPerk } from '../data';
import type { Rng } from './rng';
import type { GameState, RoleId, Skills } from './types';

export const ROSTER_LIMIT = 6;
export const DRAFT_SIZE = 3;
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

// ---------- Draft ----------

/** Offer a pick of 3 people you don't already have, weighted by rarity. Replaces any pending draft. */
export function dealDraft(state: GameState, rng: Rng, reason: string): GameState {
  const owned = new Set(state.team.cards.map((c) => c.personId));
  let pool = PEOPLE.filter((p) => !owned.has(p.id));
  const options: string[] = [];
  while (options.length < DRAFT_SIZE && pool.length) {
    let roll = rng.float() * pool.reduce((s, p) => s + RARITY_WEIGHT[p.rarity], 0);
    const pick = pool.find((p) => (roll -= RARITY_WEIGHT[p.rarity]) <= 0) ?? pool.at(-1)!;
    options.push(pick.id);
    pool = pool.filter((p) => p.id !== pick.id);
  }
  return options.length ? { ...state, draft: { options, reason } } : state;
}

export function pickError(state: GameState, index: number): string | undefined {
  if (!state.draft?.options[index]) return 'Nothing to pick.';
  if (state.team.cards.length >= ROSTER_LIMIT) return `Your team is full (${ROSTER_LIMIT}). Discard someone first.`;
  return undefined;
}

/** Take a person; they fill their role right away if it's empty, otherwise go to reserve. */
export function pickPerson(state: GameState, index: number): GameState {
  const error = pickError(state, index);
  if (error) throw new Error(error);
  const person = getPerson(state.draft!.options[index]!);
  const uid = state.team.nextUid;
  const assigned = { ...state.team.assigned };
  if (assigned[person.role] === undefined) assigned[person.role] = uid;
  return {
    ...state,
    draft: undefined,
    team: { cards: [...state.team.cards, { uid, personId: person.id }], assigned, nextUid: uid + 1 },
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text: `${person.name} joined your team.` }],
  };
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
    log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text: `${getPerson(card.personId).name} left your team for good.` }],
  };
}

/** Add a specific person (scenario setups, background perks). */
export function grantPerson(state: GameState, personId: string, assign = true): GameState {
  const uid = state.team.nextUid;
  const role = getPerson(personId).role;
  const assigned = assign && state.team.assigned[role] === undefined ? { ...state.team.assigned, [role]: uid } : state.team.assigned;
  return { ...state, team: { cards: [...state.team.cards, { uid, personId }], assigned, nextUid: uid + 1 } };
}
