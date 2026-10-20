import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { LinkExpired } from '../email-forms';

export const metadata: Metadata = { title: 'Confirm your email' };

/**
 * Where a confirmation link lands. A link that worked goes on to sign in, which asks for the password; one that
 * did not says so and offers a new one. Someone already signed in goes on to onboarding.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (error) return <LinkExpired kind="confirm" />;
  if (await getUser()) redirect('/onboarding');
  redirect('/sign-in?confirmed=1');
}
