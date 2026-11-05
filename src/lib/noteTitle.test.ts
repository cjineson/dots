import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveNoteTitle } from './noteTitle';

test('deriveNoteTitle uses the first non-empty line', () => {
  assert.equal(deriveNoteTitle('\n  Welcome the crowd  \nsecond line'), 'Welcome the crowd');
});

test('deriveNoteTitle truncates long lines', () => {
  const title = deriveNoteTitle('x'.repeat(100));
  assert.equal(title.length, 60);
  assert.ok(title.endsWith('\u2026'));
});

test('deriveNoteTitle names empty notes', () => {
  assert.equal(deriveNoteTitle('  \n '), 'Empty note');
});
