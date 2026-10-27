import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveSongFontSize } from './fontSize';

test('songs without a custom size follow the default', () => {
  assert.equal(resolveSongFontSize(undefined, 24), 24);
  assert.equal(resolveSongFontSize(18, 24), 24);
});

test('custom song sizes are kept', () => {
  assert.equal(resolveSongFontSize(30, 24), 30);
});
