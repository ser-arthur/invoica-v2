import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignUpPage() {
  if (await getUser()) redirect('/dashboard');
  return <AuthForm mode="sign-up" />;
}
