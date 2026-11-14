import { SCHEMA_VERSION } from '../engine/run';
import { migrate } from './migrations';
import type { GameState } from '../engine/types';

/** Slot 1 keeps the original key, so saves from before slots existed load as slot 1. */
export const SAVE_KEY = 'political-chronicle.currentRun';

/** How many runs can be in progress at once. */
export const SLOT_COUNT = 3;

export function slotKey(slot: number): string {
  return slot === 0 ? SAVE_KEY : `${SAVE_KEY}.${slot + 1}`;
}

interface SaveFile {
  schemaVersion: number;
  savedAt: string;
  state: GameState;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, slot = 0): boolean {
  const store = storage();
  if (!store) return false;
  const file: SaveFile = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
  try {
    store.setItem(slotKey(slot), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export type LoadResult = { state: GameState; migratedFrom?: number; savedAt?: string } | { state: null; reason?: string };

/** Keys every playable save must have after migration; a save missing any is treated as corrupt. */
const REQUIRED_KEYS: (keyof GameState)[] = [
  'clock',
  'politician',
  'career',
  'regions',
  'team',
  'chambers',
  'items',
  'wealth',
  'packs',
  'world',
  'modifiers',
  'snapshots',
];

/** Loads the saved run, upgrading older save formats. `reason` explains a save that can't be loaded. */
export function loadGameResult(slot = 0): LoadResult {
  const store = storage();
  if (!store) return { state: null };
  try {
    const raw = store.getItem(slotKey(slot));
    if (!raw) return { state: null };
    const file = JSON.parse(raw) as Partial<SaveFile>;
    if (!file.state || typeof file.schemaVersion !== 'number') return { state: null, reason: 'The saved game is unreadable.' };
    const result = migrate(file.state as unknown as Record<string, unknown>, file.schemaVersion);
    if (!result.ok) return { state: null, reason: result.reason };
    const state = result.state as unknown as GameState;
    if (REQUIRED_KEYS.some((k) => state[k] === undefined)) return { state: null, reason: 'The saved game is incomplete.' };
    const savedAt = typeof file.savedAt === 'string' ? file.savedAt : undefined;
    return result.from === SCHEMA_VERSION ? { state, savedAt } : { state, migratedFrom: result.from, savedAt };
  } catch {
    return { state: null, reason: 'The saved game is unreadable.' };
  }
}

/** Returns the saved run (upgraded if needed), or null. */
export function loadGame(slot = 0): GameState | null {
  return loadGameResult(slot).state;
}

/** Every slot, in order. */
export function loadAllSlots(): LoadResult[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => loadGameResult(i));
}

export function clearSave(slot = 0): void {
  try {
    storage()?.removeItem(slotKey(slot));
  } catch {
    // ignore
  }
}
