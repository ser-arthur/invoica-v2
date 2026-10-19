import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { LinkExpired } from '../email-forms';

export const metadata: Metadata = { title: 'Confirm your email' };

/** Where a confirmation link lands: signed in, it goes on to onboarding; otherwise the link did not work. */
export default async function ConfirmEmailPage() {
  if (await getUser()) redirect('/onboarding');
  return <LinkExpired kind="confirm" />;
}
