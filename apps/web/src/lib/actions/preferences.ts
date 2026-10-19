'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ORG_COOKIE, requireUser } from '../session';
import { myOrganisations } from '@invoica/db';
import { getDb } from '../db';
import { env } from '../env';

export async function setThemeAction(theme: 'light' | 'dark' | 'system') {
  if (!['light', 'dark', 'system'].includes(theme)) return;
  (await cookies()).set('invoica_theme', theme, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: env.secureCookies,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
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
