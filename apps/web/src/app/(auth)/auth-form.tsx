'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { reachAuth } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';
import { Button, Field, FormMessage, Input, inlineLinkClass } from '@/components/ui';

const linkClass = inlineLinkClass;

function messageFor(error: { status?: number; code?: string; message?: string }) {
  if (error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD')
    return 'That email and password do not match an account.';
  if (error.code === 'EMAIL_NOT_VERIFIED')
    return 'Confirm your email address first. We have sent you a new link.';
  if (error.status === 429) return 'Too many attempts. Wait a minute, then try again.';
  return error.message ?? 'Something went wrong. Try again.';
}

/** After sign-up: the link is on its way, and it can be sent again. */
export function CheckEmail({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function resend() {
    setState('sending');
    const result = await reachAuth(authClient.sendVerificationEmail({ email }));
    if (result.error) {
      setError(messageFor(result.error));
      setState('error');
      return;
    }
    setState('sent');
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          Check your email
        </h1>
        <p className="mt-2 text-muted">
          We have sent a link to <span className="font-medium text-ink">{email}</span>. Open it to finish
          creating your account. It works for 24 hours.
        </p>
      </div>
      {state === 'sent' ? <FormMessage tone="info">A new link is on its way.</FormMessage> : null}
      {state === 'error' ? <FormMessage>{error}</FormMessage> : null}
      <p className="text-sm text-muted">
        Nothing there? Check your spam folder, or{' '}
        <button type="button" className={linkClass} onClick={resend} disabled={state === 'sending'}>
          send the link again
        </button>
        .
      </p>
    </div>
  );
}

export function AuthForm({ mode, notice }: { mode: 'sign-in' | 'sign-up'; notice?: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const result =
      mode === 'sign-up'
        ? await reachAuth(
            authClient.signUp.email({
              email,
              password,
              name: String(form.get('name') ?? '').trim() || email,
            }),
          )
        : await reachAuth(authClient.signIn.email({ email, password }));
    setPending(false);
    if (result.error) {
      setError(messageFor(result.error));
      return;
    }
    if (mode === 'sign-up') {
      setSentTo(email);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  if (sentTo) return <CheckEmail email={sentTo} />;

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
      {notice ? <FormMessage tone="info">{notice}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
      {mode === 'sign-up' ? (
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" maxLength={100} required />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint={
          mode === 'sign-up' ? (
            'At least 10 characters.'
          ) : (
            <Link href="/forgot-password" className={linkClass}>
              Forgot your password?
            </Link>
          )
        }
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
      <Button type="submit" size="lg" disabled={pending || !ready}>
        {pending ? 'One moment' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </Button>
      <p className="text-sm text-muted">
        {mode === 'sign-up' ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className={linkClass}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Invoica?{' '}
            <Link href="/sign-up" className={linkClass}>
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
