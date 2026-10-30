'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { authAnswer, authWords, checkAuthFields } from '@/lib/auth-messages';
import { reachAuth } from '@/lib/reach';
import { useHydrated } from '@/lib/use-hydrated';
import { Button, Field, FormMessage, Input, inlineLinkClass } from '@/components/ui';
import { useFieldErrors } from './use-field-errors';
import a from './auth.module.css';

const linkClass = inlineLinkClass;

/** After sign-up: the link is on its way, and it can be sent again. */
export function CheckEmail({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function resend() {
    setState('sending');
    const result = await reachAuth(authClient.sendVerificationEmail({ email }));
    if (result.error) {
      setError(authWords(result.error));
      setState('error');
      return;
    }
    setState('sent');
  }

  return (
    <div className={`flex flex-col gap-5 ${a.arrive}`}>
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

export function AuthForm({
  mode,
  notice,
  defaultEmail,
}: {
  mode: 'sign-in' | 'sign-up';
  notice?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const fields = useFieldErrors();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (fields.show(checkAuthFields(mode, { name, email, password }), formElement)) return;
    setPending(true);
    const result =
      mode === 'sign-up'
        ? await reachAuth(authClient.signUp.email({ email, password, name }))
        : await reachAuth(authClient.signIn.email({ email, password }));
    setPending(false);
    if (result.error) {
      const answer = authAnswer(result.error);
      if ('field' in answer) fields.show({ [answer.field]: answer.message }, formElement);
      else setError(answer.form);
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
        <Field label="Your name" htmlFor="name" error={fields.errors.name}>
          <Input id="name" name="name" autoComplete="name" maxLength={100} {...fields.input('name')} />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email" error={fields.errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          {...fields.input('email')}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={fields.errors.password}
        keepHint={mode === 'sign-in'}
        hint={
          mode === 'sign-up' ? (
            'At least 10 characters.'
          ) : (
            <Link href="/forgot-password" className={`${linkClass} ${a.quiet}`}>
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
          {...fields.input('password')}
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
