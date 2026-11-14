// Player preferences for feedback. Stored per device; a blocked localStorage just means defaults.
import { useSyncExternalStore } from 'react';

export interface FxSettings {
  sound: boolean;
  haptics: boolean;
}

const KEY = 'political-chronicle.fx';
const DEFAULTS: FxSettings = { sound: true, haptics: true };
const listeners = new Set<() => void>();

function read(): FxSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FxSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current = typeof localStorage === 'undefined' ? DEFAULTS : read();

export function fxSettings(): FxSettings {
  return current;
}

export function setFxSettings(next: Partial<FxSettings>): void {
  current = { ...current, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Settings still apply for this session.
  }
  for (const l of listeners) l();
}

export function useFxSettings(): FxSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => DEFAULTS,
  );
}
