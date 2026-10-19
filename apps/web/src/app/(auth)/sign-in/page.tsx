import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getUser()) redirect('/dashboard');
  const { reset } = await searchParams;
  return (
    <AuthForm
      mode="sign-in"
      notice={reset === 'done' ? 'Your password has been changed. Sign in with the new one.' : undefined}
    />
  );
}
