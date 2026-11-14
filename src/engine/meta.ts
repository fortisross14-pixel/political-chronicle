// Meta-progression across runs: stars, unlocks, artifacts, abilities, and the Hall of Runs
// (DESIGN_V2 §8). Pure functions over a Profile; storage lives in src/storage/profile.ts.
import { getOffice, getScenario, SCENARIOS } from '../data';
import type { Scenario } from '../data';
import type { GameState, OfficeLevel } from './types';

export interface ScenarioProgress {
  /** Best set of star ids reached. */
  stars: string[];
  completions: number;
  attempts: number;
}

export interface RunSummary {
  runId: string;
  name: string;
  backgroundId: string;
  homeState: string;
  residentRegionId: string;
  mode: 'sandbox' | 'scenario';
  scenarioId?: string;
  scenarioWon?: boolean;
  stars?: number;
  startYear: number;
  endYear: number;
  highestOffice?: string;
  officesHeld: string[];
  electionsWon: number;
  electionsLost: number;
  promisesKept: number;
  promisesBroken: number;
  peakApproval: number;
  legacy: number;
  /** One point per turn: average approval in office (or poll while running), and funds. */
  series: { approval: number[]; funds: number[]; recognition: number[] };
  finishedAt: string;
}

export interface Profile {
  version: 1;
  scenarios: Record<string, ScenarioProgress>;
  artifacts: string[];
  abilities: string[];
  runs: RunSummary[];
}

export const MAX_RUNS_KEPT = 50;

export function emptyProfile(): Profile {
  return { version: 1, scenarios: {}, artifacts: [], abilities: [], runs: [] };
}

export function beginnerScenarios(): Scenario[] {
  return SCENARIOS.filter((s) => s.track === 'beginner').sort((a, b) => a.order - b.order);
}

export function scenarioStars(profile: Profile, id: string): number {
  return profile.scenarios[id]?.stars.length ?? 0;
}

/** The first beginner scenario is open; each next one needs a star on the previous. */
export function scenarioUnlocked(profile: Profile, id: string): boolean {
  const scenario = getScenario(id);
  if (scenario.track !== 'beginner') return sandboxUnlocked(profile);
  const prev = beginnerScenarios().find((s) => s.order === scenario.order - 1);
  return !prev || scenarioStars(profile, prev.id) > 0;
}

/** Sandbox opens once every beginner scenario has at least one star. */
export function sandboxUnlocked(profile: Profile): boolean {
  return beginnerScenarios().every((s) => scenarioStars(profile, s.id) > 0);
}

export function totalStars(profile: Profile): number {
  return Object.values(profile.scenarios).reduce((s, p) => s + p.stars.length, 0);
}

/** 2 artifact slots to start, +1 at 6 stars, +1 at 10. */
export function artifactSlots(profile: Profile): number {
  const stars = totalStars(profile);
  return 2 + (stars >= 6 ? 1 : 0) + (stars >= 10 ? 1 : 0);
}

const OFFICE_POINTS: Record<OfficeLevel, number> = { mayor: 10, house: 20, senate: 35, governor: 40 };
const LADDER: Record<OfficeLevel, number> = { mayor: 0, house: 1, senate: 2, governor: 3 };

/** Years in each office, from the turn snapshots (a 4-month turn is a third of a year). */
function yearsInOffice(state: GameState): Record<string, number> {
  const years: Record<string, number> = {};
  for (const snap of state.snapshots) if (snap.officeId) years[snap.officeId] = (years[snap.officeId] ?? 0) + 1 / snap.turnsThisYear;
  return years;
}

/** Legacy score: office points × years served, plus promises kept and peak approval (DESIGN v1 §11). */
export function legacyScore(state: GameState): number {
  let score = 0;
  for (const [officeId, years] of Object.entries(yearsInOffice(state))) score += OFFICE_POINTS[getOffice(officeId).level] * years;
  const kept = state.promises.filter((p) => p.kept).length;
  const total = state.promises.length;
  if (total) score += 20 * (kept / total);
  score += 20 * Math.max(0, ...state.snapshots.map((s) => s.approval ?? 0));
  score += 5 * state.elections.filter((e) => e.kind === 'general' && e.playerWon).length;
  return Math.round(score);
}

