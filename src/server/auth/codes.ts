import { createHash, randomBytes } from 'node:crypto';
export function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newCode() {
  return randomBytes(24).toString('base64url');
}
