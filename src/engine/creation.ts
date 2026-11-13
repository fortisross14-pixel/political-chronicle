import { getBackground, REGIONS_BY_ID } from '../data';
import type { NewRunConfig } from './run';
import type { Gender, Politician, RegionId, SkillId, Skills } from './types';

export const SKILL_IDS: SkillId[] = ['oratory', 'charisma', 'media', 'digital', 'policy', 'negotiation', 'fundraising'];

export const SKILL_LABELS: Record<SkillId, string> = {
  oratory: 'Oratory',
  charisma: 'Charisma',
  media: 'Media Savvy',
  digital: 'Digital',
  policy: 'Policy',
  negotiation: 'Negotiation',
  fundraising: 'Fundraising',
};

export const SKILL_HINTS: Record<SkillId, string> = {
  oratory: 'Rallies, speeches, debate delivery',
  charisma: 'Town halls, door-knocking, retail politics',
  media: 'TV & cable interviews; fewer gaffes',
  digital: 'Social campaigns, podcasts, viral reach',
  policy: 'Debates, credibility, previews decision effects',
  negotiation: 'Party standing, endorsements, deals',
  fundraising: 'Donor income, fundraising events',
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
  birthRegionId: RegionId;
  backgroundId: string;
  /** Points the player spends on top of base + background. */
  allocation: Partial<Record<SkillId, number>>;
}

/** 10 + 1 per full 5 years over 25 (DESIGN §3.1). */
export function skillPointsForAge(age: number): number {
  return 10 + Math.floor((Math.max(MIN_AGE, age) - MIN_AGE) / 5);
}

/** Starting funds: background base, +2.5% per year over 25 (savings & contacts). */
export function startingFundsFor(backgroundId: string, age: number): number {
  const base = getBackground(backgroundId).baseFunds;
  return Math.round((base * (1 + (Math.max(MIN_AGE, age) - MIN_AGE) * 0.025)) / 1000) * 1000;
}

/** Skills before the player's allocation: base 1 + background bonus. */
export function preAllocationSkills(backgroundId: string): Skills {
  const bonus = getBackground(backgroundId).skillBonus;
  return Object.fromEntries(SKILL_IDS.map((id) => [id, BASE_SKILL + (bonus[id] ?? 0)])) as Skills;
}

export function pointsSpent(allocation: CreationInput['allocation']): number {
  return SKILL_IDS.reduce((sum, id) => sum + (allocation[id] ?? 0), 0);
}

export function finalSkills(input: Pick<CreationInput, 'backgroundId' | 'allocation'>): Skills {
  const base = preAllocationSkills(input.backgroundId);
  return Object.fromEntries(SKILL_IDS.map((id) => [id, base[id] + (input.allocation[id] ?? 0)])) as Skills;
}

/** Empty array means the character is valid. */
export function creationErrors(input: CreationInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Enter a name.');
  if (!Number.isInteger(input.age) || input.age < MIN_AGE || input.age > MAX_AGE) {
    errors.push(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);
  }
  if (!REGIONS_BY_ID[input.birthRegionId]) errors.push('Choose a birthplace.');
  try {
    getBackground(input.backgroundId);
  } catch {
    errors.push('Choose a background.');
    return errors;
  }
  if (SKILL_IDS.some((id) => (input.allocation[id] ?? 0) < 0 || !Number.isInteger(input.allocation[id] ?? 0))) {
    errors.push('Skill points must be whole, non-negative numbers.');
  }
  const total = skillPointsForAge(input.age);
  const spent = pointsSpent(input.allocation);
  if (spent > total) errors.push(`You spent ${spent - total} more skill point(s) than you have.`);
  if (spent < total) errors.push(`Spend your remaining ${total - spent} skill point(s).`);
  const skills = finalSkills(input);
  const over = SKILL_IDS.filter((id) => skills[id] > CREATION_SKILL_CAP);
  if (over.length) errors.push(`Skills are capped at ${CREATION_SKILL_CAP} at creation (${over.map((id) => SKILL_LABELS[id]).join(', ')}).`);
  return errors;
}

export function buildPolitician(input: CreationInput): Politician {
  return {
    name: input.name.trim(),
    gender: input.gender,
    startAge: input.age,
    birthRegionId: input.birthRegionId,
    backgroundId: input.backgroundId,
    skills: finalSkills(input),
  };
}

export function buildRunConfig(input: CreationInput, seed: string): NewRunConfig {
  const errors = creationErrors(input);
  if (errors.length) throw new Error(`Invalid character: ${errors.join(' ')}`);
  return { seed, politician: buildPolitician(input), startingFunds: startingFundsFor(input.backgroundId, input.age) };
}

/**
 * Deals points round-robin, strongest background skills first, respecting the cap, so the
 * background's strengths survive. Used for the creator's "auto-assign" button and default.
 */
export function autoAllocate(backgroundId: string, age: number): Partial<Record<SkillId, number>> {
  const skills = preAllocationSkills(backgroundId);
  const order = [...SKILL_IDS].sort((a, b) => skills[b] - skills[a]);
  const allocation: Partial<Record<SkillId, number>> = {};
  let left = skillPointsForAge(age);
  while (left > 0) {
    const open = order.filter((id) => skills[id] < CREATION_SKILL_CAP);
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
