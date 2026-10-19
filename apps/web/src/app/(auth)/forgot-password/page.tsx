import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { ForgotPasswordForm } from '../email-forms';

export const metadata: Metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage() {
  if (await getUser()) redirect('/dashboard');
  return <ForgotPasswordForm />;
}
