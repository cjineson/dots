import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeUtf8 } from './utf8';

test('decodeUtf8 preserves Unicode content and removes a UTF-8 BOM', () => {
  assert.equal(decodeUtf8(new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), '{}');
  assert.equal(decodeUtf8(new TextEncoder().encode('{"title":"Café 🎵"}')), '{"title":"Café 🎵"}');
});

test('decodeUtf8 rejects invalid UTF-8 bytes', () => {
  assert.throws(
    () => decodeUtf8(new Uint8Array([0xc3, 0x28])),
    { message: 'The selected file is not valid UTF-8 text.' },
  );
});
