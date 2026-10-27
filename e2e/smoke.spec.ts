import { expect, test } from '@playwright/test';

test('dashboard loads and opens Settings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Settings' })).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: 'Open Settings' }).click();
  await expect(page.getByText('Export', { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});
