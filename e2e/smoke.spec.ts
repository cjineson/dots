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

test('snapshot import previews and merges a changed song', async ({ page }) => {
  const snapshot = (title: string) => ({
    format: 'dots-library-snapshot', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
    groups: [{ id: 'group', name: 'Band', order_index: 0 }],
    setlists: ['First', 'Second'].map((name, order_index) => ({
      id: name, name, order_index, group_id: 'group', location: null, latitude: null, longitude: null,
      notes: null, date: null, time: null, items: [
        { kind: 'song', id: 'song-1', sort_order: 0 },
        ...(order_index === 0 ? [{ kind: 'break', id: 'break-1', sort_order: 1, duration_minutes: 10 }] : []),
      ],
    })),
    songs: [
      { id: 'solo', title: 'Solo', notes_raw_text: '', font_size: 18, cue_document: null, tags: null, group_id: 'group', sort_order: 0, is_note: 0 },
      { id: 'song-1', title, notes_raw_text: 'C G', font_size: 18, cue_document: null, tags: null, group_id: null, sort_order: null, is_note: 0 },
    ],
  });
  const openSnapshot = async (title: string) => {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await (await chooser).setFiles({ name: 'library.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot(title))) });
    await expect(page.getByRole('button', { name: 'Replace current library' })).toBeVisible();
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Settings' }).click();
  await page.getByRole('switch', { name: 'High contrast' }).click();
  await expect(page.getByRole('switch', { name: 'High contrast' })).toBeChecked();
  await openSnapshot('Original');
  await page.getByRole('button', { name: 'Replace current library' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and apply' }).click();
  await expect(page.getByRole('button', { name: 'Replace current library' })).not.toBeVisible();

  await openSnapshot('Updated');
  await page.getByRole('button', { name: 'Preview merge (1 differences)' }).click();
  await page.getByRole('radio', { name: /Use snapshot/ }).click();
  await page.getByRole('button', { name: 'Apply merge' }).click();
  await page.getByRole('button', { name: 'Confirm and apply' }).click();
  await expect(page.getByRole('button', { name: 'Replace current library' })).not.toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const malformed = snapshot('Corrupt');
  malformed.setlists[0].items[0].id = 'missing';
  await (await chooser).setFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(malformed)) });
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'High contrast' })).toBeChecked();
  await page.getByRole('link', { name: 'Dashboard, back' }).click();
  await page.getByRole('button', { name: 'Expand First' }).click();
  await page.getByRole('button', { name: 'Expand Second' }).click();
  await expect(page.getByRole('button', { name: 'Play Updated' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Play Solo' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Delete break from First' })).toHaveCount(1);
});
