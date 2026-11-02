import { test, expect } from '@playwright/test';

test('Three Inspect only loads when explicitly requested', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#center')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-knotty-inspector', 'ready');

  await page.goto('/?editor=1');
  await expect(page.locator('html')).toHaveAttribute('data-knotty-inspector', 'ready', { timeout: 30000 });
  await expect(page.locator('#center')).toBeVisible();
  expect(errors).toEqual([]);
});
