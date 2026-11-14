import { SCHEMA_VERSION } from '../engine/run';
import { migrate } from './migrations';
import type { GameState } from '../engine/types';

export const SAVE_KEY = 'political-chronicle.currentRun';

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

export function saveGame(state: GameState): boolean {
  const store = storage();
  if (!store) return false;
  const file: SaveFile = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export type LoadResult = { state: GameState; migratedFrom?: number } | { state: null; reason?: string };

/** Keys every playable save must have after migration; a save missing any is treated as corrupt. */
const REQUIRED_KEYS: (keyof GameState)[] = [
  'clock',
  'politician',
  'career',
  'regions',
  'team',
  'chambers',
  'items',
  'modifiers',
  'snapshots',
];

/** Loads the saved run, upgrading older save formats. `reason` explains a save that can't be loaded. */
export function loadGameResult(): LoadResult {
  const store = storage();
  if (!store) return { state: null };
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return { state: null };
    const file = JSON.parse(raw) as Partial<SaveFile>;
    if (!file.state || typeof file.schemaVersion !== 'number') return { state: null, reason: 'The saved game is unreadable.' };
    const result = migrate(file.state as unknown as Record<string, unknown>, file.schemaVersion);
    if (!result.ok) return { state: null, reason: result.reason };
    const state = result.state as unknown as GameState;
    if (REQUIRED_KEYS.some((k) => state[k] === undefined)) return { state: null, reason: 'The saved game is incomplete.' };
    return result.from === SCHEMA_VERSION ? { state } : { state, migratedFrom: result.from };
  } catch {
    return { state: null, reason: 'The saved game is unreadable.' };
  }
}

/** Returns the saved run (upgraded if needed), or null. */
export function loadGame(): GameState | null {
  return loadGameResult().state;
}

export function clearSave(): void {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
