import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseBoxes } from './parser';

test('parseBoxes keeps multiline cue text in a single box', () => {
  const cueText = 'First line\nSecond line\r\nThird line';

  assert.deepEqual(parseBoxes(cueText), [cueText]);
});

test('parseBoxes keeps empty cue text in a single box', () => {
  assert.deepEqual(parseBoxes(''), ['']);
});
