import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeTextFile } from './textEncoding';

test('decodeTextFile preserves UTF-8 Unicode content and removes a UTF-8 BOM', () => {
  assert.equal(decodeTextFile(new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), '{}');
  assert.equal(
    decodeTextFile(new TextEncoder().encode('{"title":"Café 🎵"}')),
    '{"title":"Café 🎵"}',
  );
});

test('decodeTextFile decodes UTF-16 in either byte order with and without a BOM', () => {
  const json = '{"title":"Café 🎵"}';
  const codeUnits = Array.from({ length: json.length }, (_, index) => json.charCodeAt(index));
  const utf16le = new Uint8Array([
    0xff,
    0xfe,
    ...codeUnits.flatMap((code) => [code & 0xff, code >> 8]),
  ]);
  const utf16be = new Uint8Array([
    0xfe,
    0xff,
    ...codeUnits.flatMap((code) => [code >> 8, code & 0xff]),
  ]);
  const utf16leWithoutBom = utf16le.slice(2);

  assert.equal(decodeTextFile(utf16le), json);
  assert.equal(decodeTextFile(utf16be), json);
  assert.equal(decodeTextFile(utf16leWithoutBom), json);
});

test('decodeTextFile rejects invalid UTF-8 and malformed UTF-16', () => {
  assert.throws(
    () => decodeTextFile(new Uint8Array([0xc3, 0x28])),
    { message: 'The selected file is not valid UTF-8 or UTF-16 text.' },
  );
  assert.throws(() => decodeTextFile(new Uint8Array([0xff, 0xfe, 0x7b])));
  assert.throws(() => decodeTextFile(new Uint8Array([0xff, 0xfe, 0x00, 0xd8])));
});
