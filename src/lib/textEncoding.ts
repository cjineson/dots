function decodeUtf16(bytes: Uint8Array, littleEndian: boolean, offset: number): string {
  if ((bytes.length - offset) % 2 !== 0) {
    throw new Error('The selected file has an incomplete UTF-16 character.');
  }

  const characters: string[] = [];
  for (let index = offset; index < bytes.length; index += 2) {
    const first = littleEndian
      ? bytes[index] | (bytes[index + 1] << 8)
      : (bytes[index] << 8) | bytes[index + 1];

    if (first >= 0xdc00 && first <= 0xdfff) {
      throw new Error('The selected file contains invalid UTF-16 characters.');
    }

    if (first >= 0xd800 && first <= 0xdbff) {
      const nextIndex = index + 2;
      if (nextIndex >= bytes.length) {
        throw new Error('The selected file contains invalid UTF-16 characters.');
      }

      const second = littleEndian
        ? bytes[nextIndex] | (bytes[nextIndex + 1] << 8)
        : (bytes[nextIndex] << 8) | bytes[nextIndex + 1];
      if (second < 0xdc00 || second > 0xdfff) {
        throw new Error('The selected file contains invalid UTF-16 characters.');
      }
      characters.push(String.fromCharCode(first, second));
      index = nextIndex;
      continue;
    }

    characters.push(String.fromCharCode(first));
  }

  return characters.join('');
}

function detectUtf16ByteOrder(bytes: Uint8Array): boolean | null {
  let zeroEven = 0;
  let zeroOdd = 0;
  const sampleEnd = Math.min(bytes.length, 64);

  for (let index = 0; index < sampleEnd; index += 1) {
    if (bytes[index] === 0) {
      if (index % 2 === 0) zeroEven += 1;
      else zeroOdd += 1;
    }
  }

  if (zeroOdd >= 2 && zeroOdd > zeroEven * 2) return true;
  if (zeroEven >= 2 && zeroEven > zeroOdd * 2) return false;
  return null;
}

export function decodeTextFile(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new Error(
      'This file appears to be a ZIP archive, not a GigBox JSON file. Convert the Notes ZIP to a .gigbox.json file before importing.',
    );
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return decodeUtf16(bytes, true, 2);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16(bytes, false, 2);
  }

  const byteOrder = detectUtf16ByteOrder(bytes);
  if (byteOrder !== null) {
    return decodeUtf16(bytes, byteOrder, 0);
  }

  let encoded = '';
  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, '0')}`;
  }

  try {
    return decodeURIComponent(encoded).replace(/^\uFEFF/, '');
  } catch {
    const prefix = Array.from(bytes.slice(0, 16), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(' ');
    throw new Error(
      `The selected file is not valid UTF-8 or UTF-16 text. First bytes (hex): ${prefix || '(empty file)'}`,
    );
  }
}
