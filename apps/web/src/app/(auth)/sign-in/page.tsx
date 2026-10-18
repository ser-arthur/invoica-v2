import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
  if (await getUser()) redirect('/dashboard');
  return <AuthForm mode="sign-in" />;
}
