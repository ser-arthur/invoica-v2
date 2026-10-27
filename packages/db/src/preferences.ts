import { eq, sql } from 'drizzle-orm';
import type { Tx } from './client';
import { userPreference } from './schema';

export type Theme = 'light' | 'dark' | 'system';

export const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * The theme saved on a person's account, or null when they have never chosen one. Runs inside `withUser`: the row rule
 * shows a person their own row only, so asking for anyone else's finds nothing.
 */
export async function getTheme(tx: Tx, userId: string): Promise<Theme | null> {
  const [row] = await tx
    .select({ theme: userPreference.theme })
    .from(userPreference)
    .where(eq(userPreference.userId, userId));
  return row && isTheme(row.theme) ? row.theme : null;
}

/** Saves a person's theme on their account, replacing any earlier choice. Runs inside `withUser` for that person. */
export async function saveTheme(tx: Tx, userId: string, theme: Theme): Promise<void> {
  await tx
    .insert(userPreference)
    .values({ userId, theme })
    .onConflictDoUpdate({ target: userPreference.userId, set: { theme: sql`excluded.theme` } });
}
