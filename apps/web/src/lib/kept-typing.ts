/**
 * docs/specs/kept-on-this-device.md: an invoice typed and not yet saved, kept in the browser's own storage on this
 * device. Every read and write is allowed to fail (a private window, storage switched off): nothing is kept then.
 */

const PREFIX = 'invoica:kept:';

export interface Kept<S> {
  /** When it was last kept, in milliseconds. */
  at: number;
  /** The draft's version the typing started from; null for a new invoice. */
  version: string | null;
  state: S;
  rateEnteredFor: string | null;
}

/** Where a page keeps its typing: per person, business and invoice. */
export const keptKey = (scope: string, id: string | null) => `${PREFIX}${scope}:${id ?? 'new'}`;

export function readKept<S>(key: string): Kept<S> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const kept = JSON.parse(raw) as Kept<S>;
    if (typeof kept?.at !== 'number' || typeof kept.state !== 'object' || kept.state === null) {
      window.localStorage.removeItem(key);
      return null;
    }
    return kept;
  } catch {
    return null;
  }
}

export function writeKept<S>(key: string, kept: Kept<S>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(kept));
  } catch {
    // Not kept: the editor works as before.
  }
}

export function removeKept(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}

/** Removes everything kept on this device, as signing out does. */
export function removeAllKept(): void {
  try {
    const storage = window.localStorage;
    for (const key of Object.keys(storage)) if (key.startsWith(PREFIX)) storage.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}

/** "14:32 on 20 October", in the person's own time. */
export function keptAt(at: number): string {
  const d = new Date(at);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(d);
  return `${time} on ${day}`;
}
