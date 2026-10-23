import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prefillEmail } from '@/lib/prefill-email';
import { getUser } from '@/lib/session';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getUser()) redirect('/dashboard');
  const { email } = await searchParams;
  return <AuthForm mode="sign-up" defaultEmail={prefillEmail(email)} />;
}
