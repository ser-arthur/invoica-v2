import type { Metadata } from 'next';
import { LinkExpired, ResetPasswordForm } from '../email-forms';

export const metadata: Metadata = { title: 'Choose a new password' };

/** Reached from a reset link, which brings either a token or an error. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  if (error || !token) return <LinkExpired kind="reset" />;
  return <ResetPasswordForm token={token} />;
}
