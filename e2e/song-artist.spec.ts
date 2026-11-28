import { expect, test } from '@playwright/test';

test('artist is saved, shown in performance, searchable, and removable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add song', exact: true }).click();
  await page.getByPlaceholder('Song title').fill('A Song');
  await page.getByPlaceholder('Artist', { exact: true }).fill('The Artist');
  await page.getByLabel('Edit text cue').fill('Lyrics');
  await expect(page.getByText('A Song - The Artist').last()).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play A Song - The Artist' })).toBeVisible();
  await page.getByRole('button', { name: 'Play A Song - The Artist' }).click();
  await expect(page.getByText('A Song - The Artist').last()).toBeVisible();
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();
  await page.getByRole('button', { name: 'Search songs' }).click();
  await page.getByLabel('Search songs').fill('Artist');
  await expect(page.getByRole('button', { name: 'A Song - The Artist, in Songs' })).toBeVisible();
  await page.getByRole('button', { name: 'Close search' }).click();
  await page.getByRole('button', { name: 'Edit A Song - The Artist' }).click();
  await expect(page.getByPlaceholder('Artist', { exact: true })).toHaveValue('The Artist');
  await page.getByPlaceholder('Artist', { exact: true }).clear();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play A Song', exact: true })).toBeVisible();
});

test('snapshot song artists appear in setlists and flow', async ({ page }) => {
  const snapshot = {
    format: 'dots-library-snapshot', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
    groups: [],
    songs: [{ id: 'song', title: 'Setlist Song', artist: 'The Artist', notes_raw_text: 'Lyrics', font_size: 18, cue_document: null, tags: null, group_id: null, sort_order: null, is_note: 0 }],
    setlists: [{ id: 'setlist', name: 'Gig', order_index: 0, group_id: null, location: null, latitude: null, longitude: null, notes: null, date: null, time: null, items: [{ kind: 'song', id: 'song', sort_order: 0 }] }],
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Settings' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await (await chooser).setFiles({ name: 'library.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
  await page.getByRole('button', { name: 'Replace current library' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and apply' }).click();
  await page.getByRole('link', { name: 'Dashboard, back' }).click();
  await page.getByRole('button', { name: 'Expand Gig' }).click();
  await expect(page.getByRole('button', { name: 'Play Setlist Song - The Artist' })).toBeVisible();
  await page.getByRole('button', { name: 'Play Gig', exact: true }).click();
  await expect(page.getByText('Setlist Song - The Artist').last()).toBeVisible();
});
