import { expect, test } from '@playwright/test';
import { nightState, seed } from './helpers';

test('a scenario plays from the menu: starter pack, launch, campaign, results and the Hall of Runs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await seed(page, {});
  await page.goto('/');
  await page.getByRole('button', { name: /^Scenarios/ }).click();
  await page.getByRole('button', { name: /Hometown favorite/ }).click();
  await page.getByPlaceholder(/Sam Ortega/).fill('Casey Moran');
  await page.getByRole('button', { name: 'Start scenario' }).click();

  // The free people pack: keep all three.
  await page.getByRole('button', { name: /^Keep 3 cards/ }).click();
  await expect(page.locator('.scenario-hud h2')).toHaveText(/Mayor of Watertown/);

  // Launch the Watertown race: topics on the 7-step sliders, then launch.
  await page
    .locator('.race-slot.open', { hasText: 'Mayor of Watertown' })
    .getByRole('button', { name: /^Launch/ })
    .click();
  await page.getByRole('button', { name: /Campaign topics/ }).click();
  for (const label of ['Strongly: Protect gun rights', 'Strongly: Cut taxes broadly']) {
    await page.getByRole('radio', { name: label, exact: true }).first().click();
  }
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Launch the campaign' }).click();
  // Two free launch packs: keep one card from each.
  for (let i = 0; i < 2; i++) {
    await page.locator('.pack-overlay .gcard').first().click();
    await page.getByRole('button', { name: /^Keep this card/ }).click();
  }

  for (let t = 0; t < 7; t++) {
    await page.locator('.decision-card button').first().click();
    await page.getByRole('button', { name: /^Confirm/ }).click();
    await page.getByRole('button', { name: 'End turn' }).click();
  }
  await expect(page.locator('.night-head h2')).toContainText('Election night');
  await page.getByRole('button', { name: 'Skip to the end' }).click();
  await expect(page.locator('.result h2')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.results-hero h1')).toHaveText(/Mission (accomplished|failed)/);
  await page.getByRole('button', { name: 'Back to menu' }).click();
  await page.getByRole('button', { name: /^Hall of Runs/ }).click();
  await expect(page.locator('table.hall tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('election night streams results, takes actions and ends on the result', async ({ page }) => {
  await seed(page, { state: nightState() });
  await page.goto('/');
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.locator('.live')).toBeVisible();
  await page.getByRole('button', { name: /Pause/ }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  const tokens = Number(await page.locator('.tokens .big-number').innerText());
  await page
    .getByRole('button', { name: /^Mobilize/ })
    .first()
    .click();
  await expect(page.locator('.tokens .big-number')).toHaveText(String(tokens - 1));
  await page.getByRole('button', { name: 'Skip to the end' }).click();
  await expect(page.locator('.result h2')).toBeVisible();
});
