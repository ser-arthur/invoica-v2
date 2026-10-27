'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ORG_COOKIE, requireUser } from '../session';
import { isTheme, myOrganisations, saveTheme, withUser, type Theme } from '@invoica/db';
import { getDb } from '../db';
import { env } from '../env';
import { accountTheme, rememberOnDevice } from '../theme';
import { failure, type ActionResult } from './result';

/** Saves the theme on the account, so every device the person signs in on shows it, and on this device at once. */
export async function setThemeAction(theme: Theme): Promise<ActionResult> {
  if (!isTheme(theme)) return { ok: false, message: 'Choose light, dark or system.' };
  try {
    const user = await requireUser();
    await withUser(getDb(), user.id, (tx) => saveTheme(tx, user.id, theme));
    await rememberOnDevice(theme);
    revalidatePath('/', 'layout');
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Brings this device's copy of the theme up to the account's, when the account's was chosen on another device or
 * before signing in here, so this device's sign-in pages follow it after signing out.
 */
export async function rememberAccountThemeAction(): Promise<void> {
  const theme = await accountTheme();
  if (theme) await rememberOnDevice(theme);
}

export async function switchOrganisationAction(id: string) {
  const user = await requireUser();
  const mine = await myOrganisations(getDb(), user.id);
  if (!mine.some((o) => o.id === id)) return;
  (await cookies()).set(ORG_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.secureCookies,
  });
  revalidatePath('/', 'layout');
}
