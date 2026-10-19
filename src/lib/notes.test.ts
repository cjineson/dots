import assert from 'node:assert/strict';
import test from 'node:test';

import { parseNotes, toggleChecklistLine } from './notes';

test('parseNotes recognises checklist lines and plain text', () => {
  assert.deepEqual(parseNotes('Load in 6pm\n[ ] Spare strings\n[x] Cables'), [
    { kind: 'text', text: 'Load in 6pm' },
    { kind: 'check', text: 'Spare strings', checked: false, lineIndex: 1 },
    { kind: 'check', text: 'Cables', checked: true, lineIndex: 2 },
  ]);
});

test('toggleChecklistLine flips only the requested checklist line', () => {
  const notes = 'Plan\n[ ] A\n[x] B';
  assert.equal(toggleChecklistLine(notes, 1), 'Plan\n[x] A\n[x] B');
  assert.equal(toggleChecklistLine(notes, 2), 'Plan\n[ ] A\n[ ] B');
  assert.equal(toggleChecklistLine(notes, 0), notes);
  assert.equal(toggleChecklistLine(notes, 9), notes);
});
