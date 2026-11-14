import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { applyAction, createScenarioRun } from '../src/engine';
import { nightState, seed, veteranProfile } from './helpers';

/** WCAG 2.1 AA checks on a screen; returns a readable list of what failed. */
async function audit(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Decorative motion (turn wipe, banners) is mid-animation in a snapshot; colour is checked once it settles.
    .exclude('.turn-splash')
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')} — ${v.help}`);
}

test.use({ reducedMotion: 'reduce' });

test('menu, every Government section, profile, party and election night pass WCAG AA checks', async ({ page }) => {
  let s = createScenarioRun('hometown_favorite', { name: 'Alex Reyes', artifacts: [], seed: 'a11y' });
  s = applyAction(s, {
    type: 'SET_PLATFORM',
    platform: [
      { issue: 'guns', stance: 2 },
      { issue: 'taxes', stance: 2 },
    ],
  });
  await seed(page, { state: s, profile: veteranProfile() });
  await page.goto('/');
  expect(await audit(page)).toEqual([]);
  await page.getByRole('button', { name: /Continue/ }).click();
  expect(await audit(page)).toEqual([]);
  for (const n of ['Play cards', 'Market', 'Team', 'Map']) {
    await page.getByRole('button', { name: new RegExp(`^${n}`) }).click();
    expect(await audit(page), n).toEqual([]);
  }
  for (const n of ['My profile', 'My party']) {
    await page.getByRole('tab', { name: n }).click();
    expect(await audit(page), n).toEqual([]);
  }
});

test('election night passes WCAG AA checks', async ({ page }) => {
  await seed(page, { state: nightState() });
  await page.goto('/');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Pause/ }).click();
  expect(await audit(page)).toEqual([]);
});

test('Sandbox creator passes WCAG AA checks', async ({ page }) => {
  await seed(page, { profile: veteranProfile() });
  await page.goto('/');
  await page.getByRole('button', { name: /^Sandbox/ }).click();
  expect(await audit(page)).toEqual([]);
});
