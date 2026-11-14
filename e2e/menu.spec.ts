import { expect, test } from '@playwright/test';
import { seed, veteranProfile } from './helpers';

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
  await page.locator('.loadout-card', { hasText: 'Rapid response' }).click();
  await page.getByRole('button', { name: 'Start career' }).click();
  await expect(page.locator('.who strong')).toHaveText('Jo Park');
  await page.reload();
  await expect(page.getByRole('button', { name: /Continue — Jo Park/ })).toBeVisible();
});
