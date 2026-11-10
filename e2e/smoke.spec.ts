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

test('song editor inserts a tab at the selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add song', exact: true }).click();
  const input = page.getByLabel('Edit text cue');
  await input.fill('ABCD');
  await input.press('Home');
  await input.press('ArrowRight');
  await input.press('Shift+ArrowRight');
  await input.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Insert tab at cursor' }).click();
  await expect(input).toHaveValue('A\tD');
  await expect(input).toBeFocused();
  await input.press('X');
  await expect(input).toHaveValue('A\tXD');
  await input.press('Tab');
  await expect(input).not.toBeFocused();

  await page.getByRole('button', { name: 'Add table', exact: true }).click();
  const cell = page.getByLabel('Edit table cell 1, 2');
  await cell.fill('EF');
  await cell.press('Home');
  await cell.press('ArrowRight');
  await page.getByRole('button', { name: 'Insert tab at cursor' }).last().click();
  await expect(cell).toHaveValue('E\tF');
  await expect(cell).toBeFocused();
});
