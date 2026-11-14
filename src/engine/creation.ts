import { GameError } from './errors';
import { getBackground, getRegion, REGIONS_BY_ID, US_STATE_NAMES } from '../data';
import type { NewRunConfig } from './run';
import type { Gender, Politician, RegionId, SkillId, Skills } from './types';

export const SKILL_IDS: SkillId[] = ['charisma', 'economics', 'diplomacy', 'strategy', 'administration', 'leadership', 'law'];

export const SKILL_LABELS: Record<SkillId, string> = {
  charisma: 'Charisma',
  economics: 'Economics',
  diplomacy: 'Diplomacy',
  strategy: 'Strategy',
  administration: 'Administration',
  leadership: 'Leadership',
  law: 'Law & Policy',
};

export const SKILL_CODES: Record<SkillId, string> = {
  charisma: 'CHA',
  economics: 'ECO',
  diplomacy: 'DIP',
  strategy: 'STR',
  administration: 'ADM',
  leadership: 'LEA',
  law: 'LAW',
};

export const SKILL_HINTS: Record<SkillId, string> = {
  charisma: 'Speeches, debates, interviews, crowds — every campaign event; fewer gaffes',
  economics: 'Donors and fundraising; budget and tax bills land better',
  diplomacy: 'Deals across party lines; softens penalties from your party',
  strategy: 'Exact previews (5+), opponent intel, a 4th decision card (7+)',
  administration: 'In office: slower approval wear, bills land harder',
  leadership: 'Party standing gains, crises, keeping your team together',
  law: 'Credibility on policy; bill passage in legislatures',
};

export const MIN_AGE = 25;
export const MAX_AGE = 65;
export const BASE_SKILL = 1;
/** No skill may exceed this at creation (base + background + allocated). */
export const CREATION_SKILL_CAP = 5;

export interface CreationInput {
  name: string;
  gender: Gender;
  age: number;
  /** USPS code of the birth state (any of 50). */
  homeState: string;
  /** Your city: a region of a playable state. */
  residentRegionId: RegionId;
  backgroundId: string;
  /** Points the player spends on top of base + background. */
  allocation: Partial<Record<SkillId, number>>;
}

/** 10 + 1 per full 5 years over 25. */
export function skillPointsForAge(age: number): number {
  return 10 + Math.floor((Math.max(MIN_AGE, age) - MIN_AGE) / 5);
}

/** Starting funds: background base, +2.5% per year over 25 (savings & contacts). */
export function startingFundsFor(backgroundId: string, age: number): number {
  const base = getBackground(backgroundId).baseFunds;
  return Math.round((base * (1 + (Math.max(MIN_AGE, age) - MIN_AGE) * 0.025)) / 1000) * 1000;
}

/** A background's weakness can cap a skill below the general creation cap. */
export function creationCap(backgroundId: string, skill: SkillId): number {
  return Math.min(CREATION_SKILL_CAP, getBackground(backgroundId).creationCaps?.[skill] ?? CREATION_SKILL_CAP);
}

/** Skills before the player's allocation: base 1 + background's fixed points. */
export function preAllocationSkills(backgroundId: string): Skills {
  const bonus = getBackground(backgroundId).skillBonus;
  return Object.fromEntries(SKILL_IDS.map((id) => [id, BASE_SKILL + (bonus[id] ?? 0)])) as Skills;
}

/** Points you can actually place: your age allowance, limited by the background's caps. */
export function spendablePoints(backgroundId: string, age: number): number {
  const base = preAllocationSkills(backgroundId);
  const room = SKILL_IDS.reduce((sum, id) => sum + Math.max(0, creationCap(backgroundId, id) - base[id]), 0);
  return Math.min(skillPointsForAge(age), room);
}

export function pointsSpent(allocation: CreationInput['allocation']): number {
  return SKILL_IDS.reduce((sum, id) => sum + (allocation[id] ?? 0), 0);
}

export function finalSkills(input: Pick<CreationInput, 'backgroundId' | 'allocation'>): Skills {
  const base = preAllocationSkills(input.backgroundId);
  return Object.fromEntries(SKILL_IDS.map((id) => [id, base[id] + (input.allocation[id] ?? 0)])) as Skills;
}

/** Same state for birth and residence: a native. */
export function isNative(politician: Pick<Politician, 'homeState' | 'residentRegionId'>): boolean {
  return politician.homeState === getRegion(politician.residentRegionId).state;
}

/** Empty array means the character is valid. */
export function creationErrors(input: CreationInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Enter a name.');
  if (!Number.isInteger(input.age) || input.age < MIN_AGE || input.age > MAX_AGE) {
    errors.push(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);
  }
  if (!US_STATE_NAMES[input.homeState]) errors.push('Choose a home state.');
  if (!REGIONS_BY_ID[input.residentRegionId]) errors.push('Choose where you live.');
  try {
    getBackground(input.backgroundId);
  } catch {
    errors.push('Choose a background.');
    return errors;
  }
  if (SKILL_IDS.some((id) => (input.allocation[id] ?? 0) < 0 || !Number.isInteger(input.allocation[id] ?? 0))) {
    errors.push('Skill points must be whole, non-negative numbers.');
  }
  // Points that can't be placed (every open skill already at its cap) are simply lost.
  const total = spendablePoints(input.backgroundId, input.age);
  const spent = pointsSpent(input.allocation);
  if (spent > total) errors.push(`You spent ${spent - total} more skill point(s) than you have.`);
  if (spent < total) errors.push(`Spend your remaining ${total - spent} skill point(s).`);
  const skills = finalSkills(input);
  const over = SKILL_IDS.filter((id) => skills[id] > creationCap(input.backgroundId, id));
  if (over.length)
    errors.push(
      `Over the cap at creation: ${over.map((id) => `${SKILL_LABELS[id]} (max ${creationCap(input.backgroundId, id)})`).join(', ')}.`,
    );
  return errors;
}

export function buildPolitician(input: CreationInput): Politician {
  return {
    name: input.name.trim(),
    gender: input.gender,
    startAge: input.age,
    homeState: input.homeState,
    residentRegionId: input.residentRegionId,
    backgroundId: input.backgroundId,
    skills: finalSkills(input),
  };
}

export function buildRunConfig(input: CreationInput, seed: string): NewRunConfig {
  const errors = creationErrors(input);
  if (errors.length) throw new GameError(`Invalid character: ${errors.join(' ')}`, 'invalid_character');
  return { seed, politician: buildPolitician(input), startingFunds: startingFundsFor(input.backgroundId, input.age) };
}

/**
 * Deals points round-robin, strongest background skills first, respecting caps, so the
 * background's strengths survive. Used for the creator's "auto-assign" button and default.
 */
export function autoAllocate(backgroundId: string, age: number): Partial<Record<SkillId, number>> {
  const skills = preAllocationSkills(backgroundId);
  const order = [...SKILL_IDS].sort((a, b) => skills[b] - skills[a]);
  const allocation: Partial<Record<SkillId, number>> = {};
  let left = skillPointsForAge(age);
  while (left > 0) {
    const open = order.filter((id) => skills[id] < creationCap(backgroundId, id));
    if (!open.length) break;
    for (const id of open) {
      if (left === 0) break;
      skills[id] += 1;
      allocation[id] = (allocation[id] ?? 0) + 1;
      left--;
    }
  }
  return allocation;
}
