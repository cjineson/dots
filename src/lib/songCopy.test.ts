import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findVariantConflict, tagSignature } from './songCopy';

const tag = (label: string) => ({ label, color: '#FFCC00' as const });

test('tagSignature ignores order, case and colour', () => {
  assert.equal(
    tagSignature([tag('Piano'), tag('Capo 2')]),
    tagSignature([{ label: 'capo 2', color: '#FFFFFF' }, tag('piano')]),
  );
  assert.notEqual(tagSignature([tag('Piano')]), tagSignature([tag('Guitar')]));
  assert.equal(tagSignature(), tagSignature([]));
});

test('findVariantConflict allows same title only with different tags', () => {
  const songs = [
    { id: '1', title: 'Wonderwall', tags: [tag('Guitar')] },
    { id: '2', title: 'Other', tags: [] },
  ];
  assert.equal(findVariantConflict(songs, 'wonderwall', [tag('guitar')])?.id, '1');
  assert.equal(findVariantConflict(songs, 'Wonderwall', [tag('Piano')]), undefined);
  assert.equal(findVariantConflict(songs, 'Wonderwall', [tag('Guitar'), tag('Capo 2')]), undefined);
  assert.equal(findVariantConflict(songs, 'Wonderwall', [tag('Guitar')], '1'), undefined);
  assert.equal(findVariantConflict(songs, 'Other', [])?.id, '2');
});
