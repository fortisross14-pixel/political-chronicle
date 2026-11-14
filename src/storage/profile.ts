import { emptyProfile } from '../engine/meta';
import type { Profile } from '../engine/meta';

export const PROFILE_KEY = 'political-chronicle.profile';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Meta-progression lives apart from the current run, so finishing or abandoning a run never loses it. */
export function loadProfile(): Profile {
  try {
    const raw = storage()?.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw) as Partial<Profile>;
    if (p.version !== 1) return emptyProfile();
    return { ...emptyProfile(), ...p } as Profile;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): boolean {
  try {
    storage()?.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
