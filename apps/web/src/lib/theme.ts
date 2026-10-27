import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getTheme, isTheme, withUser, type Theme } from '@invoica/db';
import { getDb } from './db';
import { env } from './env';
import { getUser } from './session';

/** This device's copy of the theme (docs/specs/theme-on-the-account.md). */
export const THEME_COOKIE = 'invoica_theme';

/** The theme this device remembers, or null when it remembers none. */
export async function deviceTheme(): Promise<Theme | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : null;
}

/**
 * The theme saved on the signed-in person's account. Null when no one is signed in, when they have never chosen one,
 * and when the lookup fails, so a page still shows (in the device's theme).
 */
export const accountTheme = cache(async (): Promise<Theme | null> => {
  try {
    const user = await getUser();
    if (!user) return null;
    return await withUser(getDb(), user.id, (tx) => getTheme(tx, user.id));
  } catch {
    return null;
  }
});

/** The theme a page shows: the account's, else the device's, else light; and whether the device's copy is behind. */
export async function pageTheme(): Promise<{ theme: Theme; deviceBehind: boolean }> {
  const [account, device] = await Promise.all([accountTheme(), deviceTheme()]);
  return { theme: account ?? device ?? 'light', deviceBehind: account !== null && account !== device };
}

/** Remembers a theme on this device. Only from a server action or route handler, where cookies can be set. */
export async function rememberOnDevice(theme: Theme): Promise<void> {
  (await cookies()).set(THEME_COOKIE, theme, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: env.secureCookies,
    maxAge: 60 * 60 * 24 * 365,
  });
}
