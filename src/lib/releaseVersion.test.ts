import assert from 'node:assert/strict';
import test from 'node:test';

import { bumpForCommits, nextVersion, parseVersion } from './releaseVersion';

test('bumpForCommits picks the highest conventional-commit level', () => {
  assert.equal(bumpForCommits([{ subject: 'fix: crash' }]), 'patch');
  assert.equal(bumpForCommits([{ subject: 'fix: crash' }, { subject: 'feat(ui): add thing' }]), 'minor');
  assert.equal(bumpForCommits([{ subject: 'feat!: drop v1 archives' }, { subject: 'feat: x' }]), 'major');
  assert.equal(
    bumpForCommits([{ subject: 'fix: x', body: 'Details\n\nBREAKING CHANGE: format changed' }]),
    'major',
  );
});

test('bumpForCommits treats non-conventional subjects as patch and ignores merge commits', () => {
  assert.equal(bumpForCommits([{ subject: 'Widen startup logo on welcome screen' }]), 'patch');
  assert.equal(bumpForCommits([{ subject: 'Merge pull request #9 from a/b' }]), null);
  assert.equal(bumpForCommits([]), null);
});

test('nextVersion applies the bump and keeps the version when nothing changed', () => {
  assert.equal(nextVersion('1.2.3', [{ subject: 'fix: a' }]), '1.2.4');
  assert.equal(nextVersion('1.2.3', [{ subject: 'feat: a' }]), '1.3.0');
  assert.equal(nextVersion('1.2.3', [{ subject: 'refactor!: a' }]), '2.0.0');
  assert.equal(nextVersion('1.2.3', []), '1.2.3');
});

test('parseVersion rejects non-semver strings', () => {
  assert.deepEqual(parseVersion('1.20.3'), [1, 20, 3]);
  assert.throws(() => parseVersion('1.0'));
  assert.throws(() => parseVersion('1.0.0-beta'));
});
