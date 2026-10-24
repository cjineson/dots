import { expect, test } from '@playwright/test';

test('dashboard loads and opens Settings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  await page.getByText('Settings', { exact: true }).first().click();
  await expect(page.getByText('Export', { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});
