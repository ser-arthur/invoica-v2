'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button, Field, FormMessage, Input } from '@/components/ui';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const result =
      mode === 'sign-up'
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get('name') ?? '').trim() || email,
          })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(
        result.error.status === 401 || result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? 'That email and password do not match an account.'
          : (result.error.message ?? 'Something went wrong. Try again.'),
      );
      return;
    }
    router.push(mode === 'sign-up' ? '/onboarding' : '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {mode === 'sign-up' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="mt-2 text-muted">
          {mode === 'sign-up'
            ? 'Thirty days of everything, no card needed. Then keep using it free, or upgrade.'
            : 'Welcome back.'}
        </p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {mode === 'sign-up' ? (
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint={mode === 'sign-up' ? 'At least 10 characters.' : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          minLength={mode === 'sign-up' ? 10 : undefined}
          required
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'One moment' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </Button>
      <p className="text-sm text-muted">
        {mode === 'sign-up' ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-brand underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Invoica?{' '}
            <Link href="/sign-up" className="font-medium text-brand underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
