import type { Page } from '@playwright/test';
import { applyAction, createScenarioRun, SCHEMA_VERSION } from '../src/engine';
import type { GameState } from '../src/engine';
import { emptyProfile } from '../src/engine/meta';
import { launch, skipPacks } from '../src/engine/testUtils';
import type { Profile } from '../src/engine/meta';

export const SAVE_KEY = 'political-chronicle.currentRun';
export const PROFILE_KEY = 'political-chronicle.profile';

/** Puts a save (and optionally a profile) in localStorage before the app loads. */
export async function seed(page: Page, opts: { state?: GameState; profile?: Profile }) {
  await page.addInitScript(
    ([save, profile, saveKey, profileKey]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      if (save) localStorage.setItem(saveKey, save);
      if (profile) localStorage.setItem(profileKey, profile);
      sessionStorage.setItem('seeded', '1');
    },
    [
      opts.state ? JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state: opts.state }) : '',
      opts.profile ? JSON.stringify(opts.profile) : '',
      SAVE_KEY,
      PROFILE_KEY,
    ] as const,
  );
}

/** A profile with a star on every beginner scenario (Sandbox unlocked) and some loot. */
export function veteranProfile(): Profile {
  const p = emptyProfile();
  for (const id of ['hometown_favorite', 'keep_your_word', 'pick_a_side', 'big_city_small_town']) {
    p.scenarios[id] = { stars: ['win'], completions: 1, attempts: 1 };
  }
  return { ...p, artifacts: ['war_chest', 'lucky_tie'], abilities: ['rapid_response'] };
}

/** Hometown favorite with the Watertown campaign launched (packs set aside), ready to play. */
export function launchedState(seed = 'e2e'): GameState {
  const s = createScenarioRun('hometown_favorite', { name: 'Night Owl', artifacts: [], seed });
  return launch(skipPacks(s), [
    { issue: 'guns', stance: 2 },
    { issue: 'taxes', stance: 2 },
  ]);
}

/** Hometown favorite, played to the start of election night (the night is left open). */
export function nightState(): GameState {
  let s = launchedState('e2e-night');
  for (let i = 0; i < 10 && !s.night; i++) {
    s = skipPacks(s);
    if (s.decisions && !s.decisions.resolved) s = applyAction(s, { type: 'RESOLVE_DECISIONS', apply: [s.decisions.cardIds[0]!] });
    s = applyAction(s, { type: 'END_TURN' });
  }
  return s;
}

/** The page must never scroll sideways. */
export async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
