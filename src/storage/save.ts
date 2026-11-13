import { SCHEMA_VERSION } from '../engine/run';
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

/** Returns the saved run, or null if there is none or it is from an incompatible version. */
export function loadGame(): GameState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const file = JSON.parse(raw) as Partial<SaveFile>;
    if (file.schemaVersion !== SCHEMA_VERSION || !file.state) return null;
    return file.state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
