import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultExportFileName, exportFileName } from './exportFileName';

test('defaultExportFileName uses ddmmyyyy-hhmm', () => {
  assert.equal(defaultExportFileName(new Date(2026, 10, 2, 9, 5)), 'dots-export-02112026-0905');
});

test('exportFileName adds the .json extension once', () => {
  assert.equal(exportFileName('Friday gig', 'x'), 'Friday gig.json');
  assert.equal(exportFileName('Friday gig.JSON', 'x'), 'Friday gig.json');
});

test('exportFileName strips illegal characters and leading dots', () => {
  assert.equal(exportFileName('a/b:c*?', 'x'), 'abc.json');
  assert.equal(exportFileName('..hidden', 'x'), 'hidden.json');
});

test('exportFileName falls back when the name is blank', () => {
  assert.equal(exportFileName('   ', 'dots-export'), 'dots-export.json');
  assert.equal(exportFileName('.json', 'dots-export'), 'dots-export.json');
});
