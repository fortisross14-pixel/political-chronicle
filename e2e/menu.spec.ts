import { expect, test } from '@playwright/test';
import { launchedState, seed, veteranProfile } from './helpers';

test('Sandbox is locked for new players and opens after the beginner track', async ({ page }) => {
  await seed(page, {});
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Sandbox/ })).toBeDisabled();
});

test('a veteran builds a Sandbox politician with a loadout and the run saves across a reload', async ({ page }) => {
  await seed(page, { profile: veteranProfile() });
  await page.goto('/');
  await page.getByRole('button', { name: /^Sandbox/ }).click();
  await page.getByPlaceholder(/Sam Ortega/).fill('Jo Park');
  await page.getByRole('button', { name: 'Start career' }).click();
  await page.locator('.loadout-card', { hasText: 'War chest' }).click();
  await page.locator('.loadout-card', { hasText: 'Rapid-response pager' }).click();
  await page.getByRole('button', { name: 'Start career' }).click();
  await expect(page.locator('.who strong')).toHaveText('Jo Park');
  await page.reload();
  await expect(page.getByRole('button', { name: /Continue — Jo Park/ })).toBeVisible();
});

test('a second run goes in its own slot; both survive a reload', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await seed(page, { state: launchedState('slot-1'), profile: veteranProfile() });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Continue — Night Owl/ })).toBeVisible();
  await page.getByRole('button', { name: /^Sandbox/ }).click();
  await page.getByPlaceholder(/Sam Ortega/).fill('Jo Park');
  await page.getByRole('button', { name: 'Start career' }).click();
  await page.getByRole('button', { name: 'Start career' }).click();
  await expect(page.locator('.who strong')).toHaveText('Jo Park');
  await page.reload();
  await expect(page.getByRole('button', { name: /Continue — Night Owl/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue — Jo Park/ })).toBeVisible();
});
