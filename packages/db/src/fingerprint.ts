import { createHash } from 'node:crypto';

/** A short digest of what a request asked for, stored with its request key. */
export function fingerprint(request: unknown): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}
