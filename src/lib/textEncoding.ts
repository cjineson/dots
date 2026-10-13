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

function findBytes(bytes: Uint8Array, value: string): number {
  const marker = Array.from(value, (character) => character.charCodeAt(0));
  for (let index = 0; index <= bytes.length - marker.length; index += 1) {
    if (marker.every((byte, offset) => bytes[index + offset] === byte)) {
      return index;
    }
  }
  return -1;
}

function extractGigBoxJsonFromBinaryPlist(bytes: Uint8Array): string {
  const markerIndex = findBytes(bytes, '"format"');
  if (markerIndex < 0) {
    throw new Error('This Apple binary property list does not contain a GigBox JSON archive.');
  }

  let start = markerIndex;
  while (start >= 0 && bytes[start] !== 0x7b) start -= 1;
  if (start < 0) {
    throw new Error('Could not locate the embedded GigBox JSON object in the property list.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (byte === 0x5c) escaped = true;
      else if (byte === 0x22) inString = false;
      continue;
    }

    if (byte === 0x22) inString = true;
    else if (byte === 0x7b) depth += 1;
    else if (byte === 0x7d && --depth === 0) {
      return decodeTextFile(bytes.slice(start, index + 1));
    }
  }

  throw new Error('The embedded GigBox JSON object is incomplete.');
}

export function decodeTextFile(bytes: Uint8Array): string {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x62 &&
    bytes[1] === 0x70 &&
    bytes[2] === 0x6c &&
    bytes[3] === 0x69 &&
    bytes[4] === 0x73 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x30 &&
    bytes[7] === 0x30
  ) {
    return extractGigBoxJsonFromBinaryPlist(bytes);
  }

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
