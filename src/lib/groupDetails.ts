export const MAX_GROUP_IMAGE_LENGTH = 20 * 1024 * 1024;
export const DEFAULT_GROUP_IMAGE_SIZE = 1024;

export function isGroupImage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_GROUP_IMAGE_LENGTH) return false;
  const prefix = /^data:image\/(jpeg|png);base64,/.exec(value)?.[0];
  if (!prefix) return false;
  const data = value.slice(prefix.length);
  return data.length > 0 && data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(data);
}
