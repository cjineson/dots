export function decodeUtf8(bytes: Uint8Array): string {
  let encoded = '';
  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, '0')}`;
  }

  try {
    return decodeURIComponent(encoded).replace(/^\uFEFF/, '');
  } catch {
    throw new Error('The selected file is not valid UTF-8 text.');
  }
}
