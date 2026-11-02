import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBuildTime, readBuildInfo } from './buildInfo';

test('readBuildInfo reads stamped values and tolerates a missing config', () => {
  assert.deepEqual(
    readBuildInfo({ version: '1.2.3', extra: { buildTime: '2026-11-02T23:18:00Z', commit: 'abc1234' } }),
    { version: '1.2.3', builtAt: '2026-11-02T23:18:00Z', commit: 'abc1234' },
  );
  assert.deepEqual(readBuildInfo(undefined), { version: 'unknown', builtAt: undefined, commit: undefined });
  assert.equal(readBuildInfo({ version: '1.0.0', extra: { buildTime: 5 } }).builtAt, undefined);
});

test('formatBuildTime formats valid timestamps and rejects the rest', () => {
  assert.match(formatBuildTime('2026-11-02T23:18:00Z') ?? '', /2026/);
  assert.equal(formatBuildTime(undefined), null);
  assert.equal(formatBuildTime('not a date'), null);
});
