/**
 * docs/specs/kept-on-this-device.md: an invoice typed and not yet saved, kept in the browser's own storage on this
 * device. Every read and write is allowed to fail (a private window, storage switched off): nothing is kept then.
 */

const PREFIX = 'invoica:kept:';

/** The shape kept; a copy in another shape (from an earlier version of the app) is not offered. */
const SHAPE = 1;

/** Copies older than this are removed when the editor opens. */
const KEPT_FOR_MS = 30 * 86_400_000;

export interface Kept<S> {
  shape?: number;
  /** When it was last kept, in milliseconds. */
  at: number;
  /** The draft's version the typing started from; null for a new invoice. */
  version: string | null;
  state: S;
  rateEnteredFor: string | null;
  /** The request key of a new invoice's first save, so bringing it back and saving again makes one invoice. */
  createKey?: string;
}

/** Where a page keeps its typing: per person, business and invoice. */
export const keptKey = (scope: string, id: string | null) => `${PREFIX}${scope}:${id ?? 'new'}`;

export function readKept<S>(key: string): Kept<S> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const kept = JSON.parse(raw) as Kept<S>;
    const lines = (kept?.state as { lines?: unknown } | null)?.lines;
    if (kept?.shape !== SHAPE || typeof kept.at !== 'number' || !Array.isArray(lines)) {
      window.localStorage.removeItem(key);
      return null;
    }
    return kept;
  } catch {
    return null;
  }
}

export function writeKept<S>(key: string, kept: Omit<Kept<S>, 'shape'>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...kept, shape: SHAPE }));
  } catch {
    // Not kept: the editor carries on without a copy.
  }
}

export function removeKept(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}

/** Removes copies kept longer than thirty days, such as one for a draft deleted or issued elsewhere since. */
export function pruneKept(now = Date.now()): void {
  try {
    const storage = window.localStorage;
    for (const key of Object.keys(storage)) {
      if (!key.startsWith(PREFIX)) continue;
      const at = (JSON.parse(storage.getItem(key) ?? 'null') as { at?: unknown } | null)?.at;
      if (typeof at !== 'number' || now - at > KEPT_FOR_MS) storage.removeItem(key);
    }
  } catch {
    // Nothing to remove.
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

/** "14:32 on 20 October 2026", in the person's own time. */
export function keptAt(at: number): string {
  const d = new Date(at);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return `${time} on ${day}`;
}
