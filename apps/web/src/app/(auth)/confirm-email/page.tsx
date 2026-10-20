import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { confirmationAddress } from '@/lib/auth-confirm';
import { env } from '@/lib/env';
import { getUser } from '@/lib/session';
import { ConfirmEmailForm, LinkExpired } from '../email-forms';

export const metadata: Metadata = { title: 'Confirm your email' };

/**
 * Where a confirmation link lands. It asks for the account's password, which confirms the address and signs in
 * (docs/specs/sign-in-by-email.md, rule 1). A link that does not work says so and offers a new one; one for an
 * address already confirmed goes on to the app when signed in, and to sign-in when not.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const email = !error && typeof token === 'string' ? await confirmationAddress(token, env.authSecret) : null;
  const found = email ? await (await getAuth().$context).internalAdapter.findUserByEmail(email) : null;
  if (!email || !found || typeof token !== 'string') return <LinkExpired kind="confirm" />;
  if (found.user.emailVerified) redirect((await getUser()) ? '/onboarding' : '/sign-in?confirmed=1');
  return <ConfirmEmailForm token={token} email={email} />;
}
