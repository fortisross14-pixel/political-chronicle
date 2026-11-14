import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { launchedState, seed } from './helpers';

/** Drags from a point near the top of `from` (clear of the dock) to `to`, in small steps. */
async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const box = (await from.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + Math.min(60, box.height / 2) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(start.x + ((to.x - start.x) * i) / steps, start.y + ((to.y - start.y) * i) / steps);
  }
  await page.mouse.up();
}

test('on a phone, decisions are swiped and cards are dragged onto a region', async ({ page }) => {
  const s = launchedState();
  await seed(page, { state: s });
  await page.goto('/');
  await page.getByRole('button', { name: /Continue/ }).click();

  // Swipe the top decision to the right: it is backed and the next card comes up.
  const top = page.locator('.swipe-card');
  await top.scrollIntoViewIfNeeded();
  const box = (await top.boundingBox())!;
  await drag(page, top, { x: box.x + box.width / 2 + 220, y: box.y + 60 });
  await expect(page.locator('.dot.yes')).toHaveCount(1);
  await page.getByRole('button', { name: /^Confirm 1 stance/ }).click();

  // Drag Door-knocking onto the Mill Street chip.
  await page.getByRole('button', { name: /^Campaign/ }).click();
  const energy = Number((await page.locator('.stat', { hasText: 'Energy' }).locator('.count').innerText()).trim());
  const chip = page.locator('.region-chip', { hasText: 'Mill Street' });
  await chip.scrollIntoViewIfNeeded();
  const target = (await chip.boundingBox())!;
  await drag(page, page.locator('.hand-fan .gcard', { hasText: 'Door-knocking' }), {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  });
  await expect(page.locator('.stat', { hasText: 'Energy' }).locator('.count')).toHaveText(String(energy - 2));
  await expect(page.locator('.region-chip.active')).toContainText('Mill Street');
});
