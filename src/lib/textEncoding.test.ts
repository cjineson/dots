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

test('decodeTextFile extracts an embedded GigBox archive from a binary plist', () => {
  const json = '{"format":"gigbox-setlists","version":2,"setlists":[]}';
  const prefix = new TextEncoder().encode(
    'bplist00\x00\x01NSKeyedArchiver\x00attributedStringData\x00NS.data\x00',
  );
  const suffix = new Uint8Array([0x00, 0x00, 0x08]);
  const bytes = new Uint8Array(prefix.length + json.length + suffix.length);
  bytes.set(prefix);
  bytes.set(new TextEncoder().encode(json), prefix.length);
  bytes.set(suffix, prefix.length + json.length);

  assert.equal(decodeTextFile(bytes), json);
});

test('decodeTextFile rejects binary plists without an embedded GigBox archive', () => {
  assert.throws(
    () => decodeTextFile(new TextEncoder().encode('bplist00\x00NSKeyedArchiver')),
    { message: 'This Apple binary property list does not contain a GigBox JSON archive.' },
  );
});

test('decodeTextFile diagnoses non-text input and rejects malformed UTF-16', () => {
  assert.throws(
    () => decodeTextFile(new Uint8Array([0xc3, 0x28])),
    {
      message:
        'The selected file is not valid UTF-8 or UTF-16 text. First bytes (hex): c3 28',
    },
  );
  assert.throws(
    () => decodeTextFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
    {
      message:
        'This file appears to be a ZIP archive, not a GigBox JSON file. Convert the Notes ZIP to a .gigbox.json file before importing.',
    },
  );
  assert.throws(() => decodeTextFile(new Uint8Array([0xff, 0xfe, 0x7b])));
  assert.throws(() => decodeTextFile(new Uint8Array([0xff, 0xfe, 0x00, 0xd8])));
});
