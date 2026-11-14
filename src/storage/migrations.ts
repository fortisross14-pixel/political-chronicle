// Save migrations: each step upgrades a raw save from version N to N + 1. Saves are plain JSON,
// so steps work on loosely typed objects and only touch what changed in that version.
import {
  DEFAULT_MODIFIERS,
  initWorld,
  positionOf,
  rollChambers,
  Rng,
  seedFromString,
  SCHEMA_VERSION,
  stanceAt,
  wealthRange,
} from '../engine';

type Raw = Record<string, unknown> & { [key: string]: unknown };

/** The oldest save format we can still read: v6 (M7) introduced the current skills and traits. */
export const OLDEST_MIGRATABLE = 6;

const STEPS: Record<number, (s: Raw) => Raw> = {
  // v6 → v7 (M8): people cards replace paid staff; legislatures appear.
  6: (s) => {
    const { staff: _staff, ...rest } = s;
    const clock = s.clock as { year: number };
    const lastIncome = s.lastIncome as { donors: number; salary: number; party?: number } | undefined;
    return {
      ...rest,
      team: { cards: [], assigned: {}, nextUid: 1 },
      chambers: rollChambers(new Rng(seedFromString(`${String(s.runId)}:chambers`)), clock.year),
      ...(lastIncome ? { lastIncome: { donors: lastIncome.donors, salary: lastIncome.salary, party: lastIncome.party ?? 0 } } : {}),
    };
  },
  // v7 → v8 (M9): loot, items and election night. Free drafts were removed.
  7: (s) => {
    const { draft: _draft, ...rest } = s;
    const career = s.career as Raw;
    const race = career.race as Raw | undefined;
    return {
      ...rest,
      items: [],
      nextItemUid: 1,
      career: race ? { ...career, race: { tokens: 2, milestones: [], doorKnocks: 0, raisedThisTurn: 0, ...race } } : career,
    };
  },
  // v8 → v9 (M10): run modifiers, start year and artifacts.
  8: (s) => {
    const snapshots = s.snapshots as { year: number }[];
    const clock = s.clock as { year: number };
    return { ...s, modifiers: { ...DEFAULT_MODIFIERS }, startYear: snapshots[0]?.year ?? clock.year, artifacts: [] };
  },
  // v9 → v10 (gameplay rework): personal wealth, packs instead of the Market, political events,
  // the world, a 7-step platform scale. An auto-filed re-election without a platform is
  // withdrawn: you launch it yourself now.
  9: (s) => {
    const { market: _market, ...rest } = s;
    type P = { issue: string; stance: number };
    const onScale = (list: P[] | undefined) => list?.map((p) => ({ ...p, stance: stanceAt(positionOf(p.stance)) }));
    const career = s.career as Raw & { race?: Raw & { platform: P[] }; office?: Raw & { platform: P[]; officeId: string } };
    const { race, office, ...careerRest } = career;
    const keptRace = race && race.platform.length ? { ...race, platform: onScale(race.platform) } : undefined;
    const keptOffice = office ? { ...office, platform: onScale(office.platform) } : undefined;
    const platform = keptRace?.platform ?? keptOffice?.platform;
    const politician = s.politician as { backgroundId: string; startAge: number; name: string };
    const range = wealthRange(politician.backgroundId, politician.startAge);
    const clock = s.clock as { year: number };
    const world = initWorld(new Rng(seedFromString(`${String(s.runId)}:world`)), clock.year);
    if (office)
      world.seats[office.officeId] = {
        holder: politician.name,
        affiliation: career.affiliation as 'DU' | 'RP' | 'IND',
        since: clock.year,
        isPlayer: true,
      };
    return {
      ...rest,
      wealth: Math.round(Math.sqrt(range.min * range.max) / 1000) * 1000,
      policyHand: [],
      packs: [],
      world,
      career: {
        ...careerRest,
        ...(keptRace ? { race: keptRace } : {}),
        ...(keptOffice ? { office: keptOffice } : {}),
        ...(platform ? { platform } : {}),
      },
    };
  },
};

export type MigrationResult = { ok: true; state: Raw; from: number } | { ok: false; reason: string };

/** Upgrades a raw save to the current schema, one version at a time. */
export function migrate(raw: Raw, version: number): MigrationResult {
  if (version > SCHEMA_VERSION) return { ok: false, reason: 'This save comes from a newer version of the game.' };
  if (version < OLDEST_MIGRATABLE)
    return { ok: false, reason: 'This save is from before the current skills and traits (M7) and can’t be upgraded.' };
  let state = raw;
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = STEPS[v];
    if (!step) return { ok: false, reason: `No upgrade path from save version ${v}.` };
    state = step(state);
  }
  return { ok: true, state: { ...state, schemaVersion: SCHEMA_VERSION }, from: version };
}

/** Every version between the oldest readable one and the current one must have a step. */
export function migrationsComplete(): boolean {
  for (let v = OLDEST_MIGRATABLE; v < SCHEMA_VERSION; v++) if (!STEPS[v]) return false;
  return true;
}
