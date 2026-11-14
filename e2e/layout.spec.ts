import { expect, test } from '@playwright/test';
import { nightState, noHorizontalScroll, seed, veteranProfile } from './helpers';

test('menu, game and election night never scroll sideways', async ({ page }) => {
  await seed(page, { state: nightState(), profile: veteranProfile() });
  await page.goto('/');
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.locator('.live')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.getByRole('button', { name: 'Skip to the end' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(await noHorizontalScroll(page)).toBe(true);
});
