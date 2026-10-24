import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextCopyTitle } from './songCopy';

test('nextCopyTitle numbers copies and skips titles already in use', () => {
  assert.equal(nextCopyTitle('Song', ['Song']), 'Song Copy 1');
  assert.equal(nextCopyTitle('Song', ['Song', 'Song Copy 1']), 'Song Copy 2');
  assert.equal(nextCopyTitle('Song', ['Song', 'song copy 1', 'Song Copy 3']), 'Song Copy 2');
});

test('nextCopyTitle copies of copies use the original title', () => {
  assert.equal(nextCopyTitle('Song Copy 1', ['Song', 'Song Copy 1']), 'Song Copy 2');
  assert.equal(nextCopyTitle('  ', []), 'Untitled Song Copy 1');
});