export function buildRunSummary(state: GameState): RunSummary {
  const generals = state.elections.filter((e) => e.kind === 'general');
  // Offices served, plus any won on the final Election Day (a scenario can end before you take office).
  const offices = [
    ...new Set([
      ...state.snapshots.map((s) => s.officeId).filter((o): o is string => !!o),
      ...generals.filter((e) => e.playerWon).map((e) => e.officeId),
    ]),
  ];
  const highest = offices.sort((a, b) => LADDER[getOffice(b).level] - LADDER[getOffice(a).level])[0];
  const result = state.scenario?.result;
  return {
    runId: state.runId,
    name: state.politician.name,
    backgroundId: state.politician.backgroundId,
    homeState: state.politician.homeState,
    residentRegionId: state.politician.residentRegionId,
    mode: state.scenario ? 'scenario' : 'sandbox',
    scenarioId: state.scenario?.id,
    scenarioWon: result?.won,
    stars: result?.stars.length,
    startYear: state.startYear,
    // A run that ends as a new year starts really ended in the year before.
    endYear: Math.max(state.startYear, state.clock.turn === 0 ? state.clock.year - 1 : state.clock.year),
    highestOffice: highest,
    officesHeld: offices,
    electionsWon: generals.filter((e) => e.playerWon).length,
    electionsLost: generals.filter((e) => !e.playerWon).length,
    promisesKept: state.promises.filter((p) => p.kept).length,
    promisesBroken: state.promises.filter((p) => !p.kept).length,
    peakApproval: Math.max(0, ...state.snapshots.map((s) => s.approval ?? 0)),
    legacy: legacyScore(state),
    series: {
      approval: state.snapshots.map((s) => s.approval ?? s.poll ?? 0),
      funds: state.snapshots.map((s) => s.funds),
      recognition: state.snapshots.map((s) => {
        const values = Object.values(s.regions);
        return values.reduce((a, r) => a + r.recognition, 0) / Math.max(1, values.length);
      }),
    },
    finishedAt: new Date().toISOString(),
  };
}

export interface RecordOutcome {
  profile: Profile;
  /** Rewards newly earned by this run. */
  newArtifacts: string[];
  newAbilities: string[];
  newStars: string[];
  unlockedSandbox: boolean;
}

/** Files a finished run: Hall of Runs, best stars, and any rewards for newly reached star counts. */
export function recordRun(profile: Profile, state: GameState): RecordOutcome {
  const summary = buildRunSummary(state);
  const already = profile.runs.some((r) => r.runId === summary.runId);
  const out: RecordOutcome = { profile, newArtifacts: [], newAbilities: [], newStars: [], unlockedSandbox: false };
  if (already) return out;
  const wasSandbox = sandboxUnlocked(profile);
  let next: Profile = { ...profile, runs: [summary, ...profile.runs].slice(0, MAX_RUNS_KEPT) };
  const result = state.scenario?.result;
  if (state.scenario && result) {
    const scenario = getScenario(state.scenario.id);
    const prev = profile.scenarios[scenario.id] ?? { stars: [], completions: 0, attempts: 0 };
    const best = [...new Set([...prev.stars, ...result.stars])];
    out.newStars = best.filter((s) => !prev.stars.includes(s));
    // Rewards are tied to how many stars you hold: reaching 1, 2 or 3 for the first time pays out.
    for (let n = prev.stars.length + 1; n <= best.length; n++) {
      const reward = scenario.rewards[n - 1];
      for (const a of reward?.artifacts ?? []) if (!next.artifacts.includes(a)) out.newArtifacts.push(a);
      for (const a of reward?.abilities ?? []) if (!next.abilities.includes(a)) out.newAbilities.push(a);
    }
    next = {
      ...next,
      artifacts: [...next.artifacts, ...out.newArtifacts],
      abilities: [...next.abilities, ...out.newAbilities],
      scenarios: {
        ...next.scenarios,
        [scenario.id]: { stars: best, completions: prev.completions + (result.won ? 1 : 0), attempts: prev.attempts + 1 },
      },
    };
  }
  out.unlockedSandbox = !wasSandbox && sandboxUnlocked(next);
  return { ...out, profile: next };
}

export function loadoutError(profile: Profile, artifacts: string[], abilities: string[]): string | undefined {
  if (artifacts.length > artifactSlots(profile)) return `You have ${artifactSlots(profile)} artifact slots.`;
  if (artifacts.some((a) => !profile.artifacts.includes(a))) return 'You don’t own that artifact.';
  if (abilities.length > 2) return 'At most 2 abilities.';
  if (abilities.some((a) => !profile.abilities.includes(a))) return 'You haven’t earned that ability.';
  return undefined;
}
