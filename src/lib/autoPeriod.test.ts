import assert from 'node:assert/strict';
import { test } from 'node:test';

import { undoAutoPeriod } from './autoPeriod';

test('undoAutoPeriod turns an auto period back into a second space', () => {
  assert.equal(undoAutoPeriod('A ', 'A. '), 'A  ');
  assert.equal(undoAutoPeriod('A  B ', 'A  B. '), 'A  B  ');
  assert.equal(undoAutoPeriod('A \nB', 'A. \nB'), 'A  \nB');
});

test('undoAutoPeriod leaves other edits alone', () => {
  assert.equal(undoAutoPeriod('A', 'A '), 'A ');
  assert.equal(undoAutoPeriod('A', 'A.'), 'A.');
  assert.equal(undoAutoPeriod('A B', 'A. B'), 'A. B');
  assert.equal(undoAutoPeriod('', '. '), '. ');
});
