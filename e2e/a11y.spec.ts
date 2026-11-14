import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { launchedState, nightState, seed, veteranProfile } from './helpers';

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
  const s = launchedState();
  await seed(page, { state: s, profile: veteranProfile() });
  await page.goto('/');
  expect(await audit(page)).toEqual([]);
  await page.getByRole('button', { name: /Continue/ }).click();
  expect(await audit(page)).toEqual([]);
  for (const n of ['Campaign', 'Packs', 'Team', 'Map']) {
    await page.getByRole('button', { name: new RegExp(`^${n}`) }).click();
    expect(await audit(page), n).toEqual([]);
  }
  for (const n of ['My profile', 'My party', 'World']) {
    await page.getByRole('tab', { name: n }).click();
    expect(await audit(page), n).toEqual([]);
  }
});

test('election night passes WCAG AA checks', async ({ page }) => {
  await seed(page, { state: nightState() });
  await page.goto('/');
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.locator('.exit-polls')).toBeVisible();
  expect(await audit(page), 'exit polls').toEqual([]);
  await page.getByRole('button', { name: 'Start the count' }).click();
  await page.getByRole('button', { name: /Pause/ }).click();
  expect(await audit(page)).toEqual([]);
});

test('Sandbox creator passes WCAG AA checks', async ({ page }) => {
  await seed(page, { profile: veteranProfile() });
  await page.goto('/');
  await page.getByRole('button', { name: /^Sandbox/ }).click();
  expect(await audit(page)).toEqual([]);
});

test('the starter pack, the launch screen and the topic sliders pass WCAG AA checks', async ({ page }) => {
  await seed(page, {});
  await page.goto('/');
  await page.getByRole('button', { name: /^Missions/ }).click();
  await page.getByRole('button', { name: /Hometown favorite/ }).click();
  await page.getByPlaceholder(/Sam Ortega/).fill('Casey Moran');
  await page.getByRole('button', { name: 'Start mission' }).click();
  await expect(page.locator('.pack-overlay')).toBeVisible();
  expect(await audit(page), 'pack').toEqual([]);
  await page.getByRole('button', { name: /^Keep (\d cards|this card)/ }).click();
  await page.getByRole('button', { name: /^Launch a campaign/ }).click();
  await page
    .locator('.race-slot.open', { hasText: 'Mayor of Watertown' })
    .getByRole('button', { name: /^Launch/ })
    .click();
  expect(await audit(page), 'launch').toEqual([]);
  await page.getByRole('button', { name: /Campaign topics/ }).click();
  expect(await audit(page), 'topics').toEqual([]);
});
