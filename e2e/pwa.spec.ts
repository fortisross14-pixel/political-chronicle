import { expect, test } from '@playwright/test';
import { seed } from './helpers';

test('the app installs a service worker, has a manifest and reloads offline', async ({ page, context }) => {
  await seed(page, {});
  await page.goto('/');
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return href ? ((await (await fetch(href)).json()) as { name: string; icons: unknown[] }) : null;
  });
  expect(manifest?.name).toBe('Political Chronicle');
  expect(manifest?.icons.length).toBeGreaterThanOrEqual(3);

  // Wait until the worker controls the page and has precached the build.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: /Political/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Scenarios/ })).toBeVisible();
  await context.setOffline(false);
});
