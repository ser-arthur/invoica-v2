import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getOrganisation,
  myOrganisations,
  withOrganisation,
  type Actor,
  type Organisation,
  type MyOrganisation,
} from '@invoica/db';
import { todayIn } from '@invoica/core';
import { getAuth } from './auth';
import { getDb } from './db';

export const ORG_COOKIE = 'invoica_org';

export const getUser = cache(async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

/**
 * Whether the visitor is signed in, for the public pages. A lookup that fails (the database out of reach, say)
 * counts as signed out, so the website still shows.
 */
export async function isSignedIn() {
  try {
    return Boolean(await getUser());
  } catch {
    return false;
  }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  return user;
}

export interface Workspace {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  actor: Actor;
  organisation: Organisation;
  organisations: MyOrganisation[];
  today: string;
}

/** The signed-in user, the organisation they are working in, and today's date in its time zone. */
export const requireWorkspace = cache(async (): Promise<Workspace> => {
  const user = await requireUser();
  const db = getDb();
  const organisations = await myOrganisations(db, user.id);
  if (organisations.length === 0) redirect('/onboarding');
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const chosen = organisations.find((o) => o.id === wanted) ?? organisations[0]!;
  const actor: Actor = { userId: user.id, organisationId: chosen.id };
  const organisation = await withOrganisation(db, actor, (tx) => getOrganisation(tx, actor));
  return { user, actor, organisation, organisations, today: todayIn(organisation.timeZone) };
});
